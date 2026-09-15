/**
 * Zyrbit V1 — Wealth Intelligence Engine (v2 Correctness Audit)
 * Pure deterministic Safe-to-Spend, Spending Pace, and Bill Obligation calculations.
 * Strict status-based bill tracking (zero heuristic string/amount matching false positives).
 */

import { computeNetBalance, computeMonthExpenses } from './wealthCalculator.js';

/**
 * Computes upcoming unpaid bill obligations.
 * Uses bill.status ('unpaid' vs 'paid') strictly to prevent false expense matches.
 * 
 * @param {Array} bills - Array of wealth_bills objects
 * @param {Array} expenses - Array of money_expenses objects (reserved for total burn/balance)
 * @param {string} currentMonthYMD - Current YYYY-MM string
 * @returns {Object} { upcomingBillTotal, unpaidBills, nextBill }
 */
export function computeUpcomingObligations(bills = []) {
  // Rely strictly on bill.status === 'unpaid' (or status !== 'paid')
  const unpaidBills = (bills || []).filter(b => {
    if (!b || !b.amount) return false;
    const isUnpaid = b.status !== 'paid';
    return isUnpaid;
  });

  const sortedBills = [...unpaidBills].sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
  const upcomingBillTotal = sortedBills.reduce((sum, b) => {
    const amt = Number(b.amount);
    return sum + (isFinite(amt) && amt > 0 ? amt : 0);
  }, 0);

  const nextBill = sortedBills.length > 0 ? sortedBills[0] : null;

  return {
    upcomingBillTotal,
    unpaidBills: sortedBills,
    nextBill,
  };
}

/**
 * Computes deterministic spending pace comparing time elapsed vs budget spent.
 * 
 * @param {Array} expenses - Array of money_expenses objects
 * @param {number} monthlyBudget - Target monthly budget
 * @param {string} currentMonthYMD - Current YYYY-MM string
 * @param {string} todayYMD - Current YYYY-MM-DD string
 * @returns {Object|null} { status, text, timePct, budgetPct }
 */
export function computeSpendingPace(expenses = [], monthlyBudget = 15000, currentMonthYMD = '', todayYMD = '') {
  const budget = Number(monthlyBudget);
  if (!isFinite(budget) || budget <= 0) return null;

  const now = todayYMD ? new Date(`${todayYMD}T00:00:00`) : new Date();
  const currentDay = now.getDate();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const daysInMonth = new Date(year, month, 0).getDate();

  const monthTotal = computeMonthExpenses(expenses, currentMonthYMD);

  const timePct = Math.round((currentDay / daysInMonth) * 100);
  const budgetPct = Math.min(100, Math.round((monthTotal / budget) * 100));

  if (monthTotal >= budget) {
    return {
      status: 'exceeded',
      text: 'Monthly budget reached.',
      timePct,
      budgetPct,
    };
  }

  if (budgetPct <= timePct + 5) {
    return {
      status: 'on_track',
      text: 'Spending pace is on track.',
      timePct,
      budgetPct,
    };
  }

  const diff = budgetPct - timePct;
  return {
    status: 'ahead',
    text: `Spending pace is ${diff}% ahead of schedule.`,
    timePct,
    budgetPct,
  };
}

/**
 * Computes deterministic Safe-to-Spend daily spending allowance.
 * 
 * @param {Array} incomes - Array of wealth_income objects
 * @param {Array} expenses - Array of money_expenses objects
 * @param {Array} bills - Array of wealth_bills objects
 * @param {Object} settings - User wealth settings
 * @param {string} todayYMD - Current YYYY-MM-DD string
 * @returns {Object} Safe-to-Spend output object
 */
export function computeSafeToSpend(incomes = [], expenses = [], bills = [], settings = {}, todayYMD = '') {
  const now = todayYMD ? new Date(`${todayYMD}T00:00:00`) : new Date();
  const currentDay = now.getDate();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const daysInMonth = new Date(year, month, 0).getDate();
  const daysLeftInMonth = Math.max(1, daysInMonth - currentDay + 1);

  const currentMonthYMD = todayYMD ? todayYMD.slice(0, 7) : new Date().toISOString().slice(0, 7);

  const liquidCash = computeNetBalance(incomes, expenses);
  const { upcomingBillTotal, nextBill } = computeUpcomingObligations(bills);

  const monthTotal = computeMonthExpenses(expenses, currentMonthYMD);
  const rawBudget = Number(settings?.monthly_budget);
  const budgetGoal = isFinite(rawBudget) && rawBudget > 0 ? rawBudget : 15000;
  const budgetRemaining = Math.max(0, budgetGoal - monthTotal);

  const uncommittedCash = Math.max(0, liquidCash - upcomingBillTotal);
  const effectiveLiquidity = Math.min(uncommittedCash, budgetRemaining);

  const safeToSpendDaily = Math.max(0, Math.floor(effectiveLiquidity / daysLeftInMonth));

  let status = 'active';
  let text = 'Safe to spend today';
  let hint = 'Based on your logged data.';

  if (liquidCash <= 0) {
    status = 'zero';
    text = 'Low cash balance';
    hint = 'Spending locked based on logged cash.';
  } else if (uncommittedCash <= 0 && upcomingBillTotal > 0) {
    status = 'constrained';
    text = 'Reserved for bills';
    hint = `${upcomingBillTotal.toLocaleString()} reserved for upcoming bills.`;
  } else if (budgetRemaining <= 0) {
    status = 'constrained';
    text = 'Budget limit hit';
    hint = 'Monthly budget cap reached.';
  }

  return {
    safeToSpendDaily,
    liquidCash,
    upcomingBillTotal,
    budgetRemaining,
    daysLeftInMonth,
    nextBill,
    status,
    text,
    hint,
    disclaimer: 'Based on your logged data.',
  };
}
