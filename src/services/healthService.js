/**
 * Zyrbit / DexOS — Unified Health Domain Service
 * Pure JavaScript domain operations for Sleep, Hydration, Movement, Weight, and Nutrition.
 * Acts as the authoritative service façade for all physical-domain mutations and telemetry.
 * Zero direct database calls from UI components.
 */

import { supabase } from '../lib/supabase/index.js';
import {
  validateWaterLog,
  validateSleepLog,
  validateWorkoutLog,
  validateWeightLog,
  computeHealthState,
} from '../engines/health/index.js';
import * as foodService from './foodService.js';

export const todayStr = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().split('T')[0];
};

// ─── 1. HYDRATION (WATER) ─────────────────────────────────────────────────────

/**
 * Logs a hydration entry in milliliters.
 * @param {Object} params
 * @param {string} params.userId - Authenticated user UUID
 * @param {number} params.amountMl - Water amount in milliliters (50-3000ml)
 * @param {string} [params.date=todayStr()] - YYYY-MM-DD log date
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export async function logWater({ userId, amountMl, date = todayStr() }) {
  if (!userId) {
    return { success: false, error: 'User ID is required.' };
  }

  const validation = validateWaterLog(amountMl);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const payload = {
    user_id: userId,
    log_date: date,
    amount_ml: validation.value,
  };

  try {
    const { data, error } = await supabase
      .from('health_water_logs')
      .insert([payload])
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message || 'Failed to log water.' };
  }
}

/**
 * Deletes a hydration log entry.
 * @param {Object} params
 * @param {string} params.userId - Authenticated user UUID
 * @param {string} params.logId - Log UUID
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function deleteWaterLog({ userId, logId }) {
  if (!userId || !logId) {
    return { success: false, error: 'User ID and Log ID are required.' };
  }

  try {
    const { error } = await supabase
      .from('health_water_logs')
      .delete()
      .eq('id', logId)
      .eq('user_id', userId);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message || 'Failed to delete water log.' };
  }
}

// ─── 2. SLEEP ─────────────────────────────────────────────────────────────────

/**
 * Logs sleep duration and subjective quality rating.
 * @param {Object} params
 * @param {string} params.userId - Authenticated user UUID
 * @param {number} params.durationHours - Sleep duration in hours (0.5-24h)
 * @param {number} params.quality - Sleep quality rating (1-5)
 * @param {string} [params.date=todayStr()] - YYYY-MM-DD sleep date
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export async function logSleep({ userId, durationHours, quality, date = todayStr() }) {
  if (!userId) {
    return { success: false, error: 'User ID is required.' };
  }

  const validation = validateSleepLog(durationHours, quality);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const payload = {
    user_id: userId,
    sleep_date: date,
    duration_hours: validation.hours,
    quality: validation.quality,
  };

  try {
    const { data, error } = await supabase
      .from('health_sleep_logs')
      .upsert([payload], { onConflict: 'user_id,sleep_date' })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message || 'Failed to log sleep.' };
  }
}

/**
 * Deletes a sleep log entry.
 * @param {Object} params
 * @param {string} params.userId - Authenticated user UUID
 * @param {string} params.logId - Log UUID
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function deleteSleepLog({ userId, logId }) {
  if (!userId || !logId) {
    return { success: false, error: 'User ID and Log ID are required.' };
  }

  try {
    const { error } = await supabase
      .from('health_sleep_logs')
      .delete()
      .eq('id', logId)
      .eq('user_id', userId);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message || 'Failed to delete sleep log.' };
  }
}

// ─── 3. MOVEMENT (WORKOUTS) ───────────────────────────────────────────────────

/**
 * Logs a physical workout or movement session.
 * @param {Object} params
 * @param {string} params.userId - Authenticated user UUID
 * @param {string} [params.activityType='Strength'] - Type of workout
 * @param {number} params.activeMinutes - Duration in minutes (1-1440m)
 * @param {number} [params.rpe=5] - Rate of perceived exertion (1-10)
 * @param {string|null} [params.notes=null] - Optional notes
 * @param {string} [params.date=todayStr()] - YYYY-MM-DD log date
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export async function logActivity({
  userId,
  activityType = 'Strength',
  activeMinutes,
  rpe = 5,
  notes = null,
  date = todayStr(),
}) {
  if (!userId) {
    return { success: false, error: 'User ID is required.' };
  }

  const validation = validateWorkoutLog(activeMinutes, rpe);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const payload = {
    user_id: userId,
    log_date: date,
    activity_type: activityType || 'Strength',
    active_minutes: validation.minutes,
    rpe: validation.rpe,
    notes: notes || null,
  };

  try {
    const { data, error } = await supabase
      .from('health_move_logs')
      .insert([payload])
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message || 'Failed to log workout.' };
  }
}

/**
 * Deletes a workout log entry.
 * @param {Object} params
 * @param {string} params.userId - Authenticated user UUID
 * @param {string} params.logId - Log UUID
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function deleteActivityLog({ userId, logId }) {
  if (!userId || !logId) {
    return { success: false, error: 'User ID and Log ID are required.' };
  }

  try {
    const { error } = await supabase
      .from('health_move_logs')
      .delete()
      .eq('id', logId)
      .eq('user_id', userId);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message || 'Failed to delete workout log.' };
  }
}

// ─── 4. WEIGHT ────────────────────────────────────────────────────────────────

/**
 * Logs scale body weight in kilograms.
 * Upserts on (user_id, log_date).
 * @param {Object} params
 * @param {string} params.userId - Authenticated user UUID
 * @param {number} params.weight - Body weight in kg
 * @param {string} [params.date=todayStr()] - YYYY-MM-DD log date
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export async function logWeight({ userId, weight, date = todayStr() }) {
  if (!userId) {
    return { success: false, error: 'User ID is required.' };
  }

  const validation = validateWeightLog(weight);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const payload = {
    user_id: userId,
    log_date: date,
    weight: validation.value,
  };

  try {
    const { data, error } = await supabase
      .from('health_weight_logs')
      .upsert([payload], { onConflict: 'user_id,log_date' })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message || 'Failed to log weight.' };
  }
}

/**
 * Deletes a weight log entry.
 * @param {Object} params
 * @param {string} params.userId - Authenticated user UUID
 * @param {string} params.logId - Log UUID
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function deleteWeightLog({ userId, logId }) {
  if (!userId || !logId) {
    return { success: false, error: 'User ID and Log ID are required.' };
  }

  try {
    const { error } = await supabase
      .from('health_weight_logs')
      .delete()
      .eq('id', logId)
      .eq('user_id', userId);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message || 'Failed to delete weight log.' };
  }
}

/**
 * Fetches recent rolling weight history.
 * @param {string} userId - Authenticated user UUID
 * @param {number} [days=60] - Number of days to look back
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
export async function getWeightHistory(userId, days = 60) {
  if (!userId) {
    return { success: false, error: 'User ID is required.' };
  }

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startStr = startDate.toISOString().split('T')[0];

  try {
    const { data, error } = await supabase
      .from('health_weight_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('log_date', startStr)
      .order('log_date', { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data: data || [] };
  } catch (err) {
    return { success: false, error: err.message || 'Failed to fetch weight history.' };
  }
}

/**
 * Fetches the most recent weight log entry for a user.
 * @param {string} userId - Authenticated user UUID
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export async function getLatestWeightLog(userId) {
  if (!userId) {
    return { success: false, error: 'User ID is required.' };
  }
  try {
    const { data, error } = await supabase
      .from('health_weight_logs')
      .select('*')
      .eq('user_id', userId)
      .order('log_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message || 'Failed to fetch latest weight log.' };
  }
}


// ─── 5. NUTRITION & MEALS ─────────────────────────────────────────────────────

export const logMeal = foodService.logMeal;
export const updateMealLog = foodService.updateMealLog;
export const deleteMealLog = foodService.deleteMealLog;
export const createPersonalFood = foodService.createPersonalFood;
export const updatePersonalFood = foodService.updatePersonalFood;
export const deletePersonalFood = foodService.deletePersonalFood;
export const saveMeal = foodService.saveMeal;
export const updateFoodSettings = foodService.updateFoodSettings;
export const getFoodSummary = foodService.getFoodSummary;
export const findFoodReference = foodService.findFoodReference;

/**
 * Batch logs multiple meal items (used by Saved Meals and Repeat Yesterday).
 * Replaces direct UI calls to supabase.from('meal_logs').insert(rows).
 *
 * @param {Object} params
 * @param {string} params.userId - Authenticated user UUID
 * @param {string} [params.date=todayStr()] - YYYY-MM-DD log date
 * @param {string} [params.mealType='lunch'] - Target meal slot
 * @param {Array} params.items - Array of food item objects
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
export async function batchLogMeals({ userId, date = todayStr(), mealType = 'lunch', items = [] }) {
  if (!userId) {
    return { success: false, error: 'User ID is required.' };
  }
  if (!items || items.length === 0) {
    return { success: false, error: 'No meal items provided.' };
  }

  const rows = items.map((item) => ({
    user_id: userId,
    date,
    meal_type: item.meal_type || mealType || 'snack',
    food_id: item.food_id || null,
    food_name: (item.food_name || 'Food').trim().slice(0, 150),
    quantity_g: Math.max(1, Math.min(50000, Number(item.quantity_g) || 100)),
    calories: Math.max(0, Math.min(10000, Number(item.calories) || 0)),
    protein: Math.max(0, Math.min(2000, Number(item.protein) || 0)),
    carbs: Math.max(0, Math.min(2000, Number(item.carbs) || 0)),
    fat: Math.max(0, Math.min(2000, Number(item.fat) || 0)),
    fiber: Math.max(0, Math.min(2000, Number(item.fiber) || 0)),
  }));

  try {
    const { data, error } = await supabase
      .from('meal_logs')
      .insert(rows)
      .select();

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data: data || [] };
  } catch (err) {
    return { success: false, error: err.message || 'Failed to batch log meals.' };
  }
}

/**
 * Deletes a saved meal combo template.
 * @param {Object} params
 * @param {string} params.userId - Authenticated user UUID
 * @param {string} params.mealId - Saved meal template UUID
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function deleteSavedMeal({ userId, mealId }) {
  if (!userId || !mealId) {
    return { success: false, error: 'User ID and Meal ID are required.' };
  }

  try {
    const { error } = await supabase
      .from('saved_meals')
      .delete()
      .eq('id', mealId)
      .eq('user_id', userId);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message || 'Failed to delete saved meal.' };
  }
}

// ─── 6. UNIFIED SNAPSHOT & TELEMETRY ──────────────────────────────────────────

/**
 * Caches/synchronizes recovery score in dexos_daily_summary for backward compatibility.
 * @param {Object} params
 * @param {string} params.userId - Authenticated user UUID
 * @param {number} params.score - Recovery score (0-100)
 * @param {string} [params.date=todayStr()] - YYYY-MM-DD date
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function syncRecoveryScore({ userId, score, date = todayStr() }) {
  if (!userId) {
    return { success: false, error: 'User ID is required.' };
  }

  try {
    const { error } = await supabase
      .from('dexos_daily_summary')
      .upsert(
        {
          user_id: userId,
          log_date: date,
          recovery_score: Math.max(0, Math.min(100, Math.round(score))),
        },
        { onConflict: 'user_id,log_date' }
      );

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message || 'Failed to sync recovery score.' };
  }
}

/**
 * Fetches recent rolling health telemetry for Dex and domain consumers.
 * @param {string} userId - Authenticated user UUID
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export async function getHealthData(userId) {
  if (!userId) {
    return { success: false, error: 'User ID is required.' };
  }
  const today = todayStr();

  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - 6);
  const startOfWeekStr = startOfWeek.toISOString().split('T')[0];

  try {
    const [sRes, wRes, mRes] = await Promise.all([
      supabase
        .from('health_sleep_logs')
        .select('*')
        .eq('user_id', userId)
        .gte('sleep_date', startOfWeekStr)
        .order('sleep_date', { ascending: false }),
      supabase
        .from('health_water_logs')
        .select('*')
        .eq('user_id', userId)
        .eq('log_date', today),
      supabase
        .from('health_move_logs')
        .select('*')
        .eq('user_id', userId)
        .gte('log_date', startOfWeekStr)
        .order('log_date', { ascending: false }),
    ]);

    return {
      success: true,
      data: {
        sleepLogs: sRes.data || [],
        waterLogs: wRes.data || [],
        moveLogs: mRes.data || [],
      },
    };
  } catch (err) {
    return { success: false, error: err.message || 'Failed to fetch health data.' };
  }
}

/**
 * Single authoritative method for Zenith and Dex to retrieve a cohesive physical snapshot.
 * Eliminates 4 separate ad-hoc table queries in Zenith.
 *
 * @param {string} userId - Authenticated user UUID
 * @param {string} [date=todayStr()] - Target YYYY-MM-DD
 * @returns {Promise<{
 *   success: boolean,
 *   state?: Object,
 *   error?: string
 * }>}
 */
export async function getHealthSnapshot(userId, date = todayStr()) {
  if (!userId) {
    return { success: false, error: 'User ID is required.' };
  }

  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - 6);
  const startOfWeekStr = startOfWeek.toISOString().split('T')[0];

  try {
    const [sRes, wRes, mRes, mealRes, wtRes, setRes] = await Promise.all([
      supabase
        .from('health_sleep_logs')
        .select('*')
        .eq('user_id', userId)
        .gte('sleep_date', startOfWeekStr)
        .order('sleep_date', { ascending: false }),
      supabase
        .from('health_water_logs')
        .select('*')
        .eq('user_id', userId)
        .eq('log_date', date),
      supabase
        .from('health_move_logs')
        .select('*')
        .eq('user_id', userId)
        .gte('log_date', startOfWeekStr)
        .order('log_date', { ascending: false }),
      supabase
        .from('meal_logs')
        .select('*')
        .eq('user_id', userId)
        .eq('date', date)
        .order('created_at', { ascending: true }),
      supabase
        .from('health_weight_logs')
        .select('*')
        .eq('user_id', userId)
        .order('log_date', { ascending: false })
        .limit(7),
      supabase
        .from('food_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle(),
    ]);

    const telemetry = {
      sleepLogs: sRes.data || [],
      waterLogs: wRes.data || [],
      moveLogs: mRes.data || [],
      mealLogs: mealRes.data || [],
      weightLogs: wtRes.data || [],
      todayStr: date,
    };

    const settings = setRes.data || {};
    const state = computeHealthState(telemetry, settings);

    return {
      success: true,
      state,
      raw: {
        sleepLogs: telemetry.sleepLogs,
        waterLogs: telemetry.waterLogs,
        moveLogs: telemetry.moveLogs,
        mealLogs: telemetry.mealLogs,
        weightLogs: telemetry.weightLogs,
        settings,
      },
    };
  } catch (err) {
    return { success: false, error: err.message || 'Failed to fetch health snapshot.' };
  }
}

/**
 * Loads full comprehensive telemetry for the Health page surface.
 * Replaces fragmented multi-table fetchers with a single service entry point.
 *
 * @param {string} userId - Authenticated user UUID
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export async function getHealthTelemetry(userId) {
  if (!userId) {
    return { success: false, error: 'User ID is required.' };
  }

  const today = todayStr();
  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - 6);
  const startOfWeekStr = startOfWeek.toISOString().split('T')[0];

  const start90Days = new Date();
  start90Days.setDate(start90Days.getDate() - 90);
  const start90DaysStr = start90Days.toISOString().split('T')[0];

  try {
    const [
      sRes,
      wRes,
      mRes,
      mealRes,
      wtRes,
      sumRes,
      setRes,
      savedRes,
      libRes,
    ] = await Promise.all([
      supabase
        .from('health_sleep_logs')
        .select('*')
        .eq('user_id', userId)
        .gte('sleep_date', startOfWeekStr)
        .order('sleep_date', { ascending: false }),
      supabase
        .from('health_water_logs')
        .select('*')
        .eq('user_id', userId)
        .eq('log_date', today),
      supabase
        .from('health_move_logs')
        .select('*')
        .eq('user_id', userId)
        .gte('log_date', startOfWeekStr)
        .order('log_date', { ascending: false }),
      supabase
        .from('meal_logs')
        .select('*')
        .eq('user_id', userId)
        .eq('date', today)
        .order('created_at', { ascending: true }),
      supabase
        .from('health_weight_logs')
        .select('*')
        .eq('user_id', userId)
        .order('log_date', { ascending: false })
        .limit(30),
      supabase
        .from('dexos_daily_summary')
        .select('*')
        .eq('user_id', userId)
        .gte('log_date', start90DaysStr),
      supabase
        .from('food_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle(),
      supabase
        .from('saved_meals')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
      supabase
        .from('user_food_library')
        .select('*')
        .eq('user_id', userId)
        .order('food_name', { ascending: true }),
    ]);

    return {
      success: true,
      data: {
        sleepLogs: sRes.data || [],
        waterLogs: wRes.data || [],
        moveLogs: mRes.data || [],
        mealLogs: mealRes.data || [],
        weightLogs: wtRes.data || [],
        dailySummaries: sumRes.data || [],
        settings: setRes.data || null,
        savedMeals: savedRes.data || [],
        personalFoods: libRes.data || [],
      },
    };
  } catch (err) {
    return { success: false, error: err.message || 'Failed to load health telemetry.' };
  }
}

// ─── DOMAIN HISTORY FUNCTIONS & CONVENIENCE ALIASES ──────────────────────────

/**
 * Fetches recent rolling sleep history.
 */
export async function getSleepHistory(userId, days = 30) {
  if (!userId) return { success: false, error: 'User ID is required.' };
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startStr = startDate.toISOString().split('T')[0];
  try {
    const { data, error } = await supabase
      .from('health_sleep_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('sleep_date', startStr)
      .order('sleep_date', { ascending: false });
    if (error) return { success: false, error: error.message };
    return { success: true, data: data || [] };
  } catch (err) {
    return { success: false, error: err.message || 'Failed to fetch sleep history.' };
  }
}

/**
 * Fetches recent rolling water history.
 */
export async function getWaterHistory(userId, days = 30) {
  if (!userId) return { success: false, error: 'User ID is required.' };
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startStr = startDate.toISOString().split('T')[0];
  try {
    const { data, error } = await supabase
      .from('health_water_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('log_date', startStr)
      .order('log_date', { ascending: false });
    if (error) return { success: false, error: error.message };
    return { success: true, data: data || [] };
  } catch (err) {
    return { success: false, error: err.message || 'Failed to fetch water history.' };
  }
}

/**
 * Fetches recent rolling activity / workout history.
 */
export async function getActivityHistory(userId, days = 30) {
  if (!userId) return { success: false, error: 'User ID is required.' };
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startStr = startDate.toISOString().split('T')[0];
  try {
    const { data, error } = await supabase
      .from('health_move_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('log_date', startStr)
      .order('log_date', { ascending: false });
    if (error) return { success: false, error: error.message };
    return { success: true, data: data || [] };
  } catch (err) {
    return { success: false, error: err.message || 'Failed to fetch activity history.' };
  }
}

// Aliases matching prompt requirements
export const deleteSleep = deleteSleepLog;
export const deleteWater = deleteWaterLog;
export const deleteActivity = deleteActivityLog;
export const deleteWeight = deleteWeightLog;
export const updateMeal = updateMealLog;
export const deleteMeal = deleteMealLog;

/**
 * Fetches food and nutrition macro settings for a user.
 */
export async function getFoodSettings(userId) {
  if (!userId) {
    return { success: false, error: 'User ID is required.' };
  }
  try {
    const { data, error } = await supabase
      .from('food_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message || 'Failed to fetch food settings.' };
  }
}

/**
 * Fetches user's custom saved food items.
 */
export async function getPersonalFoods(userId) {
  if (!userId) return { success: false, error: 'User ID is required.' };
  try {
    const { data, error } = await supabase
      .from('user_food_library')
      .select('*')
      .eq('user_id', userId)
      .order('food_name', { ascending: true });
    if (error) return { success: false, error: error.message };
    return { success: true, data: data || [] };
  } catch (err) {
    return { success: false, error: err.message || 'Failed to fetch personal foods.' };
  }
}

/**
 * Fetches user's saved meal templates.
 */
export async function getSavedMeals(userId) {
  if (!userId) return { success: false, error: 'User ID is required.' };
  try {
    const { data, error } = await supabase
      .from('saved_meals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) return { success: false, error: error.message };
    return { success: true, data: data || [] };
  } catch (err) {
    return { success: false, error: err.message || 'Failed to fetch saved meals.' };
  }
}




