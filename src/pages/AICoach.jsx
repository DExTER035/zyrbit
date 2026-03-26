import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../components/BottomNav.jsx'
import { showToast } from '../components/Toast.jsx'
import { supabase } from '../lib/supabase.js'
import { earnZyrons, getWallet } from '../lib/zyrons.js'
import { getRankByZyrons } from '../lib/ranks.js'
import { computeGravityScore } from '../lib/gravity.js'

// --- GEMINI API HELPERS ---
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`

const sendToZyra = async (messages, systemPrompt) => {
  try {
    const res = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { role: 'user', parts: [{ text: systemPrompt }] },
          { role: 'model', parts: [{ text: 'Understood. I am Zyra, ready to help.' }] },
          ...messages.map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.text }]
          }))
        ]
      })
    })
    const data = await res.json()
    console.log('Gemini full response:', JSON.stringify(data))
    if (data.error) throw new Error(`API error ${data.error.code}: ${data.error.message}`)
    if (!data.candidates) throw new Error(`No candidates. Status: ${data.promptFeedback?.blockReason || 'unknown'}`)
    return data.candidates[0].content.parts[0].text
  } catch (err) {
    console.error('Zyra error:', err)
    throw err
  }
}

const generateCardContent = async (prompt) => {
  try {
    const res = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    })
    const data = await res.json()
    return data.candidates[0].content.parts[0].text.trim()
  } catch (e) {
    return null
  }
}

// --- TAB 1: ZYRA ---
function ZyraTab({ userContext, earn }) {
  const [history, setHistory] = useState(() => {
    try { const saved = localStorage.getItem('zyrbit_zyra_chat'); return saved ? JSON.parse(saved) : [] }
    catch { return [] }
  })
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [streamingId, setStreamingId] = useState(null)
  const [personality, setPersonality] = useState(() => localStorage.getItem('zyrbit_personality') || 'Supportive')
  const [showSettings, setShowSettings] = useState(false)
  
  const bottomRef = useRef(null)

  useEffect(() => { localStorage.setItem('zyrbit_zyra_chat', JSON.stringify(history.slice(-50))) }, [history])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [history, loading, streamingId])

  const personalities = {
    Supportive: {
      color: '#ce93d8', border: '#9c27b0', bg: '#9c27b015',
      prompt: `You are Zyra, warm AI wellness coach inside Zyrbit habit app. User data: ${JSON.stringify(userContext)}. Give encouraging, specific coaching under 80 words. Reference their rank and streak when relevant. End every response with: This is wellness advice, not medical advice.`
    },
    Strict: {
      color: '#f87171', border: '#ef4444', bg: '#ef444415',
      prompt: `You are Zyra in STRICT mode — brutally honest like a drill sergeant. User data: ${JSON.stringify(userContext)}. No sugarcoating. Call out excuses directly. Under 80 words. End with: This is wellness advice, not medical advice.`
    },
    Zen: {
      color: '#81c784', border: '#4caf50', bg: '#4caf5015',
      prompt: `You are Zyra in ZEN mode — calm and philosophical like a wise mentor. User data: ${JSON.stringify(userContext)}. Use metaphors and peaceful guidance. Under 80 words. End with: This is wellness advice, not medical advice.`
    }
  }

  const handleSend = async (text = input) => {
    if (!text.trim() || loading) return
    const newMsg = { role: 'user', text: text.trim(), id: Date.now() }
    const updated = [...history, newMsg]
    setHistory(updated)
    setInput('')
    setLoading(true)

    try {
      const fullText = await sendToZyra(updated, personalities[personality].prompt)
      const zyraMsg = { role: 'model', text: '', id: Date.now() + 1, fullText }
      setHistory(prev => [...prev, zyraMsg])
      setLoading(false)
      setStreamingId(zyraMsg.id)
      earn(2, 'Zyra message')

      // Stream character by character
      let i = 0
      const interval = setInterval(() => {
        setHistory(prev => prev.map(m => {
          if (m.id === zyraMsg.id) return { ...m, text: fullText.slice(0, i + 1) }
          return m
        }))
        i++
        if (i >= fullText.length) {
          clearInterval(interval)
          setStreamingId(null)
          setHistory(prev => prev.map(m => m.id === zyraMsg.id ? { ...m, text: fullText } : m))
        }
      }, 16)
    } catch (err) {
      setLoading(false)
      console.error('Zyra error full:', err)
      const errMsg = err?.message || 'Unknown error'
      const zyraErrMsg = { role: 'model', text: `Zyra is taking a break 🧊 (${errMsg})`, id: Date.now() + 1, fullText: '' }
      setHistory(prev => [...prev, zyraErrMsg])
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Top Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ position: 'relative' }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#1a0a2e', border: '1px solid #ce93d8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ce93d8', fontWeight: 900, fontSize: 16, zIndex: 2, position: 'relative' }}>Z</div>
            <div style={{ position: 'absolute', inset: -2, background: '#9c27b0', borderRadius: '50%', opacity: 0.3, animation: 'zyraPulse 2s infinite', zIndex: 1 }} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#e8e8f0' }}>Zyra</div>
            <div style={{ fontSize: 10, color: personalities[personality].color }}>{personality} Mode Active</div>
          </div>
        </div>
        <button onClick={() => setShowSettings(true)} style={{ background: 'none', border: 'none', color: '#bbb', fontSize: 20, cursor: 'pointer' }}>⚙️</button>
      </div>

      {/* Context Bar */}
      {userContext && (
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none', marginBottom: 12, paddingBottom: 4 }}>
          <div style={{ flexShrink: 0, padding: '4px 10px', background: '#0a0a12', border: '1px solid #1e1e2a', borderRadius: 100, fontSize: 11, color: '#4caf50', fontWeight: 700 }}>✅ {userContext.done}/{userContext.total} habits</div>
          <div style={{ flexShrink: 0, padding: '4px 10px', background: '#0a0a12', border: '1px solid #1e1e2a', borderRadius: 100, fontSize: 11, color: '#ff9800', fontWeight: 700 }}>🔥 {userContext.streak}d streak</div>
          <div style={{ flexShrink: 0, padding: '4px 10px', background: '#0a0a12', border: '1px solid #1e1e2a', borderRadius: 100, fontSize: 11, color: '#00ffff', fontWeight: 700 }}>⚡ {userContext.balance} Zyrons</div>
          <div style={{ flexShrink: 0, padding: '4px 10px', background: '#0a0a12', border: '1px solid #1e1e2a', borderRadius: 100, fontSize: 11, color: '#ce93d8', fontWeight: 700 }}>{userContext.rank}</div>
          {userContext.mood && <div style={{ flexShrink: 0, padding: '4px 10px', background: '#0a0a12', border: '1px solid #1e1e2a', borderRadius: 100, fontSize: 11, color: '#aaaabc', fontWeight: 700 }}>Mood: {userContext.mood}</div>}
        </div>
      )}

      {/* Personality Mode Bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {Object.keys(personalities).map(p => {
          const active = personality === p
          const st = personalities[p]
          return (
            <button key={p} onClick={() => { setPersonality(p); localStorage.setItem('zyrbit_personality', p) }}
              style={{ flex: 1, padding: '6px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                background: active ? st.bg : '#0a0a12', border: `1px solid ${active ? st.border : '#1e1e2a'}`, color: active ? st.color : '#444' }}>
              {p}
            </button>
          )
        })}
      </div>

      {/* Chat Area */}
      <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none', minHeight: 200, display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16, paddingBottom: 10 }}>
        {history.length === 0 && <div style={{ textAlign: 'center', color: '#444', fontSize: 12, marginTop: 40 }}>Start a conversation with Zyra...</div>}
        {history.map(m => (
          <div key={m.id} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
            <div style={{
              padding: '10px 14px', fontSize: 13, lineHeight: 1.5,
              background: m.role === 'user' ? '#001a1a' : '#0d0818',
              border: m.role === 'user' ? '1px solid #00ffff20' : '1px solid #2a1a3a',
              borderLeft: m.role === 'user' ? undefined : '2px solid #9c27b0',
              borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '4px 14px 14px 14px',
              color: m.role === 'user' ? '#e8e8f0' : '#aaaabc',
              whiteSpace: 'pre-wrap'
            }}>
              {m.text}{(streamingId === m.id) && <span style={{ opacity: 0.5 }}>|</span>}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ alignSelf: 'flex-start', background: '#0d0818', border: '1px solid #2a1a3a', borderLeft: '2px solid #9c27b0', borderRadius: '4px 14px 14px 14px', padding: '12px 14px' }}>
            <div style={{ display: 'flex', gap: 4 }}>
              <div style={{ width: 6, height: 6, background: '#9c27b0', borderRadius: '50%', animation: 'bounce 1s infinite' }} />
              <div style={{ width: 6, height: 6, background: '#9c27b0', borderRadius: '50%', animation: 'bounce 1s infinite 0.2s' }} />
              <div style={{ width: 6, height: 6, background: '#9c27b0', borderRadius: '50%', animation: 'bounce 1s infinite 0.4s' }} />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick Pills */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none', marginBottom: 12, paddingBottom: 4 }}>
        {['🔥 Roast me', '🚀 Check-in', '🧠 Why failing?', '💡 New habit', '🎯 Focus now'].map(p => (
          <button key={p} onClick={() => handleSend(p)} disabled={loading}
            style={{ flexShrink: 0, padding: '6px 12px', background: '#1e1e2a', border: 'none', borderRadius: 100, color: '#aaaabc', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            {p}
          </button>
        ))}
      </div>

      {/* Input Row */}
      <div style={{ display: 'flex', gap: 8 }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} disabled={loading}
          placeholder="Ask Zyra anything..." style={{ flex: 1, background: '#0a0a12', border: '1px solid #1e1e2a', borderRadius: 12, padding: '12px 16px', color: '#e8e8f0', fontSize: 14, outline: 'none' }} />
        <button onClick={() => handleSend()} disabled={loading || !input.trim()}
          style={{ width: 44, height: 44, borderRadius: 12, background: '#9c27b0', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          ↑
        </button>
      </div>

      {/* Settings Overlay */}
      {showSettings && (
        <div style={{ position: 'absolute', inset: 0, background: '#000000ee', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: '#0d0d18', border: '1px solid #2a1a3a', borderRadius: 20, padding: 24, width: '100%' }}>
            <h3 style={{ color: '#fff', marginBottom: 16 }}>Personality Settings</h3>
            {Object.keys(personalities).map(p => (
              <div key={p} onClick={() => { setPersonality(p); localStorage.setItem('zyrbit_personality', p) }}
                style={{ padding: 16, border: `1px solid ${personality === p ? '#9c27b0' : '#1e1e2a'}`, borderRadius: 12, marginBottom: 12, cursor: 'pointer', background: '#0a0a12' }}>
                <div style={{ fontWeight: 800, color: personalities[p].color, marginBottom: 4 }}>{p}</div>
                <div style={{ fontSize: 11, color: '#aaaabc' }}>{p === 'Supportive' ? 'Warm, encouraging coaching.' : p === 'Strict' ? 'Brutally honest drill sergeant.' : 'Calm, philosophical guidance.'}</div>
              </div>
            ))}
            <button onClick={() => setShowSettings(false)} style={{ width: '100%', padding: 14, background: '#fff', color: '#000', borderRadius: 12, fontWeight: 800, border: 'none', marginTop: 8 }}>Done</button>
          </div>
        </div>
      )}
      <style>{`@keyframes zyraPulse { 0% { transform: scale(1); opacity: 0.5 } 50% { transform: scale(1.15); opacity: 0.2 } 100% { transform: scale(1); opacity: 0.5 } }`}</style>
    </div>
  )
}

// --- TAB 2: COACH ---
function CoachTab({ userContext, earn }) {
  const [daily, setDaily] = useState(null)
  const [suggs, setSuggs] = useState(null)
  const [weekly, setWeekly] = useState(null)
  const [loading, setLoading] = useState({})

  const today = new Date().toISOString().split('T')[0]
  
  useEffect(() => {
    setDaily(localStorage.getItem(`zyrbit_checkin_${today}`))
    const cachedSuggs = localStorage.getItem(`zyrbit_suggestions_${today}`)
    if (cachedSuggs) setSuggs(JSON.parse(cachedSuggs))
    
    // simple weekly cache key
    const weekKey = `zyrbit_weekly_${Math.floor(Date.now() / 604800000)}`
    setWeekly(localStorage.getItem(weekKey))
  }, [])

  const handleRefreshDaily = async () => {
    setLoading(p => ({...p, daily: true}))
    const prompt = `Write a DAILY ORBIT CHECK-IN paragraph under 80 words for user ${userContext.name}. They completed ${userContext.done}/${userContext.total} habits today. Streak: ${userContext.streak} days. Rank: ${userContext.rank}. Make it specific, personal, and motivational.`
    const res = await generateCardContent(prompt)
    if (res) {
      setDaily(res)
      localStorage.setItem(`zyrbit_checkin_${today}`, res)
      earn(5, 'Coach refresh')
    }
    setLoading(p => ({...p, daily: false}))
  }

  const handleRefreshSuggs = async () => {
    setLoading(p => ({...p, suggs: true}))
    const prompt = `Generate exactly 3 "SMART SUGGESTIONS" for user profiling. Weakest zone: ${userContext.weakestZone}. Return ONLY raw JSON array: [{"dot":"#4caf50","tip":"..."},{"dot":"#ff9800","tip":"..."}]`
    const res = await generateCardContent(prompt)
    try {
      const parsed = JSON.parse(res.replace(/```json|```/g,'').trim())
      setSuggs(parsed)
      localStorage.setItem(`zyrbit_suggestions_${today}`, JSON.stringify(parsed))
    } catch { }
    setLoading(p => ({...p, suggs: false}))
  }

  const handleRefreshWeekly = async () => {
    setLoading(p => ({...p, weekly: true}))
    const prompt = `Write a WEEKLY ORBIT REPORT under 60 words summarizing progress. Describe their momentum based on streak of ${userContext.streak}. Very concise and proud tone.`
    const res = await generateCardContent(prompt)
    if (res) {
      setWeekly(res)
      const weekKey = `zyrbit_weekly_${Math.floor(Date.now() / 604800000)}`
      localStorage.setItem(weekKey, res)
      earn(10, 'Weekly report')
    }
    setLoading(p => ({...p, weekly: false}))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto', paddingBottom: 20, scrollbarWidth: 'none' }}>
      {/* Daily Check-in */}
      <div style={{ background: '#0d0d18', border: '1px solid #1e1e2a', borderLeft: '3px solid #00bcd4', borderRadius: 16, padding: 14 }}>
        <div style={{ fontSize: 9, color: '#00bcd460', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 800, marginBottom: 8 }}>DAILY ORBIT CHECK-IN</div>
        <div style={{ fontSize: 13, color: '#e8e8f0', lineHeight: 1.6, marginBottom: 12 }}>
          {loading.daily ? <span style={{ color: '#555' }}>Synthesizing...</span> : daily || 'No check-in created today. Tap refresh to generate!'}
        </div>
        <button onClick={handleRefreshDaily} disabled={loading.daily} style={{ background: '#00bcd415', border: '1px solid #00bcd430', color: '#00bcd4', padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>
          ↻ Refresh +5 ⚡
        </button>
      </div>

      {/* Smart Suggestions */}
      <div style={{ background: '#0d0d18', border: '1px solid #1e1e2a', borderLeft: '3px solid #9c27b0', borderRadius: 16, padding: 14 }}>
        <div style={{ fontSize: 9, color: '#9c27b0', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 800, marginBottom: 12 }}>SMART SUGGESTIONS</div>
        {loading.suggs ? <div style={{ color: '#555', fontSize: 13 }}>Analyzing data...</div> : (!suggs ? (
           <button onClick={handleRefreshSuggs} style={{ background: '#9c27b015', border: '1px solid #9c27b030', color: '#ce93d8', padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>Generate Suggestions</button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {suggs.map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.dot || '#00bcd4', marginTop: 5, flexShrink: 0 }} />
                <div style={{ fontSize: 13, color: '#e8e8f0', lineHeight: 1.5 }}>{s.tip}</div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Weekly Report */}
      <div style={{ background: '#0d0d18', border: '1px solid #1e1e2a', borderLeft: '3px solid #fde047', borderRadius: 16, padding: 14 }}>
        <div style={{ fontSize: 9, color: '#fde047', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 800, marginBottom: 12 }}>WEEKLY ORBIT REPORT</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <div style={{ flex: 1, background: '#0a0a12', border: '1px solid #1e1e2a', borderRadius: 10, padding: 10 }}>
            <div style={{ fontSize: 9, color: '#666', fontWeight: 800, marginBottom: 4 }}>AVG COMPLETED</div>
            <div style={{ fontSize: 16, color: '#fde047', fontWeight: 900 }}>{userContext.total > 0 ? Math.round((userContext.done/userContext.total)*100) : 0}%</div>
          </div>
          <div style={{ flex: 1, background: '#0a0a12', border: '1px solid #1e1e2a', borderRadius: 10, padding: 10 }}>
            <div style={{ fontSize: 9, color: '#666', fontWeight: 800, marginBottom: 4 }}>BEST STREAK</div>
            <div style={{ fontSize: 16, color: '#fde047', fontWeight: 900 }}>{userContext.longest}d</div>
          </div>
        </div>
        <div style={{ fontSize: 13, color: '#e8e8f0', lineHeight: 1.6, marginBottom: 12 }}>
          {loading.weekly ? <span style={{ color: '#555' }}>Generating report...</span> : weekly || 'Weekly report ready to generate.'}
        </div>
        <button onClick={handleRefreshWeekly} disabled={loading.weekly} style={{ background: '#fde04715', border: '1px solid #fde04730', color: '#fde047', padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>
          ↻ Generate Report +10 ⚡
        </button>
      </div>
    </div>
  )
}

// --- TAB 3: QUIZ ---
const getFallbackQuestions = () => [
  {q:"I have cities but no houses, mountains but no trees, water but no fish. What am I?",opts:["A dream","A map","A painting","A mirror"],ans:1,cat:"Riddle",explanation:"A map has symbols for cities, mountains and water but none of the actual things."},
  {q:"The more you take, the more you leave behind. What am I?",opts:["Time","Money","Footsteps","Memories"],ans:2,cat:"Riddle",explanation:"Every step you take leaves a footprint behind you."},
  {q:"If there are 3 apples and you take away 2, how many do YOU have?",opts:["1","2","3","0"],ans:1,cat:"Math",explanation:"You took 2 apples so YOU have 2."},
  {q:"A rooster lays an egg on a barn roof. Which way does it roll?",opts:["Left","Right","Forward","Roosters don't lay eggs"],ans:3,cat:"Logic",explanation:"Roosters are male chickens and cannot lay eggs."},
  {q:"How many months have 28 days?",opts:["1","2","4","12"],ans:3,cat:"Logic",explanation:"All 12 months have at least 28 days. Everyone thinks only February does."},
  {q:"What gets wetter as it dries?",opts:["Rain","A towel","Soap","Ice"],ans:1,cat:"Riddle",explanation:"A towel absorbs water while drying you."},
  {q:"Speed of light in vacuum?",opts:["200k km/s","300k km/s","400k km/s","150k km/s"],ans:1,cat:"Science",explanation:"The speed of light is approximately 300,000 km/s in vacuum."},
  {q:"Which is heavier: a ton of feathers or a ton of bricks?",opts:["Bricks","Feathers","They are equal","Depends"],ans:2,cat:"Logic",explanation:"Both weigh exactly one ton."},
  {q:"If you multiply all numbers on a phone keypad, the result is?",opts:["3628800","362880","0","123456789"],ans:2,cat:"Math",explanation:"The phone keypad includes 0. Anything multiplied by 0 equals 0."},
  {q:"What always runs but never walks, has a mouth but never talks?",opts:["Wind","A river","Time","A clock"],ans:1,cat:"Riddle",explanation:"A river runs continuously and has a mouth."},
]

const EARNINGS = [5, 10, 20, 40, 80, 160, 320, 640, 640, 585]

function QuizTab({ quizPhase, setQuizPhase, earn, userContext }) {
  const [questions, setQuestions] = useState([])
  const [qIdx, setQIdx] = useState(0)
  const [sessionEarned, setSessionEarned] = useState(0)
  const [timeLeft, setTimeLeft] = useState(20)
  const [selected, setSelected] = useState(null)
  const [status, setStatus] = useState('idle') // idle, correct, wrong
  const [cooldown, setCooldown] = useState(null)
  const [loading, setLoading] = useState(false)
  const [learnMode, setLearnMode] = useState(false)

  useEffect(() => {
    const last = localStorage.getItem('zyrbit_quiz_last')
    if (last) {
      const diff = Date.now() - parseInt(last)
      if (diff < 86400000) setCooldown(86400000 - diff)
    }
  }, [])

  useEffect(() => {
    if (cooldown > 0) {
      const interval = setInterval(() => setCooldown(c => Math.max(0, c - 60000)), 60000)
      return () => clearInterval(interval)
    }
  }, [cooldown])

  // Timer
  useEffect(() => {
    if (quizPhase === 'active' && status === 'idle' && !learnMode && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000)
      return () => clearTimeout(timer)
    } else if (timeLeft === 0 && status === 'idle') {
      handleAnswer(-1) // Time out = wrong
    }
  }, [quizPhase, status, timeLeft, learnMode])

  const startQuiz = async () => {
    setLoading(true)
    const today = new Date().toDateString()
    // User-specific cache key so different users get different questions
    const userId = userContext?.rank || 'guest'
    const cacheKey = `zyrbit_quiz_${userId}_${today}`
    let qs = localStorage.getItem(cacheKey)
    if (qs) {
      qs = JSON.parse(qs)
    } else {
      // Personalize questions based on user's profile
      const zone = userContext?.weakestZone || 'growth'
      const rank = userContext?.rank || 'Dust'
      const streak = userContext?.streak || 0
      const done = userContext?.done || 0
      const total = userContext?.total || 0
      const seed = Math.floor(Math.random() * 900) + 100 // random seed 100-999 for variety
      const prompt = `You are generating a personalized daily quiz for a habit-tracking app user.
User profile: rank="${rank}", streak=${streak} days, completed ${done}/${total} habits today, weakest zone="${zone}".
Random seed: ${seed} (use this to ensure variety every time).
Generate exactly 10 unique brain teasers relevant to wellness, habits, productivity, and self-improvement (tailored to their ${zone} zone).
Mix: 2 riddles, 3 logic puzzles, 2 math teasers, 2 wellness/habit trivia, 1 zone-specific challenge about ${zone}.
Return ONLY a raw JSON array, no markdown, no explanation:
[{"q":"question text","opts":["A","B","C","D"],"ans":0,"cat":"Riddle","explanation":"short 1 sentence explanation"}, ...]`
      try {
        const res = await generateCardContent(prompt)
        qs = JSON.parse(res.replace(/```json|```/g,'').trim())
        if (!Array.isArray(qs) || qs.length < 5) throw new Error('Not enough questions')
        // Ensure exactly 10
        if (qs.length > 10) qs = qs.slice(0, 10)
        localStorage.setItem(cacheKey, JSON.stringify(qs))
      } catch {
        qs = getFallbackQuestions()
      }
    }
    setQuestions(qs)
    setQIdx(0)
    setSessionEarned(0)
    setTimeLeft(20)
    setStatus('idle')
    setSelected(null)
    setLearnMode(false)
    setQuizPhase('active')
    setLoading(false)
  }

  const handleAnswer = async (idx) => {
    if (status !== 'idle') return
    setSelected(idx)
    const q = questions[qIdx]
    const isCorrect = idx === q.ans

    if (isCorrect) {
      setStatus('correct')
      const actualEarn = Math.min(EARNINGS[qIdx], 2500 - sessionEarned)
      
      // AWAIT database save instead of skipping it
      const success = await earn(actualEarn, 'Quiz correct answer')
      if (success) {
        setSessionEarned(prev => prev + actualEarn)
      }
      
      setTimeout(() => {
        if (qIdx === 9) {
          endQuiz('maxearned')
        } else {
          setQIdx(prev => prev + 1)
          setTimeLeft(20)
          setStatus('idle')
          setSelected(null)
        }
      }, 1500)
    } else {
      setStatus('wrong')
      setTimeout(() => endQuiz('gameover'), 2000)
    }
  }

  const endQuiz = (mode) => {
    setQuizPhase(mode)
    localStorage.setItem('zyrbit_quiz_last', Date.now().toString())
    setCooldown(86400000)
  }

  const formatTime = (ms) => {
    const h = Math.floor(ms / 3600000)
    const m = Math.floor((ms % 3600000) / 60000)
    return `${h}h ${m}m`
  }

  if (learnMode) {
    return (
      <div style={{ paddingBottom: 20 }}>
        <button onClick={() => setLearnMode(false)} style={{ background: '#1e1e2a', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: 8, marginBottom: 16 }}>← Back</button>
        {questions.slice(0, qIdx + (status === 'correct' ? 1 : 0)).map((q, i) => (
          <div key={i} style={{ background: '#0d0d18', border: '1px solid #2a1a3a', borderRadius: 12, padding: 14, marginBottom: 12 }}>
            <div style={{ fontWeight: 800, color: '#e8e8f0', marginBottom: 8 }}>{i+1}. {q.q}</div>
            <div style={{ color: '#4caf50', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Answer: {q.opts[q.ans]}</div>
            <div style={{ color: '#aaaabc', fontSize: 11, fontStyle: 'italic' }}>{q.explanation}</div>
          </div>
        ))}
      </div>
    )
  }

  if (quizPhase === 'start') {
    return (
      <div style={{ background: '#0d0d18', border: '1px solid #2a1a1a', borderRadius: 18, padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🧠</div>
        <h3 style={{ fontSize: 18, fontWeight: 900, color: '#e8e8f0', marginBottom: 4 }}>Daily Brain Teasers</h3>
        <p style={{ fontSize: 11, color: '#666', marginBottom: 20 }}>10 fresh questions generated by Zyra every 24 hours</p>
        
        <div style={{ background: '#0a0a12', borderRadius: 12, padding: 16, textAlign: 'left', marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: '#aaaabc', marginBottom: 6 }}>• Answer 10 questions correctly</div>
          <div style={{ fontSize: 12, color: '#aaaabc', marginBottom: 6 }}>• 20 seconds per question</div>
          <div style={{ fontSize: 12, color: '#aaaabc', marginBottom: 6 }}>• Wrong answer = Game Over</div>
          <div style={{ fontSize: 12, color: '#aaaabc', marginBottom: 0 }}>• Screen locks while active!</div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginBottom: 24 }}>
          {EARNINGS.map((e, i) => (
            <div key={i} style={{ background: '#ff980015', border: '1px solid #ff980030', color: '#ff9800', fontSize: 10, padding: '4px 8px', borderRadius: 100, fontWeight: 800 }}>Q{i+1}:{e}⚡</div>
          ))}
        </div>

        {cooldown ? (
          <div style={{ background: '#1e1e2a', padding: 16, borderRadius: 12, color: '#aaaabc', fontSize: 12, fontWeight: 700 }}>
            <div style={{ marginBottom: userContext?.todayQuizEarned !== undefined ? 10 : 0 }}>
              Already played today — resets in {formatTime(cooldown)}
            </div>
            {userContext?.todayQuizEarned > 0 && (
              <div style={{ fontSize: 16, color: '#ff9800', fontWeight: 900 }}>
                You won {userContext.todayQuizEarned} ⚡ this cycle!
              </div>
            )}
            {userContext?.todayQuizEarned === 0 && (
              <div style={{ fontSize: 14, color: '#ef4444', fontWeight: 800 }}>
                Brain fried on Q1 this cycle! 💥
              </div>
            )}
          </div>
        ) : (
          <button onClick={startQuiz} disabled={loading} style={{ background: '#ff9800', color: '#000', width: '100%', padding: 16, borderRadius: 12, fontWeight: 900, fontSize: 14, border: 'none', cursor: 'pointer' }}>
            {loading ? 'Generating...' : 'Start Quiz — Earn up to 2,500 ⚡'}
          </button>
        )}
      </div>
    )
  }

  if (quizPhase === 'gameover' || quizPhase === 'maxearned') {
    return (
      <div style={{ background: '#0d0d18', border: '1px solid #2a1a1a', borderRadius: 18, padding: 24, textAlign: 'center' }}>
        {quizPhase === 'maxearned' && <style>{`.confetti { position: absolute; width: 10px; height: 10px; background: #fde047; animation: fall 3s linear infinite; } @keyframes fall { to { transform: translateY(300px) rotate(360deg); } }`}</style>}
        {quizPhase === 'maxearned' && Array.from({length: 10}).map((_, i) => <div key={i} className="confetti" style={{ left: `${i*10}%`, animationDelay: `${i*0.2}s`, background: ['#fde047', '#ff9800', '#9c27b0'][i%3] }} />)}
        
        <div style={{ fontSize: 40, marginBottom: 12 }}>{quizPhase === 'gameover' ? '💥' : '🏆'}</div>
        <h3 style={{ fontSize: 20, fontWeight: 900, color: quizPhase === 'gameover' ? '#ef4444' : '#fde047', marginBottom: 8 }}>
          {quizPhase === 'gameover' ? 'Brain Fried!' : 'Galaxy Brain!'}
        </h3>
        
        <p style={{ fontSize: 13, color: '#aaaabc', marginBottom: 24 }}>
          {quizPhase === 'maxearned' ? '2,500 ⚡ Zyrons earned today!' : 
            (qIdx < 4 ? "Every orbit starts somewhere. Aim for Q5 tomorrow!" : 
             qIdx < 7 ? "Solid run! Q8 is in reach tomorrow!" : "So close! One more right and you'd have crushed it!")}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
          <div style={{ background: '#0a0a12', padding: 12, borderRadius: 12, border: '1px solid #1e1e2a' }}>
            <div style={{ fontSize: 10, color: '#666', fontWeight: 800, marginBottom: 4 }}>EARNED</div>
            <div style={{ fontSize: 18, color: '#ff9800', fontWeight: 900 }}>+{sessionEarned}⚡</div>
          </div>
          <div style={{ background: '#0a0a12', padding: 12, borderRadius: 12, border: '1px solid #1e1e2a' }}>
            <div style={{ fontSize: 10, color: '#666', fontWeight: 800, marginBottom: 4 }}>CORRECT</div>
            <div style={{ fontSize: 18, color: '#4caf50', fontWeight: 900 }}>{qIdx}/10</div>
          </div>
        </div>

        <button onClick={() => setLearnMode(true)} style={{ background: '#9c27b0', color: '#fff', border: 'none', width: '100%', padding: 14, borderRadius: 12, fontWeight: 800, fontSize: 13, cursor: 'pointer', marginBottom: 12 }}>
          📚 Review Answers
        </button>
        <button disabled style={{ background: '#1e1e2a', color: '#666', border: 'none', width: '100%', padding: 14, borderRadius: 12, fontWeight: 800, fontSize: 13, cursor: 'not-allowed' }}>
          ↺ Try Again Tomorrow
        </button>
      </div>
    )
  }

  // Active Phase
  const q = questions[qIdx]
  if (!q) return null

  const timerColor = timeLeft > 10 ? '#9c27b0' : timeLeft > 5 ? '#ff9800' : '#ef4444'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Session Progress */}
      <div style={{ background: '#0a0a12', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #1e1e2a' }}>
        <div style={{ flex: 1, marginRight: 16 }}>
          <div style={{ height: 4, background: '#1e1e2a', borderRadius: 2, overflow: 'hidden', marginBottom: 6 }}>
            <div style={{ width: `${(sessionEarned/2500)*100}%`, height: '100%', background: '#ff9800', transition: 'width 0.3s' }} />
          </div>
          <div style={{ fontSize: 10, color: '#666', fontWeight: 800 }}>QUESTION {qIdx + 1} OF 10</div>
        </div>
        <div style={{ fontSize: 14, fontWeight: 900, color: '#ff9800' }}>{sessionEarned} / 2500 ⚡</div>
      </div>

      {/* Question Card */}
      <div style={{ background: '#0d0818', border: '1px solid #2a1a3a', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ padding: '16px 16px 12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ fontSize: 9, background: '#9c27b030', color: '#ce93d8', padding: '4px 8px', borderRadius: 100, fontWeight: 800, textTransform: 'uppercase' }}>{q.cat}</div>
            <div style={{ fontSize: 11, background: '#ff980020', color: '#ff9800', padding: '4px 8px', borderRadius: 100, fontWeight: 900 }}>+{EARNINGS[qIdx]}⚡</div>
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#e8e8f0', lineHeight: 1.5 }}>{q.q}</div>
        </div>
        
        {/* Timer Bar */}
        <div style={{ height: 3, background: '#1e1e2a', width: '100%' }}>
          <div style={{ height: '100%', background: timerColor, width: `${(timeLeft/20)*100}%`, transition: 'width 1s linear, background-color 0.3s' }} />
        </div>
      </div>

      {/* Options */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, animation: status === 'wrong' ? 'shake 0.5s' : 'none' }}>
        <style>{`@keyframes shake { 0%,100% {transform: translateX(0)} 25% {transform: translateX(-5px)} 75% {transform: translateX(5px)} }`}</style>
        {q.opts.map((opt, i) => {
          let bg = '#0a0a12', border = '#1e1e28'
          if (status !== 'idle') {
            if (i === q.ans) { bg = '#4caf5020'; border = '#4caf50' }
            else if (i === selected) { bg = '#ef444420'; border = '#ef4444' }
          } else if (i === selected) {
            bg = '#ff980020'; border = '#ff9800'
          }

          return (
            <button key={i} onClick={() => handleAnswer(i)} disabled={status !== 'idle'}
              style={{ padding: '14px 16px', background: bg, border: `1px solid ${border}`, borderRadius: 12, color: '#e8e8f0', fontSize: 14, fontWeight: 600, textAlign: 'left', cursor: status === 'idle' ? 'pointer' : 'default', transition: 'all 0.2s' }}>
              <span style={{ color: '#666', marginRight: 12, fontWeight: 800 }}>{['A','B','C','D'][i]}</span> {opt}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// --- MAIN PAGE COMPONENT ---
export default function AICoach() {
  const [activeTab, setActiveTab] = useState('quiz')
  const [quizPhase, setQuizPhase] = useState('start')
  const quizActive = quizPhase === 'active'

  const [user, setUser] = useState(null)
  const userRef = useRef(null)  // always-current reference to avoid stale closure in handleEarn
  const [userContext, setUserContext] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) { userRef.current = user; setUser(user); buildContext(user) }
    })
  }, [])

  const buildContext = async (u) => {
    const today = new Date().toISOString().split('T')[0]
    const quizTimeLimit = new Date(Date.now() - 86400000).toISOString()
    
    const [{ data: h }, { data: logs }, { data: streaks }, wallet, gs, { data: journal }, { data: qTxs }] = await Promise.all([
      supabase.from('habits').select('*').eq('user_id', u.id),
      supabase.from('activity_log').select('habit_id,status').eq('user_id', u.id).eq('completed_date', today),
      supabase.from('user_streaks').select('current_streak,longest_streak').eq('user_id', u.id),
      getWallet(u.id),
      computeGravityScore(supabase, u.id),
      supabase.from('orbit_journal').select('mood').eq('user_id', u.id).eq('entry_date', today).single(),
      supabase.from('zyron_transactions').select('amount').eq('user_id', u.id).eq('reason', 'Quiz correct answer').gte('created_at', quizTimeLimit)
    ])

    const completed = logs?.filter(l => l.status === 'completed').length || 0
    const rs = getRankByZyrons(wallet?.total_earned || 0)
    
    // find weakest zone
    let weakest = 'none'
    if (h && h.length > 0) {
      const zoneCounts = {}
      h.forEach(hb => { zoneCounts[hb.zone] = (zoneCounts[hb.zone] || 0) + 1 })
      weakest = Object.entries(zoneCounts).sort((a,b)=>a[1]-b[1])[0][0]
    }

    const todayQuizEarned = qTxs ? qTxs.reduce((sum, tx) => sum + tx.amount, 0) : 0

    setUserContext({
      name: u.user_metadata?.full_name || 'Orbiter',
      rank: rs.name,
      element: rs.element,
      total: h?.length || 0,
      done: completed,
      streak: streaks?.reduce((m, s) => Math.max(m, s.current_streak || 0), 0) || 0,
      longest: streaks?.reduce((m, s) => Math.max(m, s.longest_streak || 0), 0) || 0,
      balance: wallet?.balance || 0,
      gravity: gs,
      mood: journal?.mood || 'not logged',
      weakestZone: weakest,
      todayQuizEarned
    })
  }

  const handleEarn = useCallback(async (amt, reason) => {
    const currentUser = userRef.current
    if (!currentUser) { console.warn('handleEarn: user not loaded yet, zyrons skipped'); return false }
    if (amt <= 0) return true
    
    // Wait for the DB call and ensure it succeeds
    const earned = await earnZyrons(currentUser.id, amt, reason)
    
    if (earned) {
      showToast(`+${amt} ⚡`, 'success')
      setUserContext(prev => prev ? { ...prev, balance: prev.balance + amt } : prev)
      return true
    } else {
      showToast('❌ Failed to save Zyrons. Connection issue?', 'error')
      return false
    }
  }, [])  // stable ref — no stale closure risk

  const handleNavClick = (tab) => {
    if (quizActive) {
      const el = document.getElementById('quiz-lock-banner')
      if (el) {
        el.style.background = '#ef444420'
        el.style.borderColor = '#ef4444'
        setTimeout(() => {
          el.style.background = '#ff980010'
          el.style.borderColor = '#ff980025'
        }, 600)
      }
      return
    }
    navigate(`/${tab}`)
  }

  const TAB_THEMES = {
    zyra: { bg: '#9c27b015', border: '#9c27b0', color: '#ce93d8' },
    coach: { bg: '#00bcd415', border: '#00bcd4', color: '#00bcd4' },
    quiz: { bg: '#ff980015', border: '#ff9800', color: '#ff9800' }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#000000', fontFamily: 'Inter, sans-serif', overflowX: 'hidden', paddingBottom: 100 }}>
      {quizActive && (
        <div id="quiz-lock-banner" style={{ background: '#ff980010', borderBottom: '1px solid #ff980025', padding: '8px', textAlign: 'center', color: '#e8e8f0', fontSize: 11, fontWeight: 800, position: 'sticky', top: 0, zIndex: 100, transition: 'all 0.3s' }}>
          🔒 Screen locked — answer to continue
        </div>
      )}

      {/* PAGE HEADER */}
      {!quizActive && (
        <div style={{ padding: '24px 16px 8px' }}>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: '#FFF', letterSpacing: -0.5, marginBottom: 2 }}>🎯 Quiz</h1>
          <p style={{ fontSize: 11, color: '#444', margin: 0 }}>Test your knowledge · Earn Zyrons</p>
        </div>
      )}
      {quizActive && <div style={{ height: 24 }} />}

      <div style={{ padding: '0 16px', height: 'calc(100vh - 160px)', display: 'flex', flexDirection: 'column' }}>
        <QuizTab quizPhase={quizPhase} setQuizPhase={setQuizPhase} earn={handleEarn} userContext={userContext} />
      </div>

      <BottomNav activeTab="coach" onTabChange={handleNavClick} />
    </div>
  )
}
