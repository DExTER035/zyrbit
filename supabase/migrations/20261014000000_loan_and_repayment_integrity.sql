-- ==============================================================================
-- ZYRBIT WEALTH — LOAN AND REPAYMENT INTEGRITY (TASK 4D REMEDIATION)
-- Provides atomic database transaction functions for lending, borrowing,
-- and loan repayments with strict cross-user ownership guards, retry idempotency,
-- legacy loan reconciliation, and relational integrity.
-- Idempotent and safe to run in Supabase SQL editor.
-- ==============================================================================

-- 0. SCHEMA INTEGRITY ADJUSTMENTS
-- Ensure wealth_bills allows amount = 0 when settled/paid while rejecting negative balances.
-- Idempotent and safe on fresh databases, existing databases, and repeated executions.
DO $$
BEGIN
  -- Drop legacy constraint requiring amount > 0 if present
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_wealth_bills_amount') THEN
    ALTER TABLE public.wealth_bills DROP CONSTRAINT chk_wealth_bills_amount;
  END IF;

  -- Ensure invariant CHECK (amount >= 0) is established
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_wealth_bills_amount') THEN
    ALTER TABLE public.wealth_bills ADD CONSTRAINT chk_wealth_bills_amount CHECK (amount >= 0);
  END IF;
END $$;

-- 1. ATOMIC LOAN RECORDING (LEND / BORROW)
-- Inserts or updates the cash movement and corresponding obligation in a single transaction.
CREATE OR REPLACE FUNCTION public.record_loan_atomic(
  p_user_id UUID,
  p_type TEXT, -- 'LEND' or 'BORROW'
  p_amount NUMERIC,
  p_person TEXT DEFAULT '',
  p_note TEXT DEFAULT '',
  p_date DATE DEFAULT CURRENT_DATE,
  p_due_date DATE DEFAULT CURRENT_DATE,
  p_tx_id UUID DEFAULT NULL,
  p_bill_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_type TEXT := UPPER(TRIM(p_type));
  v_person TEXT := TRIM(p_person);
  v_note TEXT := TRIM(p_note);
  v_promise_name TEXT;
  v_expense_id UUID := COALESCE(p_tx_id, gen_random_uuid());
  v_income_id UUID := COALESCE(p_tx_id, gen_random_uuid());
  v_bill_id UUID := COALESCE(p_bill_id, gen_random_uuid());
  v_existing_bill RECORD;
  v_total_repaid NUMERIC := 0;
  v_remaining_to_set NUMERIC := p_amount;
BEGIN
  -- Strict Authorization:
  -- Only explicitly verified service-role callers may specify an arbitrary p_user_id.
  -- Ordinary callers must be authenticated and cannot act on behalf of another user.
  IF (COALESCE(auth.role(), '') IS DISTINCT FROM 'service_role') THEN
    IF auth.uid() IS NULL THEN
      RAISE EXCEPTION 'Authentication required: caller identity is missing';
    END IF;
    IF auth.uid() IS DISTINCT FROM p_user_id THEN
      RAISE EXCEPTION 'Unauthorized: Caller user does not match target user ID';
    END IF;
  END IF;

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User ID is required';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Loan amount must be strictly greater than 0';
  END IF;

  IF v_type NOT IN ('LEND', 'BORROW') THEN
    RAISE EXCEPTION 'Invalid loan type. Must be LEND or BORROW';
  END IF;

  -- 1. CROSS-USER OWNERSHIP VALIDATION & CONCURRENCY LOCKING
  -- Prevent overwriting transactions, obligations, or promises owned by another user.
  IF p_tx_id IS NOT NULL THEN
    PERFORM 1 FROM public.money_expenses WHERE id = p_tx_id FOR UPDATE;
    PERFORM 1 FROM public.wealth_income WHERE id = p_tx_id FOR UPDATE;

    IF EXISTS (SELECT 1 FROM public.money_expenses WHERE id = p_tx_id AND user_id IS DISTINCT FROM p_user_id)
       OR EXISTS (SELECT 1 FROM public.wealth_income WHERE id = p_tx_id AND user_id IS DISTINCT FROM p_user_id) THEN
      RAISE EXCEPTION 'Transaction ID is already owned by another user';
    END IF;
  END IF;

  IF p_bill_id IS NOT NULL THEN
    SELECT * INTO v_existing_bill FROM public.wealth_bills WHERE id = p_bill_id FOR UPDATE;
    PERFORM 1 FROM public.money_promises WHERE id = p_bill_id FOR UPDATE;

    IF EXISTS (SELECT 1 FROM public.wealth_bills WHERE id = p_bill_id AND user_id IS DISTINCT FROM p_user_id)
       OR EXISTS (SELECT 1 FROM public.money_promises WHERE id = p_bill_id AND user_id IS DISTINCT FROM p_user_id) THEN
      RAISE EXCEPTION 'Obligation or promise ID is already owned by another user';
    END IF;

    -- 2. PRESERVE SETTLED AND PARTIALLY REPAID STATE
    IF v_existing_bill IS NOT NULL AND v_existing_bill.id IS NOT NULL THEN
      IF v_existing_bill.status = 'paid' THEN
        RAISE EXCEPTION 'Cannot modify an obligation that is already fully settled';
      END IF;

      -- Calculate total repayments already made towards this obligation
      SELECT COALESCE(SUM(amount), 0) INTO v_total_repaid
      FROM public.money_promise_repayments
      WHERE promise_id = p_bill_id AND user_id = p_user_id;

      IF v_total_repaid > 0 THEN
        IF p_amount <= v_total_repaid THEN
          RAISE EXCEPTION 'New loan principal (%) must be greater than already repaid amount (%)', p_amount, v_total_repaid;
        END IF;
        -- Preserve net balance after accounting for prior repayments
        v_remaining_to_set := ROUND((p_amount - v_total_repaid)::numeric, 2);
      END IF;
    END IF;
  END IF;

  IF v_type = 'LEND' THEN
    v_promise_name := CASE WHEN v_person <> '' THEN v_person || ' owes you' ELSE 'Money owed to you' END;

    -- 1. Upsert expense record in money_expenses (scoped to p_user_id)
    INSERT INTO public.money_expenses (id, user_id, amount, category, note, expense_date, created_at)
    VALUES (
      v_expense_id,
      p_user_id,
      p_amount,
      'Lend',
      COALESCE(NULLIF(v_note, ''), CASE WHEN v_person <> '' THEN 'Lent to ' || v_person ELSE 'Loan' END),
      p_date,
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      amount = EXCLUDED.amount,
      category = EXCLUDED.category,
      note = EXCLUDED.note,
      expense_date = EXCLUDED.expense_date
    WHERE public.money_expenses.user_id = p_user_id;

    -- 2. Upsert obligation in wealth_bills (scoped to p_user_id, preserves repayment balance)
    INSERT INTO public.wealth_bills (id, user_id, name, amount, due_date, frequency, status, created_at)
    VALUES (
      v_bill_id,
      p_user_id,
      v_promise_name,
      v_remaining_to_set,
      p_due_date,
      'one_off',
      'receivable',
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      amount = v_remaining_to_set,
      due_date = EXCLUDED.due_date,
      status = 'receivable'
    WHERE public.wealth_bills.user_id = p_user_id;

    -- 3. Upsert into money_promises (relational integrity guaranteed, scoped to p_user_id)
    INSERT INTO public.money_promises (id, user_id, person, amount, type, due_date, status, note, created_at, updated_at)
    VALUES (
      v_bill_id,
      p_user_id,
      COALESCE(NULLIF(v_person, ''), 'Contact'),
      v_remaining_to_set,
      'lent',
      p_due_date,
      'outstanding',
      v_note,
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      person = EXCLUDED.person,
      amount = v_remaining_to_set,
      due_date = EXCLUDED.due_date,
      status = 'outstanding',
      updated_at = NOW()
    WHERE public.money_promises.user_id = p_user_id;

    RETURN jsonb_build_object(
      'success', true,
      'type', 'LEND',
      'expense_id', v_expense_id,
      'bill_id', v_bill_id,
      'amount', v_remaining_to_set,
      'initial_amount', p_amount
    );

  ELSE -- BORROW
    v_promise_name := CASE WHEN v_person <> '' THEN 'Return to ' || v_person ELSE 'Repay debt' END;

    -- 1. Upsert income record in wealth_income (scoped to p_user_id)
    INSERT INTO public.wealth_income (id, user_id, amount, source, note, income_date, created_at)
    VALUES (
      v_income_id,
      p_user_id,
      p_amount,
      'Borrow',
      COALESCE(NULLIF(v_note, ''), CASE WHEN v_person <> '' THEN 'Borrowed from ' || v_person ELSE 'Liability' END),
      p_date,
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      amount = EXCLUDED.amount,
      source = EXCLUDED.source,
      note = EXCLUDED.note,
      income_date = EXCLUDED.income_date
    WHERE public.wealth_income.user_id = p_user_id;

    -- 2. Upsert commitment in wealth_bills (scoped to p_user_id, preserves repayment balance)
    INSERT INTO public.wealth_bills (id, user_id, name, amount, due_date, frequency, status, created_at)
    VALUES (
      v_bill_id,
      p_user_id,
      v_promise_name,
      v_remaining_to_set,
      p_due_date,
      'one_off',
      'unpaid',
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      amount = v_remaining_to_set,
      due_date = EXCLUDED.due_date,
      status = 'unpaid'
    WHERE public.wealth_bills.user_id = p_user_id;

    -- 3. Upsert into money_promises (scoped to p_user_id)
    INSERT INTO public.money_promises (id, user_id, person, amount, type, due_date, status, note, created_at, updated_at)
    VALUES (
      v_bill_id,
      p_user_id,
      COALESCE(NULLIF(v_person, ''), 'Contact'),
      v_remaining_to_set,
      'borrowed',
      p_due_date,
      'outstanding',
      v_note,
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      person = EXCLUDED.person,
      amount = v_remaining_to_set,
      due_date = EXCLUDED.due_date,
      status = 'outstanding',
      updated_at = NOW()
    WHERE public.money_promises.user_id = p_user_id;

    RETURN jsonb_build_object(
      'success', true,
      'type', 'BORROW',
      'income_id', v_income_id,
      'bill_id', v_bill_id,
      'amount', v_remaining_to_set,
      'initial_amount', p_amount
    );
  END IF;
END;
$$;

-- 2. ATOMIC REPAYMENT RESOLUTION
-- Updates the obligation and logs cash transaction in a single transaction with row locking and retry idempotency.
CREATE OR REPLACE FUNCTION public.resolve_loan_repayment_atomic(
  p_user_id UUID,
  p_bill_id UUID,
  p_amount NUMERIC,
  p_person TEXT DEFAULT '',
  p_note TEXT DEFAULT '',
  p_date DATE DEFAULT CURRENT_DATE,
  p_repayment_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bill RECORD;
  v_promise RECORD;
  v_existing_rep RECORD;
  v_current_amount NUMERIC;
  v_remaining NUMERIC;
  v_is_full_repayment BOOLEAN;
  v_contact TEXT;
  v_rep_id UUID := COALESCE(p_repayment_id, gen_random_uuid());
  v_cash_id UUID := v_rep_id;
  v_new_status TEXT;
  v_is_loan BOOLEAN := FALSE;
  v_is_receivable BOOLEAN := FALSE;
BEGIN
  -- Strict Authorization:
  -- Only explicitly verified service-role callers may specify an arbitrary p_user_id.
  -- Ordinary callers must be authenticated and cannot act on behalf of another user.
  IF (COALESCE(auth.role(), '') IS DISTINCT FROM 'service_role') THEN
    IF auth.uid() IS NULL THEN
      RAISE EXCEPTION 'Authentication required: caller identity is missing';
    END IF;
    IF auth.uid() IS DISTINCT FROM p_user_id THEN
      RAISE EXCEPTION 'Unauthorized: Caller user does not match target user ID';
    END IF;
  END IF;

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User ID is required';
  END IF;

  IF p_bill_id IS NULL THEN
    RAISE EXCEPTION 'Obligation/Bill ID is required';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Repayment amount must be strictly greater than 0';
  END IF;

  -- 1. ATOMIC IDEMPOTENCY / DEDUPLICATION CHECK
  -- If a repayment request ID is provided, check if it was already processed.
  IF p_repayment_id IS NOT NULL THEN
    SELECT * INTO v_existing_rep
    FROM public.money_promise_repayments
    WHERE id = p_repayment_id
    FOR UPDATE;

    IF FOUND THEN
      -- Validate that the key is not being reused for a different user, bill, or amount
      IF v_existing_rep.user_id IS DISTINCT FROM p_user_id THEN
        RAISE EXCEPTION 'Idempotency key belongs to another user';
      END IF;
      IF v_existing_rep.promise_id IS DISTINCT FROM p_bill_id THEN
        RAISE EXCEPTION 'Idempotency key reused for a different bill';
      END IF;
      IF v_existing_rep.amount IS DISTINCT FROM p_amount THEN
        RAISE EXCEPTION 'Idempotency key reused with a different repayment amount';
      END IF;

      -- Fetch current obligation status to return accurate idempotent outcome
      SELECT * INTO v_bill
      FROM public.wealth_bills
      WHERE id = p_bill_id AND user_id = p_user_id;

      RETURN jsonb_build_object(
        'success', true,
        'bill_id', p_bill_id,
        'repaid_amount', v_existing_rep.amount,
        'remaining_balance', v_bill.amount,
        'status', v_bill.status,
        'is_full_repayment', (v_bill.status = 'paid'),
        'cash_tx_id', p_repayment_id,
        'idempotent_replay', true
      );
    END IF;

    -- Also verify that the transaction ID is not stolen from another user's cash tables
    IF EXISTS (SELECT 1 FROM public.wealth_income WHERE id = p_repayment_id AND user_id IS DISTINCT FROM p_user_id)
       OR EXISTS (SELECT 1 FROM public.money_expenses WHERE id = p_repayment_id AND user_id IS DISTINCT FROM p_user_id) THEN
      RAISE EXCEPTION 'Transaction ID is already owned by another user';
    END IF;
  END IF;

  -- 2. LOCK TARGET OBLIGATION
  SELECT * INTO v_bill
  FROM public.wealth_bills
  WHERE id = p_bill_id AND user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Obligation not found for the given user';
  END IF;

  IF v_bill.status = 'paid' THEN
    RAISE EXCEPTION 'Obligation is already fully settled';
  END IF;

  -- 3. REPAYMENT GUARD & CLASSIFICATION
  -- Inspect linked money_promises first, then examine bill status and verified loan keywords.
  SELECT * INTO v_promise
  FROM public.money_promises
  WHERE id = p_bill_id AND user_id = p_user_id
  FOR UPDATE;

  IF FOUND THEN
    v_is_loan := TRUE;
    IF LOWER(v_promise.type) IN ('lent', 'lend') THEN
      v_is_receivable := TRUE;
    ELSIF LOWER(v_promise.type) IN ('borrowed', 'borrow') THEN
      v_is_receivable := FALSE;
    ELSE
      v_is_receivable := (v_bill.status = 'receivable' OR LOWER(v_bill.name) LIKE '%owes you%');
    END IF;
  ELSE
    IF v_bill.status = 'receivable' OR LOWER(v_bill.name) LIKE '%owes you%' THEN
      v_is_loan := TRUE;
      v_is_receivable := TRUE;
    ELSIF LOWER(v_bill.name) LIKE 'return to %'
       OR LOWER(v_bill.name) LIKE 'borrowed from %'
       OR LOWER(v_bill.name) LIKE 'repay debt%' THEN
      v_is_loan := TRUE;
      v_is_receivable := FALSE;
    ELSE
      v_is_loan := FALSE;
    END IF;
  END IF;

  IF NOT v_is_loan THEN
    RAISE EXCEPTION 'Target obligation is an ordinary bill, not a loan or debt commitment';
  END IF;

  v_current_amount := v_bill.amount;

  IF p_amount > v_current_amount THEN
    RAISE EXCEPTION 'Repayment amount (%) exceeds outstanding balance (%)', p_amount, v_current_amount;
  END IF;

  v_remaining := ROUND((v_current_amount - p_amount)::numeric, 2);
  v_is_full_repayment := (v_remaining <= 0);
  v_new_status := CASE WHEN v_is_full_repayment THEN 'paid' ELSE v_bill.status END;
  v_contact := COALESCE(NULLIF(TRIM(p_person), ''), TRIM(v_bill.name));

  -- 4. RECONCILE LEGACY PARENT PROMISE (Requirement 3)
  -- If bill was created prior to money_promises table, backfill parent row inside this transaction
  IF v_promise IS NULL OR v_promise.id IS NULL THEN
    INSERT INTO public.money_promises (
      id,
      user_id,
      person,
      amount,
      type,
      due_date,
      status,
      note,
      created_at,
      updated_at
    )
    VALUES (
      p_bill_id,
      p_user_id,
      v_contact,
      v_current_amount,
      CASE WHEN v_is_receivable THEN 'lent' ELSE 'borrowed' END,
      v_bill.due_date,
      'outstanding',
      v_bill.name,
      COALESCE(v_bill.created_at, NOW()),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      updated_at = NOW()
    WHERE public.money_promises.user_id = p_user_id
    RETURNING * INTO v_promise;
  END IF;

  -- 5. UPDATE OBLIGATION IN WEALTH_BILLS
  UPDATE public.wealth_bills
  SET
    amount = CASE WHEN v_is_full_repayment THEN 0 ELSE v_remaining END,
    status = v_new_status
  WHERE id = p_bill_id AND user_id = p_user_id;

  -- 6. SYNCHRONIZE CORRESPONDING MONEY_PROMISES RECORD
  UPDATE public.money_promises
  SET
    amount = CASE WHEN v_is_full_repayment THEN 0 ELSE v_remaining END,
    status = CASE WHEN v_is_full_repayment THEN 'paid' ELSE 'outstanding' END,
    updated_at = NOW()
  WHERE id = p_bill_id AND user_id = p_user_id;

  -- 7. RECORD CASH TRANSACTION
  IF v_is_receivable THEN
    -- Incoming repayment of lent money
    INSERT INTO public.wealth_income (id, user_id, amount, source, note, income_date, created_at)
    VALUES (
      v_cash_id,
      p_user_id,
      p_amount,
      'Loan Repayment',
      COALESCE(NULLIF(TRIM(p_note), ''), 'Repaid by ' || v_contact),
      p_date,
      NOW()
    )
    ON CONFLICT (id) DO NOTHING;
  ELSE
    -- Outgoing payment of borrowed debt
    INSERT INTO public.money_expenses (id, user_id, amount, category, note, expense_date, created_at)
    VALUES (
      v_cash_id,
      p_user_id,
      p_amount,
      'Debt Repayment',
      COALESCE(NULLIF(TRIM(p_note), ''), 'Repaid to ' || v_contact),
      p_date,
      NOW()
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- 8. RECORD INSTALLMENT IN MONEY_PROMISE_REPAYMENTS (FK safety guaranteed)
  INSERT INTO public.money_promise_repayments (id, user_id, promise_id, amount, repayment_date, note, created_at)
  VALUES (
    v_rep_id,
    p_user_id,
    p_bill_id,
    p_amount,
    p_date,
    COALESCE(NULLIF(TRIM(p_note), ''), 'Repayment of ' || p_amount::TEXT),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN jsonb_build_object(
    'success', true,
    'bill_id', p_bill_id,
    'repaid_amount', p_amount,
    'remaining_balance', CASE WHEN v_is_full_repayment THEN 0 ELSE v_remaining END,
    'status', v_new_status,
    'is_full_repayment', v_is_full_repayment,
    'cash_tx_id', v_cash_id,
    'idempotent_replay', false
  );
END;
$$;

-- 3. PERMISSIONS & SECURITY HARDENING
DROP FUNCTION IF EXISTS public.record_loan_atomic(UUID, TEXT, NUMERIC, TEXT, TEXT, DATE, DATE, UUID, UUID);
DROP FUNCTION IF EXISTS public.resolve_loan_repayment_atomic(UUID, UUID, NUMERIC, TEXT, TEXT, DATE);
DROP FUNCTION IF EXISTS public.resolve_loan_repayment_atomic(UUID, UUID, NUMERIC, TEXT, TEXT, DATE, UUID);

REVOKE ALL ON FUNCTION public.record_loan_atomic(UUID, TEXT, NUMERIC, TEXT, TEXT, DATE, DATE, UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.resolve_loan_repayment_atomic(UUID, UUID, NUMERIC, TEXT, TEXT, DATE, UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.record_loan_atomic(UUID, TEXT, NUMERIC, TEXT, TEXT, DATE, DATE, UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.resolve_loan_repayment_atomic(UUID, UUID, NUMERIC, TEXT, TEXT, DATE, UUID) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
