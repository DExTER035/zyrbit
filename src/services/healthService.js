/**
 * Zyrbit / DexOS — Health Domain Service
 * Pure JavaScript domain operations for hydration, sleep, workouts, and recovery metrics.
 * Reuses deterministic validators from healthCalculator.js.
 */

import { supabase } from '../lib/supabase/index.js';
import {
  validateWaterLog,
  validateSleepLog,
  validateWorkoutLog,
} from '../engines/health/index.js';

export const todayStr = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().split('T')[0];
};

/**
 * Logs a hydration entry.
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
 * Deletes a water log entry.
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

/**
 * Logs or updates a daily sleep entry.
 * @param {Object} params
 * @param {string} params.userId - Authenticated user UUID
 * @param {number} params.durationHours - Sleep duration in hours (0.5-24h)
 * @param {number} params.quality - Sleep quality score (1-5)
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

/**
 * Logs a physical activity / workout session.
 * @param {Object} params
 * @param {string} params.userId - Authenticated user UUID
 * @param {string} [params.activityType='Strength'] - Type of activity
 * @param {number} params.activeMinutes - Duration in minutes (1-1440m)
 * @param {number} [params.rpe=5] - Rate of perceived exertion (1-10)
 * @param {string|null} [params.notes=null] - Optional workout notes
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
 * Deletes an activity log entry.
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

/**
 * Caches/synchronizes recovery readiness score in dexos_daily_summary.
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
      .upsert({
        user_id: userId,
        log_date: date,
        recovery_score: Math.max(0, Math.min(100, Math.round(score))),
      }, { onConflict: 'user_id,log_date' });

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message || 'Failed to sync recovery score.' };
  }
}

/**
 * Fetches recent rolling health telemetry.
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
      supabase.from('health_sleep_logs').select('*').eq('user_id', userId).gte('sleep_date', startOfWeekStr).order('sleep_date', { ascending: false }),
      supabase.from('health_water_logs').select('*').eq('user_id', userId).eq('log_date', today),
      supabase.from('health_move_logs').select('*').eq('user_id', userId).gte('log_date', startOfWeekStr).order('log_date', { ascending: false }),
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
