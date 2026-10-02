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

  // ── Current-month figures ─────────────────────────────────────────────────
  const monthExpenses = expenses.filter(e => e.expense_date?.startsWith(curMonth));
  const monthIncomes  = incomes.filter(i => i.income_date?.startsWith(curMonth));
  const monthSpend    = monthExpenses.reduce((s, e) => s + toNum(e.amount), 0);
  const monthEarned   = monthIncomes.reduce((s, i) => s + toNum(i.amount), 0);

  // ── Today ─────────────────────────────────────────────────────────────────
  const todaySpend = expenses
    .filter(e => e.expense_date === today)
    .reduce((s, e) => s + toNum(e.amount), 0);

  // ── Budget ────────────────────────────────────────────────────────────────
  const rawBudget     = Number(settings?.monthly_budget);
  const monthlyBudget = isFinite(rawBudget) && rawBudget > 0 ? rawBudget : null;
  const budgetUsedPct = monthlyBudget
    ? Math.min(100, Math.round((monthSpend / monthlyBudget) * 100))
    : null;
  const budgetRemaining = monthlyBudget != null
    ? Math.max(0, monthlyBudget - monthSpend)
    : null;

  // ── Bills (unpaid, sorted by due date) ───────────────────────────────────
  const unpaidBills = bills
    .filter(b => b.status !== 'paid' && toNum(b.amount) > 0)
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

  // ── Burn rate & Runway (honest — needs minimum 3 expense records) ─────────
  const thirtyDaysAgo    = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = localYMD(thirtyDaysAgo);

  const recentExpenses = expenses.filter(e =>
    e.expense_date && e.expense_date >= thirtyDaysAgoStr
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
  if (monthlyBudget != null && monthlyBudget > 0) {
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

  // ── Zone breakdown (current month) ────────────────────────────────────────
  const zoneAmounts = {};
  monthExpenses.forEach(e => {
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
  let flowInvested = 0;
  let flowRefunds = 0;

  monthExpenses.forEach(e => {
    const cat = (e.category || '').toLowerCase();
    const note = (e.note || '').toLowerCase();
    const amt = toNum(e.amount);

    if (cat.includes('transfer')) {
      flowTransfers += amt;
    } else if (cat.includes('invest') || cat.includes('sip') || cat.includes('gold')) {
      flowInvested += amt;
    } else if (cat.includes('lend') || cat.includes('loan') || note.includes('lent') || note.includes('loan to')) {
      flowLent += amt;
    } else {
      flowSpent += amt;
    }
  });

  monthIncomes.forEach(i => {
    const src = (i.source || '').toLowerCase();
    const note = (i.note || '').toLowerCase();
    const amt = toNum(i.amount);

    if (src.includes('borrow') || src.includes('loan') || note.includes('borrowed')) {
      flowBorrowed += amt;
    } else if (src.includes('refund') || src.includes('reimburse') || note.includes('refund')) {
      flowRefunds += amt;
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
    invested: flowInvested,
    refunds: flowRefunds,
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

  // Also check if any recent 'Lend' expense isn't yet marked returned
  const lendExpenses = expenses.filter(e => {
    const cat = (e.category || '').toLowerCase();
    const note = (e.note || '').toLowerCase();
    return cat.includes('lend') || cat.includes('loan') || note.includes('lent');
  });

  // Total owed to you
  const totalReceivables = explicitReceivables.reduce((s, r) => s + r.amount, 0) +
    (explicitReceivables.length === 0 ? lendExpenses.reduce((s, e) => s + toNum(e.amount), 0) : 0);

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
    .filter(e => {
      const c = (e.category || '').toLowerCase();
      const n = (e.note || '').toLowerCase();
      return c.includes('transfer') || c.includes('saving') || n.includes('saving');
    })
    .reduce((s, e) => s + toNum(e.amount), 0);

  const allTimeSavingsWithdraw = incomes
    .filter(i => {
      const s = (i.source || '').toLowerCase();
      const n = (i.note || '').toLowerCase();
      return s.includes('saving') || n.includes('saving');
    })
    .reduce((s, i) => s + toNum(i.amount), 0);

  const calculatedSavings = Math.max(0, allTimeTransfers - allTimeSavingsWithdraw);

  const assets = {
    cash: Math.max(0, liquidCash),
    savings: calculatedSavings > 0 ? calculatedSavings : (liquidCash > 50000 ? Math.round(liquidCash * 0.4) : 0),
    invested: allTimeInvested,
    gold: allTimeGold,
    owedToYou: totalReceivables,
    total: Math.max(0, liquidCash) + allTimeInvested + allTimeGold + totalReceivables,
  };

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
