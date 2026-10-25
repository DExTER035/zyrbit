/**
 * Zyrbit V1 — Money State Engine (authoritative)
 * Single source of truth for all Wealth financial computations.
 * Replaces wealthCalculator.js + wealthIntelligence.js responsibilities.
 *
 * Rules:
 * - Pure deterministic logic. Zero side effects. Zero database access.
 * - Never fabricate values when data is insufficient — return null instead.
 * - No fake runway values (999, 9999, Infinity).
 * - All callers must provide raw data arrays. Engine does not fetch.
 */

// ─── Zone Configuration ────────────────────────────────────────────────────────

/**
 * Maps expense categories to the 4 Wealth spending zones.
 * Unmapped categories default to 'routine'.
 */
export const ZONE_MAP = {
  'Food':                  'needs',
  'Rent & Bills':          'needs',
  'Utilities':             'needs',
  'Health':                'needs',
  'Housing':               'needs',
  'Transport':             'routine',
  'Tools & Subscriptions': 'routine',
  'General':               'routine',
  'Other':                 'routine',
  'Leisure':               'joy',
  'Entertainment':         'joy',
  'Shopping':              'joy',
  'Education':             'growth',
  'Courses':               'growth',
  'Growth Investment':     'growth',
};

export const ZONES = [
  { key: 'needs',   label: 'Needs & Essentials', emoji: '🏠', color: '#EF4444' },
  { key: 'routine', label: 'Routine Living',      emoji: '⚡', color: '#F59E0B' },
  { key: 'joy',     label: 'Discretionary Joy',   emoji: '✨', color: '#8B7FFF' },
  { key: 'growth',  label: 'Growth Investment',   emoji: '📈', color: '#1FA36F' },
];

// ─── Internal Helpers ─────────────────────────────────────────────────────────

const localYMD = (dateObj = new Date()) => {
  const d = new Date(dateObj.getTime() - dateObj.getTimezoneOffset() * 60000);
  return d.toISOString().split('T')[0];
};

const toNum = (val) => {
  const n = Number(val);
  return isFinite(n) && n > 0 ? n : 0;
};

/**
 * Checks whether an expense is an internal transfer or savings allocation
 * rather than ordinary lifestyle consumption.
 */
export const isTransferExpense = (e) => {
  const cat = (e?.category || '').toLowerCase();
  const note = (e?.note || '').toLowerCase();
  return cat.includes('transfer') || cat.includes('saving') || note.includes('transfer to') || note.includes('to savings');
};

/**
 * Checks whether an expense is lending capital or debt repayment
 * rather than ordinary lifestyle consumption.
 */
export const isPrincipalExpense = (e) => {
  const cat = (e?.category || '').toLowerCase();
  const note = (e?.note || '').toLowerCase();
  return (
    cat.includes('lend') ||
    cat.includes('loan') ||
    cat.includes('debt') ||
    cat.includes('repay') ||
    note.includes('lent to') ||
    note.includes('loan to') ||
    note.includes('repaid to')
  );
};

/**
 * Checks whether an income is an internal transfer or savings withdrawal
 * rather than external earned income.
 */
export const isTransferIncome = (i) => {
  const src = (i?.source || '').toLowerCase();
  const note = (i?.note || '').toLowerCase();
  return src.includes('transfer') || src.includes('saving') || note.includes('from savings') || note.includes('transfer from');
};

/**
 * Checks whether an income is repayment of a previously lent loan
 * rather than new external earned income.
 */
export const isRepaymentIncome = (i) => {
  const src = (i?.source || '').toLowerCase();
  const note = (i?.note || '').toLowerCase();
  return (
    src.includes('repay') ||
    src.includes('reimburse') ||
    note.includes('repaid by') ||
    note.includes('repayment') ||
    note.includes('reimburs')
  );
};

/**
 * Checks whether an income is borrowed money (a loan/liability)
 * rather than external earned income.
 */
export const isBorrowIncome = (i) => {
  const src = (i?.source || '').toLowerCase();
  const note = (i?.note || '').toLowerCase();
  if (isRepaymentIncome(i)) return false;
  return src.includes('borrow') || note.includes('borrowed') || (src.includes('loan') && !src.includes('repay'));
};

// ─── computeMoneyState ─────────────────────────────────────────────────────────

/**
 * Computes the full deterministic money state from raw data.
 *
 * @param {Object} params
 * @param {Array}  params.incomes   - wealth_income rows
 * @param {Array}  params.expenses  - money_expenses rows
 * @param {Array}  params.bills     - wealth_bills rows
 * @param {Object} params.settings  - wealth_settings row (may be null)
 * @param {string} params.today     - YYYY-MM-DD reference date
 * @returns {Object} MoneyState
 */
export function computeMoneyState({
  incomes  = [],
  expenses = [],
  bills    = [],
  settings = {},
  today    = localYMD(),
}) {
  const now         = new Date(`${today}T00:00:00`);
  const currentDay  = now.getDate();
  const year        = now.getFullYear();
  const month       = now.getMonth() + 1;
  const daysInMonth = new Date(year, month, 0).getDate();
  const daysLeft    = Math.max(1, daysInMonth - currentDay + 1);
  const curMonth    = today.slice(0, 7);

  // ── All-time Totals ───────────────────────────────────────────────────────
  const totalIncome  = incomes.reduce((s, i) => s + toNum(i.amount), 0);
  const totalExpense = expenses.reduce((s, e) => s + toNum(e.amount), 0);
  const liquidCash   = totalIncome - totalExpense;

  // ── Current-month figures (transfers, lending & debt isolated from lifestyle spend & earned income) ──
  const monthExpenses = expenses.filter(e => e.expense_date?.startsWith(curMonth));
  const monthIncomes  = incomes.filter(i => i.income_date?.startsWith(curMonth));
  const lifestyleMonthExpenses = monthExpenses.filter(e => !isTransferExpense(e) && !isPrincipalExpense(e));
  const monthSpend    = lifestyleMonthExpenses.reduce((s, e) => s + toNum(e.amount), 0);
  const earnedMonthIncomes = monthIncomes.filter(i => !isTransferIncome(i) && !isBorrowIncome(i) && !isRepaymentIncome(i));
  const monthEarned   = earnedMonthIncomes.reduce((s, i) => s + toNum(i.amount), 0);

  // ── Today (excluding internal transfers and principal movements) ─────────
  const todaySpend = expenses
    .filter(e => e.expense_date === today && !isTransferExpense(e) && !isPrincipalExpense(e))
    .reduce((s, e) => s + toNum(e.amount), 0);

  // ── Budget ────────────────────────────────────────────────────────────────
  const rawBudget = settings?.monthly_budget;
  const isBudgetExplicit = rawBudget !== null && rawBudget !== undefined && rawBudget !== '' && isFinite(Number(rawBudget)) && Number(rawBudget) >= 0;
  const monthlyBudget = isBudgetExplicit ? Number(rawBudget) : null;
  const budgetUsedPct = monthlyBudget != null
    ? (monthlyBudget === 0 ? (monthSpend > 0 ? 100 : 0) : Math.min(100, Math.round((monthSpend / monthlyBudget) * 100)))
    : null;
  const budgetRemaining = monthlyBudget != null
    ? Math.max(0, monthlyBudget - monthSpend)
    : null;

  // ── Bills (unpaid payable obligations, sorted by due date) ──────────────
  const unpaidBills = bills
    .filter(b => b.status !== 'paid' && b.status !== 'receivable' && toNum(b.amount) > 0)
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
    .map(b => {
      const due       = new Date(b.due_date + 'T00:00:00');
      const daysUntil = Math.round((due - now) / 86400000);
      return { ...b, daysUntil };
    });

  const upcomingBillTotal = unpaidBills.reduce((s, b) => s + toNum(b.amount), 0);
  const nextBill          = unpaidBills[0] || null;

  // ── Unencumbered cash (liquid - all unpaid bills) ─────────────────────────
  const unencumberedCash = Math.max(0, liquidCash - upcomingBillTotal);

  // ── Safe-to-spend daily ───────────────────────────────────────────────────
  let safeToSpendDaily  = 0;
  let safeToSpendStatus = 'active';
  let safeToSpendHint   = null;

  if (liquidCash <= 0) {
    safeToSpendStatus = 'zero';
    safeToSpendHint   = 'No positive cash balance logged.';
  } else if (unencumberedCash <= 0 && upcomingBillTotal > 0) {
    safeToSpendStatus = 'constrained';
    safeToSpendHint   = 'All available cash reserved for upcoming bills.';
  } else if (monthlyBudget != null && monthSpend >= monthlyBudget) {
    safeToSpendStatus = 'constrained';
    safeToSpendHint   = 'Monthly budget limit reached.';
  } else {
    const effectiveLiquidity = monthlyBudget != null
      ? Math.min(unencumberedCash, budgetRemaining)
      : unencumberedCash;
    safeToSpendDaily = Math.max(0, Math.floor(effectiveLiquidity / daysLeft));
  }

  // ── Burn rate & Runway (honest — needs minimum 3 expense records, excluding transfers & principal) ─
  const thirtyDaysAgo    = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = localYMD(thirtyDaysAgo);

  const recentExpenses = expenses.filter(e =>
    e.expense_date && e.expense_date >= thirtyDaysAgoStr && !isTransferExpense(e) && !isPrincipalExpense(e)
  );
  const burnLast30    = recentExpenses.reduce((s, e) => s + toNum(e.amount), 0);
  const hasRunwayData = recentExpenses.length >= 3 && burnLast30 > 0;

  let dailyBurnRate = null; // null = not enough data
  let runwayDays    = null; // null = not enough data
  let safeUntil     = null;

  if (hasRunwayData) {
    dailyBurnRate = Math.round(burnLast30 / 30);
    if (liquidCash <= 0) {
      runwayDays = 0;
    } else if (dailyBurnRate > 0) {
      runwayDays = Math.round(liquidCash / dailyBurnRate);
      const safeDate = new Date(now);
      safeDate.setDate(safeDate.getDate() + runwayDays);
      safeUntil = localYMD(safeDate);
    }
  }

  // ── Spending pace (requires budget) ───────────────────────────────────────
  let spendingPace = null;
  if (monthlyBudget != null) {
    if (monthlyBudget === 0) {
      spendingPace = {
        status: monthSpend > 0 ? 'exceeded' : 'on_track',
        label: monthSpend > 0 ? 'Budget reached' : 'On track',
        timePct: 100,
        budgetPct: monthSpend > 0 ? 100 : 0,
      };
    } else {
      const timePct   = Math.round((currentDay / daysInMonth) * 100);
      const budgetPct = Math.min(100, Math.round((monthSpend / monthlyBudget) * 100));

      if (monthSpend >= monthlyBudget) {
        spendingPace = { status: 'exceeded', label: 'Budget reached', timePct, budgetPct };
      } else if (budgetPct <= timePct + 5) {
        spendingPace = { status: 'on_track', label: 'On track', timePct, budgetPct };
      } else {
        const diff = budgetPct - timePct;
        spendingPace = { status: 'ahead', label: `${diff}% ahead of schedule`, timePct, budgetPct };
      }
    }
  }

  // ── Zone breakdown (current month, lifestyle expenses only) ───────────────
  const zoneAmounts = {};
  lifestyleMonthExpenses.forEach(e => {
    const zone = ZONE_MAP[e.category] || 'routine';
    zoneAmounts[zone] = (zoneAmounts[zone] || 0) + toNum(e.amount);
  });

  const zoneBreakdown = ZONES.map(z => ({
    ...z,
    amount: zoneAmounts[z.key] || 0,
    pct: monthSpend > 0
      ? Math.round(((zoneAmounts[z.key] || 0) / monthSpend) * 100)
      : 0,
  }));

  // ── Recent lists ──────────────────────────────────────────────────────────
  const recentIncomes = [...monthIncomes]
    .sort((a, b) => new Date(b.income_date) - new Date(a.income_date))
    .slice(0, 5);

  const recentExpensesSorted = [...monthExpenses]
    .sort((a, b) => new Date(b.expense_date) - new Date(a.expense_date))
    .slice(0, 5);

  // ── Money State V1: Semantic Flow Breakdown (Current Month) ───────────────
  let flowIncome = 0;
  let flowSpent = 0;
  let flowLent = 0;
  let flowBorrowed = 0;
  let flowTransfers = 0;
  let flowTransfersIn = 0;
  let flowInvested = 0;
  let flowRefunds = 0;
  let flowDebtRepaid = 0;

  monthExpenses.forEach(e => {
    const cat = (e.category || '').toLowerCase();
    const note = (e.note || '').toLowerCase();
    const amt = toNum(e.amount);

    if (isTransferExpense(e)) {
      flowTransfers += amt;
    } else if (cat.includes('invest') || cat.includes('sip') || cat.includes('gold')) {
      flowInvested += amt;
    } else if (cat.includes('lend') || cat.includes('loan') || note.includes('lent') || note.includes('loan to')) {
      flowLent += amt;
    } else if (cat.includes('debt') || cat.includes('repay') || note.includes('repay') || note.includes('debt')) {
      flowDebtRepaid += amt;
    } else {
      flowSpent += amt;
    }
  });

  monthIncomes.forEach(i => {
    const src = (i.source || '').toLowerCase();
    const note = (i.note || '').toLowerCase();
    const amt = toNum(i.amount);

    if (isRepaymentIncome(i)) {
      flowRefunds += amt;
    } else if (isBorrowIncome(i)) {
      flowBorrowed += amt;
    } else if (src.includes('refund') || src.includes('reimburse') || note.includes('refund')) {
      flowRefunds += amt;
    } else if (isTransferIncome(i)) {
      flowTransfersIn += amt;
    } else {
      flowIncome += amt;
    }
  });

  const flow = {
    income: flowIncome,
    spent: flowSpent,
    lent: flowLent,
    borrowed: flowBorrowed,
    transfers: flowTransfers,
    transfersIn: flowTransfersIn,
    invested: flowInvested,
    refunds: flowRefunds,
    debtRepaid: flowDebtRepaid,
    grossLifestyleSpend: flowSpent,
    netSpending: flowSpent - flowRefunds,
  };

  // ── Money State V1: Commitments (Next 30 Days) ─────────────────────────────
  // Payable commitments: unpaid bills, subscriptions, debt repayments
  const payableCommitments = unpaidBills.filter(b => b.status !== 'receivable');
  const next30Commitments = payableCommitments.filter(b => b.daysUntil >= -30 && b.daysUntil <= 30);
  const committedNext30Total = next30Commitments.reduce((sum, b) => sum + toNum(b.amount), 0);

  // ── Money State V1: Money Promises / Receivables ──────────────────────────
  // Receivables from bills with status 'receivable' OR expenses with category 'Lend'/'Loan'
  const explicitReceivables = bills
    .filter(b => b.status === 'receivable' && toNum(b.amount) > 0)
    .map(b => {
      const due = new Date(b.due_date + 'T00:00:00');
      const daysUntil = Math.round((due - now) / 86400000);
      return {
        id: b.id,
        person: b.name.replace(/^Owed by\s+/i, '').replace(/\s+owes you$/i, ''),
        amount: toNum(b.amount),
        dueDate: b.due_date,
        daysUntil,
        reminderScheduled: true,
        type: 'receivable',
        raw: b,
      };
    });

  // Check if loan/promise records are tracked in bills (active or settled)
  const hasTrackedReceivableBills = bills.some(b =>
    b.status === 'receivable' ||
    (b.name || '').toLowerCase().includes('owes you') ||
    (b.name || '').toLowerCase().startsWith('owed by')
  );

  let totalReceivables = 0;
  if (hasTrackedReceivableBills) {
    // Authoritative source: explicit receivables in wealth_bills
    totalReceivables = explicitReceivables.reduce((s, r) => s + r.amount, 0);
  } else {
    // Fallback for legacy expenses logged with category 'Lend' without wealth_bills
    const lendExpenses = expenses.filter(e => {
      const cat = (e.category || '').toLowerCase();
      const note = (e.note || '').toLowerCase();
      return cat.includes('lend') || cat.includes('loan') || note.includes('lent');
    });
    const totalLent = lendExpenses.reduce((s, e) => s + toNum(e.amount), 0);
    const allTimeRepaid = incomes.filter(i => isRepaymentIncome(i)).reduce((s, i) => s + toNum(i.amount), 0);
    totalReceivables = Math.max(0, totalLent - allTimeRepaid);
  }

  // ── Money State V1: Assets ────────────────────────────────────────────────
  const allTimeInvested = expenses
    .filter(e => {
      const c = (e.category || '').toLowerCase();
      return c.includes('invest') || c.includes('sip') || c.includes('mutual') || c.includes('stock');
    })
    .reduce((s, e) => s + toNum(e.amount), 0);

  const allTimeGold = expenses
    .filter(e => (e.category || '').toLowerCase().includes('gold'))
    .reduce((s, e) => s + toNum(e.amount), 0);

  const allTimeTransfers = expenses
    .filter(e => isTransferExpense(e))
    .reduce((s, e) => s + toNum(e.amount), 0);

  const allTimeSavingsWithdraw = incomes
    .filter(i => isTransferIncome(i))
    .reduce((s, i) => s + toNum(i.amount), 0);

  const calculatedSavings = Math.max(0, allTimeTransfers - allTimeSavingsWithdraw);

  // ── Money State V1: Liabilities (I owe others) ───────────────────────────
  const iOweBills = bills.filter(b => 
    b.status !== 'paid' && 
    ((b.name || '').toLowerCase().includes('return to') || 
     (b.name || '').toLowerCase().includes('borrow') ||
     (b.name || '').toLowerCase().includes('debt') ||
     (b.name || '').toLowerCase().includes('owe '))
  ).map(b => {
    const due = new Date(b.due_date + 'T00:00:00');
    const daysUntil = Math.round((due - now) / 86400000);
    return {
      id: b.id,
      name: b.name,
      person: b.name.replace(/^return to\s+/i, '').replace(/^borrowed from\s+/i, '').replace(/^owe\s+/i, '').trim(),
      amount: toNum(b.amount),
      dueDate: b.due_date,
      daysUntil,
      raw: b,
    };
  });
  const iOweTotal = iOweBills.reduce((s, b) => s + b.amount, 0);
  const liabilities = {
    iOwe: iOweBills,
    iOweTotal,
  };

  const currentSavings = calculatedSavings;
  const assets = {
    cash: Math.max(0, liquidCash),
    savings: currentSavings,
    invested: allTimeInvested,
    gold: allTimeGold,
    owedToYou: totalReceivables,
    total: Math.max(0, liquidCash) + currentSavings + allTimeInvested + allTimeGold + totalReceivables,
    netAssets: (Math.max(0, liquidCash) + currentSavings + allTimeInvested + allTimeGold + totalReceivables) - iOweTotal,
  };

  // ── Money State V1: Calibration Status ────────────────────────────────────
  // Honest calibration: User has calibrated cash balance if totalIncome > 0
  const isCalibrated = totalIncome > 0 && liquidCash >= 0;

  // ── Money State V1: Unified Recent Events (Top 5-6) ────────────────────────
  const unifiedRecent = [
    ...expenses.map(e => {
      const cat = (e.category || '').toLowerCase();
      let emoji = '💳';
      let type = 'SPEND';
      if (cat.includes('food') || cat.includes('dinner') || cat.includes('lunch') || cat.includes('poha')) emoji = '🍲';
      else if (cat.includes('transport') || cat.includes('metro') || cat.includes('cab')) emoji = '🚇';
      else if (cat.includes('education') || cat.includes('book') || cat.includes('assignment')) emoji = '📚';
      else if (cat.includes('invest') || cat.includes('sip')) { emoji = '📈'; type = 'INVESTMENT'; }
      else if (cat.includes('lend') || cat.includes('loan')) { emoji = '🤝'; type = 'LEND'; }
      else if (cat.includes('transfer')) { emoji = '↔️'; type = 'TRANSFER'; }
      else if (cat.includes('entertainment') || cat.includes('movie')) emoji = '🎬';

      return {
        id: e.id,
        type,
        title: e.note || e.category,
        amount: toNum(e.amount),
        isCredit: false,
        date: e.expense_date,
        emoji,
        raw: e,
      };
    }),
    ...incomes.map(i => {
      const src = (i.source || '').toLowerCase();
      let emoji = '💵';
      let type = 'INCOME';
      if (src.includes('editing') || src.includes('freelance') || src.includes('code')) emoji = '💻';
      else if (src.includes('salary')) emoji = '🏦';
      else if (isRepaymentIncome(i)) { emoji = '🤝'; type = 'REPAYMENT'; }
      else if (src.includes('refund') || src.includes('reimburse')) { emoji = '🔄'; type = 'REFUND'; }
      else if (src.includes('borrow')) { emoji = '📥'; type = 'BORROW'; }

      return {
        id: i.id,
        type,
        title: i.note || i.source,
        amount: toNum(i.amount),
        isCredit: true,
        date: i.income_date,
        emoji,
        raw: i,
      };
    }),
  ]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 6);

  // ── Money State V1: Dex Guidance ──────────────────────────────────────────
  let dexGuidance = null;
  if (!isCalibrated) {
    dexGuidance = 'Set your cash balance to calculate your exact Safe-to-Spend.';
  } else if (explicitReceivables.length > 0 && explicitReceivables[0].daysUntil <= 2) {
    const r = explicitReceivables[0];
    dexGuidance = `${r.person} owes you ₹${r.amount.toLocaleString()} and it is due ${r.daysUntil === 0 ? 'today' : r.daysUntil === 1 ? 'tomorrow' : `in ${r.daysUntil} days`}.`;
  } else if (nextBill && nextBill.daysUntil <= 6 && nextBill.daysUntil >= 0) {
    dexGuidance = `${nextBill.name} renews in ${nextBill.daysUntil === 0 ? 'today' : `${nextBill.daysUntil} days`} (₹${nextBill.amount.toLocaleString()}).`;
  } else if (safeToSpendDaily > 0) {
    dexGuidance = `You have ₹${safeToSpendDaily.toLocaleString()} available for everyday spending.`;
  } else if (flowInvested > 0) {
    dexGuidance = `You invested ₹${flowInvested.toLocaleString()} this month.`;
  }

  return {
    liquidCash,
    unencumberedCash,
    totalIncome,
    totalExpense,
    monthSpend,
    monthEarned,
    todaySpend,
    curMonth,
    monthlyBudget,
    budgetRemaining,
    budgetUsedPct,
    unpaidBills,
    payableCommitments,
    upcomingBillTotal,
    committedNext30Total,
    nextBill,
    safeToSpendDaily,
    safeToSpendStatus,
    safeToSpendHint,
    dailyBurnRate,
    runwayDays,
    runwayHasData: hasRunwayData,
    safeUntil,
    spendingPace,
    zoneBreakdown,
    recentIncomes,
    recentExpensesSorted,
    daysLeft,
    currentDay,
    daysInMonth,
    today,
    // Money State V1 additions
    isCalibrated,
    flow,
    assets,
    liabilities,
    next30Commitments,
    moneyPromises: explicitReceivables,
    unifiedRecent,
    dexGuidance,
  };
}

// ─── computeCategorySpending ─────────────────────────────────────────────────

/**
 * Category-wise spending computation for a specific month.
 *
 * Rules:
 * - Uses actual recorded expense data for the specified month (default: current month).
 * - Excludes transfers (isTransferExpense).
 * - Excludes principal/lending & debt repayments (isPrincipalExpense).
 * - Excludes investment purchases (SIP, stocks, gold, mutual funds).
 * - Handles refunds/reimbursements consistently with existing flow calculations (flowRefunds).
 * - Returns structured categories with labels, amounts, percentages, colors, and net spend.
 */
export function computeCategorySpending({
  expenses = [],
  incomes = [],
  month = localYMD().slice(0, 7),
}) {
  const monthExpenses = expenses.filter(e => e.expense_date?.startsWith(month));
  const monthIncomes = incomes.filter(i => i.income_date?.startsWith(month));

  // Exclude transfers, lending/debt repayments, and investment purchases
  const eligibleExpenses = monthExpenses.filter(e => {
    if (isTransferExpense(e)) return false;
    if (isPrincipalExpense(e)) return false;
    const cat = (e?.category || '').toLowerCase();
    const note = (e?.note || '').toLowerCase();
    if (
      cat.includes('invest') ||
      cat.includes('sip') ||
      cat.includes('mutual') ||
      cat.includes('stock') ||
      cat.includes('gold') ||
      note.includes('invest in')
    ) {
      return false;
    }
    return true;
  });

  // Refunds in current month
  const refundsTotal = monthIncomes
    .filter(i => {
      const src = (i?.source || '').toLowerCase();
      const note = (i?.note || '').toLowerCase();
      return (
        isRepaymentIncome(i) ||
        src.includes('refund') ||
        src.includes('reimburse') ||
        note.includes('refund') ||
        note.includes('reimburse')
      );
    })
    .reduce((s, i) => s + toNum(i.amount), 0);

  const categoryTotals = {};
  eligibleExpenses.forEach(e => {
    const rawCat = (e.category || 'Other').trim();
    const cat = rawCat || 'Other';
    categoryTotals[cat] = (categoryTotals[cat] || 0) + toNum(e.amount);
  });

  const grossSpend = Object.values(categoryTotals).reduce((sum, v) => sum + v, 0);
  const netSpend = Math.max(0, grossSpend - refundsTotal);

  const CATEGORY_COLORS = {
    'Rent': '#964269',         // Plum / Mauve
    'Rent & Bills': '#964269',
    'Bills': '#964269',
    'Food': '#1F4E8C',         // Navy Blue
    'Shopping': '#2E7D42',     // Forest Green
    'Travel': '#A84B25',       // Rust
    'Transport': '#A84B25',    // Rust / Travel
    'Other': '#D49A33',        // Mustard / Ochre
    'Utilities': '#E9B44C',    // Amber
    'Entertainment': '#EC4899',// Pink
    'Leisure': '#A855F7',      // Violet
    'Health': '#1FA36F',       // Emerald Green
    'Education': '#D97706',    // Amber
    'General': '#68777B',      // Muted Teal
  };

  const FALLBACK_PALETTE = [
    '#964269', '#1F4E8C', '#2E7D42', '#A84B25', '#D49A33', '#1FA36F', '#EC4899', '#68777B'
  ];

  const categories = Object.entries(categoryTotals)
    .map(([cat, amount], idx) => ({
      category: cat,
      amount,
      pct: grossSpend > 0 ? Math.round((amount / grossSpend) * 100) : 0,
      color: CATEGORY_COLORS[cat] || FALLBACK_PALETTE[idx % FALLBACK_PALETTE.length],
    }))
    .sort((a, b) => b.amount - a.amount);

  return {
    month,
    eligibleExpenses,
    categories,
    grossSpend,
    netSpend,
    refundsTotal,
    hasExpenses: categories.length > 0 && grossSpend > 0,
  };
}

// ─── computeFinancialOverview ───────────────────────────────────────────────

/**
 * Computes verified financial overview metrics:
 * Total recorded assets, total tracked liabilities, net worth, and available to spend.
 *
 * Rules:
 * - Distinguishes actual recorded balances from estimates or unconfigured states.
 * - Never treats an unconfigured/unknown balance as ₹0 unless explicitly recorded.
 * - If user has no recorded transactions or calibration, assets and net worth return null.
 * - If user explicitly recorded a 0 balance or transactions totaling 0, returns 0.
 */
export function computeFinancialOverview({
  moneyState,
  incomes = [],
  expenses = [],
  bills = [],
}) {
  // Calibration status is authoritatively determined by moneyState.isCalibrated.
  // Mere presence of expense records does not configure or calibrate cash.
  const isCashConfigured = Boolean(moneyState?.isCalibrated);

  const cashVal = isCashConfigured ? Number(moneyState?.assets?.cash ?? moneyState?.liquidCash ?? 0) : null;
  const savingsVal = Number(moneyState?.assets?.savings ?? 0);
  const investedVal = Number(moneyState?.assets?.invested ?? 0);
  const goldVal = Number(moneyState?.assets?.gold ?? 0);
  const owedToYouVal = Number(moneyState?.assets?.owedToYou ?? 0);

  const hasHoldings = savingsVal > 0 || investedVal > 0 || goldVal > 0 || owedToYouVal > 0;

  // Total recorded assets (null if uncalibrated/unconfigured with 0 holdings)
  const totalRecordedAssets = (isCashConfigured || hasHoldings)
    ? (Number(cashVal || 0) + savingsVal + investedVal + goldVal + owedToYouVal)
    : null;

  // Tracked liabilities
  const iOweTotal = Number(moneyState?.liabilities?.iOweTotal ?? 0);
  const upcomingBillsTotal = Number(moneyState?.upcomingBillTotal ?? 0);
  const totalTrackedLiabilities = iOweTotal;

  // Net worth: only when supported by valid recorded data
  const netWorth = (totalRecordedAssets !== null)
    ? (totalRecordedAssets - totalTrackedLiabilities)
    : null;

  // Safe to Spend / Available to Spend
  const availableToSpend = isCashConfigured
    ? Number(moneyState?.unencumberedCash ?? moneyState?.liquidCash ?? 0)
    : null;

  return {
    isCashConfigured,
    hasHoldings,
    cashVal,
    savingsVal,
    investedVal,
    goldVal,
    owedToYouVal,
    totalRecordedAssets,
    totalTrackedLiabilities,
    upcomingBillsTotal,
    netWorth,
    availableToSpend,
  };
}
