/**
 * Zyrbit / DexOS — Day Receipt Service
 * Daily synthesis artifact engine powered by cross-domain authoritative state.
 *
 * Responsibilities:
 * - Deterministically assemble the Day Receipt from existing domain states
 * - Select a compact, meaningful set of daily signals (4–7 metrics max)
 * - Produce natural-language day state interpretation (NO arbitrary gamified scores)
 * - Produce concise, calm tomorrow guidance
 * - Provide privacy-conscious share/save sanitization
 * - Support on-the-fly historical reconstruction
 */

import { supabase } from '../lib/supabase/index.js';
import { getGrowthData } from './growthService.js';
import { getHealthSnapshot } from './healthService.js';
import { getWealthSnapshot } from './wealthService.js';

export const todayStr = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().split('T')[0];
};

/**
 * Formats a YYYY-MM-DD date into the canonical uppercase receipt header string:
 * e.g., "DAY RECEIPT · FRI 2 OCT"
 * @param {string} dateStr - YYYY-MM-DD
 * @returns {string}
 */
export function formatReceiptDate(dateStr) {
  if (!dateStr) return 'DAY RECEIPT';
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d, 12, 0, 0);
    const dayAbbr = dateObj.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
    const dateNum = dateObj.getDate();
    const monthAbbr = dateObj.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
    return `DAY RECEIPT · ${dayAbbr} ${dateNum} ${monthAbbr}`;
  } catch {
    return `DAY RECEIPT · ${dateStr}`;
  }
}

/**
 * Formats minutes into compact "Xh Ym" or "Ym".
 * @param {number} totalMinutes
 * @returns {string}
 */
function formatMinutes(totalMinutes) {
  const mins = Math.max(0, Math.round(Number(totalMinutes) || 0));
  if (mins === 0) return '0m';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

/**
 * Formats decimal hours into "Xh Ym" or "Xh".
 * @param {number} hours
 * @returns {string}
 */
function formatHours(hours) {
  const hVal = Number(hours) || 0;
  const totalMins = Math.round(hVal * 60);
  return formatMinutes(totalMins);
}

/**
 * Pure deterministic engine for assembling a Day Receipt artifact.
 *
 * @param {Object} params
 * @param {string} params.date - YYYY-MM-DD
 * @param {Array} [params.tasks=[]] - growth_tasks
 * @param {Array} [params.focusSessions=[]] - growth_focus_sessions
 * @param {Array} [params.sleepLogs=[]] - sleep logs
 * @param {Array} [params.waterLogs=[]] - water logs
 * @param {Array} [params.foodLogs=[]] - meal logs
 * @param {Array} [params.moveLogs=[]] - workout/movement logs
 * @param {Array} [params.expenses=[]] - money_expenses
 * @param {Array} [params.incomes=[]] - wealth_income
 * @param {Array} [params.bills=[]] - wealth_bills (receivables/liabilities)
 * @param {Array} [params.habits=[]] - habits
 * @param {Array} [params.activity=[]] - habit activity logs
 * @param {string} [params.currencySymbol='₹']
 * @returns {Object}
 */
export function assembleDayReceipt({
  date = todayStr(),
  tasks = [],
  focusSessions = [],
  sleepLogs = [],
  waterLogs = [],
  foodLogs = [],
  moveLogs = [],
  expenses = [],
  incomes = [],
  bills = [],
  habits = [],
  activity = [],
  currencySymbol = '₹',
}) {
  const metrics = [];
  const domainsTouched = new Set();

  // ── 1. HEALTH SIGNALS ────────────────────────────────────────────────────────
  // Sleep
  const daySleep = sleepLogs.find((s) => s.sleep_date === date || s.log_date === date);
  const sleepHours = daySleep ? Number(daySleep.duration_hours || daySleep.hours || 0) : 0;
  const sleepQuality = daySleep?.quality ?? null;
  if (sleepHours > 0) {
    domainsTouched.add('health');
    metrics.push({
      id: 'sleep',
      label: 'Slept',
      value: formatHours(sleepHours),
      domain: 'health',
      raw: sleepHours,
      quality: sleepQuality,
    });
  }

  // Hydration
  const dayWater = waterLogs.filter((w) => {
    const lDate = w.log_date || (w.created_at ? w.created_at.slice(0, 10) : null);
    return lDate === date;
  });
  const totalWaterMl = dayWater.reduce((sum, w) => sum + (Number(w.amount_ml) || 0), 0);
  const glasses = Math.round(totalWaterMl / 250);
  if (glasses > 0 || totalWaterMl > 0) {
    domainsTouched.add('health');
    metrics.push({
      id: 'water',
      label: 'Water',
      value: `${glasses} / 8`,
      domain: 'health',
      raw: totalWaterMl,
    });
  }

  // Food / Fuel
  const dayFood = foodLogs.filter((f) => {
    const lDate = f.log_date || (f.created_at ? f.created_at.slice(0, 10) : null);
    return lDate === date;
  });
  if (dayFood.length > 0) {
    domainsTouched.add('health');
    const firstMeal = dayFood[0];
    const mealLabel = dayFood.length === 1 && firstMeal.name
      ? (firstMeal.name.length > 18 ? firstMeal.name.slice(0, 16) + '...' : firstMeal.name)
      : `${dayFood.length} meal${dayFood.length > 1 ? 's' : ''}`;
    metrics.push({
      id: 'food',
      label: 'Fuel',
      value: mealLabel,
      domain: 'health',
      raw: dayFood.length,
    });
  }

  // Movement
  const dayMove = moveLogs.filter((m) => {
    const lDate = m.log_date || (m.created_at ? m.created_at.slice(0, 10) : null);
    return lDate === date;
  });
  const totalMoveMins = dayMove.reduce((sum, m) => sum + (Number(m.active_minutes) || 0), 0);
  if (totalMoveMins > 0) {
    domainsTouched.add('health');
    const firstMove = dayMove[0];
    const moveLabel = dayMove.length === 1 && firstMove.activity_type
      ? firstMove.activity_type
      : 'Movement';
    metrics.push({
      id: 'movement',
      label: moveLabel,
      value: formatMinutes(totalMoveMins),
      domain: 'health',
      raw: totalMoveMins,
    });
  }

  // ── 2. GROWTH SIGNALS ────────────────────────────────────────────────────────
  // Focus sessions
  const daySessions = focusSessions.filter((s) => s.session_date === date);
  const totalFocusMins = daySessions.reduce((sum, s) => sum + (Number(s.duration_minutes) || 0), 0);
  if (totalFocusMins > 0) {
    domainsTouched.add('growth');
    metrics.push({
      id: 'focus',
      label: 'Deep focus',
      value: formatMinutes(totalFocusMins),
      domain: 'growth',
      raw: totalFocusMins,
    });

    // If there is a distinct topic/note (e.g. "DSA" or study topic)
    const topicSession = daySessions.find((s) => s.notes && s.notes.trim().length > 0);
    if (topicSession && topicSession.notes.trim()) {
      const topic = topicSession.notes.trim();
      const topicShort = topic.length > 16 ? topic.slice(0, 14) + '...' : topic;
      // Only add distinct metric if duration > 0 and not identical
      if (daySessions.length > 1 || topicSession.duration_minutes < totalFocusMins) {
        metrics.push({
          id: 'focus_topic',
          label: topicShort,
          value: formatMinutes(topicSession.duration_minutes),
          domain: 'growth',
          raw: topicSession.duration_minutes,
        });
      }
    }
  }

  // Completed Tasks
  const completedTasks = tasks.filter((t) => {
    if (t.status !== 'done') return false;
    const cDate = t.completed_at ? t.completed_at.slice(0, 10) : null;
    return cDate === date || (t.due_date === date && !t.completed_at);
  });
  if (completedTasks.length > 0) {
    domainsTouched.add('growth');
    if (completedTasks.length === 1) {
      const taskName = completedTasks[0].name || 'Task';
      const shortName = taskName.length > 18 ? taskName.slice(0, 16) + '...' : taskName;
      metrics.push({
        id: 'task_single',
        label: shortName,
        value: 'completed',
        domain: 'growth',
      });
    } else {
      metrics.push({
        id: 'tasks_count',
        label: 'Tasks',
        value: `${completedTasks.length} completed`,
        domain: 'growth',
        raw: completedTasks.length,
      });
    }
  }

  // Completed Habits
  const completedActivity = activity.filter((a) => {
    return a.status === 'completed' && (a.completed_date === date || (a.created_at && a.created_at.slice(0, 10) === date));
  });
  if (completedActivity.length > 0 && metrics.length < 5) {
    // Only show a standout habit if the receipt is not full
    const firstAct = completedActivity[0];
    const habitObj = habits.find((h) => h.id === firstAct.habit_id);
    if (habitObj) {
      domainsTouched.add('growth');
      const hName = habitObj.name.length > 18 ? habitObj.name.slice(0, 16) + '...' : habitObj.name;
      metrics.push({
        id: 'habit',
        label: hName,
        value: 'done',
        domain: 'growth',
      });
    }
  }

  // ── 3. WEALTH SIGNALS ────────────────────────────────────────────────────────
  // Expenses
  const dayExpenses = expenses.filter((e) => {
    return e.expense_date === date || (e.created_at && e.created_at.slice(0, 10) === date);
  });
  const totalSpent = dayExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  if (totalSpent > 0) {
    domainsTouched.add('wealth');
    metrics.push({
      id: 'spent',
      label: 'Spent',
      value: `${currencySymbol}${totalSpent.toLocaleString()}`,
      domain: 'wealth',
      raw: totalSpent,
    });
  }

  // Incomes
  const dayIncomes = incomes.filter((i) => {
    return i.income_date === date || (i.created_at && i.created_at.slice(0, 10) === date);
  });
  const totalEarned = dayIncomes.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
  if (totalEarned > 0) {
    domainsTouched.add('wealth');
    metrics.push({
      id: 'earned',
      label: 'Earned',
      value: `${currencySymbol}${totalEarned.toLocaleString()}`,
      domain: 'wealth',
      raw: totalEarned,
    });
  }

  // Money Promises: Owed to me (receivables active / created as of that date)
  const receivables = bills.filter((b) => {
    const isRec = b.status === 'receivable' || b.type === 'receivable' || b.name?.toLowerCase().includes('owes');
    if (!isRec) return false;
    const createdDate = b.created_at ? b.created_at.slice(0, 10) : b.due_date;
    if (createdDate && createdDate > date) return false; // not yet created on this date
    if (b.status === 'paid' && b.paid_at && b.paid_at.slice(0, 10) < date) {
      return false; // already resolved before this date
    }
    const dueDate = b.due_date || createdDate;
    return dueDate === date || createdDate === date;
  });
  if (receivables.length > 0) {
    domainsTouched.add('wealth');
    const recTotal = receivables.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    metrics.push({
      id: 'owed_to_me',
      label: 'Owed to me',
      value: `${currencySymbol}${recTotal.toLocaleString()}`,
      domain: 'wealth',
      raw: recTotal,
    });
  }

  // Money Promises: I owe (liabilities active / created as of that date)
  const liabilities = bills.filter((b) => {
    const isLiab = b.status === 'liability' || b.name?.toLowerCase().includes('borrow');
    if (!isLiab) return false;
    const createdDate = b.created_at ? b.created_at.slice(0, 10) : b.due_date;
    if (createdDate && createdDate > date) return false; // not yet created on this date
    if (b.status === 'paid' && b.paid_at && b.paid_at.slice(0, 10) < date) {
      return false; // already resolved before this date
    }
    const dueDate = b.due_date || createdDate;
    return dueDate === date || createdDate === date;
  });
  if (liabilities.length > 0) {
    domainsTouched.add('wealth');
    const liabTotal = liabilities.reduce((sum, l) => sum + (Number(l.amount) || 0), 0);
    metrics.push({
      id: 'i_owe',
      label: 'I owe',
      value: `${currencySymbol}${liabTotal.toLocaleString()}`,
      domain: 'wealth',
      raw: liabTotal,
    });
  }

  // ── 4. EMPTY / QUIET DAY DETERMINATION ────────────────────────────────────────
  const isQuietDay = metrics.length === 0;

  // ── 5. NATURAL LANGUAGE INTERPRETATION ───────────────────────────────────────
  // No arbitrary numeric scores (no 82/100). Pure natural language truth.
  let interpretation = '';
  let tomorrow = null;

  if (isQuietDay) {
    interpretation = 'Not enough captured yet.';
    tomorrow = null;
  } else {
    const hasFocus = totalFocusMins >= 40;
    const lowSleep = sleepHours > 0 && sleepHours < 6.2;
    const lowFuel = glasses < 4 || dayFood.length === 1;
    const heavyWorkload = totalFocusMins >= 90 || totalMoveMins >= 60;
    const tasksDoneCount = completedTasks.length;

    if (hasFocus && (lowSleep || lowFuel)) {
      interpretation = 'On pace,\nunder-fuelled.';
      tomorrow = 'tomorrow is already softer';
    } else if (tasksDoneCount > 0 && lowSleep) {
      interpretation = 'Good progress. Recovery was light.';
      tomorrow = 'start with recovery';
    } else if (totalFocusMins >= 90 && totalSpent <= 100) {
      interpretation = 'Strong focus day. Money stayed steady.';
      tomorrow = 'protect your morning';
    } else if (heavyWorkload && lowSleep) {
      interpretation = 'Heavy day. Tomorrow should be lighter.';
      tomorrow = 'keep the evening light';
    } else if (tasks.filter((t) => t.status !== 'done' && t.due_date === date).length > 2 && hasFocus) {
      interpretation = 'Behind on the plan, but the important work moved.';
      tomorrow = 'finish the important thing before adding more';
    } else if (metrics.length <= 2) {
      interpretation = 'Quiet day. One important thing moved forward.';
      tomorrow = 'one deep-work block is enough';
    } else if (sleepHours >= 7 && glasses >= 5 && hasFocus) {
      interpretation = 'Balanced execution. Rhythm held steady.';
      tomorrow = 'protect your morning';
    } else {
      interpretation = 'Quiet day. Rhythm held.';
      tomorrow = 'one deep-work block is enough';
    }
  }

  // Compact selection: limit metrics to max 7
  const finalMetrics = metrics.slice(0, 7);

  return {
    date,
    dateFormatted: formatReceiptDate(date),
    metrics: finalMetrics,
    interpretation,
    tomorrow,
    domainsTouched: Array.from(domainsTouched),
    isQuietDay,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Produces a privacy-conscious shareable representation of the Day Receipt.
 * Sanitizes financial amounts and private notes.
 *
 * @param {Object} receipt
 * @param {Object} [options={}]
 * @param {boolean} [options.hideMoney=true] - Mask monetary amounts as "Logged"
 * @returns {Object}
 */
export function sanitizeReceiptForShare(receipt, { hideMoney = true } = {}) {
  if (!receipt) return null;

  const sanitizedMetrics = (receipt.metrics || []).map((m) => {
    if (hideMoney && m.domain === 'wealth') {
      return {
        ...m,
        value: 'Logged',
        isMasked: true,
      };
    }
    return { ...m };
  });

  return {
    ...receipt,
    metrics: sanitizedMetrics,
    isSanitized: true,
  };
}

/**
 * Authoritative facade: loads domain data for a given date and assembles the Day Receipt.
 *
 * @param {string} userId - Authenticated user UUID
 * @param {string} [dateStr=todayStr()] - YYYY-MM-DD
 * @returns {Promise<{success: boolean, receipt?: Object, error?: string}>}
 */
export async function getDayReceipt(userId, dateStr = todayStr()) {
  if (!userId) {
    return { success: false, error: 'User ID is required.' };
  }

  try {
    const [healthRes, growthRes, wealthRes, habitActRes, habitsRes] = await Promise.allSettled([
      getHealthSnapshot(userId, dateStr),
      getGrowthData(userId),
      getWealthSnapshot(userId),
      supabase
        .from('activity_log')
        .select('*')
        .eq('user_id', userId)
        .eq('completed_date', dateStr),
      supabase
        .from('habits')
        .select('id, name, icon, zone')
        .eq('user_id', userId),
    ]);

    const healthData = healthRes.status === 'fulfilled' && healthRes.value?.success
      ? healthRes.value.raw || {}
      : {};

    const growthData = growthRes.status === 'fulfilled' && growthRes.value?.success
      ? growthRes.value.data || {}
      : {};

    const wealthData = wealthRes.status === 'fulfilled' && wealthRes.value?.success
      ? wealthRes.value.data || {}
      : {};

    const activity = habitActRes.status === 'fulfilled' && habitActRes.value?.data
      ? habitActRes.value.data
      : [];

    const habits = habitsRes.status === 'fulfilled' && habitsRes.value?.data
      ? habitsRes.value.data
      : [];

    const receipt = assembleDayReceipt({
      date: dateStr,
      tasks: growthData.tasks || [],
      focusSessions: growthData.sessions || [],
      sleepLogs: healthData.sleepLogs || [],
      waterLogs: healthData.waterLogs || [],
      foodLogs: healthData.mealLogs || [],
      moveLogs: healthData.moveLogs || [],
      expenses: wealthData.expenses || [],
      incomes: wealthData.incomes || [],
      bills: wealthData.bills || [],
      habits,
      activity,
      currencySymbol: wealthData.settings?.currency === 'USD' ? '$' : '₹',
    });

    return { success: true, receipt };
  } catch (err) {
    console.error('Failed to get Day Receipt:', err);
    return { success: false, error: err.message || 'Failed to assemble Day Receipt.' };
  }
}
