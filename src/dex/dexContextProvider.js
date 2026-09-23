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
import { getWealthSummary } from '../services/wealthService.js';
import { getHabitsToday } from '../services/habitService.js';

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
 * Wealth context: today's spending and this month's income/expense totals.
 * @param {string} userId
 * @param {string} today
 * @returns {Promise<Object>}
 */
async function fetchWealthContext(userId, today) {
  try {
    const result = await getWealthSummary(userId, today);
    if (!result.success) {
      return { unavailable: true, error: result.error || 'Wealth data unavailable.' };
    }
    return result.data;
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
