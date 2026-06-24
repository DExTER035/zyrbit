// ── Zyrbit Analytics & Beta Tracking ────────────────────────────────────────
// Lightweight event tracking system for beta monitoring.
// All events are stored in Supabase analytics_events table.

import { supabase } from './supabase.js'

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
    await supabase.from('analytics_events').insert({
      user_id:    userId,
      event_name: eventName,
      properties: properties,
      session_id: getSessionId(),
    })
  } catch (e) {
    // Analytics must never crash the app
    console.warn('[Analytics] Failed to track event:', eventName, e.message)
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
    const { data: existing } = await supabase
      .from('beta_onboarding')
      .select(col)
      .eq('user_id', userId)
      .maybeSingle()

    // Only set if not already recorded
    if (existing && existing[col]) return

    await supabase.from('beta_onboarding').upsert({
      user_id:    userId,
      [col]:      new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
  } catch (e) {
    console.warn('[Onboarding] Failed to record milestone:', milestone, e.message)
  }
}

/**
 * Fetch the current user's onboarding progress.
 * Returns an object of milestone keys → true/false.
 */
export const getOnboardingProgress = async (userId) => {
  if (!userId) return {}
  try {
    const { data } = await supabase
      .from('beta_onboarding')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    return {
      first_login:           !!data?.first_login_at,
      first_habit_created:   !!data?.first_habit_created_at,
      first_habit_completed: !!data?.first_habit_completed_at,
      first_reflection:      !!data?.first_reflection_at,
      first_dex_chat:        !!data?.first_dex_chat_at,
    }
  } catch {
    return {}
  }
}
