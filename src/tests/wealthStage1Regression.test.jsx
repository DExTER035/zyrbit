import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { computeMoneyState } from '../engines/wealth/moneyState.js';
import { saveWealthSettings } from '../services/wealthService.js';
import TransactionFormModal from '../components/domain/wealth/TransactionFormModal.jsx';
import BillFormModal from '../components/domain/wealth/BillFormModal.jsx';

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: '/wealth', search: '' }),
  };
});

// Mock Supabase
vi.mock('../lib/supabase/index.js', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { id: 'test-wealth-stage1-user' } } },
      }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
    from: vi.fn(() => {
      const queryBuilder = {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        then: vi.fn((resolve) => resolve({ data: [], error: null })),
      };
      return queryBuilder;
    }),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
}));

describe('Zyrbit Wealth — Stage 1 Audit Regression Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 1. EXPLICIT ZERO BUDGET HANDLING
  // ──────────────────────────────────────────────────────────────────────────
  describe('1. Explicit Zero Budget Handling', () => {
    it('saveWealthSettings preserves explicit 0 monthlyBudget and does NOT replace it with 15000', async () => {
      const { supabase } = await import('../lib/supabase/index.js');
      let capturedPayload = null;

      supabase.from = vi.fn((tableName) => {
        if (tableName === 'wealth_settings') {
          return {
            upsert: vi.fn((payload) => {
              capturedPayload = payload;
              return {
                select: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: payload, error: null }),
                }),
              };
            }),
          };
        }
        return {};
      });

      const res = await saveWealthSettings({
        userId: 'user-zero-budget',
        monthlyBudget: 0,
        currency: 'INR',
      });

      expect(res.success).toBe(true);
      expect(capturedPayload).not.toBeNull();
      expect(capturedPayload.monthly_budget).toBe(0);
      expect(capturedPayload.monthly_budget).not.toBe(15000);
    });

    it('computeMoneyState correctly honors monthly_budget: 0 without falling back to null or 15000', () => {
      const stateWithZero = computeMoneyState({
        incomes: [{ amount: 20000, source: 'Salary', income_date: '2026-10-19' }],
        expenses: [{ amount: 500, category: 'Food', expense_date: '2026-10-19' }],
        settings: { monthly_budget: 0, currency: 'INR' },
        today: '2026-10-19',
      });

      // Explicit zero budget must be 0, not null and not 15000
      expect(stateWithZero.monthlyBudget).toBe(0);
      expect(stateWithZero.budgetRemaining).toBe(0);
      // Since budget is 0 and user spent 500, safe-to-spend is 0 and status is constrained
      expect(stateWithZero.safeToSpendDaily).toBe(0);
      expect(stateWithZero.safeToSpendStatus).toBe('constrained');
      expect(stateWithZero.safeToSpendHint).toBe('Monthly budget limit reached.');
      expect(stateWithZero.spendingPace.status).toBe('exceeded');
    });

    it('computeMoneyState preserves null for truly unset budget', () => {
      const stateUnset = computeMoneyState({
        incomes: [{ amount: 20000, source: 'Salary', income_date: '2026-10-19' }],
        expenses: [{ amount: 500, category: 'Food', expense_date: '2026-10-19' }],
        settings: { monthly_budget: null },
        today: '2026-10-19',
      });

      expect(stateUnset.monthlyBudget).toBeNull();
      expect(stateUnset.budgetRemaining).toBeNull();
      expect(stateUnset.budgetUsedPct).toBeNull();
      expect(stateUnset.spendingPace).toBeNull();
    });

    it('Wealth page renders "of ₹ 0 monthly budget" when budget is explicitly 0', async () => {
      const formatBudgetLabel = (monthlyBudget, settingsBudget, currencySymbol = '₹') => {
        const currentBudget = (monthlyBudget !== null && monthlyBudget !== undefined) 
          ? monthlyBudget 
          : (settingsBudget !== null && settingsBudget !== undefined && isFinite(Number(settingsBudget)) && Number(settingsBudget) >= 0)
            ? Number(settingsBudget)
            : null;

        return (currentBudget !== null && isFinite(currentBudget))
          ? `of ${currencySymbol} ${Number(currentBudget).toLocaleString()} monthly budget` 
          : 'Set monthly budget';
      };

      // Explicit zero budget formats as 'of ₹ 0 monthly budget'
      expect(formatBudgetLabel(0, 0, '₹')).toBe('of ₹ 0 monthly budget');
      expect(formatBudgetLabel(0, null, '₹')).toBe('of ₹ 0 monthly budget');
      expect(formatBudgetLabel(null, 0, '₹')).toBe('of ₹ 0 monthly budget');

      // Unset budget formats as 'Set monthly budget'
      expect(formatBudgetLabel(null, null, '₹')).toBe('Set monthly budget');
      expect(formatBudgetLabel(undefined, undefined, '₹')).toBe('Set monthly budget');

      // Non-zero budget formats normally
      expect(formatBudgetLabel(25000, 25000, '₹')).toBe('of ₹ 25,000 monthly budget');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 2. TOGGLE BILL STATUS RESULT & ERROR HANDLING
  // ──────────────────────────────────────────────────────────────────────────
  describe('2. toggleBillStatus Result & Error Checks', () => {
    it('wealthService.toggleBillStatus returns error when database update fails', async () => {
      const { toggleBillStatus } = await import('../services/wealthService.js');
      const { supabase } = await import('../lib/supabase/index.js');

      supabase.from = vi.fn(() => ({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Database transaction lock timeout' },
                }),
              }),
            }),
          }),
        }),
      }));

      const res = await toggleBillStatus({
        userId: 'test-user',
        billId: 'bill-123',
        status: 'paid',
      });

      expect(res.success).toBe(false);
      expect(res.error).toBe('Database transaction lock timeout');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 3. SETTLING "I OWE" LIABILITIES VIA SAFE REPAYMENT WORKFLOW
  // ──────────────────────────────────────────────────────────────────────────
  describe('3. "I Owe" Liability Settlement Workflow', () => {
    it('resolveMoneyPromise records cash outflow in money_expenses and updates bill status to paid', async () => {
      const { resolveMoneyPromise } = await import('../services/wealthService.js');
      const { supabase } = await import('../lib/supabase/index.js');

      let insertedExpense = null;
      let updatedBillStatus = null;

      // Mock RPC as missing so it exercises the atomic multi-step fallback
      supabase.rpc = vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST202', message: 'Function not found' },
      });

      supabase.from = vi.fn((tableName) => {
        if (tableName === 'wealth_bills') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: {
                      id: 'bill-owe-1',
                      user_id: 'user-debt-test',
                      name: 'Return to Alex',
                      amount: 1200,
                      status: 'unpaid',
                      due_date: '2026-10-25',
                    },
                    error: null,
                  }),
                }),
              }),
            }),
            update: vi.fn((updatePayload) => {
              updatedBillStatus = updatePayload;
              return {
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                      maybeSingle: vi.fn().mockResolvedValue({
                        data: { id: 'bill-owe-1', ...updatePayload },
                        error: null,
                      }),
                    }),
                  }),
                }),
              };
            }),
          };
        }

        if (tableName === 'money_expenses') {
          return {
            insert: vi.fn((rows) => {
              insertedExpense = rows[0];
              return {
                select: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: rows[0],
                    error: null,
                  }),
                }),
              };
            }),
          };
        }

        return {
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      });

      const res = await resolveMoneyPromise({
        userId: 'user-debt-test',
        billId: 'bill-owe-1',
        amount: 1200,
        person: 'Alex',
        date: '2026-10-19',
      });

      expect(res.success).toBe(true);
      expect(res.data.isFullRepayment).toBe(true);
      expect(res.data.status).toBe('paid');

      // Crucial requirement: A real cash outflow (expense) must be recorded for repaying borrowed debt
      expect(insertedExpense).not.toBeNull();
      expect(insertedExpense.category).toBe('Debt Repayment');
      expect(insertedExpense.amount).toBe(1200);
      expect(insertedExpense.note).toContain('Alex');

      // The obligation must be marked as paid
      expect(updatedBillStatus).not.toBeNull();
      expect(updatedBillStatus.status).toBe('paid');
      expect(updatedBillStatus.amount).toBe(0);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 4. TRANSACTION FORMS LOCAL DATE INTEGRITY
  // ──────────────────────────────────────────────────────────────────────────
  describe('4. Transaction and Bill Forms Local Date Integrity', () => {
    it('TransactionFormModal initializes with local YMD date rather than raw UTC date', () => {
      const getLocalYMD = () => {
        const d = new Date();
        const o = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
        return o.toISOString().split('T')[0];
      };

      const expectedLocalDate = getLocalYMD();

      const html = renderToStaticMarkup(
        <TransactionFormModal
          isOpen={true}
          type="expense"
          currencySymbol="₹"
          onClose={() => {}}
          onSave={() => {}}
        />
      );

      // Input type="date" should have value matching the local YMD string
      expect(html).toContain(`value="${expectedLocalDate}"`);
    });

    it('BillFormModal initializes with local YMD date rather than raw UTC date', () => {
      const getLocalYMD = () => {
        const d = new Date();
        const o = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
        return o.toISOString().split('T')[0];
      };

      const expectedLocalDate = getLocalYMD();

      const html = renderToStaticMarkup(
        <BillFormModal
          isOpen={true}
          currencySymbol="₹"
          onClose={() => {}}
          onSave={() => {}}
        />
      );

      // Due date input should have value matching the local YMD string
      expect(html).toContain(`value="${expectedLocalDate}"`);
    });
  });
});
