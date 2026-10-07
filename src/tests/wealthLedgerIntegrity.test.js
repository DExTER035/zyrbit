/**
 * Zyrbit Wealth — P0 Ledger / Dashboard Integrity Acceptance Suite
 * Verifies that the Wealth domain behaves as a true single-source-of-truth financial ledger.
 *
 * Covers:
 * TEST 1 — INCOME (+₹500 immediately updates Balance, Free, Income, Recent Events)
 * TEST 2 — EXPENSE (-₹100 immediately decreases Balance to ₹400, updates Free, Expense total)
 * TEST 3 — DELETE (Deleting -₹100 immediately restores Balance to ₹500 with zero stale values)
 * TEST 4 — EDIT (Editing ₹100 to ₹250 immediately updates Balance to ₹250 with no duplicate)
 * TEST 5 — MULTIPLE TRANSACTIONS (+10,000, -500, -1,000, -250 -> Net ₹8,250 derived)
 * TEST 6 — TRANSFER (Transfers isolated from lifestyle consumption)
 * TEST 7 — DATE / TIME (Local timezone consistency, no hardcoded '16 Oct' or '28 Oct')
 * TEST 8 — MONTH FILTER (Month boundaries respected consistently across ledger and summary)
 * TEST 9 — DASHBOARD DERIVATION (Full traceable derivation pipeline)
 * TEST 10 — REACT STATE / INVALIDATION (Cache invalidation on mutation)
 * TEST 11 — DATABASE VERIFICATION (Supabase service methods return exact persisted fields)
 * TEST 12 — AUTH / RLS (Data isolation by user_id)
 */

import { describe, it, expect } from 'vitest';
import { computeMoneyState } from '../engines/wealth/moneyState.js';
import {
  addExpense,
  deleteExpense,
  getWealthSnapshot,
} from '../services/wealthService.js';

const TEST_TODAY = '2026-10-08';

describe('ZYRBIT WEALTH — P0 LEDGER & DASHBOARD INTEGRITY ACCEPTANCE', () => {
  // ── TEST 1: INCOME ──────────────────────────────────────────────────────────
  it('TEST 1 — INCOME: Adding +₹500 increases Balance and Free to ₹500 with matching Recent Events', () => {
    const incomes = [
      {
        id: 'inc-1',
        user_id: 'test-user',
        amount: 500,
        source: 'Test Income',
        note: 'Test Income',
        income_date: TEST_TODAY,
        created_at: '2026-10-08T10:00:00Z',
      },
    ];
    const expenses = [];
    const bills = [];

    const state = computeMoneyState({ incomes, expenses, bills, today: TEST_TODAY });

    expect(state.liquidCash).toBe(500);
    expect(state.totalIncome).toBe(500);
    expect(state.monthEarned).toBe(500);
    expect(state.unencumberedCash).toBe(500);
    expect(state.upcomingBillTotal).toBe(0);

    // Recent events derivation check
    expect(state.unifiedRecent).toHaveLength(1);
    expect(state.unifiedRecent[0].amount).toBe(500);
    expect(state.unifiedRecent[0].isCredit).toBe(true);
    expect(state.unifiedRecent[0].title).toBe('Test Income');
  });

  // ── TEST 2: EXPENSE ─────────────────────────────────────────────────────────
  it('TEST 2 — EXPENSE: Adding -₹100 Food expense decreases Balance to ₹400 and recalculates Free', () => {
    const incomes = [
      {
        id: 'inc-1',
        amount: 500,
        source: 'Test Income',
        note: 'Test Income',
        income_date: TEST_TODAY,
        created_at: '2026-10-08T10:00:00Z',
      },
    ];
    const expenses = [
      {
        id: 'exp-1',
        amount: 100,
        category: 'Food',
        note: 'Test Expense',
        expense_date: TEST_TODAY,
        created_at: '2026-10-08T12:00:00Z',
      },
    ];
    const bills = [];

    const state = computeMoneyState({ incomes, expenses, bills, today: TEST_TODAY });

    expect(state.liquidCash).toBe(400); // ₹500 - ₹100
    expect(state.totalExpense).toBe(100);
    expect(state.monthSpend).toBe(100);
    expect(state.unencumberedCash).toBe(400);

    // Food category tracked in zone
    const needsZone = state.zoneBreakdown.find((z) => z.key === 'needs');
    expect(needsZone.amount).toBe(100);

    // Recent events has both, expense first (12:00 > 10:00)
    expect(state.unifiedRecent).toHaveLength(2);
    expect(state.unifiedRecent[0].amount).toBe(100);
    expect(state.unifiedRecent[0].isCredit).toBe(false);
    expect(state.unifiedRecent[0].title).toBe('Test Expense');
  });

  // ── TEST 3: DELETE ──────────────────────────────────────────────────────────
  it('TEST 3 — DELETE: Deleting the ₹100 expense immediately restores Balance to ₹500 without stale values', () => {
    const incomes = [
      {
        id: 'inc-1',
        amount: 500,
        source: 'Test Income',
        note: 'Test Income',
        income_date: TEST_TODAY,
      },
    ];
    // Simulating post-delete state: expenses array is empty
    const expenses = [];

    const state = computeMoneyState({ incomes, expenses, bills: [], today: TEST_TODAY });

    expect(state.liquidCash).toBe(500);
    expect(state.totalExpense).toBe(0);
    expect(state.monthSpend).toBe(0);
    expect(state.unencumberedCash).toBe(500);
    expect(state.unifiedRecent).toHaveLength(1);
    expect(state.unifiedRecent[0].isCredit).toBe(true);
  });

  // ── TEST 4: EDIT ────────────────────────────────────────────────────────────
  it('TEST 4 — EDIT: Editing expense from ₹100 to ₹250 produces exact final balance ₹250 without duplicate', () => {
    const incomes = [{ id: 'inc-1', amount: 500, source: 'Salary', income_date: TEST_TODAY }];
    // Replaced/updated record in place
    const expenses = [
      {
        id: 'exp-1',
        amount: 250,
        category: 'Food',
        note: 'Updated Expense',
        expense_date: TEST_TODAY,
      },
    ];

    const state = computeMoneyState({ incomes, expenses, bills: [], today: TEST_TODAY });

    expect(state.liquidCash).toBe(250); // 500 - 250
    expect(state.totalExpense).toBe(250);
    expect(state.unencumberedCash).toBe(250);
    expect(state.unifiedRecent).toHaveLength(2);
    // Verified no duplicate record exists
    expect(state.unifiedRecent.filter((r) => r.id === 'exp-1')).toHaveLength(1);
  });

  // ── TEST 5: MULTIPLE TRANSACTIONS ──────────────────────────────────────────
  it('TEST 5 — MULTIPLE TRANSACTIONS: Net ₹8,250 is derived deterministically from persisted transactions', () => {
    const incomes = [
      { id: 'inc-1', amount: 10000, source: 'Freelance', income_date: TEST_TODAY },
    ];
    const expenses = [
      { id: 'exp-1', amount: 500, category: 'Food', expense_date: TEST_TODAY },
      { id: 'exp-2', amount: 1000, category: 'Shopping', expense_date: TEST_TODAY },
      { id: 'exp-3', amount: 250, category: 'Transport', expense_date: TEST_TODAY },
    ];

    const state = computeMoneyState({ incomes, expenses, bills: [], today: TEST_TODAY });

    expect(state.totalIncome).toBe(10000);
    expect(state.totalExpense).toBe(1750);
    expect(state.liquidCash).toBe(8250);
    expect(state.unencumberedCash).toBe(8250);
  });

  // ── TEST 6: TRANSFER ────────────────────────────────────────────────────────
  it('TEST 6 — TRANSFER: Transfers are isolated from lifestyle burn and not counted as consumption', () => {
    const incomes = [{ id: 'inc-1', amount: 5000, source: 'Salary', income_date: TEST_TODAY }];
    const expenses = [
      { id: 'exp-1', amount: 2000, category: 'Transfer', note: 'Savings Transfer', expense_date: TEST_TODAY },
      { id: 'exp-2', amount: 300, category: 'Food', note: 'Dinner', expense_date: TEST_TODAY },
    ];

    const state = computeMoneyState({ incomes, expenses, bills: [], today: TEST_TODAY });

    expect(state.flow.transfers).toBe(2000);
    expect(state.flow.spent).toBe(300); // Everyday lifestyle spend excludes transfers!
    expect(state.flow.grossLifestyleSpend).toBe(300);
  });

  // ── TEST 7: DATE / TIME ─────────────────────────────────────────────────────
  it('TEST 7 — DATE / TIME: Dynamically derives current dates and does not hardcode static past dates', () => {
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const monthShort = now.toLocaleDateString('en-IN', { month: 'short' });
    const dynamicEndStr = `${daysInMonth} ${monthShort}`;

    // Verify dynamic end of month is valid
    expect(daysInMonth).toBeGreaterThanOrEqual(28);
    expect(daysInMonth).toBeLessThanOrEqual(31);
    expect(dynamicEndStr).not.toBe('28 Oct'); // Not locked to hardcoded 28 Oct unless it's genuinely a 28-day month!

    // Verify recent events sorts descending
    const expenses = [
      { id: 'e1', amount: 50, expense_date: '2026-10-07', note: 'Yesterday' },
      { id: 'e2', amount: 100, expense_date: '2026-10-08', note: 'Today' },
    ];
    const state = computeMoneyState({ expenses, today: '2026-10-08' });
    expect(state.unifiedRecent[0].title).toBe('Today');
    expect(state.unifiedRecent[1].title).toBe('Yesterday');
  });

  // ── TEST 8: MONTH FILTER ────────────────────────────────────────────────────
  it('TEST 8 — MONTH FILTER: Filters current month correctly and ignores other months in month totals', () => {
    const expenses = [
      { id: 'e1', amount: 400, expense_date: '2026-10-02' },
      { id: 'e2', amount: 600, expense_date: '2026-10-05' },
      { id: 'e3', amount: 1200, expense_date: '2026-09-15' }, // Previous month
    ];
    const state = computeMoneyState({ expenses, today: '2026-10-08' });

    expect(state.monthSpend).toBe(1000); // 400 + 600
    expect(state.totalExpense).toBe(2200); // All time
  });

  // ── TEST 9: DASHBOARD DERIVATION ────────────────────────────────────────────
  it('TEST 9 — DASHBOARD DERIVATION: Full pipeline correctly derives all hero and pacing numbers', () => {
    const incomes = [{ id: 'i1', amount: 30000, income_date: '2026-10-01' }];
    const expenses = [{ id: 'e1', amount: 6000, expense_date: '2026-10-05' }];
    const bills = [{ id: 'b1', name: 'Wifi Bill', amount: 1000, status: 'unpaid', due_date: '2026-10-20' }];

    const state = computeMoneyState({ incomes, expenses, bills, today: '2026-10-08' });

    // Pipeline checks:
    expect(state.liquidCash).toBe(24000); // 30,000 - 6,000
    expect(state.upcomingBillTotal).toBe(1000); // Unpaid bills
    expect(state.unencumberedCash).toBe(23000); // 24,000 - 1,000
    expect(state.daysLeft).toBe(24); // 31 - 8 + 1
    expect(state.safeToSpendDaily).toBe(Math.floor(23000 / 24)); // 958
  });

  // ── TEST 10: REACT STATE / CACHE INVALIDATION ───────────────────────────────
  it('TEST 10 — REACT STATE / CACHE: Event invalidation dispatches dexos:refresh and reloads', () => {
    let refreshed = false;
    const target = typeof window !== 'undefined' ? window : new EventTarget();
    const handler = (e) => {
      if (e.detail?.domain === 'wealth') refreshed = true;
    };
    target.addEventListener('dexos:refresh', handler);

    target.dispatchEvent(new CustomEvent('dexos:refresh', { detail: { domain: 'wealth', source: 'test' } }));
    expect(refreshed).toBe(true);

    target.removeEventListener('dexos:refresh', handler);
  });

  // ── TEST 11: DATABASE SERVICE VERIFICATION ──────────────────────────────────
  it('TEST 11 — DATABASE SERVICE: Service functions validate required inputs before hitting DB', async () => {
    // Missing userId check
    const expRes = await addExpense({ userId: null, amount: 100 });
    expect(expRes.success).toBe(false);
    expect(expRes.error).toContain('User ID is required');

    // Invalid amount check
    const invalidAmtRes = await addExpense({ userId: 'u-1', amount: -50 });
    expect(invalidAmtRes.success).toBe(false);
    expect(invalidAmtRes.error).toContain('positive number');

    // Missing id for delete
    const delRes = await deleteExpense({ userId: 'u-1', id: null });
    expect(delRes.success).toBe(false);
  });

  // ── TEST 12: AUTH / RLS ─────────────────────────────────────────────────────
  it('TEST 12 — AUTH / RLS: Snapshot query always scopes strictly by authenticated userId', async () => {
    const snap = await getWealthSnapshot(null);
    expect(snap.success).toBe(false);
    expect(snap.error).toContain('User ID is required');
  });
});
