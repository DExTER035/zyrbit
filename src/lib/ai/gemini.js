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
      console.error('Edge Function proxy error:', error.message)
      if (error.status === 429) {
        throw new Error('Rate limit exceeded. Dex needs a breather! 🧊 Please try again in a minute.')
      }
      throw new Error(error.message || 'AI service temporarily unavailable.')
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

/**
 * Dex AI nutrition analyzer helper
 */
export const getNutritionInsights = async (historyDataText, goalSettingsText) => {
  return askZyra([{
    role: 'user',
    text: `You are Dex, the AI nutrition intelligence coach inside DexOS.
Analyze the user's recent daily summaries of nutrition intake (calories, protein, carbs, fat, water, and weight) and compare them with their goals.

Goal Settings:
${goalSettingsText}

Recent Nutrition Summaries (past 30 days):
${historyDataText}

Based on this historical data, identify interesting and subtle eating patterns, deficits, spikes, anomalies, or consistency levels.
List exactly 3 to 4 bullet points of insights and suggested improvements.
Rules for insights:
1. Be direct, precise, and calm. Do not sound generic or write introductions/conclusions.
2. Keep each bullet point under 15 words.
3. Call out specific numbers or percentages when relevant (e.g. "You consistently eat 15% less protein on weekends", "You hit your water goal 18 out of 30 days").
4. If there is insufficient data, provide helpful tips on what metrics they should focus on.

End with: "This analysis is based on your logged metrics and is not medical advice."`
  }])
}
