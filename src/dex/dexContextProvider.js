/**
 * DexOS — Dex Context Provider
 * Aggregates a compact, real-time snapshot of the user's day across core domains.
 * This is the sole data source for Dex AI prompts — it must stay token-efficient and fast.
 *
 * Rules:
 * - Use domain read services exclusively (growthService, healthService, wealthService, habitService).
 * - ZERO direct Supabase queries or imports in this layer.
 * - NEVER duplicate calculation logic from engines/calculators.
 * - NEVER expose raw database rows — always reduce to a minimal summary.
 * - ALWAYS filter by user_id inside domain services.
 * - Gracefully handle partial domain failures without crashing the overall context.
 */

import { getGrowthData } from '../services/growthService.js';
import { getHealthSnapshot } from '../services/healthService.js';
import { getWealthSnapshot, getPendingClarifications } from '../services/wealthService.js';
import { getHabitsToday } from '../services/habitService.js';
import { computeMoneyState } from '../engines/wealth/moneyState.js';

/**
 * Returns the local YYYY-MM-DD string for today.
 * @returns {string}
 */
const localToday = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().split('T')[0];
};

// ─── Domain Context Fetchers ──────────────────────────────────────────────────

/**
 * Growth context: today's tasks and recent focus time.
 * @param {string} userId
 * @param {string} today
 * @returns {Promise<Object>}
 */
async function fetchGrowthContext(userId, today) {
  try {
    const result = await getGrowthData(userId);
    if (!result.success) return { unavailable: true, error: result.error || 'Growth data unavailable.' };

    const { tasks, projects, sessions } = result.data;

    const pendingTasks = tasks
      .filter((t) => t.status !== 'done')
      .map((t) => ({
        id: t.id,
        name: t.name,
        priority: t.priority,
        dueDate: t.due_date || null,
        projectId: t.project_id || null,
      }))
      .sort((a, b) => a.priority - b.priority)
      .slice(0, 10);

    const todaySessions = sessions.filter((s) => s.session_date === today);
    const focusMinutesToday = todaySessions.reduce(
      (sum, s) => sum + (s.duration_minutes || 0),
      0
    );

    return {
      pendingTaskCount: pendingTasks.length,
      pendingTasks,
      projectCount: projects.length,
      focusMinutesToday,
      focusSessionsToday: todaySessions.length,
    };
  } catch (err) {
    return { unavailable: true, error: err.message || 'Failed to fetch growth context.' };
  }
}

/**
 * Unified Health context: Sleep, Hydration, Nutrition, Movement, Weight, and Bio-Pacing.
 * Uses getHealthSnapshot to eliminate fragmented, multi-roundtrip reads.
 *
 * @param {string} userId
 * @param {string} today
 * @returns {Promise<Object>}
 */
async function fetchHealthContext(userId, today) {
  try {
    const res = await getHealthSnapshot(userId, today);
    if (!res.success || !res.state) {
      return { unavailable: true, error: res.error || 'Health data unavailable.' };
    }

    const { sleep, hydration, fuel, movement, weight, pacing, headline } = res.state;

    return {
      headline,
      sleep: {
        hours: sleep.hours,
        debt: sleep.debt,
        quality: sleep.quality,
        summary: sleep.summary,
      },
      hydration: {
        ml: hydration.ml,
        targetMl: hydration.targetMl,
        ratio: hydration.ratio,
        summary: hydration.summary,
      },
      nutrition: {
        calories: fuel.calories,
        protein: fuel.protein,
        targetCalories: fuel.targetCalories,
        targetProtein: fuel.targetProtein,
        mealCount: fuel.mealCount,
        summary: fuel.summary,
      },
      movement: {
        activeMinutes: movement.activeMinutes,
        todayRpe: movement.todayRpe,
        workoutCount7d: movement.workoutCount7d,
        summary: movement.summary,
      },
      weight: {
        currentKg: weight.currentKg,
        lastLoggedDate: weight.lastLoggedDate,
      },
      pacing: {
        focusCapacity: pacing.focusCapacity,
        caffeineCutoff: pacing.caffeineCutoff,
        recommendedWorkType: pacing.recommendedWorkType,
      },
    };
  } catch (err) {
    return { unavailable: true, error: err.message || 'Failed to fetch health context.' };
  }
}

/**
 * Wealth context: full MoneyState for Dex — answers safe-to-spend, runway,
 * income, upcoming bills, spending pace, etc.
 * @param {string} userId
 * @param {string} today
 * @returns {Promise<Object>}
 */
async function fetchWealthContext(userId, today) {
  try {
    const snapshot = await getWealthSnapshot(userId);
    if (!snapshot.success) {
      return { unavailable: true, error: snapshot.error || 'Wealth data unavailable.' };
    }
    const { settings, expenses, incomes, bills } = snapshot.data;
    const ms = computeMoneyState({ incomes, expenses, bills, settings, today });

    // Compute yesterday
    const yesterdayDate = new Date(`${today}T00:00:00`);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = yesterdayDate.toISOString().split('T')[0];

    const curMonth = today.slice(0, 7);
    const monthExpenses = expenses.filter(e => e.expense_date?.startsWith(curMonth));
    const monthIncomes = incomes.filter(i => i.income_date?.startsWith(curMonth));

    const spentYesterday = expenses
      .filter(e => e.expense_date === yesterdayStr)
      .reduce((s, e) => s + (Number(e.amount) || 0), 0);

    const foodSpentMonth = monthExpenses
      .filter(e => (e.category || '').toLowerCase() === 'food')
      .reduce((s, e) => s + (Number(e.amount) || 0), 0);

    const upiSpentMonth = monthExpenses
      .filter(e => {
        const text = `${e.category || ''} ${e.note || ''}`.toLowerCase();
        return text.includes('upi') || text.includes('paytm') || text.includes('gpay') || text.includes('phonepe') || text.includes('transfer');
      })
      .reduce((s, e) => s + (Number(e.amount) || 0), 0);

    const transfersMonth = ms.flow?.transfers || 0;

    // Subscriptions paid this month
    const subsExpenses = monthExpenses.filter(e =>
      (e.category || '').toLowerCase().includes('subscription') ||
      (e.note || '').toLowerCase().includes('spotify') ||
      (e.note || '').toLowerCase().includes('netflix') ||
      (e.note || '').toLowerCase().includes('youtube') ||
      (e.note || '').toLowerCase().includes('prime')
    );
    const subscriptionsPaidMonth = subsExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const subscriptionItems = subsExpenses.map(e => ({ name: e.note || e.category, amount: Number(e.amount) || 0, date: e.expense_date }));

    // Payees (who I paid)
    const payeeMap = {};
    monthExpenses.forEach(e => {
      const name = (e.note || e.category || 'Other').trim();
      payeeMap[name] = (payeeMap[name] || 0) + (Number(e.amount) || 0);
    });
    const whoIPaid = Object.entries(payeeMap)
      .map(([payee, amount]) => ({ payee, amount }))
      .sort((a, b) => b.amount - a.amount);

    // Payers (who paid me)
    const payerMap = {};
    monthIncomes.forEach(i => {
      const name = (i.source || i.note || 'Other').trim();
      payerMap[name] = (payerMap[name] || 0) + (Number(i.amount) || 0);
    });
    const whoPaidMe = Object.entries(payerMap)
      .map(([payer, amount]) => ({ payer, amount }))
      .sort((a, b) => b.amount - a.amount);

    // Check pending clarification items from imported_transactions (or localStorage)
    const pendingClarifications = await getPendingClarifications(userId);

    return {
      // ── Core numbers Dex needs to answer questions ──────────────────────────
      safeToSpendDaily:    ms.safeToSpendDaily,
      safeToSpendStatus:   ms.safeToSpendStatus,
      safeToSpendHint:     ms.safeToSpendHint,
      liquidCash:          ms.liquidCash,
      unencumberedCash:    ms.unencumberedCash,
      monthlyBudget:       ms.monthlyBudget,
      budgetRemaining:     ms.budgetRemaining,
      // ── Period figures ──────────────────────────────────────────────────────
      spentToday:          ms.todaySpend,
      spentYesterday:      Math.round(spentYesterday * 100) / 100,
      totalExpensesMonth:  ms.monthSpend,
      totalIncomeMonth:    ms.monthEarned,
      foodSpentMonth:      Math.round(foodSpentMonth * 100) / 100,
      upiSpentMonth:       Math.round(upiSpentMonth * 100) / 100,
      transfersMonth:      Math.round(transfersMonth * 100) / 100,
      subscriptionsPaidMonth: Math.round(subscriptionsPaidMonth * 100) / 100,
      subscriptionItems,
      whoPaidMe,
      whoIPaid,
      pendingClarifications,
      // ── Runway ─────────────────────────────────────────────────────────────
      runwayDays:          ms.runwayDays,
      runwayHasData:       ms.runwayHasData,
      dailyBurnRate:       ms.dailyBurnRate,
      safeUntil:           ms.safeUntil,
      // ── Bills ──────────────────────────────────────────────────────────────
      upcomingBills: ms.unpaidBills.map(b => ({
        name:    b.name,
        amount:  Number(b.amount) || 0,
        dueDate: b.due_date,
        daysUntil: b.daysUntil,
      })),
      upcomingBillTotal: ms.upcomingBillTotal,
      // ── Spending pace ───────────────────────────────────────────────────────
      spendingPace: ms.spendingPace
        ? { status: ms.spendingPace.status, label: ms.spendingPace.label }
        : null,
      // ── Promises & Obligations ─────────────────────────────────────────────
      moneyPromises: (ms.moneyPromises || []).map(r => ({
        person: r.person,
        amount: r.amount,
        dueDate: r.dueDate,
        daysUntil: r.daysUntil,
      })),
      liabilities: ms.unpaidBills
        .filter(b => b.name?.toLowerCase().includes('return to') || b.name?.toLowerCase().includes('borrow'))
        .map(b => ({
          person: b.name.replace(/^Return to\s+/i, ''),
          amount: Number(b.amount) || 0,
          dueDate: b.due_date,
        })),
      commitmentsThisWeek: ms.unpaidBills
        .filter(b => b.status !== 'receivable' && b.daysUntil >= 0 && b.daysUntil <= 7)
        .map(b => ({
          name: b.name,
          amount: Number(b.amount) || 0,
          dueDate: b.due_date,
        })),
      subscriptions: ms.unpaidBills
        .filter(b => b.frequency && b.frequency !== 'one_off')
        .map(b => ({
          name: b.name,
          amount: Number(b.amount) || 0,
          frequency: b.frequency,
          dueDate: b.due_date,
        })),
      zoneBreakdown: ms.zoneBreakdown || [],
      // ── Calendar ───────────────────────────────────────────────────────────
      daysLeftInMonth: ms.daysLeft,
      currency: settings?.currency || 'INR',
    };
  } catch (err) {
    return { unavailable: true, error: err.message || 'Failed to fetch wealth context.' };
  }
}

/**
 * Habits context: today's habits and completion state.
 * @param {string} userId
 * @param {string} today
 * @returns {Promise<Object>}
 */
async function fetchHabitsContext(userId, today) {
  try {
    const result = await getHabitsToday(userId, today);
    if (!result.success) {
      return { unavailable: true, error: result.error || 'Habits data unavailable.' };
    }
    return result.data;
  } catch (err) {
    return { unavailable: true, error: err.message || 'Failed to fetch habits context.' };
  }
}

// ─── Main Context Builder ─────────────────────────────────────────────────────

/**
 * Builds the full Dex context snapshot for today.
 * Domains are fetched in parallel for performance.
 *
 * @param {string} userId - Authenticated user UUID from session
 * @returns {Promise<{
 *   success: boolean,
 *   context?: {
 *     date: string,
 *     growth: Object,
 *     health: Object,
 *     food: Object,
 *     wealth: Object,
 *     habits: Object,
 *   },
 *   error?: string
 * }>}
 */
export async function buildDexContext(userId) {
  if (!userId || typeof userId !== 'string' || !userId.trim()) {
    return { success: false, error: 'Authenticated user ID is required.' };
  }

  const today = localToday();

  try {
    const [growth, health, wealth, habits] = await Promise.all([
      fetchGrowthContext(userId, today),
      fetchHealthContext(userId, today),
      fetchWealthContext(userId, today),
      fetchHabitsContext(userId, today),
    ]);

    return {
      success: true,
      context: {
        date: today,
        growth,
        health,
        // Backward-compatibility alias for prompts expecting context.food
        food: health.nutrition || null,
        wealth,
        habits,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err.message || 'Failed to build Dex context.',
    };
  }
}
