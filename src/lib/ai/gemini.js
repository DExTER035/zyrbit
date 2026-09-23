// ── DexOS Unified AI Service ─────────────────────────────────────────────────
// Single source of truth for all Gemini API calls in the app.
// Server-side architecture: Calls Supabase Edge Function 'zyra' to protect secrets.
import { supabase } from '../supabase/index.js';

/**
 * Core low-level fetch to Gemini via secure Edge Function proxy.
 * Transmits prompt telemetry to server-side Edge Function 'zyra'.
 * @param {Array<{role: 'user'|'model', text: string}>} messages
 * @param {string?} systemPrompt  – if provided, prepended as user→model exchange
 */
export const askZyra = async (messages, systemPrompt = null) => {
  try {
    const { data, error } = await supabase.functions.invoke('zyra', {
      body: { messages, systemPrompt }
    })

    if (error) {
      console.warn('Edge Function proxy notice:', error.message)
      const status = error.status || error.context?.status
      if (status === 429) {
        throw new Error('Rate limit exceeded. Dex needs a breather! 🧊 Please try again in a minute.')
      }
      if (status === 401) {
        throw new Error('Authentication required. Please sign in to speak with Dex.')
      }
      throw new Error('Dex AI is temporarily unavailable. Direct commands work offline.')
    }

    if (data?.error) {
      throw new Error(data.error)
    }

    if (!data?.text) {
      throw new Error('AI service returned empty response.')
    }

    return data.text

  } catch (err) {
    console.error('askZyra error:', err.message)
    if (err.message && (err.message.includes('non-2xx') || err.message.includes('Edge Function'))) {
      throw new Error('Dex AI is temporarily unavailable. Direct commands work offline.')
    }
    throw err
  }
}

/**
 * Shorthand: single-prompt text generation.
 */
export const generateContent = async (prompt) => {
  return askZyra([{ role: 'user', text: prompt }])
}

/**
 * Zyra coaching: personalised wellness advice under 100 words.
 */
export const getZyraCoaching = async (context) => {
  return askZyra([{
    role: 'user',
    text: `You are Dex, AI wellness coach inside DexOS Life OS.
Give warm motivational coaching under 100 words.
Reference active user goals and habits when relevant.
End with: "This is general wellness advice, not medical advice."
Context: ${context}`
  }])
}

/**
 * Weekly progress report: ~150 word personalised summary.
 */
export const getWeeklyReport = async (context) => {
  return askZyra([{
    role: 'user',
    text: `You are Dex inside DexOS Life OS.
Generate a weekly progress report under 150 words.
Be specific about the user's habits, tasks, and overall progress.
Context: ${context}`
  }])
}

