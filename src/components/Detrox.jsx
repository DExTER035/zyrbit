import React, { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { computeGravityScore } from '../lib/gravity'

export default function Detrox({ user }) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [contextData, setContextData] = useState(null)
  const [inputVal, setInputVal] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const hasAutoGreeted = useRef(false)

  // Floating Button Pulse
  const [pulse, setPulse] = useState(false)
  useEffect(() => {
    const t = setInterval(() => setPulse(p => !p), 3000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // Core send function — defined early so it can be referenced anywhere
  const handleSend = useCallback(async (customPrompt = null, forcedContext = null, ctx = null) => {
    const textToSend = customPrompt || inputVal
    if (!textToSend.trim()) return

    if (!customPrompt) {
      setMessages(prev => [...prev, { role: 'user', content: textToSend }])
      setInputVal('')
    }
    setIsLoading(true)

    const API_KEY = import.meta.env.VITE_GEMINI_API_KEY
    const useCtx = ctx || forcedContext || contextData

    const sysPrompt = `You are Detrox, the AI built into Zyrbit — a habit and life tracking app for Indian college students. You have full access to this student's data.
Context Data: ${JSON.stringify(useCtx)}

You speak like a brutally honest, sharp senior who genuinely wants the student to win — not a motivational poster, not a corporate assistant. You use casual Indian English where natural. You reference their actual data in every response. Never give generic advice. If their data looks bad, say so directly.
Keep responses under 120 words. Be specific, be real.`

    // Build message history in Gemini format
    const historyMessages = customPrompt
      ? []
      : messages.map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        }))

    const contents = [
      ...historyMessages,
      { role: 'user', parts: [{ text: textToSend }] }
    ]

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents,
            system_instruction: { parts: [{ text: sysPrompt }] }
          })
        }
      )

      if (!response.ok) {
        const errBlock = await response.json()
        console.error('Gemini error:', errBlock)
        setMessages(prev => [...prev, { role: 'assistant', content: `[Error: ${errBlock?.error?.message || 'Unable to reach AI. Check API key.'}]` }])
      } else {
        const data = await response.json()
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '[No response from AI]'
        setMessages(prev => [...prev, { role: 'assistant', content: text }])
      }
    } catch (e) {
      console.error(e)
      setMessages(prev => [...prev, { role: 'assistant', content: '[Network Error: Failed to connect to AI. Check your connection.]' }])
    } finally {
      setIsLoading(false)
    }
  }, [inputVal, messages, contextData])

  // Fetch context when chat opens
  useEffect(() => {
    if (!user || !isOpen) return

    const buildContext = async () => {
      try {
        const todayStr = new Date().toLocaleDateString('en-CA')

        const gravityScore = await computeGravityScore(supabase, user.id)

        const { data: habits } = await supabase.from('habits').select('*').eq('user_id', user.id)
        const { data: activity } = await supabase.from('activity_log').select('*').eq('user_id', user.id)

        let habitsTodayDone = 0
        let habitsTotal = habits?.length || 0
        let longestStreakHabit = 'None'
        let longestStreakDays = 0

        if (habits && activity) {
          habitsTodayDone = habits.filter(h =>
            activity.some(a => a.habit_id === h.id && a.completed_date === todayStr && a.status === 'completed')
          ).length

          habits.forEach(h => {
            if ((h.streak_count || 0) > longestStreakDays) {
              longestStreakDays = h.streak_count
              longestStreakHabit = h.name
            }
          })
        }

        const { data: studySessions } = await supabase
          .from('study_sessions')
          .select('duration_minutes, session_date, created_at')
          .eq('user_id', user.id)
        let studyMinutes = 0
        if (studySessions) {
          studySessions.forEach(s => {
            const dt = s.session_date || s.created_at || ''
            if (dt.startsWith(todayStr)) studyMinutes += (s.duration_minutes || 0)
          })
        }

        const { data: expenses } = await supabase
          .from('expense_logs')
          .select('amount, date')
          .eq('user_id', user.id)
        let spentToday = 0
        if (expenses) {
          expenses.forEach(e => {
            if (e.date && e.date.startsWith(todayStr)) spentToday += Number(e.amount || 0)
          })
        }

        const ctx = {
          gravityScore,
          habitsToday: `${habitsTodayDone}/${habitsTotal}`,
          longestStreak: `${longestStreakHabit} (${longestStreakDays} days)`,
          nextExam: 'Not tracked yet',
          studyHoursToday: `${(studyMinutes / 60).toFixed(1)} hrs`,
          moneySpentToday: `₹${spentToday}`,
          dailyBudget: '₹200',
          screenTimeToday: '3.5 hrs'
        }

        setContextData(ctx)

        // Auto-greet only once per session
        if (!hasAutoGreeted.current) {
          hasAutoGreeted.current = true
          handleSend(
            'Hi Detrox. Give me my brutally honest daily briefing based on my data. Keep it under 60 words.',
            null,
            ctx
          )
        }
      } catch (e) {
        console.error('Context fetch error:', e)
      }
    }

    buildContext()
  }, [user, isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  // Reset auto-greet when chat is closed
  const handleClose = () => {
    setIsOpen(false)
    setMessages([])
    hasAutoGreeted.current = false
  }

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <div
          onClick={() => setIsOpen(true)}
          className="animate-detroxPulse"
          style={{
            position: 'fixed', bottom: 155, right: 20, zIndex: 100,
            width: 56, height: 56, borderRadius: '50%',
            background: '#7F77DD', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: pulse ? '0 0 20px #7F77DD80' : '0 4px 12px rgba(0,0,0,0.5)',
            transition: 'all 0.5s ease', cursor: 'pointer'
          }}
        >
          <span style={{ color: '#FFF', fontSize: 22, fontWeight: 900 }}>D</span>
        </div>
      )}

      {/* Full Screen Chat Drawer */}
      {isOpen && (
        <div
          className="animate-slideUpModal"
          style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            background: '#0a0a0a', zIndex: 300, display: 'flex', flexDirection: 'column'
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderBottom: '1px solid #1a1a24' }}>
            <div>
              <h2 style={{ color: '#7F77DD', fontSize: 24, fontWeight: 900, margin: 0, letterSpacing: -1 }}>Detrox</h2>
              <div style={{ fontSize: 11, color: '#666', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5 }}>AI Planner</div>
            </div>
            <button onClick={handleClose} style={{ background: 'transparent', border: 'none', color: '#666', fontSize: 24, cursor: 'pointer' }}>✕</button>
          </div>

          {/* Chat Area */}
          <div style={{ flex: 1, padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {messages.length === 0 && !isLoading && (
              <div style={{ alignSelf: 'center', color: '#333', fontSize: 13, marginTop: 40, textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>🤖</div>
                <div>Loading your data...</div>
              </div>
            )}
            {messages.map((m, i) =>
              m.role === 'assistant' ? (
                <div key={i} style={{ alignSelf: 'flex-start', background: '#1a1a1a', color: '#FFF', padding: '12px 16px', borderRadius: '16px 16px 16px 0', maxWidth: '85%', fontSize: 14, lineHeight: 1.6 }}>
                  {m.content}
                </div>
              ) : (
                <div key={i} style={{ alignSelf: 'flex-end', background: '#7F77DD', color: '#FFF', padding: '12px 16px', borderRadius: '16px 16px 0 16px', maxWidth: '85%', fontSize: 14, lineHeight: 1.5 }}>
                  {m.content}
                </div>
              )
            )}
            {isLoading && (
              <div style={{ alignSelf: 'flex-start', color: '#7F77DD', fontSize: 12, fontWeight: 700, padding: 8 }}>
                Detrox is analyzing...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <div style={{ padding: '16px 20px', borderTop: '1px solid #1a1a24', display: 'flex', gap: 12, background: '#0a0a0a' }}>
            <input
              type="text"
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !isLoading && handleSend()}
              placeholder="Ask Detrox anything..."
              style={{ flex: 1, background: '#141418', border: '1px solid #1e1e24', borderRadius: 100, padding: '12px 20px', color: '#FFF', fontSize: 14, outline: 'none' }}
              disabled={isLoading}
            />
            <button
              onClick={() => handleSend()}
              disabled={isLoading || !inputVal.trim()}
              style={{ background: '#7F77DD', color: '#FFF', border: 'none', borderRadius: 100, width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', opacity: (isLoading || !inputVal.trim()) ? 0.5 : 1 }}
            >
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  )
}
