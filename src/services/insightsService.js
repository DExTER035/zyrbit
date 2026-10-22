/**
 * Zyrbit / DexOS — Insights Domain Service
 * 
 * Deterministically retrieves and aggregates activity telemetry across all domains:
 * Habits, Focus, Growth Tasks, Food/Nutrition, Health (Sleep, Move, Water), Wealth, and Reflections.
 * 
 * Rules:
 * - Scoped strictly to authenticated user session
 * - Exact date bounds with timezone-safe formatting
 * - Deterministic counting rules: skipped habits do NOT count as completed
 * - Transparent error tracking (no silent failure masks)
 * - Zero fabricated data or artificial scores
 */

import { supabase } from '../lib/supabase/index.js';
import { todayStr, getLocalDateStr } from '../lib/dateUtils.js';

/**
 * Returns an array of YYYY-MM-DD date strings for the past `days` count ending today.
 * @param {number} days
 * @returns {{ dates: string[], minDate: string, maxDate: string }}
 */
export function getDateWindow(days = 7) {
  const maxDate = todayStr();
  const d = new Date();
  d.setDate(d.getDate() - (days - 1));
  const minDate = getLocalDateStr(d);

  const dates = [];
  const cur = new Date(d);
  for (let i = 0; i < days; i++) {
    dates.push(getLocalDateStr(cur));
    cur.setDate(cur.getDate() + 1);
  }

  return { dates, minDate, maxDate };
}

/**
 * Fetches all qualifying user activities and computes metrics for the given window.
 * 
 * @param {Object} params
 * @param {number} [params.days=7] - 7, 30, or 90
 * @param {string} [params.explicitUserId] - Fallback user UUID
 * @returns {Promise<{
 *   success: boolean,
 *   data?: {
 *     windowDays: number,
 *     minDate: string,
 *     maxDate: string,
 *     activeDaysCount: number,
 *     totalActivitiesCount: number,
 *     dailySeries: Array<{ date: string, count: number, dayName: string, label: string }>,
 *     domains: {
 *       habits: { count: number, activeDays: number, summary: string },
 *       health: { count: number, workouts: number, avgSleep: number | null, waterLogs: number, summary: string },
 *       growth: { count: number, focusMinutes: number, tasksDone: number, summary: string },
 *       wealth: { count: number, expenseCount: number, totalSpent: number, summary: string }
 *     },
 *     hasPartialError: boolean,
 *     failedSources: string[]
 *   },
 *   error?: string
 * }>}
 */
export async function getInsightsData({ days = 7, explicitUserId = null } = {}) {
  // 1. Authoritative Auth Check
  let userId = explicitUserId;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) {
      userId = session.user.id;
    }
  } catch (authErr) {
    console.warn('InsightsService: session retrieval warning:', authErr);
  }

  if (!userId) {
    return {
      success: false,
      error: 'User authentication required to load insights.',
    };
  }

  const { dates, minDate, maxDate } = getDateWindow(days);
  const minIsoStart = `${minDate}T00:00:00.000Z`;
  const ROW_LIMIT = 2000;

  // 2. Query all domain tables in parallel with error tracking
  const queries = [
    // 0: Habits (activity_log) - strictly status = 'completed'
    supabase
      .from('activity_log')
      .select('completed_date, habit_id')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .gte('completed_date', minDate)
      .lte('completed_date', maxDate)
      .limit(ROW_LIMIT),

    // 1: Focus Sessions (growth_focus_sessions)
    supabase
      .from('growth_focus_sessions')
      .select('session_date, duration_minutes')
      .eq('user_id', userId)
      .gte('session_date', minDate)
      .lte('session_date', maxDate)
      .limit(ROW_LIMIT),

    // 2: Growth Tasks (growth_tasks) - strictly done
    supabase
      .from('growth_tasks')
      .select('completed_at')
      .eq('user_id', userId)
      .eq('status', 'done')
      .gte('completed_at', minIsoStart)
      .limit(ROW_LIMIT),

    // 3: Meal Logs (meal_logs)
    supabase
      .from('meal_logs')
      .select('date, calories')
      .eq('user_id', userId)
      .gte('date', minDate)
      .lte('date', maxDate)
      .limit(ROW_LIMIT),

    // 4: Sleep Logs (health_sleep_logs)
    supabase
      .from('health_sleep_logs')
      .select('sleep_date, duration_hours')
      .eq('user_id', userId)
      .gte('sleep_date', minDate)
      .lte('sleep_date', maxDate)
      .limit(ROW_LIMIT),

    // 5: Movement Logs (health_move_logs)
    supabase
      .from('health_move_logs')
      .select('log_date, active_minutes, activity_type')
      .eq('user_id', userId)
      .gte('log_date', minDate)
      .lte('log_date', maxDate)
      .limit(ROW_LIMIT),

    // 6: Water Logs (health_water_logs)
    supabase
      .from('health_water_logs')
      .select('log_date, amount_ml')
      .eq('user_id', userId)
      .gte('log_date', minDate)
      .lte('log_date', maxDate)
      .limit(ROW_LIMIT),

    // 7: Expenses (money_expenses)
    supabase
      .from('money_expenses')
      .select('expense_date, amount')
      .eq('user_id', userId)
      .gte('expense_date', minDate)
      .lte('expense_date', maxDate)
      .limit(ROW_LIMIT),

    // 8: Reflections (orbit_journal)
    supabase
      .from('orbit_journal')
      .select('entry_date, mood')
      .eq('user_id', userId)
      .gte('entry_date', minDate)
      .lte('entry_date', maxDate)
      .limit(ROW_LIMIT),
  ];

  let results;
  try {
    results = await Promise.allSettled(queries);
  } catch (err) {
    return {
      success: false,
      error: err.message || 'Failed to query telemetry records.',
    };
  }

  // 3. Inspect results & capture source health
  const sourceNames = [
    'habits',
    'focus',
    'tasks',
    'meals',
    'sleep',
    'movement',
    'water',
    'expenses',
    'journal',
  ];

  const failedSources = [];
  const sourceData = {};

  results.forEach((res, idx) => {
    const name = sourceNames[idx];
    if (res.status === 'fulfilled' && !res.value.error) {
      sourceData[name] = res.value.data || [];
    } else {
      failedSources.push(name);
      sourceData[name] = [];
    }
  });

  // If ALL 9 sources failed, this is an unrecoverable system/network error
  if (failedSources.length === sourceNames.length) {
    return {
      success: false,
      error: 'Unable to connect to records database. Please check your network connection.',
    };
  }

  // 4. Map events to calendar days deterministically
  const activeDatesSet = new Set();
  const dailyCounts = {};
  dates.forEach((d) => {
    dailyCounts[d] = 0;
  });

  const recordEvent = (dateStr) => {
    if (!dateStr) return;
    const cleanDate = typeof dateStr === 'string' ? dateStr.slice(0, 10) : '';
    if (dailyCounts[cleanDate] !== undefined) {
      dailyCounts[cleanDate] += 1;
      activeDatesSet.add(cleanDate);
    }
  };

  // 4a. Habits (completed only)
  (sourceData.habits || []).forEach((row) => {
    recordEvent(row.completed_date);
  });

  // 4b. Focus sessions
  (sourceData.focus || []).forEach((row) => {
    recordEvent(row.session_date);
  });

  // 4c. Completed tasks
  (sourceData.tasks || []).forEach((row) => {
    if (row.completed_at) {
      recordEvent(row.completed_at);
    }
  });

  // 4d. Meals
  (sourceData.meals || []).forEach((row) => {
    recordEvent(row.date);
  });

  // 4e. Sleep logs
  (sourceData.sleep || []).forEach((row) => {
    if (Number(row.duration_hours) > 0) {
      recordEvent(row.sleep_date);
    }
  });

  // 4f. Movement
  (sourceData.movement || []).forEach((row) => {
    recordEvent(row.log_date);
  });

  // 4g. Water logs
  (sourceData.water || []).forEach((row) => {
    if (Number(row.amount_ml) > 0) {
      recordEvent(row.log_date);
    }
  });

  // 4h. Expenses
  (sourceData.expenses || []).forEach((row) => {
    recordEvent(row.expense_date);
  });

  // 4i. Reflections
  (sourceData.journal || []).forEach((row) => {
    recordEvent(row.entry_date);
  });

  // 5. Aggregate Domain Summaries
  // Habit domain
  const habitCompletionsCount = (sourceData.habits || []).length;
  const habitActiveDays = new Set((sourceData.habits || []).map((h) => h.completed_date)).size;
  let habitSummary = 'Not enough data yet';
  if (habitCompletionsCount > 0) {
    habitSummary = habitCompletionsCount === 1 ? '1 completion' : `${habitCompletionsCount} completions`;
  }

  // Health domain (sleep, move, water)
  const workoutsCount = (sourceData.movement || []).length;
  const sleepLogs = sourceData.sleep || [];
  const waterLogs = sourceData.water || [];
  const totalSleepHours = sleepLogs.reduce((acc, s) => acc + (Number(s.duration_hours) || 0), 0);
  const avgSleep = sleepLogs.length > 0 ? (totalSleepHours / sleepLogs.length).toFixed(1) : null;
  const healthCount = workoutsCount + sleepLogs.length + waterLogs.length;

  let healthSummary = 'Not enough data yet';
  if (workoutsCount > 0 && avgSleep) {
    healthSummary = `${workoutsCount} workout${workoutsCount > 1 ? 's' : ''} · ${avgSleep}h avg sleep`;
  } else if (workoutsCount > 0) {
    healthSummary = `${workoutsCount} workout${workoutsCount > 1 ? 's' : ''} recorded`;
  } else if (avgSleep) {
    healthSummary = `${avgSleep}h avg sleep`;
  } else if (waterLogs.length > 0) {
    healthSummary = `${waterLogs.length} hydration log${waterLogs.length > 1 ? 's' : ''}`;
  }

  // Growth domain (focus + tasks)
  const totalFocusMins = (sourceData.focus || []).reduce(
    (acc, s) => acc + (Number(s.duration_minutes) || 0),
    0
  );
  const tasksDoneCount = (sourceData.tasks || []).length;
  const growthCount = (sourceData.focus || []).length + tasksDoneCount;

  let growthSummary = 'Not enough data yet';
  const focusHours = (totalFocusMins / 60).toFixed(1);
  if (totalFocusMins > 0 && tasksDoneCount > 0) {
    growthSummary = `${focusHours}h focus · ${tasksDoneCount} task${tasksDoneCount > 1 ? 's' : ''} done`;
  } else if (totalFocusMins > 0) {
    growthSummary = `${focusHours}h focus recorded`;
  } else if (tasksDoneCount > 0) {
    growthSummary = `${tasksDoneCount} task${tasksDoneCount > 1 ? 's' : ''} completed`;
  }

  // Wealth domain (expenses)
  const expensesList = sourceData.expenses || [];
  const totalSpent = expensesList.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
  let wealthSummary = 'Not enough data yet';
  if (expensesList.length > 0) {
    wealthSummary = expensesList.length === 1 ? '1 expense recorded' : `${expensesList.length} expenses recorded`;
  }

  // 6. Build Daily Series
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dailySeries = dates.map((dateStr) => {
    const parts = dateStr.split('-').map(Number);
    const dObj = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
    const dayName = daysOfWeek[dObj.getDay()];
    const count = dailyCounts[dateStr] || 0;
    return {
      date: dateStr,
      count,
      dayName,
      label: `${dayName} ${parts[2]}`,
    };
  });

  const totalActivitiesCount = Object.values(dailyCounts).reduce((a, b) => a + b, 0);
  const activeDaysCount = activeDatesSet.size;

  return {
    success: true,
    data: {
      windowDays: days,
      minDate,
      maxDate,
      activeDaysCount,
      totalActivitiesCount,
      dailySeries,
      domains: {
        habits: {
          count: habitCompletionsCount,
          activeDays: habitActiveDays,
          summary: habitSummary,
        },
        health: {
          count: healthCount,
          workouts: workoutsCount,
          avgSleep,
          waterLogs: waterLogs.length,
          summary: healthSummary,
        },
        growth: {
          count: growthCount,
          focusMinutes: totalFocusMins,
          tasksDone: tasksDoneCount,
          summary: growthSummary,
        },
        wealth: {
          count: expensesList.length,
          expenseCount: expensesList.length,
          totalSpent,
          summary: wealthSummary,
        },
      },
      hasPartialError: failedSources.length > 0,
      failedSources,
    },
  };
}
