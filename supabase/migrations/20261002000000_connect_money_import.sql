-- ==============================================================================
-- ZYRBIT WEALTH — CONNECT MONEY V1: STATEMENT IMPORT & AUDIT MIGRATION
-- Migration: 20261002000000_connect_money_import.sql
-- ==============================================================================

-- 1. STATEMENT IMPORT BATCHES
CREATE TABLE IF NOT EXISTS public.statement_import_batches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  batch_code TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'paytm',
  filename TEXT,
  period_start DATE,
  period_end DATE,
  total_count INT DEFAULT 0,
  confirmed_count INT DEFAULT 0,
  needs_review_count INT DEFAULT 0,
  status TEXT DEFAULT 'pending_review', -- pending_review | partially_confirmed | completed | rolled_back
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for statement_import_batches
ALTER TABLE public.statement_import_batches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_statement_import_batches" ON public.statement_import_batches;
CREATE POLICY "own_statement_import_batches" ON public.statement_import_batches
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_import_batches_user_created 
  ON public.statement_import_batches (user_id, created_at DESC);


-- 2. IMPORTED TRANSACTIONS (CANONICAL IMPORT STAGING & AUDIT)
CREATE TABLE IF NOT EXISTS public.imported_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  batch_id UUID REFERENCES public.statement_import_batches ON DELETE CASCADE NOT NULL,
  source TEXT NOT NULL DEFAULT 'paytm',
  source_transaction_id TEXT,
  fingerprint TEXT NOT NULL,
  occurred_at TIMESTAMPTZ,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  direction TEXT NOT NULL CHECK (direction IN ('in', 'out')),
  counterparty TEXT,
  payment_method TEXT DEFAULT 'upi',
  raw_description TEXT,
  resolution_state TEXT DEFAULT 'resolved', -- resolved | needs_review | duplicate
  suggested_action TEXT DEFAULT 'add_expense', -- add_expense | add_income | transfer | investment | refund | add_bill | ignore
  suggested_category TEXT,
  suggested_note TEXT,
  review_reason TEXT,
  status TEXT DEFAULT 'pending', -- pending | confirmed | rejected | ignored
  linked_expense_id UUID,
  linked_income_id UUID,
  linked_bill_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for imported_transactions
ALTER TABLE public.imported_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_imported_transactions" ON public.imported_transactions;
CREATE POLICY "own_imported_transactions" ON public.imported_transactions
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_imported_tx_user_batch 
  ON public.imported_transactions (user_id, batch_id);
CREATE INDEX IF NOT EXISTS idx_imported_tx_user_fingerprint 
  ON public.imported_transactions (user_id, fingerprint);
CREATE INDEX IF NOT EXISTS idx_imported_tx_user_source_id 
  ON public.imported_transactions (user_id, source_transaction_id) 
  WHERE source_transaction_id IS NOT NULL;

-- 5. GRANTS & SCHEMA CACHE RELOAD
GRANT ALL ON TABLE public.statement_import_batches TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.imported_transactions TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';

