// ── DexOS Analytics & Beta Tracking ────────────────────────────────────────
// Lightweight event tracking system for beta monitoring.
// All events are stored in Supabase analytics_events table.

import { supabase } from '../supabase/index.js'

// Helper to detect if failure is caused by missing tables (PGRST205 / 42P01 / 404)
const isSchemaUnavailableError = (err) => {
  if (!err) return false
  const code = err.code || ''
  const msg = err.message || ''
  const status = err.status || err.statusCode || 0
  return (
    code === 'PGRST205' ||
    code === '42P01' ||
    status === 404 ||
    msg.includes('Could not find the table') ||
    (msg.includes('relation') && msg.includes('does not exist'))
  )
}

// Generate or retrieve a session ID (resets per browser session)
const getSessionId = () => {
  let sid = sessionStorage.getItem('zyrbit_session_id')
  if (!sid) {
    sid = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    sessionStorage.setItem('zyrbit_session_id', sid)
  }
  return sid
}

/**
 * Track a single analytics event.
 * Non-blocking — does not throw or await in callers.
 * 
 * @param {string} userId
 * @param {string} eventName  — e.g. 'habit_completed', 'dex_chat_sent'
 * @param {object} properties — optional metadata
 */
export const trackEvent = async (userId, eventName, properties = {}) => {
  if (!userId || !eventName) return
  try {
    const { error } = await supabase.from('analytics_events').insert({
      user_id:    userId,
      event_name: eventName,
      properties: properties,
      session_id: getSessionId(),
    })
    if (error) {
      if (!isSchemaUnavailableError(error)) {
        console.warn('[Analytics] Failed to record event:', eventName, error.message)
      }
    }
  } catch (e) {
    if (!isSchemaUnavailableError(e)) {
      console.warn('[Analytics] Unexpected event tracking error:', eventName, e.message)
    }
  }
}

// ── Predefined Event Helpers ─────────────────────────────────────────────────

export const trackHabitCompleted = (userId, habitId, habitName, zone) =>
  trackEvent(userId, 'habit_completed', { habit_id: habitId, habit_name: habitName, zone })

export const trackHabitCreated = (userId, habitId, zone) =>
  trackEvent(userId, 'habit_created', { habit_id: habitId, zone })

export const trackReflectionSubmitted = (userId) =>
  trackEvent(userId, 'reflection_submitted')

export const trackDexChatSent = (userId, personality) =>
  trackEvent(userId, 'dex_chat_sent', { personality })

export const trackWeeklyReviewViewed = (userId) =>
  trackEvent(userId, 'weekly_review_viewed')

export const trackExpenseLogged = (userId, amount) =>
  trackEvent(userId, 'expense_logged', { amount })

export const trackSleepLogged = (userId, hours) =>
  trackEvent(userId, 'sleep_logged', { hours })

export const trackWaterLogged = (userId, amountMl) =>
  trackEvent(userId, 'water_logged', { amount_ml: amountMl })

export const trackFeedbackSubmitted = (userId, category) =>
  trackEvent(userId, 'feedback_submitted', { category })

export const trackPageView = (userId, page) =>
  trackEvent(userId, 'page_view', { page })

// ── Beta Onboarding Milestone Tracker ────────────────────────────────────────

/**
 * Record a milestone in the beta_onboarding table.
 * Uses UPSERT so only the first occurrence is recorded.
 * 
 * @param {string} userId
 * @param {'first_login'|'first_habit_created'|'first_habit_completed'|'first_reflection'|'first_dex_chat'} milestone
 */
export const recordMilestone = async (userId, milestone) => {
  if (!userId || !milestone) return

  const columnMap = {
    first_login:            'first_login_at',
    first_habit_created:    'first_habit_created_at',
    first_habit_completed:  'first_habit_completed_at',
    first_reflection:       'first_reflection_at',
    first_dex_chat:         'first_dex_chat_at',
  }
  const col = columnMap[milestone]
  if (!col) return

  try {
    // Fetch existing record first to avoid overwriting non-null values
    const { data: existing, error: fetchErr } = await supabase
      .from('beta_onboarding')
      .select(col)
      .eq('user_id', userId)
      .maybeSingle()

    if (fetchErr) {
      if (!isSchemaUnavailableError(fetchErr)) {
        console.warn('[Onboarding] Milestone check failed:', milestone, fetchErr.message)
      }
      return
    }

    // Only set if not already recorded
    if (existing && existing[col]) return

    const { error: upsertErr } = await supabase.from('beta_onboarding').upsert({
      user_id:    userId,
      [col]:      new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

    if (upsertErr && !isSchemaUnavailableError(upsertErr)) {
      console.warn('[Onboarding] Milestone recording failed:', milestone, upsertErr.message)
    }
  } catch (e) {
    if (!isSchemaUnavailableError(e)) {
      console.warn('[Onboarding] Unexpected milestone error:', milestone, e.message)
    }
  }
}

/**
 * Fetch the current user's onboarding progress.
 * Returns an object of milestone keys → true/false.
 */
export const getOnboardingProgress = async (userId) => {
  if (!userId) return {}
  try {
    const { data, error } = await supabase
      .from('beta_onboarding')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) {
      if (!isSchemaUnavailableError(error)) {
        console.warn('[Onboarding] Progress query failed:', error.message)
      }
      return {}
    }

    return {
      first_login:           !!data?.first_login_at,
      first_habit_created:   !!data?.first_habit_created_at,
      first_habit_completed: !!data?.first_habit_completed_at,
      first_reflection:      !!data?.first_reflection_at,
      first_dex_chat:        !!data?.first_dex_chat_at,
    }
  } catch (e) {
    if (!isSchemaUnavailableError(e)) {
      console.warn('[Onboarding] Unexpected progress error:', e.message)
    }
    return {}
  }
}
