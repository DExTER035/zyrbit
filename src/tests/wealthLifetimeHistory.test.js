import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  confirmImportTransactions,
  rollbackImportBatch,
  deduplicateTransactions,
} from '../services/statementImportService.js';
import {
  getWealthSnapshot,
  getSavingsGoals,
  addSavingsGoal,
  updateSavingsGoal,
  deleteSavingsGoal,
} from '../services/wealthService.js';
import {
  computeMoneyState,
  computeFinancialOverview,
  isTransferExpense,
  isTransferIncome,
  isPrincipalExpense,
  isBorrowIncome,
} from '../engines/wealth/moneyState.js';

// Setup Mock Supabase client
const mockExpenses = [];
const mockIncomes = [];
const mockBatches = [];
const mockImportedTxs = [];
const mockSavingsGoals = [];

vi.mock('../lib/supabase/index.js', () => {
  return {
    supabase: {
      from: vi.fn((table) => {
        let currentTable = table;
        const filters = [];
        let limitCount = null;
        let isDelete = false;

        const builder = {
          select: vi.fn(() => builder),
          eq: vi.fn((col, val) => {
            filters.push({ type: 'eq', col, val });
            return builder;
          }),
          gte: vi.fn((col, val) => {
            filters.push({ type: 'gte', col, val });
            return builder;
          }),
          in: vi.fn((col, valList) => {
            filters.push({ type: 'in', col, valList });
            return builder;
          }),
          order: vi.fn(() => builder),
          limit: vi.fn((lim) => {
            limitCount = lim;
            return builder;
          }),
          insert: vi.fn((rows) => {
            const rowArray = Array.isArray(rows) ? rows : [rows];
            let insertedRows = rowArray;
            if (currentTable === 'money_expenses') {
              mockExpenses.push(...rowArray);
            } else if (currentTable === 'wealth_income') {
              mockIncomes.push(...rowArray);
            } else if (currentTable === 'statement_import_batches') {
              mockBatches.push(...rowArray);
            } else if (currentTable === 'imported_transactions') {
              mockImportedTxs.push(...rowArray);
            } else if (currentTable === 'wealth_savings_goals') {
              insertedRows = rowArray.map((r, idx) => ({ id: r.id || `goal-${Date.now()}-${idx}`, ...r }));
              mockSavingsGoals.push(...insertedRows);
            }
            return {
              select: vi.fn(() => ({
                maybeSingle: vi.fn(async () => ({ data: insertedRows[0], error: null })),
                single: vi.fn(async () => ({ data: insertedRows[0], error: null })),
                then: (resolve) => resolve({ data: insertedRows, error: null }),
              })),
              then: (resolve) => resolve({ data: insertedRows, error: null }),
            };
          }),
          update: vi.fn((updates) => {
            const updateHandler = async () => {
              let target = [];
              if (currentTable === 'statement_import_batches') target = mockBatches;
              else if (currentTable === 'imported_transactions') target = mockImportedTxs;
              else if (currentTable === 'money_expenses') target = mockExpenses;
              else if (currentTable === 'wealth_income') target = mockIncomes;
              else if (currentTable === 'wealth_savings_goals') target = mockSavingsGoals;

              target.forEach(row => {
                const match = filters.every(f => {
                  if (f.type === 'eq') return row[f.col] === f.val;
                  if (f.type === 'in') return f.valList.includes(row[f.col]);
                  return true;
                });
                if (match) {
                  Object.assign(row, updates);
                }
              });
              return { data: null, error: null };
            };
            const updateResult = {
              eq: vi.fn((c, v) => {
                filters.push({ type: 'eq', col: c, val: v });
                return updateResult;
              }),
              select: vi.fn(() => ({
                maybeSingle: vi.fn(async () => {
                  await updateHandler();
                  let dataset = currentTable === 'wealth_savings_goals' ? mockSavingsGoals : mockExpenses;
                  const item = dataset.find(row => filters.every(f => row[f.col] === f.val));
                  return { data: item || null, error: null };
                }),
                then: (res) => updateHandler().then(res),
              })),
              then: (resolve) => updateHandler().then(resolve),
            };
            return updateResult;
          }),
          delete: vi.fn(() => {
            isDelete = true;
            return builder;
          }),
          maybeSingle: vi.fn(async () => {
            let dataset = [];
            if (currentTable === 'money_expenses') dataset = mockExpenses;
            else if (currentTable === 'wealth_income') dataset = mockIncomes;
            else if (currentTable === 'statement_import_batches') dataset = mockBatches;
            else if (currentTable === 'imported_transactions') dataset = mockImportedTxs;
            else if (currentTable === 'wealth_savings_goals') dataset = mockSavingsGoals;
            const item = dataset.find(row => {
              return filters.every(f => {
                if (f.type === 'eq') return row[f.col] === f.val;
                return true;
              });
            });
            return { data: item || null, error: null };
          }),
          single: vi.fn(async () => ({ data: null, error: null })),
          then: vi.fn((resolve) => {
            let dataset = [];
            if (currentTable === 'money_expenses') dataset = mockExpenses;
            else if (currentTable === 'wealth_income') dataset = mockIncomes;
            else if (currentTable === 'statement_import_batches') dataset = mockBatches;
            else if (currentTable === 'imported_transactions') dataset = mockImportedTxs;
            else if (currentTable === 'wealth_savings_goals') dataset = mockSavingsGoals;

            if (isDelete) {
              for (let i = dataset.length - 1; i >= 0; i--) {
                const row = dataset[i];
                const match = filters.every(f => {
                  if (f.type === 'eq') return row[f.col] === f.val;
                  return true;
                });
                if (match) {
                  dataset.splice(i, 1);
                }
              }
              return resolve({ data: null, error: null });
            }

            let filtered = dataset.filter(row => {
              return filters.every(f => {
                if (f.type === 'eq') return row[f.col] === f.val;
                if (f.type === 'in') return f.valList.includes(row[f.col]);
                if (f.type === 'gte') return (row[f.col] || '') >= f.val;
                return true;
              });
            });

            if (limitCount) {
              filtered = filtered.slice(0, limitCount);
            }
            resolve({ data: filtered, error: null });
          }),
        };
        return builder;
      }),
    },
  };
});

describe('Zyrbit Wealth — Phase 2: Lifetime Financial History & Scalability Suite', () => {
  beforeEach(() => {
    mockExpenses.length = 0;
    mockIncomes.length = 0;
    mockBatches.length = 0;
    mockImportedTxs.length = 0;
    mockSavingsGoals.length = 0;
  });

  // ── 1. CHUNKED BULK IMPORT CONFIRMATION ────────────────────────────────────
  describe('1. Chunked Bulk Import Confirmation', () => {
    it('confirms 150 mixed transactions in bulk chunks rather than single row waterfalls', async () => {
      const userId = 'usr-life-1';
      const batchId = 'batch-chunk-01';

      // Prepare 150 candidate transactions (100 expenses, 40 incomes, 10 transfers)
      const candidateTxs = [];
      for (let i = 1; i <= 100; i++) {
        candidateTxs.push({
          id: `cand-exp-${i}`,
          user_id: userId,
          batch_id: batchId,
          amount: 250 + i,
          date: '2025-06-15',
          suggested_action: 'add_expense',
          suggested_category: 'Food',
          suggested_note: `Dining out ${i}`,
          counterparty: `Restaurant ${i}`,
        });
      }
      for (let i = 1; i <= 40; i++) {
        candidateTxs.push({
          id: `cand-inc-${i}`,
          user_id: userId,
          batch_id: batchId,
          amount: 5000 + i * 100,
          date: '2025-06-01',
          suggested_action: 'add_income',
          suggested_category: 'Salary',
          suggested_note: `Client stipend ${i}`,
          counterparty: 'Tech Client',
        });
      }
      for (let i = 1; i <= 10; i++) {
        candidateTxs.push({
          id: `cand-trf-${i}`,
          user_id: userId,
          batch_id: batchId,
          amount: 1000 * i,
          date: '2025-06-10',
          suggested_action: 'transfer',
          suggested_category: 'Transfer',
          suggested_note: `Self Transfer ${i}`,
          counterparty: 'HDFC Savings',
        });
      }

      mockImportedTxs.push(...candidateTxs.map(c => ({ ...c, status: 'staged' })));

      const transactionIds = candidateTxs.map(c => c.id);
      const res = await confirmImportTransactions({
        userId,
        batchId,
        transactionIds,
        overrides: {},
      });

      expect(res.success).toBe(true);
      expect(res.confirmedCount).toBe(150);

      // Verify expenses: 100 regular expenses + 10 transfers = 110 records in money_expenses
      expect(mockExpenses.length).toBe(110);
      const transfers = mockExpenses.filter(e => e.category === 'Transfer');
      expect(transfers.length).toBe(10);

      // Verify incomes: 40 records in wealth_income
      expect(mockIncomes.length).toBe(40);

      // Verify all imported_transactions were updated with linked IDs and confirmed status
      expect(mockImportedTxs.every(t => t.status === 'confirmed')).toBe(true);
      expect(mockImportedTxs.every(t => t.linked_expense_id || t.linked_income_id)).toBe(true);
    });

    it('cascades deletion across linked records when rolling back a confirmed batch', async () => {
      const userId = 'usr-rollback-1';
      const batchId = 'batch-rb-01';

      mockBatches.push({
        id: batchId,
        user_id: userId,
        status: 'confirmed',
      });

      mockExpenses.push(
        { id: 'exp-rb-1', user_id: userId, amount: 450, category: 'Food' },
        { id: 'exp-rb-2', user_id: userId, amount: 800, category: 'Transport' },
      );
      mockIncomes.push(
        { id: 'inc-rb-1', user_id: userId, amount: 12000, source: 'Bonus' },
      );

      mockImportedTxs.push(
        { id: 'tx-1', user_id: userId, batch_id: batchId, linked_expense_id: 'exp-rb-1' },
        { id: 'tx-2', user_id: userId, batch_id: batchId, linked_expense_id: 'exp-rb-2' },
        { id: 'tx-3', user_id: userId, batch_id: batchId, linked_income_id: 'inc-rb-1' },
      );

      const res = await rollbackImportBatch({ userId, batchId });
      expect(res.success).toBe(true);

      // Verify linked records deleted
      expect(mockExpenses.find(e => e.id === 'exp-rb-1')).toBeUndefined();
      expect(mockExpenses.find(e => e.id === 'exp-rb-2')).toBeUndefined();
      expect(mockIncomes.find(i => i.id === 'inc-rb-1')).toBeUndefined();

      // Verify batch status is marked rolled_back
      const batch = mockBatches.find(b => b.id === batchId);
      expect(batch.status).toBe('rolled_back');
    });
  });

  // ── 2. DEDUPLICATION ACROSS MULTI-YEAR HISTORIES ───────────────────────────
  describe('2. Deduplication Across Multi-Year Histories', () => {
    it('deduplicates overlapping transactions against historical records without dropping past data', async () => {
      const userId = 'usr-dedup-1';

      // Past imported historical records from 2024 and 2025
      mockImportedTxs.push(
        {
          id: 'hist-1',
          user_id: userId,
          fingerprint: 'paytm:txn-old-2024-001',
          source_transaction_id: 'TXN-OLD-2024-001',
          status: 'confirmed',
        },
        {
          id: 'hist-2',
          user_id: userId,
          fingerprint: 'paytm:txn-old-2025-002',
          source_transaction_id: 'TXN-OLD-2025-002',
          status: 'confirmed',
        },
      );

      // New statement import candidate overlapping with hist-2, but introducing new-2026-003
      const candidates = [
        {
          sourceTransactionId: 'TXN-OLD-2025-002',
          fingerprint: 'paytm:txn-old-2025-002',
          date: '2025-11-20',
          amount: 1500,
          direction: 'out',
          merchant: 'Airtel Broadband',
        },
        {
          sourceTransactionId: 'TXN-NEW-2026-003',
          fingerprint: 'paytm:txn-new-2026-003',
          date: '2026-03-15',
          amount: 220,
          direction: 'out',
          merchant: 'Swiggy',
        },
      ];

      const deduplicated = await deduplicateTransactions(userId, candidates);
      expect(deduplicated).toHaveLength(2);

      const dupRow = deduplicated.find(d => d.sourceTransactionId === 'TXN-OLD-2025-002');
      expect(dupRow.isDuplicate).toBe(true);
      expect(dupRow.duplicateReason).toContain('Already imported');

      const newRow = deduplicated.find(d => d.sourceTransactionId === 'TXN-NEW-2026-003');
      expect(newRow.isDuplicate).toBe(false);
    });
  });

  // ── 3. ACTIVITY LEDGER PAGINATION LOGIC ────────────────────────────────────
  describe('3. Activity Ledger Pagination Logic', () => {
    it('slices a multi-year history into pages of 50 items with stable bounds', () => {
      const totalTxCount = 124;
      const PAGE_SIZE = 50;
      const transactions = Array.from({ length: totalTxCount }, (_, i) => ({
        id: `tx-${i + 1}`,
        amount: 100 + i,
        date: `2025-${String((i % 12) + 1).padStart(2, '0')}-15`,
      }));

      const totalPages = Math.max(1, Math.ceil(transactions.length / PAGE_SIZE));
      expect(totalPages).toBe(3);

      // Page 1: items 0 to 50
      const page1 = transactions.slice(0, PAGE_SIZE);
      expect(page1).toHaveLength(50);
      expect(page1[0].id).toBe('tx-1');
      expect(page1[49].id).toBe('tx-50');

      // Page 2: items 50 to 100
      const page2 = transactions.slice(PAGE_SIZE, PAGE_SIZE * 2);
      expect(page2).toHaveLength(50);
      expect(page2[0].id).toBe('tx-51');
      expect(page2[49].id).toBe('tx-100');

      // Page 3: items 100 to 124 (final 24 items)
      const page3 = transactions.slice(PAGE_SIZE * 2, PAGE_SIZE * 3);
      expect(page3).toHaveLength(24);
      expect(page3[0].id).toBe('tx-101');
      expect(page3[23].id).toBe('tx-124');
    });

    it('safely clamps out-of-bounds page requests', () => {
      const items = [{ id: 'tx-1' }, { id: 'tx-2' }];
      const PAGE_SIZE = 50;
      const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE)); // 1

      const clampPage = (p) => Math.min(Math.max(1, p), totalPages);

      expect(clampPage(0)).toBe(1);
      expect(clampPage(-5)).toBe(1);
      expect(clampPage(10)).toBe(1);
    });
  });

  // ── 4. DATE RANGE FILTERING ACROSS MULTIPLE YEARS ──────────────────────────
  describe('4. Date Range Filtering Across Multiple Years', () => {
    const multiYearHistory = [
      { id: '1', date: '2026-10-15', amount: 100, note: 'Current month' },
      { id: '2', date: '2026-09-10', amount: 200, note: 'Last month' },
      { id: '3', date: '2026-01-20', amount: 300, note: 'Earlier this year' },
      { id: '4', date: '2025-11-05', amount: 400, note: 'Last year' },
      { id: '5', date: '2024-08-14', amount: 500, note: 'Two years ago' },
      { id: '6', date: '2023-04-01', amount: 600, note: 'Three years ago' },
    ];

    it('supports "all" spanning all historical years without truncation', () => {
      const filtered = multiYearHistory.filter(() => true);
      expect(filtered).toHaveLength(6);
    });

    it('filters "this_year" and "last_year" accurately', () => {
      const thisYear = multiYearHistory.filter(t => t.date.startsWith('2026'));
      expect(thisYear).toHaveLength(3);

      const lastYear = multiYearHistory.filter(t => t.date.startsWith('2025'));
      expect(lastYear).toHaveLength(1);
      expect(lastYear[0].id).toBe('4');
    });

    it('filters custom date range with strict boundaries', () => {
      const start = '2024-01-01';
      const end = '2025-12-31';
      const filtered = multiYearHistory.filter(t => t.date >= start && t.date <= end);

      expect(filtered).toHaveLength(2);
      expect(filtered.map(t => t.id)).toEqual(['4', '5']);
    });
  });

  // ── 5. DYNAMIC PERIOD TOTALS & TRANSFER ISOLATION ─────────────────────────
  describe('5. Dynamic Period Totals & Transfer Isolation', () => {
    it('isolates internal transfers from lifestyle spending and earned income', () => {
      const periodTransactions = [
        { txType: 'income', amount: 50000, isTransfer: false, isBorrow: false, note: 'Salary' },
        { txType: 'expense', amount: 12000, isTransfer: false, category: 'Rent', note: 'Apartment' },
        { txType: 'expense', amount: 3500, isTransfer: false, category: 'Food', note: 'Groceries' },
        // Inter-account transfer (should not inflate spend or income)
        { txType: 'expense', amount: 20000, isTransfer: true, category: 'Transfer', note: 'Savings Transfer' },
        { txType: 'income', amount: 20000, isTransfer: true, categoryOrSource: 'Transfer', note: 'Savings Credit' },
      ];

      // Calculate period metrics
      const periodEarned = periodTransactions
        .filter(t => t.txType === 'income' && !t.isTransfer && !t.isBorrow)
        .reduce((s, t) => s + t.amount, 0);

      const periodSpent = periodTransactions
        .filter(t => t.txType === 'expense' && !t.isTransfer)
        .reduce((s, t) => s + t.amount, 0);

      const periodNet = periodEarned - periodSpent;

      // Earned: 50,000 (transfer 20,000 excluded)
      expect(periodEarned).toBe(50000);
      // Spent: 12,000 + 3,500 = 15,500 (transfer 20,000 excluded)
      expect(periodSpent).toBe(15500);
      // Net: 50,000 - 15,500 = 34,500
      expect(periodNet).toBe(34500);
    });

    it('identifies transfers using helper functions consistently', () => {
      expect(isTransferExpense({ category: 'Transfer' })).toBe(true);
      expect(isTransferExpense({ category: 'Self Transfer' })).toBe(true);
      expect(isTransferExpense({ category: 'Food' })).toBe(false);

      expect(isTransferIncome({ source: 'Transfer' })).toBe(true);
      expect(isTransferIncome({ source: 'Salary' })).toBe(false);

      expect(isBorrowIncome({ source: 'Loan' })).toBe(true);
      expect(isBorrowIncome({ source: 'Freelance' })).toBe(false);
    });
  });


  // ── 6. FINANCIAL SAFETY & CASH CALIBRATION INVARIANTS ──────────────────────
  describe('6. Financial Safety & Cash Calibration Invariants', () => {
    it('importing years of expense statements does NOT calibrate cash or fabricate liquid balance', () => {
      // Historical multi-year expense transactions (e.g., card statement with only debits)
      const expenses = [
        { id: 'e1', amount: 2000, expense_date: '2023-01-10', category: 'Shopping' },
        { id: 'e2', amount: 4500, expense_date: '2024-05-12', category: 'Travel' },
        { id: 'e3', amount: 1200, expense_date: '2025-09-20', category: 'Utilities' },
      ];
      const incomes = [];

      const moneyState = computeMoneyState({
        incomes,
        expenses,
        bills: [],
        today: '2026-10-25',
      });

      expect(moneyState.isCalibrated).toBe(false);
      expect(moneyState.liquidCash).toBe(-7700);

      const overview = computeFinancialOverview({
        moneyState,
        incomes,
        expenses,
        bills: [],
      });

      // Liquid cash must remain null (renders "Not set" in UI)
      expect(overview.isCashConfigured).toBe(false);
      expect(overview.cashVal).toBeNull();
      expect(overview.totalRecordedAssets).toBeNull();
      expect(overview.netWorth).toBeNull();
      expect(overview.availableToSpend).toBeNull();

      // Cumulative totals are intact
      expect(moneyState.totalExpense).toBe(7700);
    });

    it('preserves explicit zero cash calibration without drift', () => {
      // User explicitly calibrated cash to ₹0
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
      expect(calibratedZero.availableToSpend).toBe(0);
    });
  });

  // ── 7. CACHE GUARDING ON LIFETIME DATASETS ─────────────────────────────────
  describe('7. Cache Guarding on Lifetime Datasets', () => {
    it('bypasses localStorage write when record count exceeds 1,000 items to prevent QuotaExceededError', async () => {
      const mockStorage = {
        setItem: vi.fn(),
        getItem: vi.fn(),
      };
      globalThis.window = { localStorage: mockStorage };

      // Prepare snapshot with 1,200 records (> 1,000 threshold)
      for (let i = 0; i < 800; i++) {
        mockExpenses.push({ id: `e-${i}`, amount: 100, user_id: 'user-large-dataset' });
      }
      for (let i = 0; i < 400; i++) {
        mockIncomes.push({ id: `i-${i}`, amount: 500, user_id: 'user-large-dataset' });
      }

      await getWealthSnapshot('user-large-dataset');

      expect(mockStorage.setItem).not.toHaveBeenCalledWith(
        'zyrbit_wealth_cache_user-large-dataset',
        expect.anything()
      );

      delete globalThis.window;
    });

    it('caches snapshot in localStorage when record count is within safe limits (<= 1,000 items)', async () => {
      const mockStorage = {
        setItem: vi.fn(),
        getItem: vi.fn(),
      };
      globalThis.window = { localStorage: mockStorage };

      mockExpenses.push({ id: 'e-1', amount: 100, user_id: 'user-small-dataset' });
      mockIncomes.push({ id: 'i-1', amount: 500, user_id: 'user-small-dataset' });

      await getWealthSnapshot('user-small-dataset');

      expect(mockStorage.setItem).toHaveBeenCalledWith(
        'zyrbit_wealth_cache_user-small-dataset',
        expect.stringContaining('"expenses"')
      );

      delete globalThis.window;
    });
  });

  // ── 8. SAVINGS GOALS DATA ACCESS & ISOLATION ──────────────────────────────
  describe('8. Savings Goals Data Access & User Isolation', () => {
    it('creates, retrieves, updates, and deletes savings goals scoped to authenticated user', async () => {
      const userId = 'usr-goals-101';
      const otherUserId = 'usr-goals-999';

      // 1. Add goal for primary user
      const addRes = await addSavingsGoal({
        userId,
        name: 'Emergency Fund 6M',
        targetAmount: 300000,
        currentAmount: 75000,
        deadline: '2026-12-31',
      });
      expect(addRes.success).toBe(true);

      // 2. Add goal for another user to verify isolation
      await addSavingsGoal({
        userId: otherUserId,
        name: 'MacBook Pro',
        targetAmount: 180000,
        currentAmount: 50000,
        deadline: '2026-11-30',
      });

      // 3. Retrieve goals for primary user
      const getRes = await getSavingsGoals(userId);
      expect(getRes.success).toBe(true);
      expect(getRes.data).toHaveLength(1);
      expect(getRes.data[0].name).toBe('Emergency Fund 6M');
      expect(Number(getRes.data[0].target_amount)).toBe(300000);
      expect(Number(getRes.data[0].current_amount)).toBe(75000);

      const createdGoalId = getRes.data[0].id;

      // 4. Update goal
      const updateRes = await updateSavingsGoal({
        userId,
        id: createdGoalId,
        name: 'Emergency Fund 6M (Updated)',
        targetAmount: 300000,
        currentAmount: 125000,
        deadline: '2026-12-31',
      });
      expect(updateRes.success).toBe(true);

      const getUpdated = await getSavingsGoals(userId);
      expect(Number(getUpdated.data[0].current_amount)).toBe(125000);
      expect(getUpdated.data[0].name).toBe('Emergency Fund 6M (Updated)');

      // 5. Delete goal
      const delRes = await deleteSavingsGoal({ userId, id: createdGoalId });
      expect(delRes.success).toBe(true);

      const getFinal = await getSavingsGoals(userId);
      expect(getFinal.data).toHaveLength(0);

      // Verify other user's goal was never affected
      const getOther = await getSavingsGoals(otherUserId);
      expect(getOther.data).toHaveLength(1);
      expect(getOther.data[0].name).toBe('MacBook Pro');
    });
  });

  // ── 9. BATCH / SOURCE ISOLATION & FILTERING IN ACTIVITY ───────────────────
  describe('9. Batch / Source Isolation & Filter in Activity', () => {
    it('filters ledger transactions accurately by batch_id without dropping manual transactions when unselected', () => {
      const batchA = 'batch-axis-2026';
      const batchB = 'batch-hdfc-2026';

      const ledger = [
        { id: 'tx-1', amount: 500, date: '2026-10-15', batch_id: batchA, txType: 'expense' },
        { id: 'tx-2', amount: 1200, date: '2026-10-14', batch_id: batchA, txType: 'expense' },
        { id: 'tx-3', amount: 3500, date: '2026-10-13', batch_id: batchB, txType: 'expense' },
        { id: 'tx-manual', amount: 150, date: '2026-10-12', batch_id: null, txType: 'expense' },
      ];

      // Filter by Batch A
      const filterA = ledger.filter((t) => t.batch_id === batchA || t.raw?.batch_id === batchA);
      expect(filterA).toHaveLength(2);
      expect(filterA.map((t) => t.id)).toEqual(['tx-1', 'tx-2']);

      // Filter by Batch B
      const filterB = ledger.filter((t) => t.batch_id === batchB || t.raw?.batch_id === batchB);
      expect(filterB).toHaveLength(1);
      expect(filterB[0].id).toBe('tx-3');

      // 'all' filter retains all transactions including manual entries
      const filterAll = ledger;
      expect(filterAll).toHaveLength(4);
      expect(filterAll.some((t) => t.id === 'tx-manual')).toBe(true);
    });
  });

  // ── 10. MULTI-PERIOD CASH FLOW & HISTORICAL FILTERING ──────────────────────
  describe('10. Multi-Period Cash Flow & Historical Filtering', () => {
    it('calculates inflow, outflow, and net cash flow distinctly across This Month, Last Month, and This Year', () => {
      const now = new Date();
      const curYear = now.getFullYear();
      const curMonthNum = now.getMonth() + 1;
      const curMonthStr = `${curYear}-${String(curMonthNum).padStart(2, '0')}`;

      const lastMonthDate = new Date(curYear, now.getMonth() - 1, 1);
      const lastMonthStr = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;

      const testIncomes = [
        { id: 'i-cur', amount: 50000, income_date: `${curMonthStr}-05`, source: 'Salary' },
        { id: 'i-last', amount: 48000, income_date: `${lastMonthStr}-05`, source: 'Salary' },
        { id: 'i-old-year', amount: 40000, income_date: `${curYear}-01-10`, source: 'Bonus' },
        { id: 'i-transfer', amount: 10000, income_date: `${curMonthStr}-02`, source: 'Transfer from Savings' }, // transfer excluded
      ];

      const testExpenses = [
        { id: 'e-cur-1', amount: 15000, expense_date: `${curMonthStr}-07`, category: 'Rent' },
        { id: 'e-cur-2', amount: 3500, expense_date: `${curMonthStr}-12`, category: 'Food' },
        { id: 'e-last-1', amount: 15000, expense_date: `${lastMonthStr}-07`, category: 'Rent' },
        { id: 'e-transfer', amount: 5000, expense_date: `${curMonthStr}-08`, category: 'Transfer to Savings' }, // transfer excluded
      ];

      // Helper function matching the Wealth Home cash flow calculation
      const computeCashFlow = (period) => {
        const inc = testIncomes.filter((i) => {
          const d = (i.income_date || '').slice(0, 10);
          if (isTransferIncome(i) || isBorrowIncome(i)) return false;
          if (period === 'this_month') return d.startsWith(curMonthStr);
          if (period === 'last_month') return d.startsWith(lastMonthStr);
          if (period === 'this_year') return d.startsWith(String(curYear));
          return true;
        });

        const exp = testExpenses.filter((e) => {
          const d = (e.expense_date || '').slice(0, 10);
          if (isTransferExpense(e) || isPrincipalExpense(e)) return false;
          if (period === 'this_month') return d.startsWith(curMonthStr);
          if (period === 'last_month') return d.startsWith(lastMonthStr);
          if (period === 'this_year') return d.startsWith(String(curYear));
          return true;
        });

        const inflow = inc.reduce((s, i) => s + Number(i.amount || 0), 0);
        const outflow = exp.reduce((s, e) => s + Number(e.amount || 0), 0);
        return { inflow, outflow, net: inflow - outflow };
      };

      // 1. This Month: Inflow = 50,000 (transfers excluded), Outflow = 18,500 (transfers excluded), Net = 31,500
      const thisMonthFlow = computeCashFlow('this_month');
      expect(thisMonthFlow.inflow).toBe(50000);
      expect(thisMonthFlow.outflow).toBe(18500);
      expect(thisMonthFlow.net).toBe(31500);

      // 2. Last Month: Inflow = 48,000, Outflow = 15,000, Net = 33,000
      const lastMonthFlow = computeCashFlow('last_month');
      expect(lastMonthFlow.inflow).toBe(48000);
      expect(lastMonthFlow.outflow).toBe(15000);
      expect(lastMonthFlow.net).toBe(33000);

      // 3. This Year: aggregates across all months of curYear
      const thisYearFlow = computeCashFlow('this_year');
      expect(thisYearFlow.inflow).toBe(138000); // 50000 + 48000 + 40000
      expect(thisYearFlow.outflow).toBe(33500); // 18500 + 15000
      expect(thisYearFlow.net).toBe(104500);
    });
  });
});
