const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`

export const askZyra = async (messages) => {
  try {
    const key = import.meta.env.VITE_GEMINI_API_KEY
    
    if (!key || key === 'undefined' || key === '') {
      throw new Error('API key missing')
    }

    const contents = messages.map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.text }]
    }))

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents })
      }
    )

    if (!res.ok) {
      const err = await res.json()
      console.error('Gemini error:', err)
      throw new Error(err.error?.message || 'API failed')
    }

    const data = await res.json()
    return data.candidates[0].content.parts[0].text

  } catch (err) {
    console.error('askZyra error:', err.message)
    throw err
  }
}

export const getZyraCoaching = async (context) => {
  const systemMsg = {
    role: 'user',
    text: `You are Zyra, AI wellness coach inside Zyrbit.
Give warm motivational coaching under 100 words.
Reference user element rank when relevant.
End with: "This is general wellness advice, not medical advice."
Context: ${context}`
  }
  return askZyra([systemMsg])
}

export const getWeeklyReport = async (context) => {
  const systemMsg = {
    role: 'user',
    text: `You are Zyra inside Zyrbit habit app.
Generate a weekly orbit report under 150 words.
Be specific about the user's habits and progress.
Context: ${context}`
  }
  return askZyra([systemMsg])
}
