import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { supabase } from '../lib/supabase/index.js';
import * as wealthService from '../services/wealthService.js';
import { computeMoneyState } from '../engines/wealth/moneyState.js';

describe('Zyrbit Wealth — 5-Step Live Persistence & Recalculation Flow', () => {
  let user = null;
  let testIncomeId = null;
  let testExpenseId = null;
  let testBillId = null;
  const today = new Date().toISOString().split('T')[0];

  beforeAll(async () => {
    const { data, error } = await supabase.auth.signInAnonymously();
    expect(error).toBeNull();
    user = data.user;
    expect(user?.id).toBeTruthy();
  }, 20000);

  afterAll(async () => {
    // Clean up any remaining test records created during this run
    if (user) {
      if (testIncomeId) await wealthService.deleteIncome({ userId: user.id, id: testIncomeId });
      if (testExpenseId) await wealthService.deleteExpense({ userId: user.id, id: testExpenseId });
      if (testBillId) await wealthService.deleteBill({ userId: user.id, id: testBillId });
    }
  });

  // ── TEST 1: Income and Expense Totals ──────────────────────────────────────
  it('Test 1: Income and expense totals (Add ₹10,000 income + ₹2,000 expense -> Liquid Cash ₹8,000, Spend ₹2,000)', async () => {
    const incRes = await wealthService.addIncome({
      userId: user.id,
      amount: 10000,
      source: 'Freelance Verification',
      date: today,
    });
    expect(incRes.success).toBe(true);
    testIncomeId = incRes.data.id;

    const expRes = await wealthService.addExpense({
      userId: user.id,
      amount: 2000,
      category: 'Food',
      note: 'Verification Meal',
      date: today,
    });
    expect(expRes.success).toBe(true);
    testExpenseId = expRes.data.id;

    // Fetch live snapshot from Supabase
    const snap = await wealthService.getWealthSnapshot(user.id);
    expect(snap.success).toBe(true);

    const state = computeMoneyState({
      incomes: snap.data.incomes,
      expenses: snap.data.expenses,
      bills: snap.data.bills,
      today,
    });

    expect(state.liquidCash).toBe(8000); // 10,000 - 2,000
    expect(state.monthSpend).toBe(2000);
    expect(state.totalIncome).toBe(10000);
    expect(state.totalExpense).toBe(2000);
  });

  // ── TEST 2: Recent Events ──────────────────────────────────────────────────
  it('Test 2: Recent Events (Both transactions appear from persisted records, no hardcoded examples)', async () => {
    const snap = await wealthService.getWealthSnapshot(user.id);
    expect(snap.success).toBe(true);

    const state = computeMoneyState({
      incomes: snap.data.incomes,
      expenses: snap.data.expenses,
      bills: snap.data.bills,
      today,
    });

    expect(state.unifiedRecent).toHaveLength(2);

    const creditItem = state.unifiedRecent.find((r) => r.isCredit);
    const debitItem = state.unifiedRecent.find((r) => !r.isCredit);

    expect(creditItem).toBeDefined();
    expect(creditItem.amount).toBe(10000);
    expect(creditItem.title).toBe('Freelance Verification');

    expect(debitItem).toBeDefined();
    expect(debitItem.amount).toBe(2000);
    expect(debitItem.title).toBe('Verification Meal');
  });

  // ── TEST 3: Bills and Available Cash ────────────────────────────────────────
  it('Test 3: Bills and available cash (Add unpaid ₹1,500 bill -> Committed ₹1,500, Free to Spend ₹6,500)', async () => {
    const billRes = await wealthService.addBill({
      userId: user.id,
      name: 'Internet Fiber',
      amount: 1500,
      dueDate: '2026-10-25',
      frequency: 'monthly',
      status: 'unpaid',
    });
    expect(billRes.success).toBe(true);
    testBillId = billRes.data.id;

    const snap = await wealthService.getWealthSnapshot(user.id);
    expect(snap.success).toBe(true);

    const state = computeMoneyState({
      incomes: snap.data.incomes,
      expenses: snap.data.expenses,
      bills: snap.data.bills,
      today,
    });

    expect(state.upcomingBillTotal).toBe(1500); // Committed
    expect(state.liquidCash).toBe(8000);
    expect(state.unencumberedCash).toBe(6500); // 8,000 - 1,500
  });

  // ── TEST 4: Persistence ────────────────────────────────────────────────────
  it('Test 4: Persistence (Fresh re-query confirms all 3 records and totals persist)', async () => {
    // Re-query directly from Supabase (simulating page hard refresh)
    const snap = await wealthService.getWealthSnapshot(user.id);
    expect(snap.success).toBe(true);

    expect(snap.data.incomes.some((i) => i.id === testIncomeId)).toBe(true);
    expect(snap.data.expenses.some((e) => e.id === testExpenseId)).toBe(true);
    expect(snap.data.bills.some((b) => b.id === testBillId)).toBe(true);

    const state = computeMoneyState({
      incomes: snap.data.incomes,
      expenses: snap.data.expenses,
      bills: snap.data.bills,
      today,
    });

    expect(state.liquidCash).toBe(8000);
    expect(state.upcomingBillTotal).toBe(1500);
    expect(state.unencumberedCash).toBe(6500);
    expect(state.monthSpend).toBe(2000);
  });

  // ── TEST 5: Deletion & Recalculation ────────────────────────────────────────
  it('Test 5: Deletion and recalculation (Delete only expense -> Liquid Cash ₹10,000, Free to Spend ₹8,500, income and bill intact)', async () => {
    const delRes = await wealthService.deleteExpense({
      userId: user.id,
      id: testExpenseId,
    });
    expect(delRes.success).toBe(true);
    testExpenseId = null; // Mark as deleted so afterAll does not re-delete

    const snap = await wealthService.getWealthSnapshot(user.id);
    expect(snap.success).toBe(true);

    // Verify expense is gone
    expect(snap.data.expenses.some((e) => e.id === testExpenseId)).toBe(false);

    // Verify income and bill remain intact
    expect(snap.data.incomes.some((i) => i.id === testIncomeId)).toBe(true);
    expect(snap.data.bills.some((b) => b.id === testBillId)).toBe(true);

    const state = computeMoneyState({
      incomes: snap.data.incomes,
      expenses: snap.data.expenses,
      bills: snap.data.bills,
      today,
    });

    expect(state.liquidCash).toBe(10000); // 10,000 - 0
    expect(state.upcomingBillTotal).toBe(1500);
    expect(state.unencumberedCash).toBe(8500); // 10,000 - 1,500
    expect(state.monthSpend).toBe(0);
  });
});
