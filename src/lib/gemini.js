// ── Zyrbit Unified AI Service ─────────────────────────────────────────────────
// Single source of truth for all Gemini API calls in the app.
// Model: gemini-2.0-flash (latest supported in free tier)

const GEMINI_MODEL = 'gemini-2.0-flash'
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

const getKey = () => {
  const key = import.meta.env.VITE_GEMINI_API_KEY
  if (!key || key === 'undefined' || key === '') {
    throw new Error('Gemini API key missing. Set VITE_GEMINI_API_KEY in your .env file.')
  }
  return key
}

/**
 * Core low-level fetch to Gemini. Supports optional system prompt injection.
 * @param {Array<{role: 'user'|'model', text: string}>} messages
 * @param {string?} systemPrompt  – if provided, prepended as user→model exchange
 */
export const askZyra = async (messages, systemPrompt = null) => {
  try {
    const key = getKey()

    const contents = []

    // Inject system prompt as a user→model prologue
    if (systemPrompt) {
      contents.push({ role: 'user', parts: [{ text: systemPrompt }] })
      contents.push({ role: 'model', parts: [{ text: 'Understood. Ready to assist.' }] })
    }

    for (const m of messages) {
      contents.push({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }]
      })
    }

    const res = await fetch(`${GEMINI_BASE}/${GEMINI_MODEL}:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents })
    })

    if (!res.ok) {
      const err = await res.json()
      console.error('Gemini API error:', err)
      if (res.status === 429) {
        throw new Error('Rate limit exceeded. Dex needs a breather! 🧊 Please try again in a minute.')
      }
      throw new Error(err.error?.message || `Gemini responded with ${res.status}`)
    }

    const data = await res.json()

    if (data.error) throw new Error(`API error ${data.error.code}: ${data.error.message}`)
    if (!data.candidates) {
      throw new Error(`No candidates. Block reason: ${data.promptFeedback?.blockReason || 'unknown'}`)
    }

    return data.candidates[0].content.parts[0].text

  } catch (err) {
    console.error('askZyra error:', err.message)
    throw err
  }
}

/**
 * Shorthand: single-prompt text generation (no conversation history).
 * Used for generating card content, summaries, quiz questions, etc.
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
    text: `You are Dex, AI wellness coach inside Zyrbit Life OS.
Give warm motivational coaching under 100 words.
Reference user rank and active habits when relevant.
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
    text: `You are Dex inside Zyrbit Life OS.
Generate a weekly progress report under 150 words.
Be specific about the user's habits, tasks, and overall progress.
Context: ${context}`
  }])
}
