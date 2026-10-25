import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { computeMoneyState, computeFinancialOverview, computeCategorySpending } from '../engines/wealth/moneyState.js';
import { saveWealthSettings } from '../services/wealthService.js';
import TransactionFormModal from '../components/domain/wealth/TransactionFormModal.jsx';
import BillFormModal from '../components/domain/wealth/BillFormModal.jsx';
import SpendingPieChart from '../components/domain/wealth/SpendingPieChart.jsx';

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

  // ──────────────────────────────────────────────────────────────────────────
  // 5. WEALTH HOME AND ACTIVITY TAB SEPARATION
  // ──────────────────────────────────────────────────────────────────────────
  describe('5. Wealth Home and Activity Tab Separation', () => {
    it('Wealth Home renders the compact "View all activity →" link and does not render the full transaction list rows or filter pills', async () => {
      const Wealth = (await import('../pages/Wealth/index.jsx')).default;
      const html = renderToStaticMarkup(<Wealth />);

      // 1. Home must render the compact "View all activity →" link
      expect(html).toContain('View all activity →');
      expect(html).toContain('See all recorded transactions');

      // 2. Home must NOT render the old "Recent Transactions" header with filter pills or individual transaction rows
      expect(html).not.toContain('Recent Transactions');
      expect(html).not.toContain('>All Activity<'); // Filter pill belongs on Activity tab
    });

    it('Wealth Activity tab renders the full transaction ledger, search field, filter pills, and statement import', async () => {
      global.window = {
        location: {
          search: '?view=activity',
        },
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      };

      const Wealth = (await import('../pages/Wealth/index.jsx')).default;
      const html = renderToStaticMarkup(<Wealth />);

      delete global.window;

      // Activity tab heading and controls
      expect(html).toContain('Activity');
      expect(html).toContain('Unified transaction history &amp; statements');
      expect(html).toContain('Import Bank Statement');
      expect(html).toContain('All Activity');
      expect(html).toContain('Expenses');
      expect(html).toContain('Income');
      expect(html).toContain('placeholder="Search by note, category, or amount..."');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 6. STAGE 4: HOME FINANCIAL OVERVIEW & SPENDING PIE CHART
  // ──────────────────────────────────────────────────────────────────────────
  describe('6. Stage 4 Home Financial Overview and Spending Pie Chart', () => {
    it('computeFinancialOverview distinguishes uncalibrated state (null) from explicitly recorded 0', () => {
      // 1. Uncalibrated / no recorded data: must NOT fabricate ₹0
      const uncalibrated = computeFinancialOverview({
        moneyState: { isCalibrated: false },
        incomes: [],
        expenses: [],
        bills: [],
      });
      expect(uncalibrated.isCashConfigured).toBe(false);
      expect(uncalibrated.cashVal).toBeNull();
      expect(uncalibrated.totalRecordedAssets).toBeNull();
      expect(uncalibrated.netWorth).toBeNull();
      expect(uncalibrated.availableToSpend).toBeNull();

      // 2. Explicitly calibrated to ₹0: must reliably return 0
      const calibratedZero = computeFinancialOverview({
        moneyState: {
          isCalibrated: true,
          assets: { cash: 0, savings: 0, invested: 0, gold: 0, owedToYou: 0 },
          liabilities: { iOweTotal: 0 },
          unencumberedCash: 0,
        },
        incomes: [],
        expenses: [],
        bills: [],
      });
      expect(calibratedZero.isCashConfigured).toBe(true);
      expect(calibratedZero.cashVal).toBe(0);
      expect(calibratedZero.totalRecordedAssets).toBe(0);
      expect(calibratedZero.totalTrackedLiabilities).toBe(0);
      expect(calibratedZero.netWorth).toBe(0);
      expect(calibratedZero.availableToSpend).toBe(0);

      // 3. Supported holdings without double counting
      const withHoldings = computeFinancialOverview({
        moneyState: {
          isCalibrated: true,
          assets: { cash: 5000, savings: 20000, invested: 50000, gold: 10000, owedToYou: 3000 },
          liabilities: { iOweTotal: 8000, iOweCount: 1 },
          unencumberedCash: 4000,
        },
        incomes: [{ id: 'inc-1', amount: 35000, income_date: '2026-10-01' }],
        expenses: [{ id: 'exp-1', amount: 5000, expense_date: '2026-10-02' }],
        bills: [{ id: 'bill-1', amount: 8000, name: 'Return to Friend', status: 'unpaid' }],
      });
      expect(withHoldings.totalRecordedAssets).toBe(88000); // 5000 + 20000 + 50000 + 10000 + 3000
      expect(withHoldings.totalTrackedLiabilities).toBe(8000);
      expect(withHoldings.netWorth).toBe(80000); // 88000 - 8000
      expect(withHoldings.availableToSpend).toBe(4000);
    });

    it('computeFinancialOverview preserves uncalibrated state (null) when only expenses exist without income or calibration', () => {
      // Real engine moneyState with only expenses: liquidCash is negative, isCalibrated is false
      const moneyState = computeMoneyState({
        incomes: [],
        expenses: [
          { id: '1', amount: 200, category: 'Food', expense_date: '2026-10-20' },
          { id: '2', amount: 1000, category: 'Shopping', expense_date: '2026-10-21' },
        ],
        bills: [],
      });

      expect(moneyState.isCalibrated).toBe(false);
      expect(moneyState.liquidCash).toBe(-1200);

      const overview = computeFinancialOverview({
        moneyState,
        incomes: [],
        expenses: [
          { id: '1', amount: 200, category: 'Food', expense_date: '2026-10-20' },
          { id: '2', amount: 1000, category: 'Shopping', expense_date: '2026-10-21' },
        ],
        bills: [],
      });

      // Must NOT fabricate ₹0 cash, total recorded assets, net worth, or safe to spend!
      expect(overview.isCashConfigured).toBe(false);
      expect(overview.cashVal).toBeNull();
      expect(overview.totalRecordedAssets).toBeNull();
      expect(overview.netWorth).toBeNull();
      expect(overview.availableToSpend).toBeNull();
    });

    it('computeCategorySpending excludes transfers, debt repayments, and investments, and subtracts refunds', () => {
      const expenses = [
        { id: '1', amount: 1200, category: 'Food', expense_date: '2026-10-05' },
        { id: '2', amount: 800, category: 'Transport', expense_date: '2026-10-08' },
        // Internal transfer: must be excluded
        { id: '3', amount: 5000, category: 'Transfer', note: 'to savings', expense_date: '2026-10-10' },
        // Investment purchase: must be excluded from lifestyle spend
        { id: '4', amount: 10000, category: 'Investments', note: 'Nifty 50 SIP', expense_date: '2026-10-12' },
        // Debt repayment: must be excluded
        { id: '5', amount: 2000, category: 'Debt', note: 'loan repayment', expense_date: '2026-10-15' },
      ];

      const incomes = [
        // Refund: should offset lifestyle spending
        { id: 'inc-r', amount: 200, source: 'Refund', note: 'Amazon item return', income_date: '2026-10-14' },
        // Regular salary: should not offset spending
        { id: 'inc-s', amount: 50000, source: 'Salary', income_date: '2026-10-01' },
      ];

      const res = computeCategorySpending({ expenses, incomes, month: '2026-10' });

      expect(res.grossSpend).toBe(2000); // 1200 + 800
      expect(res.refundsTotal).toBe(200);
      expect(res.netSpend).toBe(1800); // 2000 - 200
      expect(res.hasExpenses).toBe(true);

      // Only Food and Transport should be in categories
      expect(res.categories).toHaveLength(2);
      expect(res.categories[0].category).toBe('Food');
      expect(res.categories[0].amount).toBe(1200);
      expect(res.categories[0].pct).toBe(60); // 1200 / 2000
      expect(res.categories[1].category).toBe('Transport');
      expect(res.categories[1].amount).toBe(800);
      expect(res.categories[1].pct).toBe(40); // 800 / 2000
    });

    it('SpendingPieChart component renders empty state when no expenses exist and populated state with SVG paths', () => {
      // 1. Empty state
      const emptyHtml = renderToStaticMarkup(
        <SpendingPieChart expenses={[]} incomes={[]} month="2026-10" />
      );
      expect(emptyHtml).toContain('No spending recorded this month');
      expect(emptyHtml).toContain('Where your money went');

      // 2. Populated state
      const populatedHtml = renderToStaticMarkup(
        <SpendingPieChart
          expenses={[
            { id: '1', amount: 3000, category: 'Food', expense_date: '2026-10-01' },
            { id: '2', amount: 1000, category: 'Shopping', expense_date: '2026-10-02' },
          ]}
          incomes={[]}
          month="2026-10"
        />
      );
      expect(populatedHtml).toContain('Where your money went');
      expect(populatedHtml).toContain('Food');
      expect(populatedHtml).toContain('Shopping');
      expect(populatedHtml).toContain('Total recorded spending');
      expect(populatedHtml).toContain('4,000'); // total spent
      expect(populatedHtml).toContain('<svg');
      expect(populatedHtml).toContain('<path');
    });

    it('Wealth Home dashboard integrates Financial Overview, Holdings Summary, and Spending Pie Chart', async () => {
      const Wealth = (await import('../pages/Wealth/index.jsx')).default;
      const html = renderToStaticMarkup(<Wealth />);

      // Hero Card: Total recorded assets, Net worth, Liabilities
      expect(html).toContain('Total recorded assets');
      expect(html).toContain('Net worth');
      expect(html).toContain('Liabilities');

      // Safe to Spend Card
      expect(html).toContain('Safe to Spend this month');

      // Side-by-side holdings: Cash & accounts, Investments
      expect(html).toContain('Cash &amp; accounts');
      expect(html).toContain('Investments');

      // Spending Donut Chart: Where your money went
      expect(html).toContain('Where your money went');

      // Upcoming commitments
      expect(html).toContain('Upcoming commitments');

      // Compact Activity link preserved
      expect(html).toContain('View all activity →');
    });

    it('Wealth Home renders "Not set" for Safe to Spend, Total Assets, Net Worth, and Cash when uncalibrated', async () => {
      const Wealth = (await import('../pages/Wealth/index.jsx')).default;
      const html = renderToStaticMarkup(<Wealth />);

      // In an uncalibrated financial state, cards must display "Not set", never fabricating ₹0
      expect(html).toContain('Total recorded assets');
      expect(html).toContain('Safe to Spend this month');
      expect(html).toContain('Not set');
      // Must not fabricate ₹ 0 for Safe to Spend when uncalibrated
      expect(html).not.toMatch(/Safe to Spend this month<\/div>\s*<div[^>]*>\s*₹\s*0\s*<\/div>/);
    });
  });
});

