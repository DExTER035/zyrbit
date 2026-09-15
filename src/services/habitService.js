/**
 * Zyrbit / DexOS — Habit Domain Service
 * Pure JavaScript domain operations for habits, activity logs, skips, and streaks.
 * Pure Supabase mutations without React state dependencies.
 */

import { supabase } from '../lib/supabase/index.js';

export const todayStr = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().split('T')[0];
};

/**
 * Toggles a habit's daily completion status in activity_log.
 * @param {Object} params
 * @param {string} params.userId - Authenticated user UUID
 * @param {string} params.habitId - Habit UUID
 * @param {string} [params.date=todayStr()] - YYYY-MM-DD completion date
 * @param {boolean} [params.isCompleted=false] - Current completion state
 * @returns {Promise<{success: boolean, completed: boolean, data?: Object, error?: string}>}
 */
export async function toggleHabit({ userId, habitId, date = todayStr(), isCompleted = false }) {
  if (!userId || !habitId) {
    return { success: false, completed: isCompleted, error: 'User ID and Habit ID are required.' };
  }

  try {
    if (!isCompleted) {
      // Mark habit as completed
      const { data, error } = await supabase
        .from('activity_log')
        .insert({
          user_id: userId,
          habit_id: habitId,
          completed_date: date,
          status: 'completed',
        })
        .select()
        .single();

      if (error) {
        return { success: false, completed: false, error: error.message };
      }
      return { success: true, completed: true, data };
    } else {
      // Undo habit completion
      const { error } = await supabase
        .from('activity_log')
        .delete()
        .eq('user_id', userId)
        .eq('habit_id', habitId)
        .eq('completed_date', date)
        .eq('status', 'completed');

      if (error) {
        return { success: false, completed: true, error: error.message };
      }
      return { success: true, completed: false };
    }
  } catch (err) {
    return { success: false, completed: isCompleted, error: err.message || 'Failed to toggle habit.' };
  }
}

/**
 * Skips a habit for today with streak resilience.
 * @param {Object} params
 * @param {string} params.userId - Authenticated user UUID
 * @param {string} params.habitId - Habit UUID
 * @param {string} [params.date=todayStr()] - YYYY-MM-DD date
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export async function skipHabit({ userId, habitId, date = todayStr() }) {
  if (!userId || !habitId) {
    return { success: false, error: 'User ID and Habit ID are required.' };
  }

  try {
    const { data, error } = await supabase
      .from('activity_log')
      .insert({
        user_id: userId,
        habit_id: habitId,
        completed_date: date,
        status: 'skipped',
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message || 'Failed to skip habit.' };
  }
}

/**
 * Creates a new habit definition.
 * @param {Object} params
 * @param {string} params.userId - Authenticated user UUID
 * @param {string} params.name - Habit title
 * @param {string} [params.zone='mind'] - 'mind' | 'body' | 'growth' | 'soul'
 * @param {string} [params.icon='🪐'] - Emoji icon
 * @param {string} [params.frequency='daily'] - Habit frequency
 * @param {boolean} [params.reminderEnabled=false] - Whether reminder notification is enabled
 * @param {string|null} [params.reminderTime=null] - HH:MM reminder time
 * @param {string} [params.color='#5EE6F5'] - Zone accent color
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export async function createHabit({
  userId,
  name,
  zone = 'mind',
  icon = '🪐',
  frequency = 'daily',
  reminderEnabled = false,
  reminderTime = null,
  color = '#5EE6F5',
}) {
  if (!userId) {
    return { success: false, error: 'User ID is required.' };
  }
  const cleanName = (name || '').trim();
  if (!cleanName) {
    return { success: false, error: 'Habit name cannot be empty.' };
  }

  const payload = {
    user_id: userId,
    name: cleanName,
    zone,
    icon: icon || '🪐',
    frequency: frequency || 'daily',
    reminder_enabled: Boolean(reminderEnabled),
    reminder_time: reminderTime || null,
    color,
  };

  try {
    const { data, error } = await supabase
      .from('habits')
      .insert([payload])
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message || 'Failed to create habit.' };
  }
}

/**
 * Updates an existing habit definition.
 * @param {Object} params
 * @param {string} params.userId - Authenticated user UUID
 * @param {string} params.habitId - Habit UUID
 * @param {Object} params.updates - Updated fields
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export async function updateHabit({ userId, habitId, ...updates }) {
  if (!userId || !habitId) {
    return { success: false, error: 'User ID and Habit ID are required.' };
  }

  try {
    const { data, error } = await supabase
      .from('habits')
      .update(updates)
      .eq('id', habitId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message || 'Failed to update habit.' };
  }
}

/**
 * Deletes a habit and associated data.
 * @param {Object} params
 * @param {string} params.userId - Authenticated user UUID
 * @param {string} params.habitId - Habit UUID
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function deleteHabit({ userId, habitId }) {
  if (!userId || !habitId) {
    return { success: false, error: 'User ID and Habit ID are required.' };
  }

  try {
    const { error } = await supabase
      .from('habits')
      .delete()
      .eq('id', habitId)
      .eq('user_id', userId);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message || 'Failed to delete habit.' };
  }
}

/**
 * Submits daily evening reflection / journal entry.
 * @param {Object} params
 * @param {string} params.userId - Authenticated user UUID
 * @param {string|number} [params.mood='good'] - Mood rating or descriptor
 * @param {string} [params.content] - Journal entry text
 * @param {string} [params.reflectionText] - Alias for content
 * @param {number|null} [params.completionPct=null] - Daily habit completion %
 * @param {string} [params.date=todayStr()] - YYYY-MM-DD entry date
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export async function submitDailyReflection({
  userId,
  mood = 'good',
  content,
  reflectionText,
  completionPct = null,
  date = todayStr(),
}) {
  if (!userId) {
    return { success: false, error: 'User ID is required.' };
  }

  const text = (content || reflectionText || '').trim();
  const payload = {
    user_id: userId,
    entry_date: date,
    content: text,
    mood: mood || 'good',
    completion_pct: completionPct != null ? Math.round(Number(completionPct)) : null,
    created_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase
      .from('orbit_journal')
      .insert([payload])
      .select()
      .maybeSingle();

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data: data || payload };
  } catch (err) {
    return { success: false, error: err.message || 'Failed to submit reflection.' };
  }
}

/**
 * Fetches today's active habits and completion status for a user.
 * @param {string} userId - Authenticated user UUID
 * @param {string} [date=todayStr()] - YYYY-MM-DD date
 * @returns {Promise<{
 *   success: boolean,
 *   data?: {
 *     totalHabits: number,
 *     completedToday: number,
 *     skippedToday: number,
 *     pendingToday: number,
 *     habits: Array<{id: string, name: string, frequency: string, completed: boolean, skipped: boolean}>
 *   },
 *   error?: string
 * }>}
 */
export async function getHabitsToday(userId, date = todayStr()) {
  if (!userId) {
    return { success: false, error: 'User ID is required.' };
  }

  try {
    const today = date || todayStr();
    const [habRes, logRes] = await Promise.all([
      supabase
        .from('habits')
        .select('id, name, frequency')
        .eq('user_id', userId)
        .eq('is_active', true),
      supabase
        .from('activity_log')
        .select('habit_id, status')
        .eq('user_id', userId)
        .eq('completed_date', today),
    ]);

    if (habRes.error) {
      return { success: false, error: habRes.error.message };
    }
    if (logRes.error) {
      return { success: false, error: logRes.error.message };
    }

    const habits = habRes.data || [];
    const logs = logRes.data || [];

    const completedIds = new Set(
      logs.filter((l) => l.status === 'completed').map((l) => l.habit_id)
    );
    const skippedIds = new Set(
      logs.filter((l) => l.status === 'skipped').map((l) => l.habit_id)
    );

    const habitSummary = habits.map((h) => ({
      id: h.id,
      name: h.name,
      frequency: h.frequency,
      completed: completedIds.has(h.id),
      skipped: skippedIds.has(h.id),
    }));

    return {
      success: true,
      data: {
        totalHabits: habits.length,
        completedToday: completedIds.size,
        skippedToday: skippedIds.size,
        pendingToday: habits.filter(
          (h) => !completedIds.has(h.id) && !skippedIds.has(h.id)
        ).length,
        habits: habitSummary,
      },
    };
  } catch (err) {
    return { success: false, error: err.message || 'Failed to fetch habits today.' };
  }
}

