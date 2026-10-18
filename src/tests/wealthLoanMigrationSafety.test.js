/**
 * Zyrbit Wealth — Task 4D: Loan and Repayment Migration Safety Tests
 * Verifies all remediation requirements for supabase/migrations/20261014000000_loan_and_repayment_integrity.sql
 * and its integration with src/services/wealthService.js.
 *
 * NOTE ON TEST EXECUTION ENVIRONMENT:
 * - Section 1 contains static assertions inspecting the physical SQL migration file.
 * - Section 2 contains in-memory JavaScript behavioral simulations modeling PL/pgSQL database logic.
 * - Section 3 contains Vitest unit tests testing wealthService.js RPC dispatch contracts with mocked Supabase responses.
 * - NEITHER Section 1, 2, nor 3 execute live DDL or DML inside a PostgreSQL engine. Live PostgreSQL verification
 *   remains an unverified deployment-step claim until executed against an actual Supabase/PostgreSQL instance.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as wealthService from '../services/wealthService.js';
import { supabase } from '../lib/supabase/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MIGRATION_PATH = path.resolve(__dirname, '../../supabase/migrations/20261014000000_loan_and_repayment_integrity.sql');

describe('Task 4D: Wealth Loan Migration Static and Architectural Safety', () => {
  const sqlContent = fs.readFileSync(MIGRATION_PATH, 'utf-8');

  it('1. Verifies migration file exists and contains SECURITY DEFINER with fixed search_path', () => {
    expect(sqlContent).toContain('CREATE OR REPLACE FUNCTION public.record_loan_atomic');
    expect(sqlContent).toContain('CREATE OR REPLACE FUNCTION public.resolve_loan_repayment_atomic');
    expect(sqlContent).toContain('SECURITY DEFINER');
    expect(sqlContent).toContain('SET search_path = public');
  });

  it('2. Verifies public permissions are revoked and granted only to authenticated and service_role with updated signature', () => {
    expect(sqlContent).toContain('REVOKE ALL ON FUNCTION public.record_loan_atomic');
    expect(sqlContent).toContain('REVOKE ALL ON FUNCTION public.resolve_loan_repayment_atomic');
    expect(sqlContent).toContain('GRANT EXECUTE ON FUNCTION public.record_loan_atomic(UUID, TEXT, NUMERIC, TEXT, TEXT, DATE, DATE, UUID, UUID) TO authenticated, service_role');
    expect(sqlContent).toContain('GRANT EXECUTE ON FUNCTION public.resolve_loan_repayment_atomic(UUID, UUID, NUMERIC, TEXT, TEXT, DATE, UUID) TO authenticated, service_role');
  });

  it('3. Verifies strict, NULL-safe authorization checks using IS DISTINCT FROM', () => {
    const roleMatches = sqlContent.match(/COALESCE\(auth\.role\(\),\s*''\)\s+IS DISTINCT FROM\s+'service_role'/g);
    expect(roleMatches).not.toBeNull();
    expect(roleMatches.length).toBeGreaterThanOrEqual(2);

    const missingAuthMatches = sqlContent.match(/auth\.uid\(\)\s+IS NULL/g);
    expect(missingAuthMatches).not.toBeNull();
    expect(missingAuthMatches.length).toBeGreaterThanOrEqual(2);

    const crossUserMatches = sqlContent.match(/auth\.uid\(\)\s+IS DISTINCT FROM\s+p_user_id/g);
    expect(crossUserMatches).not.toBeNull();
    expect(crossUserMatches.length).toBeGreaterThanOrEqual(2);
  });

  it('4. Verifies cross-user ID ownership validation exists in both functions', () => {
    expect(sqlContent).toContain('Transaction ID is already owned by another user');
    expect(sqlContent).toContain('Obligation or promise ID is already owned by another user');
    expect(sqlContent).toContain('WHERE public.wealth_bills.user_id = p_user_id');
    expect(sqlContent).toContain('WHERE public.money_expenses.user_id = p_user_id');
  });

  it('5. Verifies repayment retry idempotency key support and deduplication check', () => {
    expect(sqlContent).toContain('p_repayment_id UUID DEFAULT NULL');
    expect(sqlContent).toContain('Idempotency key belongs to another user');
    expect(sqlContent).toContain('Idempotency key reused for a different bill');
    expect(sqlContent).toContain('Idempotency key reused with a different repayment amount');
    expect(sqlContent).toContain("'idempotent_replay', true");
  });

  it('6. Verifies legacy loan reconciliation creates parent money_promises on the fly', () => {
    expect(sqlContent).toContain('IF v_promise IS NULL OR v_promise.id IS NULL THEN');
    expect(sqlContent).toContain('INSERT INTO public.money_promises');
    expect(sqlContent).toContain('RETURNING * INTO v_promise');
  });

  it('7. Verifies constraint adjustment is safe on fresh, existing, and repeated executions', () => {
    expect(sqlContent).toContain("IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_wealth_bills_amount') THEN");
    expect(sqlContent).toContain('ALTER TABLE public.wealth_bills DROP CONSTRAINT chk_wealth_bills_amount;');
    expect(sqlContent).toContain("IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_wealth_bills_amount') THEN");
    expect(sqlContent).toContain('ALTER TABLE public.wealth_bills ADD CONSTRAINT chk_wealth_bills_amount CHECK (amount >= 0);');
  });

  it('8. Verifies settled loan protection and repayment preservation when modifying principal', () => {
    expect(sqlContent).toContain('Cannot modify an obligation that is already fully settled');
    expect(sqlContent).toContain('New loan principal (%) must be greater than already repaid amount (%)');
  });
});

/**
 * Functional Behavioral Simulation of the PL/pgSQL Migration Logic
 * Models in-memory state of Postgres tables and constraints.
 */
describe('Task 4D: PL/pgSQL Function Behavioral Logic Simulation', () => {
  let db;

  const resetDb = () => {
    db = {
      money_expenses: [],
      wealth_income: [],
      wealth_bills: [],
      money_promises: [],
      money_promise_repayments: [],
    };
  };

  beforeEach(() => {
    resetDb();
  });

  const simulateRecordLoanAtomic = ({
    callerAuth = { uid: null, role: 'anon' },
    p_user_id,
    p_type,
    p_amount,
    p_person = '',
    p_note = '',
    p_date = '2026-10-14',
    p_due_date = '2026-10-14',
    p_tx_id = null,
    p_bill_id = null,
  }) => {
    if (callerAuth.role !== 'service_role') {
      if (!callerAuth.uid) {
        throw new Error('Authentication required: caller identity is missing');
      }
      if (callerAuth.uid !== p_user_id) {
        throw new Error('Unauthorized: Caller user does not match target user ID');
      }
    }

    if (!p_user_id) throw new Error('User ID is required');
    if (!p_amount || p_amount <= 0) throw new Error('Loan amount must be strictly greater than 0');

    const v_type = (p_type || '').trim().toUpperCase();
    if (v_type !== 'LEND' && v_type !== 'BORROW') {
      throw new Error('Invalid loan type. Must be LEND or BORROW');
    }

    // Cross-user ownership check
    if (p_tx_id) {
      const expOther = db.money_expenses.find(e => e.id === p_tx_id && e.user_id !== p_user_id);
      const incOther = db.wealth_income.find(i => i.id === p_tx_id && i.user_id !== p_user_id);
      if (expOther || incOther) {
        throw new Error('Transaction ID is already owned by another user');
      }
    }

    let existingBill = null;
    let v_total_repaid = 0;
    let v_remaining_to_set = p_amount;

    if (p_bill_id) {
      const billOther = db.wealth_bills.find(b => b.id === p_bill_id && b.user_id !== p_user_id);
      const promOther = db.money_promises.find(p => p.id === p_bill_id && p.user_id !== p_user_id);
      if (billOther || promOther) {
        throw new Error('Obligation or promise ID is already owned by another user');
      }

      existingBill = db.wealth_bills.find(b => b.id === p_bill_id && b.user_id === p_user_id);
      if (existingBill) {
        if (existingBill.status === 'paid') {
          throw new Error('Cannot modify an obligation that is already fully settled');
        }

        const repayments = db.money_promise_repayments.filter(r => r.promise_id === p_bill_id && r.user_id === p_user_id);
        v_total_repaid = repayments.reduce((s, r) => s + r.amount, 0);
        if (v_total_repaid > 0) {
          if (p_amount <= v_total_repaid) {
            throw new Error(`New loan principal (${p_amount}) must be greater than already repaid amount (${v_total_repaid})`);
          }
          v_remaining_to_set = Math.round((p_amount - v_total_repaid) * 100) / 100;
        }
      }
    }

    const v_tx_id = p_tx_id || `tx-${Date.now()}-${Math.random()}`;
    const v_bill_id = p_bill_id || `bill-${Date.now()}-${Math.random()}`;
    const v_person = (p_person || '').trim();
    const v_note = (p_note || '').trim();

    if (v_type === 'LEND') {
      const v_promise_name = v_person ? `${v_person} owes you` : 'Money owed to you';
      const expIdx = db.money_expenses.findIndex(e => e.id === v_tx_id);
      const expRow = {
        id: v_tx_id,
        user_id: p_user_id,
        amount: p_amount,
        category: 'Lend',
        note: v_note || (v_person ? `Lent to ${v_person}` : 'Loan'),
        expense_date: p_date,
      };
      if (expIdx >= 0) db.money_expenses[expIdx] = expRow;
      else db.money_expenses.push(expRow);

      const billIdx = db.wealth_bills.findIndex(b => b.id === v_bill_id);
      const billRow = {
        id: v_bill_id,
        user_id: p_user_id,
        name: v_promise_name,
        amount: v_remaining_to_set,
        due_date: p_due_date,
        frequency: 'one_off',
        status: 'receivable',
      };
      if (billIdx >= 0) db.wealth_bills[billIdx] = billRow;
      else db.wealth_bills.push(billRow);

      const promIdx = db.money_promises.findIndex(p => p.id === v_bill_id);
      const promRow = {
        id: v_bill_id,
        user_id: p_user_id,
        person: v_person || 'Contact',
        amount: v_remaining_to_set,
        type: 'lent',
        due_date: p_due_date,
        status: 'outstanding',
        note: v_note,
      };
      if (promIdx >= 0) db.money_promises[promIdx] = promRow;
      else db.money_promises.push(promRow);

      return {
        success: true,
        type: 'LEND',
        expense_id: v_tx_id,
        bill_id: v_bill_id,
        amount: v_remaining_to_set,
        initial_amount: p_amount,
      };
    } else {
      // BORROW
      const v_promise_name = v_person ? `Return to ${v_person}` : 'Repay debt';
      const incIdx = db.wealth_income.findIndex(i => i.id === v_tx_id);
      const incRow = {
        id: v_tx_id,
        user_id: p_user_id,
        amount: p_amount,
        source: 'Borrow',
        note: v_note || (v_person ? `Borrowed from ${v_person}` : 'Liability'),
        income_date: p_date,
      };
      if (incIdx >= 0) db.wealth_income[incIdx] = incRow;
      else db.wealth_income.push(incRow);

      const billIdx = db.wealth_bills.findIndex(b => b.id === v_bill_id);
      const billRow = {
        id: v_bill_id,
        user_id: p_user_id,
        name: v_promise_name,
        amount: v_remaining_to_set,
        due_date: p_due_date,
        frequency: 'one_off',
        status: 'unpaid',
      };
      if (billIdx >= 0) db.wealth_bills[billIdx] = billRow;
      else db.wealth_bills.push(billRow);

      const promIdx = db.money_promises.findIndex(p => p.id === v_bill_id);
      const promRow = {
        id: v_bill_id,
        user_id: p_user_id,
        person: v_person || 'Contact',
        amount: v_remaining_to_set,
        type: 'borrowed',
        due_date: p_due_date,
        status: 'outstanding',
        note: v_note,
      };
      if (promIdx >= 0) db.money_promises[promIdx] = promRow;
      else db.money_promises.push(promRow);

      return {
        success: true,
        type: 'BORROW',
        income_id: v_tx_id,
        bill_id: v_bill_id,
        amount: v_remaining_to_set,
        initial_amount: p_amount,
      };
    }
  };

  const simulateResolveLoanRepaymentAtomic = ({
    callerAuth = { uid: null, role: 'anon' },
    p_user_id,
    p_bill_id,
    p_amount,
    p_person = '',
    p_note = '',
    p_date = '2026-10-14',
    p_repayment_id = null,
  }) => {
    if (callerAuth.role !== 'service_role') {
      if (!callerAuth.uid) {
        throw new Error('Authentication required: caller identity is missing');
      }
      if (callerAuth.uid !== p_user_id) {
        throw new Error('Unauthorized: Caller user does not match target user ID');
      }
    }

    if (!p_user_id) throw new Error('User ID is required');
    if (!p_bill_id) throw new Error('Obligation/Bill ID is required');
    if (!p_amount || p_amount <= 0) throw new Error('Repayment amount must be strictly greater than 0');

    // 1. Idempotency / Deduplication check
    if (p_repayment_id) {
      const existingRep = db.money_promise_repayments.find(r => r.id === p_repayment_id);
      if (existingRep) {
        if (existingRep.user_id !== p_user_id) {
          throw new Error('Idempotency key belongs to another user');
        }
        if (existingRep.promise_id !== p_bill_id) {
          throw new Error('Idempotency key reused for a different bill');
        }
        if (existingRep.amount !== p_amount) {
          throw new Error('Idempotency key reused with a different repayment amount');
        }

        const bill = db.wealth_bills.find(b => b.id === p_bill_id && b.user_id === p_user_id);
        return {
          success: true,
          bill_id: p_bill_id,
          repaid_amount: existingRep.amount,
          remaining_balance: bill.amount,
          status: bill.status,
          is_full_repayment: bill.status === 'paid',
          cash_tx_id: p_repayment_id,
          idempotent_replay: true,
        };
      }

      const stolenIncome = db.wealth_income.find(i => i.id === p_repayment_id && i.user_id !== p_user_id);
      const stolenExpense = db.money_expenses.find(e => e.id === p_repayment_id && e.user_id !== p_user_id);
      if (stolenIncome || stolenExpense) {
        throw new Error('Transaction ID is already owned by another user');
      }
    }

    const bill = db.wealth_bills.find(b => b.id === p_bill_id && b.user_id === p_user_id);
    if (!bill) throw new Error('Obligation not found for the given user');
    if (bill.status === 'paid') throw new Error('Obligation is already fully settled');

    let promise = db.money_promises.find(p => p.id === p_bill_id && p.user_id === p_user_id);
    let v_is_loan = false;
    let v_is_receivable = false;

    if (promise) {
      v_is_loan = true;
      if (['lent', 'lend'].includes(promise.type.toLowerCase())) {
        v_is_receivable = true;
      } else if (['borrowed', 'borrow'].includes(promise.type.toLowerCase())) {
        v_is_receivable = false;
      } else {
        v_is_receivable = bill.status === 'receivable' || (bill.name || '').toLowerCase().includes('owes you');
      }
    } else {
      if (bill.status === 'receivable' || (bill.name || '').toLowerCase().includes('owes you')) {
        v_is_loan = true;
        v_is_receivable = true;
      } else if (
        (bill.name || '').toLowerCase().startsWith('return to ') ||
        (bill.name || '').toLowerCase().startsWith('borrowed from ') ||
        (bill.name || '').toLowerCase().startsWith('repay debt')
      ) {
        v_is_loan = true;
        v_is_receivable = false;
      } else {
        v_is_loan = false;
      }
    }

    if (!v_is_loan) {
      throw new Error('Target obligation is an ordinary bill, not a loan or debt commitment');
    }

    if (p_amount > bill.amount) {
      throw new Error(`Repayment amount (${p_amount}) exceeds outstanding balance (${bill.amount})`);
    }

    const v_remaining = Math.round((bill.amount - p_amount) * 100) / 100;
    const v_is_full_repayment = v_remaining <= 0;
    const v_new_status = v_is_full_repayment ? 'paid' : bill.status;
    const v_rep_id = p_repayment_id || `rep-${Date.now()}-${Math.random()}`;
    const v_cash_id = v_rep_id;
    const v_contact = (p_person || bill.name || '').trim();

    // Reconcile legacy loan: create parent promise if missing
    if (!promise) {
      promise = {
        id: p_bill_id,
        user_id: p_user_id,
        person: v_contact,
        amount: bill.amount,
        type: v_is_receivable ? 'lent' : 'borrowed',
        due_date: bill.due_date,
        status: 'outstanding',
        note: bill.name,
      };
      db.money_promises.push(promise);
    }

    // Update wealth_bills
    bill.amount = v_is_full_repayment ? 0 : v_remaining;
    bill.status = v_new_status;

    // Synchronize money_promises
    promise.amount = v_is_full_repayment ? 0 : v_remaining;
    promise.status = v_is_full_repayment ? 'paid' : 'outstanding';

    // Record cash transaction
    if (v_is_receivable) {
      db.wealth_income.push({
        id: v_cash_id,
        user_id: p_user_id,
        amount: p_amount,
        source: 'Loan Repayment',
        note: p_note || `Repaid by ${v_contact}`,
        income_date: p_date,
      });
    } else {
      db.money_expenses.push({
        id: v_cash_id,
        user_id: p_user_id,
        amount: p_amount,
        category: 'Debt Repayment',
        note: p_note || `Repaid to ${v_contact}`,
        expense_date: p_date,
      });
    }

    // Record installment in money_promise_repayments
    db.money_promise_repayments.push({
      id: v_rep_id,
      user_id: p_user_id,
      promise_id: p_bill_id,
      amount: p_amount,
      repayment_date: p_date,
      note: p_note || `Repayment of ${p_amount}`,
    });

    return {
      success: true,
      bill_id: p_bill_id,
      repaid_amount: p_amount,
      remaining_balance: v_is_full_repayment ? 0 : v_remaining,
      status: v_new_status,
      is_full_repayment: v_is_full_repayment,
      cash_tx_id: v_cash_id,
      idempotent_replay: false,
    };
  };

  // ── TEST: Cross-User ID Overwrite Prevention ─────────────────────────────
  it('TEST A: Rejects attempt to overwrite another user\'s transaction or bill ID', () => {
    // Setup victim's records
    db.wealth_bills.push({
      id: 'victim-bill-1',
      user_id: 'victim-user',
      name: 'Victim Loan',
      amount: 10000,
      status: 'receivable',
    });
    db.money_expenses.push({
      id: 'victim-tx-1',
      user_id: 'victim-user',
      amount: 10000,
    });

    // Attacker tries to hijack victim's bill ID
    expect(() => {
      simulateRecordLoanAtomic({
        callerAuth: { uid: 'attacker-user', role: 'authenticated' },
        p_user_id: 'attacker-user',
        p_type: 'LEND',
        p_amount: 500,
        p_bill_id: 'victim-bill-1',
      });
    }).toThrow('Obligation or promise ID is already owned by another user');

    // Attacker tries to hijack victim's tx ID
    expect(() => {
      simulateRecordLoanAtomic({
        callerAuth: { uid: 'attacker-user', role: 'authenticated' },
        p_user_id: 'attacker-user',
        p_type: 'LEND',
        p_amount: 500,
        p_tx_id: 'victim-tx-1',
      });
    }).toThrow('Transaction ID is already owned by another user');

    // Victim's records remain uncorrupted
    expect(db.wealth_bills.find(b => b.id === 'victim-bill-1').amount).toBe(10000);
    expect(db.wealth_bills.find(b => b.id === 'victim-bill-1').user_id).toBe('victim-user');
  });

  // ── TEST: Same-User Idempotent Retries ───────────────────────────────────
  it('TEST B: Repeated repayment with same idempotency key returns cached outcome without duplicate deduction', () => {
    const loan = simulateRecordLoanAtomic({
      callerAuth: { uid: 'u-1', role: 'authenticated' },
      p_user_id: 'u-1',
      p_type: 'LEND',
      p_amount: 5000,
      p_person: 'Deepak',
    });

    const key = 'rep-key-stable-123';

    // First attempt
    const res1 = simulateResolveLoanRepaymentAtomic({
      callerAuth: { uid: 'u-1', role: 'authenticated' },
      p_user_id: 'u-1',
      p_bill_id: loan.bill_id,
      p_amount: 1500,
      p_repayment_id: key,
    });

    expect(res1.success).toBe(true);
    expect(res1.remaining_balance).toBe(3500);
    expect(res1.idempotent_replay).toBe(false);
    expect(db.money_promise_repayments).toHaveLength(1);
    expect(db.wealth_income).toHaveLength(1);

    // Network retry with same key and parameters
    const res2 = simulateResolveLoanRepaymentAtomic({
      callerAuth: { uid: 'u-1', role: 'authenticated' },
      p_user_id: 'u-1',
      p_bill_id: loan.bill_id,
      p_amount: 1500,
      p_repayment_id: key,
    });

    expect(res2.success).toBe(true);
    expect(res2.remaining_balance).toBe(3500); // Balance remains 3500, NOT double-deducted to 2000!
    expect(res2.idempotent_replay).toBe(true);
    // No duplicate database entries
    expect(db.money_promise_repayments).toHaveLength(1);
    expect(db.wealth_income).toHaveLength(1);
  });

  // ── TEST: Idempotency Key Reuse Conflict ────────────────────────────────
  it('TEST C: Rejects reuse of an idempotency key with a different bill, user, or amount', () => {
    const loan1 = simulateRecordLoanAtomic({
      callerAuth: { uid: 'u-1', role: 'authenticated' },
      p_user_id: 'u-1',
      p_type: 'LEND',
      p_amount: 4000,
      p_person: 'Arjun',
    });
    const loan2 = simulateRecordLoanAtomic({
      callerAuth: { uid: 'u-1', role: 'authenticated' },
      p_user_id: 'u-1',
      p_type: 'LEND',
      p_amount: 4000,
      p_person: 'Varun',
    });

    const key = 'idemp-key-conflict';

    // Successful first repayment
    simulateResolveLoanRepaymentAtomic({
      callerAuth: { uid: 'u-1', role: 'authenticated' },
      p_user_id: 'u-1',
      p_bill_id: loan1.bill_id,
      p_amount: 1000,
      p_repayment_id: key,
    });

    // Reusing key for a different bill
    expect(() => {
      simulateResolveLoanRepaymentAtomic({
        callerAuth: { uid: 'u-1', role: 'authenticated' },
        p_user_id: 'u-1',
        p_bill_id: loan2.bill_id,
        p_amount: 1000,
        p_repayment_id: key,
      });
    }).toThrow('Idempotency key reused for a different bill');

    // Reusing key for a different amount on same bill
    expect(() => {
      simulateResolveLoanRepaymentAtomic({
        callerAuth: { uid: 'u-1', role: 'authenticated' },
        p_user_id: 'u-1',
        p_bill_id: loan1.bill_id,
        p_amount: 2000,
        p_repayment_id: key,
      });
    }).toThrow('Idempotency key reused with a different repayment amount');

    // Reusing key for a different user
    expect(() => {
      simulateResolveLoanRepaymentAtomic({
        callerAuth: { uid: 'u-other', role: 'authenticated' },
        p_user_id: 'u-other',
        p_bill_id: loan1.bill_id,
        p_amount: 1000,
        p_repayment_id: key,
      });
    }).toThrow('Idempotency key belongs to another user');
  });

  // ── TEST: Legacy Loan Reconciliation ────────────────────────────────────
  it('TEST D: Reconciles legacy loan bills by backfilling parent promise and recording history', () => {
    const legacyBillId = 'legacy-bill-without-promise';
    db.wealth_bills.push({
      id: legacyBillId,
      user_id: 'u-1',
      name: 'Karan owes you',
      amount: 3000,
      due_date: '2026-10-14',
      status: 'receivable',
    });

    // Promise table initially empty for this bill
    expect(db.money_promises.find(p => p.id === legacyBillId)).toBeUndefined();

    // Partial repayment of legacy bill
    const res = simulateResolveLoanRepaymentAtomic({
      callerAuth: { uid: 'u-1', role: 'authenticated' },
      p_user_id: 'u-1',
      p_bill_id: legacyBillId,
      p_amount: 1000,
      p_person: 'Karan',
    });

    expect(res.success).toBe(true);
    expect(res.remaining_balance).toBe(2000);

    // Parent promise was backfilled on the fly
    const promise = db.money_promises.find(p => p.id === legacyBillId);
    expect(promise).toBeDefined();
    expect(promise.type).toBe('lent');
    expect(promise.amount).toBe(2000);
    expect(promise.status).toBe('outstanding');

    // History record was properly inserted
    expect(db.money_promise_repayments).toHaveLength(1);
    expect(db.money_promise_repayments[0].promise_id).toBe(legacyBillId);
    expect(db.money_promise_repayments[0].amount).toBe(1000);
  });

  // ── TEST: Settled Loan Protection & Principal Modification ──────────────
  it('TEST E: Prevents reopening settled loans and preserves prior repayments when updating principal', () => {
    // 1. Cannot reopen settled loan
    const loan = simulateRecordLoanAtomic({
      callerAuth: { uid: 'u-1', role: 'authenticated' },
      p_user_id: 'u-1',
      p_type: 'LEND',
      p_amount: 1000,
      p_person: 'Sunil',
    });

    simulateResolveLoanRepaymentAtomic({
      callerAuth: { uid: 'u-1', role: 'authenticated' },
      p_user_id: 'u-1',
      p_bill_id: loan.bill_id,
      p_amount: 1000,
    });

    expect(() => {
      simulateRecordLoanAtomic({
        callerAuth: { uid: 'u-1', role: 'authenticated' },
        p_user_id: 'u-1',
        p_type: 'LEND',
        p_amount: 1000,
        p_bill_id: loan.bill_id,
      });
    }).toThrow('Cannot modify an obligation that is already fully settled');

    // 2. Preserves prior repayments when updating initial loan amount
    const partialLoan = simulateRecordLoanAtomic({
      callerAuth: { uid: 'u-1', role: 'authenticated' },
      p_user_id: 'u-1',
      p_type: 'LEND',
      p_amount: 5000,
      p_person: 'Naveen',
    });

    simulateResolveLoanRepaymentAtomic({
      callerAuth: { uid: 'u-1', role: 'authenticated' },
      p_user_id: 'u-1',
      p_bill_id: partialLoan.bill_id,
      p_amount: 2000,
    });

    // Bill now has 3000 remaining, with 2000 in repayments
    // User updates total principal from 5000 to 6000
    const updateRes = simulateRecordLoanAtomic({
      callerAuth: { uid: 'u-1', role: 'authenticated' },
      p_user_id: 'u-1',
      p_type: 'LEND',
      p_amount: 6000,
      p_bill_id: partialLoan.bill_id,
    });

    // Net remaining balance should be 6000 - 2000 = 4000 (NOT blindly reset to 6000)
    expect(updateRes.amount).toBe(4000);
    const bill = db.wealth_bills.find(b => b.id === partialLoan.bill_id);
    expect(bill.amount).toBe(4000);
    expect(bill.status).toBe('receivable');
  });
});

/**
 * WealthService.js Integration & RPC Contract Tests
 * Uses mocked Supabase responses to verify client signature mapping and fallback behavior.
 */
describe('Task 4D: WealthService RPC Compatibility and Graceful Fallback', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('1. wealthService.recordMoneyEvent passes stable IDs and mapped parameters', async () => {
    const rpcSpy = vi.spyOn(supabase, 'rpc').mockResolvedValueOnce({
      data: {
        success: true,
        type: 'LEND',
        expense_id: 'exp-stable-1',
        bill_id: 'bill-stable-1',
        amount: 2500,
      },
      error: null,
    });

    const res = await wealthService.recordMoneyEvent({
      userId: 'user-xyz',
      type: 'LEND',
      amount: 2500,
      person: 'Gaurav',
      note: 'Advance',
      date: '2026-10-14',
    });

    expect(res.success).toBe(true);
    expect(res.data.expenseId).toBe('exp-stable-1');
    expect(res.data.billId).toBe('bill-stable-1');
    expect(rpcSpy).toHaveBeenCalledWith('record_loan_atomic', expect.objectContaining({
      p_user_id: 'user-xyz',
      p_type: 'LEND',
      p_amount: 2500,
      p_person: 'Gaurav',
      p_tx_id: expect.any(String),
      p_bill_id: expect.any(String),
    }));
  });

  it('2. wealthService.resolveMoneyPromise passes stable p_repayment_id and formats idempotent return', async () => {
    const rpcSpy = vi.spyOn(supabase, 'rpc').mockResolvedValueOnce({
      data: {
        success: true,
        bill_id: 'bill-777',
        repaid_amount: 400,
        remaining_balance: 600,
        status: 'receivable',
        is_full_repayment: false,
        cash_tx_id: 'rep-stable-key',
        idempotent_replay: true,
      },
      error: null,
    });

    const res = await wealthService.resolveMoneyPromise({
      userId: 'user-abc',
      billId: 'bill-777',
      amount: 400,
      person: 'Neha',
      note: 'Part 1',
      repaymentId: 'rep-stable-key',
    });

    expect(res.success).toBe(true);
    expect(res.data.billId).toBe('bill-777');
    expect(res.data.remainingBalance).toBe(600);
    expect(res.data.idempotentReplay).toBe(true);
    expect(rpcSpy).toHaveBeenCalledWith('resolve_loan_repayment_atomic', expect.objectContaining({
      p_user_id: 'user-abc',
      p_bill_id: 'bill-777',
      p_amount: 400,
      p_person: 'Neha',
      p_repayment_id: 'rep-stable-key',
    }));
  });

  it('3. When RPC returns PGRST202 (unapplied migration), wealthService gracefully falls back without crashing', async () => {
    vi.spyOn(supabase, 'rpc').mockResolvedValueOnce({
      data: null,
      error: { code: 'PGRST202', message: 'Could not find the function public.resolve_loan_repayment_atomic in schema cache' },
    });

    vi.spyOn(supabase, 'from').mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: { id: 'bill-legacy', user_id: 'u-1', amount: 1000, status: 'receivable', name: 'Alok owes you' },
              error: null,
            }),
          }),
        }),
      }),
      update: () => ({
        eq: () => ({
          eq: () => ({
            select: () => ({
              maybeSingle: async () => ({
                data: { id: 'bill-legacy', amount: 500, status: 'receivable' },
                error: null,
              }),
            }),
          }),
        }),
      }),
      insert: () => ({
        select: () => ({
          maybeSingle: async () => ({
            data: { id: 'inc-1', amount: 500 },
            error: null,
          }),
        }),
      }),
    }));

    const res = await wealthService.resolveMoneyPromise({
      userId: 'u-1',
      billId: 'bill-legacy',
      amount: 500,
    });

    expect(res.success).toBe(true);
    expect(res.data.remainingBalance).toBe(500);
  });

  it('4. When RPC returns a business validation error, wealthService bubbles it without attempting fallback', async () => {
    vi.spyOn(supabase, 'rpc').mockResolvedValueOnce({
      data: null,
      error: { code: 'P0001', message: 'Target obligation is an ordinary bill, not a loan or debt commitment' },
    });

    const fromSpy = vi.spyOn(supabase, 'from');

    const res = await wealthService.resolveMoneyPromise({
      userId: 'u-1',
      billId: 'bill-wifi',
      amount: 500,
    });

    expect(res.success).toBe(false);
    expect(res.error).toBe('Target obligation is an ordinary bill, not a loan or debt commitment');
    expect(fromSpy).not.toHaveBeenCalled();
  });
});
