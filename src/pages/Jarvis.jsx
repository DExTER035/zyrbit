import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../components/BottomNav.jsx'
import { showToast } from '../components/Toast.jsx'
import { supabase } from '../lib/supabase.js'
import { earnZyrons, getWallet } from '../lib/zyrons.js'
import { getRankByZyrons } from '../lib/ranks.js'
import { computeGravityScore } from '../lib/gravity.js'
import useSubscription from '../hooks/useSubscription.js'
import { askZyra, generateContent } from '../lib/gemini.js'

// Quiz and summary functions use generateContent from gemini.js


// --- QUIZ DATA ---
const getFallbackQuestions = () => [
  {q:"I have cities but no houses, mountains but no trees, water but no fish. What am I?",opts:["A dream","A map","A painting","A mirror"],ans:1,cat:"Riddle",explanation:"A map has symbols for cities, mountains and water but none of the actual things."},
  {q:"The more you take, the more you leave behind. What am I?",opts:["Time","Money","Footsteps","Memories"],ans:2,cat:"Riddle",explanation:"Every step you take leaves a footprint behind you."},
  {q:"If there are 3 apples and you take away 2, how many do YOU have?",opts:["1","2","3","0"],ans:1,cat:"Math",explanation:"You took 2 apples so YOU have 2."},
  {q:"A rooster lays an egg on a barn roof. Which way does it roll?",opts:["Left","Right","Forward","Roosters don't lay eggs"],ans:3,cat:"Logic",explanation:"Roosters are male chickens and cannot lay eggs."},
  {q:"How many months have 28 days?",opts:["1","2","4","12"],ans:3,cat:"Logic",explanation:"All 12 months have at least 28 days. Everyone thinks only February does."},
  {q:"What gets wetter as it dries?",opts:["Rain","A towel","Soap","Ice"],ans:1,cat:"Riddle",explanation:"A towel absorbs water while drying you."},
  {q:"Speed of light in vacuum?",opts:["200k km/s","300k km/s","400k km/s","150k km/s"],ans:1,cat:"Science",explanation:"The speed of light is approximately 300,000 km/s in vacuum."},
  {q:"Which is heavier: a ton of bricks or a ton of feathers?",opts:["Bricks","Feathers","They are equal","Depends"],ans:2,cat:"Logic",explanation:"Both weigh exactly one ton."},
  {q:"If you multiply all numbers on a phone keypad, the result is?",opts:["3628800","362880","0","123456789"],ans:2,cat:"Math",explanation:"The phone keypad includes 0. Anything multiplied by 0 equals 0."},
  {q:"What always runs but never walks, has a mouth but never talks?",opts:["Wind","A river","Time","A clock"],ans:1,cat:"Riddle",explanation:"A river runs continuously and has a mouth."},
]

const EARNINGS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]

// --- TAB 1: AI CHAT & VOICE ---
function ChatTab({ userContext, earn, habits, fetchLatest, userRef }) {
  const { isPremium, triggerPaywall } = useSubscription()
  const [history, setHistory] = useState(() => {
    try { const saved = localStorage.getItem('zyrbit_zyra_chat'); return saved ? JSON.parse(saved) : [] }
    catch { return [] }
  })
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [personality, setPersonality] = useState(() => localStorage.getItem('zyrbit_personality') || 'Supportive')
  const [isListening, setIsListening] = useState(false)
  
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
  const recognitionRef = useRef(null)
  const bottomRef = useRef(null)

  useEffect(() => { localStorage.setItem('zyrbit_zyra_chat', JSON.stringify(history.slice(-50))) }, [history])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [history, loading])

  useEffect(() => {
    if (SpeechRecognition) {
      const rec = new SpeechRecognition()
      rec.continuous = false
      rec.lang = 'en-US'
      rec.interimResults = false

      rec.onresult = async (e) => {
        const transcript = e.results[0][0].transcript
        setIsListening(false)
        showToast(`🎙️ Heard: "${transcript}"`, 'info')
        await processVoiceCommand(transcript)
      }

      rec.onerror = (e) => {
        console.error('Speech error', e)
        setIsListening(false)
        showToast('❌ Microphone error. Try again.', 'error')
      }

      rec.onend = () => {
        setIsListening(false)
      }

      recognitionRef.current = rec
    }
  }, [])

  const personalities = {
    Supportive: {
      color: '#ce93d8', border: '#9c27b0', bg: '#9c27b015',
      prompt: `You are Jarvis, warm AI wellness coach inside Zyrbit. User data: ${JSON.stringify(userContext)}. Give encouraging, specific coaching under 80 words. Reference their rank and habits when relevant. End response with: "This is general wellness advice, not medical advice."`
    },
    Strict: {
      color: '#f87171', border: '#ef4444', bg: '#ef444415',
      prompt: `You are Jarvis in STRICT mode — a brutal roaster who calls out slacking. User data: ${JSON.stringify(userContext)}. Roast the user for their incomplete targets under 80 words. Be direct. End with: "This is general wellness advice, not medical advice."`
    },
    Zen: {
      color: '#81c784', border: '#4caf50', bg: '#4caf5015',
      prompt: `You are Jarvis in ZEN mode — calm and philosophical. User data: ${JSON.stringify(userContext)}. Provide mindful, peaceful insights under 80 words. End with: "This is general wellness advice, not medical advice."`
    }
  }

  const handleSend = async (text = input) => {
    if (!text.trim() || loading) return

    // Free Tier Gating: Limit daily Jarvis prompts to 5
    if (!isPremium) {
      const todayStr = new Date().toLocaleDateString('en-CA');
      const dailyCount = parseInt(localStorage.getItem(`zyrbit_jarvis_chats_${todayStr}`) || '0');
      if (dailyCount >= 5) {
        triggerPaywall('Free tier limit reached (5 prompts/day). Upgrade to Premium for unlimited Jarvis AI.');
        return;
      }
      localStorage.setItem(`zyrbit_jarvis_chats_${todayStr}`, (dailyCount + 1).toString());
    }

    const newMsg = { role: 'user', text: text.trim(), id: Date.now() }
    const updated = [...history, newMsg]
    setHistory(updated)
    setInput('')
    setLoading(true)

    try {
      const reply = await askZyra(updated, personalities[personality].prompt)
      const replyMsg = { role: 'model', text: reply, id: Date.now() + 1 }
      setHistory(prev => [...prev, replyMsg])
      setLoading(false)
      earn(2, 'Jarvis chat')
    } catch (err) {
      setLoading(false)
      const replyMsg = { role: 'model', text: `Jarvis is offline 🧊 (${err.message})`, id: Date.now() + 1 }
      setHistory(prev => [...prev, replyMsg])
    }
  }

  const toggleSpeech = () => {
    if (!recognitionRef.current) {
      showToast('⚠️ Speech recognition not supported on this platform.', 'warning')
      return
    }
    if (isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    } else {
      setIsListening(true)
      recognitionRef.current.start()
    }
  }

  const processVoiceCommand = async (phrase) => {
    const text = phrase.toLowerCase().trim()
    const todayStr = new Date().toLocaleDateString('en-CA')

    // 1. Log Water
    // e.g. "log water 250", "log water 500"
    const waterMatch = text.match(/(?:log|add|drink)\s+water\s+(\d+)|(?:log|add|drink)\s+(\d+)\s*ml/)
    if (waterMatch) {
      const amt = parseInt(waterMatch[1] || waterMatch[2])
      if (amt > 0) {
        const { error } = await supabase.from('health_water_logs').insert({
          user_id: userRef.current.id,
          log_date: todayStr,
          amount_ml: amt
        })
        if (!error) {
          showToast(`🎙️ Logged ${amt}ml water!`, 'success')
          await earnZyrons(userRef.current.id, 2, 'Water Logged (Voice)')
          fetchLatest()
        } else {
          showToast('❌ Failed to log water', 'error')
        }
        return
      }
    }

    // 2. Log Weight
    // e.g. "log weight 56", "set weight 60.5"
    const weightMatch = text.match(/(?:log|set)\s+weight\s+(\d+(?:\.\d+)?)/)
    if (weightMatch) {
      const weight = parseFloat(weightMatch[1])
      if (weight > 0) {
        const { error } = await supabase.from('system_goals').upsert({
          user_id: userRef.current.id,
          weight_current: weight,
          updated_at: new Date().toISOString()
        })
        if (!error) {
          showToast(`🎙️ Set current weight to ${weight}kg!`, 'success')
          await earnZyrons(userRef.current.id, 5, 'Weight Set (Voice)')
          fetchLatest()
        } else {
          showToast('❌ Failed to update weight', 'error')
        }
        return
      }
    }

    // 3. Log Expense/Income
    // e.g. "log expense 200 for food", "log income 500 for freelance"
    const moneyMatch = text.match(/(?:log|add)\s+(expense|spending|income)\s+(\d+)(?:\s+for\s+([\w\s]+))?/)
    if (moneyMatch) {
      const type = moneyMatch[1]
      const amt = parseFloat(moneyMatch[2])
      const note = (moneyMatch[3] || 'Voice Log').trim()
      if (amt > 0) {
        const isIncome = type === 'income'
        let error
        if (isIncome) {
          // Route income to wealth_income table
          const res = await supabase.from('wealth_income').insert({
            user_id: userRef.current.id,
            amount: amt,
            source: note,
            note: 'Voice Log',
            income_date: todayStr
          })
          error = res.error
        } else {
          // Route expense to money_expenses table
          const res = await supabase.from('money_expenses').insert({
            user_id: userRef.current.id,
            amount: amt,
            category: 'Other',
            note: note,
            expense_date: todayStr
          })
          error = res.error
        }
        if (!error) {
          showToast(`🎙️ Logged ${isIncome ? 'Income' : 'Expense'} of ₹${amt}!`, 'success')
          await earnZyrons(userRef.current.id, 5, 'Money logged (Voice)')
          fetchLatest()
        } else {
          showToast('❌ Failed to log transaction', 'error')
        }
        return
      }
    }

    // 4. Complete Habit
    // e.g. "complete habit workout", "complete reading"
    const habitMatch = text.match(/(?:complete|log|check)\s+habit\s+([\w\s]+)|(?:complete|log|check)\s+([\w\s]+)/)
    if (habitMatch) {
      const habitName = (habitMatch[1] || habitMatch[2]).trim()
      const match = habits.find(h => h.name.toLowerCase().includes(habitName))
      if (match) {
        const { error } = await supabase.from('activity_log').insert({
          user_id: userRef.current.id,
          habit_id: match.id,
          completed_date: todayStr,
          status: 'completed'
        })
        if (!error) {
          showToast(`🎙️ Completed habit: ${match.name}!`, 'success')
          await earnZyrons(userRef.current.id, 10, `Completed (Voice): ${match.name}`)
          fetchLatest()
        } else {
          showToast('❌ Already logged or failed', 'error')
        }
        return
      }
    }

    // Fallback: treat as chatbot prompt
    handleSend(phrase)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 12 }}>
      {/* Settings Row */}
      <div style={{ display: 'flex', gap: 8 }}>
        {['Supportive', 'Strict', 'Zen'].map(p => {
          const active = personality === p
          const st = personalities[p]
          return (
            <button key={p} onClick={() => { setPersonality(p); localStorage.setItem('zyrbit_personality', p) }}
              style={{ flex: 1, padding: '8px', borderRadius: 12, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                background: active ? st.bg : '#0a0a12', border: `1px solid ${active ? st.border : '#1e1e2a'}`, color: active ? st.color : '#444' }}>
              {p === 'Strict' ? 'Drill Sergeant 👹' : p === 'Zen' ? 'Zen Mentor 🧘' : 'Encouraging 🤝'}
            </button>
          )
        })}
      </div>

      {/* Chat Area */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 180, display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 8, paddingBottom: 10 }}>
        {history.length === 0 && <div style={{ textAlign: 'center', color: '#444', fontSize: 12, marginTop: 40 }}>"Jarvis active. Speak or type instructions."</div>}
        {history.map(m => (
          <div key={m.id} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
            <div style={{
              padding: '10px 14px', fontSize: 13, lineHeight: 1.5,
              background: m.role === 'user' ? '#001a1a' : '#0d0818',
              border: m.role === 'user' ? '1px solid #00ffff20' : '1px solid #2a1a3a',
              borderLeft: m.role === 'user' ? undefined : '2.5px solid #9c27b0',
              borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '4px 14px 14px 14px',
              color: m.role === 'user' ? '#e8e8f0' : '#aaaabc',
              whiteSpace: 'pre-wrap'
            }}>
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ alignSelf: 'flex-start', background: '#0d0818', border: '1px solid #2a1a3a', borderLeft: '2.5px solid #9c27b0', borderRadius: '4px 14px 14px 14px', padding: '12px 14px' }}>
            <div style={{ display: 'flex', gap: 4 }}>
              <div style={{ width: 6, height: 6, background: '#9c27b0', borderRadius: '50%', animation: 'bounce 1s infinite' }} />
              <div style={{ width: 6, height: 6, background: '#9c27b0', borderRadius: '50%', animation: 'bounce 1s infinite 0.2s' }} />
              <div style={{ width: 6, height: 6, background: '#9c27b0', borderRadius: '50%', animation: 'bounce 1s infinite 0.4s' }} />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Row */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} disabled={loading}
          placeholder={isListening ? "Listening closely..." : "Speak command or chat..."} 
          style={{ flex: 1, background: '#0D0D18', border: '1px solid #1E1E28', borderRadius: 12, padding: '12px 16px', color: '#e8e8f0', fontSize: 13, outline: 'none' }} />
        
        {/* MIC COMMAND BUTTON */}
        <button onClick={toggleSpeech}
          style={{
            width: 44, height: 44, borderRadius: 12, border: 'none', cursor: 'pointer',
            background: isListening ? '#EF4444' : '#00BCD4',
            color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: isListening ? '0 0 15px rgba(239,68,68,0.4)' : 'none',
            transition: 'all 0.2s'
          }}>
          {isListening ? '🛑' : '🎙️'}
        </button>
        
        <button onClick={() => handleSend()} disabled={loading || !input.trim()}
          style={{ width: 44, height: 44, borderRadius: 12, background: '#9c27b0', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          ↑
        </button>
      </div>

      {/* COMMAND HELPER BOX */}
      <div style={{ background: '#050508', border: '1px solid #1E1E28', borderRadius: 12, padding: '10px 14px', fontSize: 10, color: '#555', lineHeight: 1.5 }}>
        🗣️ **Try commands:** "log water 250" · "log weight 62" · "log expense 150 for food" · "complete habit reading"
      </div>
    </div>
  )
}

// --- TAB 2: DAILY SUMMARY & SUGGESTIONS ---
function SummaryTab({ userContext, uid }) {
  const [summary, setSummary] = useState(null)
  const [suggs, setSuggs] = useState(null)
  const [loading, setLoading] = useState({})

  const today = new Date().toLocaleDateString('en-CA')

  const handleRefreshSummary = async () => {
    setLoading(p => ({ ...p, summary: true }))
    const prompt = `Synthesize a professional Daily Summary of metrics under 100 words for user ${userContext.name}. Context: Completed ${userContext.done}/${userContext.total} habits. Streak: ${userContext.streak} days. Gravity: ${userContext.gravity}. Water: ${userContext.waterTotal || 0}ml. Sleep: ${userContext.sleepHours || 0}h. Money Spent: ${userContext.spentTotal || 0}. Make it feel personal and analytical.`
    try {
      const res = await generateContent(prompt)
      if (res) setSummary(res)
    } catch (_) {}
    setLoading(p => ({ ...p, summary: false }))
  }

  const handleRefreshSuggs = async () => {
    setLoading(p => ({ ...p, suggs: true }))
    const prompt = `Provide 3 smart suggestions based on user context. Total habits completed ${userContext.done}/${userContext.total}. Weakest zone is ${userContext.weakestZone || 'Growth'}. Sleep: ${userContext.sleepHours} hours. Return JSON array format: [{"dot":"#00bcd4","tip":"..."}]`
    try {
      const res = await generateContent(prompt)
      const parsed = JSON.parse(res.replace(/```json|```/g,'').trim())
      setSuggs(parsed)
    } catch (_) {}
    setLoading(p => ({ ...p, suggs: false }))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto', paddingBottom: 20 }}>
      {/* Consolidated Daily Summary */}
      <div style={{ background: '#0d0d18', border: '1px solid #1e1e2a', borderLeft: '3px solid #00bcd4', borderRadius: 16, padding: 14 }}>
        <div style={{ fontSize: 9, color: '#00bcd480', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 800, marginBottom: 8 }}>PERSONAL OS SUMMARY</div>
        <div style={{ fontSize: 12, color: '#e8e8f0', lineHeight: 1.6, marginBottom: 12 }}>
          {loading.summary ? 'Synthesizing...' : summary || 'Tap refresh to generate analysis of today\'s activities.'}
        </div>
        <button onClick={handleRefreshSummary} disabled={loading.summary} style={{ background: '#00bcd415', border: '1px solid #00bcd430', color: '#00bcd4', padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>
          ↻ Generate Analysis
        </button>
      </div>

      {/* Smart Suggestions */}
      <div style={{ background: '#0d0d18', border: '1px solid #1e1e2a', borderLeft: '3px solid #9c27b0', borderRadius: 16, padding: 14 }}>
        <div style={{ fontSize: 9, color: '#9c27b0', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 800, marginBottom: 12 }}>SMART SUGGESTIONS</div>
        {loading.suggs ? <div style={{ color: '#555', fontSize: 12 }}>Analyzing logs...</div> : (!suggs ? (
           <button onClick={handleRefreshSuggs} style={{ background: '#9c27b015', border: '1px solid #9c27b030', color: '#ce93d8', padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>Generate Suggestions</button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {suggs.map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.dot || '#00bcd4', marginTop: 5, flexShrink: 0 }} />
                <div style={{ fontSize: 12, color: '#e8e8f0', lineHeight: 1.5 }}>{s.tip}</div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

// --- TAB 3: DAILY BRAIN QUIZ ---
function QuizTab({ earn, userContext }) {
  const [questions, setQuestions] = useState([])
  const [qIdx, setQIdx] = useState(0)
  const [sessionEarned, setSessionEarned] = useState(0)
  const [timeLeft, setTimeLeft] = useState(20)
  const [selected, setSelected] = useState(null)
  const [status, setStatus] = useState('idle') // idle, correct, wrong
  const [quizPhase, setQuizPhase] = useState('start') // start, active, gameover, maxearned
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

  useEffect(() => {
    if (quizPhase === 'active' && status === 'idle' && !learnMode && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000)
      return () => clearTimeout(timer)
    } else if (timeLeft === 0 && status === 'idle') {
      handleAnswer(-1)
    }
  }, [quizPhase, status, timeLeft, learnMode])

  const startQuiz = async () => {
    setLoading(true)
    const today = new Date().toDateString()
    const cacheKey = `zyrbit_quiz_${userContext?.rank || 'guest'}_${today}`
    let qs = localStorage.getItem(cacheKey)
    if (qs) {
      qs = JSON.parse(qs)
    } else {
      const prompt = `Generate exactly 10 unique riddles, math teasers, logic puzzles and habit wellness questions. Return ONLY raw JSON array: [{"q":"...","opts":["A","B","C","D"],"ans":0,"cat":"Logic","explanation":"..."}]`
      try {
        const res = await generateContent(prompt)
        qs = JSON.parse(res.replace(/```json|```/g,'').trim())
        if (qs.length > 10) qs = qs.slice(0, 10)
        localStorage.setItem(cacheKey, JSON.stringify(qs))
      } catch (_) {
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
      const actualEarn = Math.min(EARNINGS[qIdx], 500 - sessionEarned)
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
        {questions.map((q, i) => (
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
      <div style={{ background: '#0d0d18', border: '1px solid #2A2A3A', borderRadius: 18, padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🧠</div>
        <h3 style={{ fontSize: 16, fontWeight: 900, color: '#e8e8f0', marginBottom: 4 }}>Daily Brain Teasers</h3>
        <p style={{ fontSize: 11, color: '#666', marginBottom: 20 }}>Unlock Zyrons by keeping your mental faculty active</p>
        
        {cooldown ? (
          <div style={{ background: '#1e1e2a', padding: 16, borderRadius: 12, color: '#aaaabc', fontSize: 12, fontWeight: 700 }}>
            Already played today — resets in {formatTime(cooldown)}
          </div>
        ) : (
          <button onClick={startQuiz} disabled={loading} style={{ background: '#ff9800', color: '#000', width: '100%', padding: 16, borderRadius: 12, fontWeight: 900, fontSize: 13, border: 'none', cursor: 'pointer' }}>
            {loading ? 'Generating...' : 'Start Quiz — Earn Zyrons ⚡'}
          </button>
        )}
      </div>
    )
  }

  if (quizPhase === 'gameover' || quizPhase === 'maxearned') {
    return (
      <div style={{ background: '#0d0d18', border: '1px solid #2A2A3A', borderRadius: 18, padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>{quizPhase === 'gameover' ? '💥' : '🏆'}</div>
        <h3 style={{ fontSize: 18, fontWeight: 900, color: quizPhase === 'gameover' ? '#ef4444' : '#fde047', marginBottom: 8 }}>
          {quizPhase === 'gameover' ? 'Brain Fried!' : 'Galaxy Brain!'}
        </h3>
        <p style={{ fontSize: 12, color: '#aaaabc', marginBottom: 20 }}>{sessionEarned} Zyrons added to your wallet.</p>
        <button onClick={() => setLearnMode(true)} style={{ background: '#9c27b0', color: '#fff', border: 'none', width: '100%', padding: 12, borderRadius: 12, fontWeight: 800, fontSize: 13, cursor: 'pointer', marginBottom: 10 }}>📚 Review Answers</button>
        <button onClick={() => setQuizPhase('start')} style={{ background: '#1e1e2a', color: '#666', border: 'none', width: '100%', padding: 12, borderRadius: 12, fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>Done</button>
      </div>
    )
  }

  const q = questions[qIdx]
  if (!q) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#888' }}>
        <span>QUESTION {qIdx+1} OF 10</span>
        <span style={{ color: '#ff9800' }}>+{EARNINGS[qIdx]}⚡</span>
      </div>
      <div style={{ background: '#0D0D18', border: '1px solid #1E1E28', borderRadius: 16, padding: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#FFF', lineHeight: 1.5 }}>{q.q}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {q.opts.map((opt, i) => {
          let bg = '#0A0A12', border = '#1E1E28'
          if (status !== 'idle') {
            if (i === q.ans) { bg = '#4caf5020'; border = '#4caf50' }
            else if (i === selected) { bg = '#ef444420'; border = '#ef4444' }
          }
          return (
            <button key={i} onClick={() => handleAnswer(i)} disabled={status !== 'idle'}
              style={{ padding: '14px', background: bg, border: `1px solid ${border}`, borderRadius: 12, color: '#FFF', fontSize: 13, textAlign: 'left', cursor: 'pointer' }}>
              {opt}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// --- MAIN PAGE ---
export default function Jarvis() {
  const navigate = useNavigate()
  const [activeSubTab, setActiveSubTab] = useState('chat') // chat, summary, quiz
  const [user, setUser] = useState(null)
  const [userContext, setUserContext] = useState(null)
  const [habits, setHabits] = useState([])

  const userRef = useRef(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        userRef.current = user
        setUser(user)
        buildContext(user)
      }
    })
  }, [])

  const buildContext = async (u) => {
    const today = new Date().toLocaleDateString('en-CA')
    const [{ data: h }, { data: logs }, { data: streaks }, wallet, gs, { data: sleep }, { data: wat }, { data: exp }] = await Promise.all([
      supabase.from('habits').select('*').eq('user_id', u.id),
      supabase.from('activity_log').select('habit_id,status').eq('user_id', u.id).eq('completed_date', today),
      supabase.from('user_streaks').select('current_streak,longest_streak').eq('user_id', u.id),
      getWallet(u.id),
      computeGravityScore(supabase, u.id),
      supabase.from('health_sleep_logs').select('duration_hours').eq('user_id', u.id).eq('sleep_date', today).single(),
      supabase.from('health_water_logs').select('amount_ml').eq('user_id', u.id).eq('log_date', today),
      supabase.from('money_expenses').select('amount').eq('user_id', u.id).eq('expense_date', today)
    ])

    if (h) setHabits(h)

    const completed = logs?.filter(l => l.status === 'completed').length || 0
    const rs = getRankByZyrons(wallet?.total_earned || 0)
    
    // find weakest zone
    let weakest = 'mind'
    if (h && h.length > 0) {
      const zoneCounts = {}
      h.forEach(hb => { zoneCounts[hb.zone] = (zoneCounts[hb.zone] || 0) + 1 })
      weakest = Object.entries(zoneCounts).sort((a,b)=>a[1]-b[1])[0][0]
    }

    const waterSum = wat ? wat.reduce((sum, item) => sum + item.amount_ml, 0) : 0
    const spentSum = exp ? exp.filter(e => e.amount > 0).reduce((sum, item) => sum + Number(item.amount), 0) : 0

    setUserContext({
      name: u.user_metadata?.full_name || 'Orbiter',
      rank: rs.name,
      total: h?.length || 0,
      done: completed,
      streak: streaks?.reduce((m, s) => Math.max(m, s.current_streak || 0), 0) || 0,
      balance: wallet?.balance || 0,
      gravity: gs,
      weakestZone: weakest,
      sleepHours: sleep?.duration_hours || 0,
      waterTotal: waterSum,
      spentTotal: spentSum
    })
  }

  const handleEarn = useCallback(async (amt, reason) => {
    const currentUser = userRef.current
    if (!currentUser) return false
    if (amt <= 0) return true
    
    const earned = await earnZyrons(currentUser.id, amt, reason)
    if (earned) {
      showToast(`+${amt} ⚡`, 'success')
      setUserContext(prev => prev ? { ...prev, balance: prev.balance + amt } : prev)
      return true
    } else {
      showToast('❌ Save failed', 'error')
      return false
    }
  }, [])

  return (
    <div className="app-container page-enter" style={{ background: 'var(--bg-page)', minHeight: '100vh', color: 'var(--text-primary)' }}>
      {/* HEADER */}
      <div style={{ padding: '32px 20px 0' }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: -0.5, marginBottom: 4 }}>Jarvis AI</h1>
        <p style={{ fontSize: 11, color: '#444', fontWeight: 600, marginBottom: 20 }}>System Voice Command & Wellness Intelligence</p>
        
        {/* SUB TABS */}
        <div style={{ display: 'flex', gap: '8px', paddingBottom: 16 }}>
          {[
            { id: 'chat', label: 'Jarvis Voice Chat 🤖' },
            { id: 'summary', label: 'OS Summary 📊' },
            { id: 'quiz', label: 'Brain Teasers 🧠' }
          ].map(t => {
            const isActive = activeSubTab === t.id
            return (
              <button key={t.id} onClick={() => setActiveSubTab(t.id)}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 12, cursor: 'pointer',
                  border: isActive ? '1px solid #FFF' : '1px solid #1A1A24',
                  background: isActive ? '#FFF' : '#0A0A12',
                  color: isActive ? '#000' : '#444',
                  fontWeight: 900, fontSize: 10, transition: 'all 0.2s', textAlign: 'center'
                }}>
                {t.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* CONTENTS */}
      <div className="page-content" style={{ height: 'calc(100vh - 240px)', display: 'flex', flexDirection: 'column' }}>
        {activeSubTab === 'chat' && (
          <ChatTab userContext={userContext} earn={handleEarn} habits={habits} fetchLatest={() => buildContext(user)} userRef={userRef} />
        )}
        
        {activeSubTab === 'summary' && userContext && (
          <SummaryTab userContext={userContext} uid={user?.id} />
        )}

        {activeSubTab === 'quiz' && (
          <QuizTab earn={handleEarn} userContext={userContext} />
        )}
      </div>

      <BottomNav activeTab="jarvis" onTabChange={(t) => navigate(t === 'zenith' ? '/' : `/${t}`)} />
    </div>
  )
}
