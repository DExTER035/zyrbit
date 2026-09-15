/**
 * Zyrbit V1 — Wealth Financial Calculation Engine
 * Pure deterministic financial formulas for balances, burn rates, runway, and budget targets.
 */

/**
 * Computes total all-time income from array of income objects.
 */
export function computeTotalIncome(incomes = []) {
  return (incomes || []).reduce((sum, item) => {
    const amt = Number(item?.amount);
    return sum + (isFinite(amt) && amt > 0 ? amt : 0);
  }, 0);
}

/**
 * Computes total all-time expenses from array of expense objects.
 */
export function computeTotalExpense(expenses = []) {
  return (expenses || []).reduce((sum, item) => {
    const amt = Number(item?.amount);
    return sum + (isFinite(amt) && amt > 0 ? amt : 0);
  }, 0);
}

/**
 * Computes net liquid balance (Total Income - Total Expenses).
 */
export function computeNetBalance(incomes = [], expenses = []) {
  return computeTotalIncome(incomes) - computeTotalExpense(expenses);
}

/**
 * Computes expenses for a specific YYYY-MM month string.
 */
export function computeMonthExpenses(expenses = [], currentMonthYMD = '') {
  if (!currentMonthYMD) return 0;
  return (expenses || []).reduce((sum, item) => {
    if (item?.expense_date && item.expense_date.startsWith(currentMonthYMD)) {
      const amt = Number(item.amount);
      return sum + (isFinite(amt) && amt > 0 ? amt : 0);
    }
    return sum;
  }, 0);
}

/**
 * Computes 30-day burn rate and estimated runway days.
 */
export function computeBurnRateAndRunway(expenses = [], liquidCash = 0, thirtyDaysAgoYMD = '') {
  const burnLast30 = (expenses || []).reduce((sum, item) => {
    if (thirtyDaysAgoYMD && item?.expense_date && item.expense_date >= thirtyDaysAgoYMD) {
      const amt = Number(item.amount);
      return sum + (isFinite(amt) && amt > 0 ? amt : 0);
    }
    return sum;
  }, 0);

  const dailyBurnRate = burnLast30 > 0 ? burnLast30 / 30 : 0;
  const runwayDays = (liquidCash > 0 && dailyBurnRate > 0)
    ? Math.round(liquidCash / dailyBurnRate)
    : (liquidCash <= 0 ? 0 : 999);

  return {
    burnLast30,
    dailyBurnRate,
    runwayDays,
  };
}

/**
 * Computes monthly budget statistics.
 */
export function computeBudgetStats(settings = {}, monthTotal = 0) {
  const budget = Number(settings?.monthly_budget) || 15000;
  const remaining = budget - monthTotal;
  const budgetPct = Math.min(100, Math.round((monthTotal / budget) * 100));

  return {
    budget,
    monthTotal,
    remaining,
    budgetPct,
  };
}
