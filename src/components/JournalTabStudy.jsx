import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { earnZyrons } from '../lib/zyrons'
import { showToast } from './Toast'
import StudyNotesTab from './StudyNotesTab'
import StudyTasksTab from './StudyTasksTab'

const getLocalYMD = (dateObj = new Date()) => {
  const d = new Date(dateObj.getTime() - dateObj.getTimezoneOffset() * 60000)
  return d.toISOString().split('T')[0]
}

const daysLeft = (dateStr) => {
  if (!dateStr) return null
  const target = new Date(dateStr)
  target.setHours(0,0,0,0)
  const now = new Date()
  now.setHours(0,0,0,0)
  const diffTime = target - now
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

const parseWeekString = (dt = new Date()) => {
  const day = dt.getDay() || 7
  dt.setHours(-24 * (day - 1))
  return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate())
}

const formatHMS = (secs) => {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export default function JournalTabStudy({ user }) {
  const todayDate = getLocalYMD()
  const [activeStudyTab, setActiveStudyTab] = useState('pomodoro')
  
  const [subjects, setSubjects] = useState([])
  const [countdowns, setCountdowns] = useState([])
  const [goals, setGoals] = useState(null)
  const [sessions, setSessions] = useState([])

  // Pomodoro State
  const [pomSubject, setPomSubject] = useState('general')
  const [pomTime, setPomTime] = useState(25 * 60)
  const [pomRunning, setPomRunning] = useState(false)
  const [pomSessionNum, setPomSessionNum] = useState(0)
  const [pomPhase, setPomPhase] = useState('focus')

  // Planner State
  const [plannerView, setPlannerView] = useState('This Week') // 'This Week' or 'This Month'
  const [showLogModal, setShowLogModal] = useState(false)
  const [logForm, setLogForm] = useState({ subject: 'general', hours: 1, date: todayDate })

  // Countdown Modal
  const [showCdModal, setShowCdModal] = useState(false)
  const [cdForm, setCdForm] = useState({ id: null, type: 'exam', name: '', date: todayDate })

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    let interval = null
    if (pomRunning && pomTime > 0) interval = setInterval(() => setPomTime(t => t - 1), 1000)
    else if (pomRunning && pomTime === 0) handlePomComplete()
    return () => clearInterval(interval)
  }, [pomRunning, pomTime])

  const loadData = async () => {
    const [{ data: sDocs }, { data: cDocs }, { data: gDocs }, { data: sessDocs }] = await Promise.all([
       supabase.from('study_subjects').select('*').eq('user_id', user.id),
       supabase.from('study_exams').select('*').eq('user_id', user.id),
       supabase.from('study_goals').select('*').eq('user_id', user.id).single(),
       supabase.from('study_sessions').select('*').eq('user_id', user.id)
    ])
    if (sDocs) setSubjects(sDocs)
    if (cDocs) {
      setCountdowns(cDocs)
      checkNotifs(cDocs)
    }
    if (gDocs) setGoals(gDocs)
    else {
      const startW = parseWeekString()
      const startM = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      const defGoals = { weekly: 15, monthly: 60 }
      setGoals({ weekly_target_hours: 15, monthly_target_hours: 60 })
      // We'd ideally create the goal in DB here if missing
    }
    if (sessDocs) setSessions(sessDocs)
  }

  const checkNotifs = (cds) => {
    if (!('Notification' in window)) return
    if (Notification.permission === 'default') Notification.requestPermission()
    if (Notification.permission !== 'granted') return
    
    const notified = JSON.parse(localStorage.getItem('zyrbit_notified_' + todayDate) || '[]')
    cds.forEach(cd => {
      const d = daysLeft(cd.exam_date)
      if (d !== null && d <= 3 && d >= 0 && !notified.includes(cd.id)) {
        const type = cd.type || 'exam'
        const msgs = {
          0: { t: `⚡ ${cd.name} is TODAY!`, b: `Your ${type} is today!` },
          1: { t: `⏳ ${cd.name} is TOMORROW`, b: `1 day left — final prep!` },
          2: { t: `📅 ${cd.name} in 2 days`, b: `2 days until ${type}` },
          3: { t: `🎯 ${cd.name} in 3 days`, b: `Stay focused — 3 days left!` },
        }
        const m = msgs[d]
        if (m) new Notification(m.t, { body: m.b, icon: '/icon-192x192.png', tag: `cd-${cd.id}` })
        notified.push(cd.id)
        localStorage.setItem('zyrbit_notified_' + todayDate, JSON.stringify(notified))
      }
    })
  }

  const handlePomComplete = async () => {
    setPomRunning(false)
    const nextSession = pomSessionNum + 1
    
    let isUrgent = false
    countdowns.forEach(c => { const d = daysLeft(c.exam_date); if (d !== null && d <= 7 && d >= 0) isUrgent = true })
    const zyrons = 10 + (isUrgent ? 5 : 0)

    await earnZyrons(user.id, zyrons, 'Pomodoro complete')
    
    await supabase.from('study_sessions').insert({
      user_id: user.id,
      subject_id: pomSubject === 'general' ? null : pomSubject,
      duration_minutes: 25,
      session_date: todayDate,
      notes: 'Pomodoro'
    })
    
    setPomSessionNum(nextSession)
    if (nextSession >= 4) {
      setPomPhase('long_break')
      setPomTime(15 * 60)
      setPomSessionNum(0)
    } else {
      setPomPhase('short_break')
      setPomTime(5 * 60)
    }

    showToast(`🍅 +${zyrons} ⚡ Focus session done!`, 'success')
    loadData()
  }

  const saveLog = async () => {
    if (logForm.hours <= 0) return
    await supabase.from('study_sessions').insert({
      user_id: user.id,
      subject_id: logForm.subject === 'general' ? null : logForm.subject,
      duration_minutes: logForm.hours * 60,
      session_date: logForm.date,
      notes: 'Manual log'
    })
    const rew = Math.floor(logForm.hours * 10)
    await earnZyrons(user.id, rew, 'Logged Study')
    showToast(`📚 +${rew} ⚡ Logged!`, 'success')
    setShowLogModal(false)
    loadData()
  }

  const saveCd = async () => {
    if (!cdForm.name) return
    const payload = { user_id: user.id, name: cdForm.name, exam_date: cdForm.date, type: cdForm.type, show_countdown_only: true }
    if (cdForm.id) {
       await supabase.from('study_exams').update(payload).eq('id', cdForm.id)
    } else {
       await supabase.from('study_exams').insert(payload)
    }
    setShowCdModal(false)
    loadData()
  }

  const deleteCd = async (e, id) => {
    e.stopPropagation()
    if (!window.confirm("Delete this countdown?")) return
    await supabase.from('study_exams').delete().eq('id', id)
    loadData()
  }

  // --- Rendering Calculations ---
  const weekStart = parseWeekString(new Date())
  const dailyHrs = Array(7).fill(0)
  let weekActual = 0
  
  sessions.forEach(s => {
    const dt = new Date(s.session_date)
    if (dt >= weekStart) {
       const diff = Math.floor((dt - weekStart) / 86400000)
       if (diff >= 0 && diff < 7) {
         dailyHrs[diff] += s.duration_minutes / 60
         weekActual += s.duration_minutes / 60
       }
    }
  })
  
  const weekTarget = goals?.weekly_target_hours || 15
  const weekPct = Math.min(100, Math.round((weekActual / weekTarget) * 100))
  const weekProgColor = weekPct < 50 ? '#EF4444' : weekPct < 85 ? '#FF9800' : '#4CAF50'

  const curMonth = new Date().getMonth()
  const daysInMonth = new Date(new Date().getFullYear(), curMonth + 1, 0).getDate()
  const monthDayHrs = Array(daysInMonth).fill(0)
  let monthActual = 0

  sessions.forEach(s => {
    const dt = new Date(s.session_date)
    if (dt.getMonth() === curMonth && dt.getFullYear() === new Date().getFullYear()) {
       monthDayHrs[dt.getDate() - 1] += s.duration_minutes / 60
       monthActual += s.duration_minutes / 60
    }
  })

  const monthTarget = goals?.monthly_target_hours || 60
  const monthPct = Math.min(100, Math.round((monthActual / monthTarget) * 100))

  return (
    <div style={{ padding: '0 16px', paddingBottom: 100, animation: 'fadeIn 0.4s ease-out' }}>

      {/* 4-TAB BAR */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '20px 0 16px' }}>
        {[
          { id: 'pomodoro',   icon: '📚', label: 'Pomodoro' },
          { id: 'tasks',      icon: '✅', label: 'Tasks' },
          { id: 'notes',      icon: '📝', label: 'Notes' },
          { id: 'countdowns', icon: '⏳', label: 'Countdowns' },
        ].map(t => {
          const act = activeStudyTab === t.id
          return (
            <button key={t.id} onClick={() => setActiveStudyTab(t.id)} style={{
              flex: '1 1 calc(50% - 8px)', padding: '8px 18px', borderRadius: 100, cursor: 'pointer', transition: 'all 0.2s',
              background: act ? '#FFF' : '#0A0A12',
              border: `1px solid ${act ? '#FFF' : '#1A1A24'}`,
              color: act ? '#000' : '#444',
              fontWeight: 900, fontSize: 11,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
            }}>
              <span>{t.icon}</span>
              {t.label}
            </button>
          )
        })}
      </div>

      {/* TASKS TAB */}
      {activeStudyTab === 'tasks' && <StudyTasksTab user={user} />}

      {/* NOTES TAB */}
      {activeStudyTab === 'notes' && <StudyNotesTab user={user} />}

      {/* POMODORO TAB */}
      {activeStudyTab === 'pomodoro' && (
        <>

        <div style={{ 
          background: 'linear-gradient(145deg, #13131A 0%, #0A0A12 100%)', 
          border: '1px solid #1E1E2A', 
          borderRadius: 28, 
          padding: 24,
          boxShadow: '0 12px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.02)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Subtle background glow */}
          <div style={{ position: 'absolute', top: -50, right: -50, width: 150, height: 150, background: 'radial-gradient(circle, rgba(0,188,212,0.15) 0%, rgba(0,0,0,0) 70%)', borderRadius: '50%', pointerEvents: 'none' }} />

          {/* Integrated Header / Subject Selector */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 10, color: '#00BCD4', textTransform: 'uppercase', letterSpacing: 2, fontWeight: 900, marginBottom: 4 }}>
                Session {pomSessionNum}/4 · {pomPhase === 'focus' ? 'Focus' : 'Break'}
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', paddingBottom: 4 }}>
                {[{id:'general', name:'General'}, ...subjects].map(s => (
                  <button key={s.id} onClick={() => setPomSubject(s.id)} style={{ flex: '1 1 auto', padding: '4px 10px', borderRadius: 8, border: pomSubject === s.id ? '1px solid #00BCD4' : '1px solid #1A1A24', background: pomSubject === s.id ? '#00BCD415' : 'transparent', color: pomSubject === s.id ? '#00BCD4' : '#666', fontWeight: 700, fontSize: 11, cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center' }}>
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          <div style={{ 
            fontSize: 72, 
            fontWeight: 900, 
            textAlign: 'center', 
            letterSpacing: -4, 
            fontFamily: '"SF Pro Display", "Inter", sans-serif',
            fontVariantNumeric: 'tabular-nums', 
            color: pomTime > 600 ? '#FFFFFF' : pomTime > 300 ? '#FF9800' : '#EF4444',
            textShadow: pomTime > 600 ? '0 0 30px rgba(255,255,255,0.1)' : '0 0 30px rgba(239,68,68,0.2)',
            marginBottom: 4
          }}>
            {formatHMS(pomTime)}
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, marginBottom: 28 }}>
            <div style={{ color: '#00BCD4', fontSize: 14 }}>⚡</div>
            <div style={{ fontSize: 11, color: '#888', fontWeight: 600, letterSpacing: 0.5 }}>+10 ZYRONS ON COMPLETION</div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 28 }}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} style={{ 
                width: 12, height: 12, borderRadius: '50%', 
                background: i <= pomSessionNum ? '#00BCD4' : i === pomSessionNum + 1 ? '#00BCD440' : '#1A1A24',
                boxShadow: i <= pomSessionNum ? '0 0 10px rgba(0,188,212,0.4)' : 'none',
                transition: 'all 0.3s'
              }} />
            ))}
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            {pomRunning ? (
              <button onClick={() => setPomRunning(false)} style={{ flex: 1, padding: 16, borderRadius: 16, background: 'linear-gradient(180deg, #FEF2F2 0%, #FECACA 100%)', border: 'none', color: '#B91C1C', fontSize: 16, fontWeight: 900, cursor: 'pointer', boxShadow: '0 4px 14px rgba(239, 68, 68, 0.2)' }}>
                ⏸ Pause Timer
              </button>
            ) : (
              <button onClick={() => setPomRunning(true)} style={{ flex: 1, padding: 16, borderRadius: 16, background: 'linear-gradient(180deg, #67E8F9 0%, #06B6D4 100%)', border: 'none', color: '#083344', fontSize: 16, fontWeight: 900, cursor: 'pointer', boxShadow: '0 4px 14px rgba(6, 182, 212, 0.3)' }}>
                ▶ Start Focus
              </button>
            )}
            <button onClick={() => { setPomRunning(false); setPomTime(25*60); setPomPhase('focus') }} style={{ width: 56, height: 56, borderRadius: 16, background: '#1A1A24', border: '1px solid #2A2A3A', color: '#888', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', ':hover': { color: '#fff' } }}>
              ↺
            </button>
          </div>
        </div>
        </>
      )}

      {/* COUNTDOWNS TAB */}
      {activeStudyTab === 'countdowns' && (
        <>
      {/* 2. UPCOMING COUNTDOWNS */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: '#E8E8F0', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: '#00BCD4' }}>⏳</span> UPCOMING
          </div>
          <button onClick={() => { setCdForm({ id: null, type: 'exam', name: '', date: todayDate }); setShowCdModal(true) }} style={{ padding: '6px 14px', background: '#00BCD415', border: '1px solid #00BCD430', color: '#00BCD4', borderRadius: 100, fontSize: 11, fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s' }}>
            + Add
          </button>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
          {countdowns.map(cd => {
             const d = daysLeft(cd.exam_date)
             if (d === null) return null
             const typeDetails = {
               exam: { color: '#4CAF50', icon: '📝' }, event: { color: '#00BCD4', icon: '🎉' },
               deadline: { color: '#9C27B0', icon: '⚡' }, other: { color: '#888888', icon: '📌' }
             }
             const td = typeDetails[cd.type || 'exam']
             const urgColor = d === 0 || d <= 2 ? '#EF4444' : d <= 7 ? '#F97316' : d <= 14 ? '#EAB308' : td.color

             return (
               <div key={cd.id} onClick={() => { setCdForm({ id: cd.id, type: cd.type || 'exam', name: cd.name, date: cd.exam_date }); setShowCdModal(true) }} style={{ background: '#111118', border: `1px solid #1E1E2A`, borderTop: `2px solid ${urgColor}`, borderRadius: 16, padding: '14px', cursor: 'pointer', position: 'relative', transition: 'transform 0.2s, box-shadow 0.2s' }}>
                 <div style={{ fontSize: 9, color: urgColor, opacity: 0.8, textTransform: 'uppercase', fontWeight: 800, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                   {td.icon} {cd.type || 'exam'}
                 </div>
                 <div style={{ fontSize: 13, color: '#FFFFFF', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 12 }}>{cd.name}</div>
                 
                 <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                   <div style={{ fontSize: 32, color: urgColor, fontWeight: 900, letterSpacing: -1, animation: d <= 2 ? 'pulse 2s infinite' : 'none', lineHeight: 1 }}>{d}</div>
                   <div style={{ fontSize: 10, color: '#666', fontWeight: 700, textTransform: 'uppercase' }}>{d === 1 ? 'day' : 'days'}</div>
                 </div>
                 
                 <button onClick={(e) => deleteCd(e, cd.id)} style={{ position: 'absolute', top: 10, right: 10, background: '#1A1A24', width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', color: '#666', fontSize: 10, cursor: 'pointer' }}>✕</button>
               </div>
             )
          })}
          
          <div onClick={() => { setCdForm({ id: null, type: 'exam', name: '', date: todayDate }); setShowCdModal(true) }} style={{ border: '1.5px dashed #2A2A3A', backgroundColor: '#0A0A12', borderRadius: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#666', fontWeight: 800, cursor: 'pointer', minHeight: 110, transition: 'all 0.2s' }}>
            <div style={{ fontSize: 24, marginBottom: 4 }}>+</div>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>New Event</div>
          </div>
        </div>
      </div>

      {/* 3. STUDY PLANNER (Clean segmented layout) */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
           <div style={{ fontSize: 12, color: '#E8E8F0', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
             <span style={{ color: '#9C27B0' }}>🎯</span> PLANNER
           </div>
           
           {/* Segmented Control */}
           <div style={{ display: 'flex', background: '#111118', padding: 4, borderRadius: 100, border: '1px solid #1E1E2A' }}>
              <button onClick={() => setPlannerView('This Week')} style={{ padding: '6px 14px', borderRadius: 100, background: plannerView === 'This Week' ? '#2A2A3A' : 'transparent', color: plannerView === 'This Week' ? '#FFF' : '#666', fontWeight: 700, fontSize: 11, border: 'none', cursor: 'pointer', transition: 'all 0.2s' }}>Week</button>
              <button onClick={() => setPlannerView('This Month')} style={{ padding: '6px 14px', borderRadius: 100, background: plannerView === 'This Month' ? '#2A2A3A' : 'transparent', color: plannerView === 'This Month' ? '#FFF' : '#666', fontWeight: 700, fontSize: 11, border: 'none', cursor: 'pointer', transition: 'all 0.2s' }}>Month</button>
           </div>
        </div>

        {plannerView === 'This Week' ? (
          <div style={{ background: '#111118', border: '1px solid #1E1E2A', borderRadius: 24, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 }}>
               <div>
                 <div style={{ fontSize: 10, color: '#666', textTransform: 'uppercase', fontWeight: 800, letterSpacing: 1.5, marginBottom: 4 }}>Weekly Target</div>
                 <div style={{ fontSize: 24, fontWeight: 900, color: weekProgColor, letterSpacing: -0.5 }}>{weekActual.toFixed(1)} <span style={{fontSize: 14, color: '#666', fontWeight: 700}}>/ {weekTarget} h</span></div>
               </div>
               <div style={{ fontSize: 14, fontWeight: 900, color: weekProgColor }}>{weekPct}%</div>
            </div>
            
            <div style={{ height: 8, background: '#1A1A24', borderRadius: 4, overflow: 'hidden', marginBottom: 24, boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)' }}>
               <div style={{ width: `${weekPct}%`, height: '100%', background: weekProgColor, borderRadius: 4, transition: 'width 0.5s ease-out' }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20, height: 80, padding: '0 4px' }}>
              {['M','T','W','T','F','S','S'].map((d, i) => {
                 const hrs = dailyHrs[i]
                 const isToday = new Date().getDay() === (i + 1 === 7 ? 0 : i + 1)
                 const maxHrs = Math.max(...dailyHrs, 4) // scale relative to max or at least 4 hours
                 const barHeight = Math.max(10, (hrs / maxHrs) * 60)
                 
                 return (
                   <div key={d+i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                     <div style={{ fontSize: 9, color: hrs > 0 ? '#9C27B0' : '#444', fontWeight: 800 }}>{hrs > 0 ? hrs.toFixed(1) : ''}</div>
                     <div style={{ 
                       width: 14, 
                       height: barHeight, 
                       background: hrs > 0 ? (isToday ? '#00BCD4' : '#9C27B0') : '#1A1A24', 
                       borderRadius: 100,
                       transition: 'height 0.3s ease-out'
                     }} />
                     <div style={{ fontSize: 10, color: isToday ? '#FFF' : '#666', fontWeight: isToday ? 800 : 700 }}>{d}</div>
                   </div>
                 )
              })}
            </div>

            <button onClick={() => setShowLogModal(true)} style={{ width: '100%', padding: 14, borderRadius: 100, background: '#1A1A24', border: '1px solid #2A2A3A', color: '#E8E8F0', fontWeight: 800, fontSize: 13, cursor: 'pointer', transition: 'all 0.2s' }}>
              + Log Additional Hours
            </button>
          </div>
        ) : (
          <div style={{ background: '#111118', border: '1px solid #1E1E2A', borderRadius: 24, padding: 20 }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                 <div>
                   <div style={{ fontSize: 10, color: '#666', textTransform: 'uppercase', fontWeight: 800, letterSpacing: 1.5, marginBottom: 4 }}>Monthly Target</div>
                   <div style={{ fontSize: 24, fontWeight: 900, color: '#E8E8F0', letterSpacing: -0.5 }}>{monthActual.toFixed(1)} <span style={{fontSize: 14, color: '#666', fontWeight: 700}}>/ {monthTarget} h</span></div>
                 </div>
                 <div style={{ width: 64, height: 64, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                   <svg width="64" height="64" viewBox="0 0 64 64" style={{ position: 'absolute' }}>
                     <circle cx="32" cy="32" r="28" fill="none" stroke="#1A1A24" strokeWidth="6" />
                     <circle cx="32" cy="32" r="28" fill="none" stroke="#00BCD4" strokeWidth="6" strokeLinecap="round" strokeDasharray={2*Math.PI*28} strokeDashoffset={(2*Math.PI*28) * (1 - monthPct/100)} transform="rotate(-90 32 32)" style={{ transition: 'stroke-dashoffset 1s ease-out' }} />
                   </svg>
                   <div style={{ fontSize: 13, fontWeight: 900, color: '#00BCD4' }}>{monthPct}%</div>
                 </div>
             </div>

             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
                {Array.from({length: daysInMonth}).map((_, i) => {
                  const h = monthDayHrs[i]
                  // Color intensity thresholds
                  let bg = '#1A1A24'
                  if (h > 0) bg = '#9C27B040'
                  if (h > 1.5) bg = '#9C27B080'
                  if (h > 3) bg = '#9C27B0'
                  if (h > 5) bg = '#D946EF'
                  
                  return (
                    <div key={i} style={{ aspectRatio: '1', borderRadius: 6, background: bg, border: '1px solid rgba(255,255,255,0.02)', transition: 'background 0.3s' }} title={`Day ${i+1}: ${h}h`} />
                  )
                })}
             </div>
             <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 6, marginTop: 12 }}>
               <span style={{ fontSize: 9, color: '#666', fontWeight: 700 }}>Less</span>
               <div style={{ width: 8, height: 8, borderRadius: 2, background: '#1A1A24' }}/>
               <div style={{ width: 8, height: 8, borderRadius: 2, background: '#9C27B040' }}/>
               <div style={{ width: 8, height: 8, borderRadius: 2, background: '#9C27B080' }}/>
               <div style={{ width: 8, height: 8, borderRadius: 2, background: '#9C27B0' }}/>
               <span style={{ fontSize: 9, color: '#666', fontWeight: 700 }}>More</span>
             </div>
          </div>
        )}
      </div>
        </>
      )}

      {/* MODALS */}
      {showLogModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
           <div style={{ background: '#111118', borderTop: '1px solid #2A2A3A', width: '100%', borderRadius: '32px 32px 0 0', padding: 28, paddingBottom: 48, animation: 'fadeIn 0.2s ease-out' }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: '#E8E8F0', marginBottom: 24, letterSpacing: -0.5 }}>Log Study Session</div>
              
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, color: '#888', textTransform: 'uppercase', fontWeight: 800, marginBottom: 8, letterSpacing: 1 }}>Subject</div>
                <select value={logForm.subject} onChange={e => setLogForm({...logForm, subject: e.target.value})} style={{ width: '100%', background: '#1A1A24', border: '1px solid #2A2A3A', color: '#fff', padding: 16, borderRadius: 16, outline: 'none', fontWeight: 600 }}>
                   <option value="general">General Study</option>
                   {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div style={{ display: 'flex', gap: 16, marginBottom: 32 }}>
                 <div style={{ flex: 1 }}>
                   <div style={{ fontSize: 10, color: '#888', textTransform: 'uppercase', fontWeight: 800, marginBottom: 8, letterSpacing: 1 }}>Hours</div>
                   <input type="number" step="0.5" placeholder="Hours" value={logForm.hours} onChange={e => setLogForm({...logForm, hours: e.target.value})} style={{ width: '100%', background: '#1A1A24', border: '1px solid #2A2A3A', color: '#fff', padding: 16, borderRadius: 16, outline: 'none', fontWeight: 600 }} />
                 </div>
                 <div style={{ flex: 1 }}>
                   <div style={{ fontSize: 10, color: '#888', textTransform: 'uppercase', fontWeight: 800, marginBottom: 8, letterSpacing: 1 }}>Date</div>
                   <input type="date" value={logForm.date} onChange={e => setLogForm({...logForm, date: e.target.value})} style={{ width: '100%', background: '#1A1A24', border: '1px solid #2A2A3A', color: '#fff', padding: 16, borderRadius: 16, outline: 'none', fontWeight: 600 }} />
                 </div>
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={() => setShowLogModal(false)} style={{ flex: 1, padding: 16, background: '#1A1A24', border: 'none', borderRadius: 16, color: '#E8E8F0', fontWeight: 800, cursor: 'pointer' }}>Cancel</button>
                <button onClick={saveLog} style={{ flex: 2, padding: 16, background: 'linear-gradient(180deg, #E879F9 0%, #C026D3 100%)', border: 'none', borderRadius: 16, color: '#FFF', fontWeight: 900, cursor: 'pointer', boxShadow: '0 4px 14px rgba(192, 38, 211, 0.3)' }}>Save Log</button>
              </div>
           </div>
        </div>
      )}

      {showCdModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
           <div style={{ background: '#111118', borderTop: '1px solid #2A2A3A', width: '100%', borderRadius: '32px 32px 0 0', padding: 28, paddingBottom: 48, animation: 'fadeIn 0.2s ease-out' }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: '#E8E8F0', marginBottom: 24, letterSpacing: -0.5 }}>{cdForm.id ? 'Edit' : 'Add'} Countdown</div>
              
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, color: '#888', textTransform: 'uppercase', fontWeight: 800, marginBottom: 8, letterSpacing: 1 }}>Event Type</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', paddingBottom: 4 }}>
                   {['exam', 'event', 'deadline', 'other'].map(t => (
                      <button key={t} onClick={() => setCdForm({...cdForm, type: t})} style={{ flex: '1 1 auto', padding: '10px 18px', borderRadius: 100, background: cdForm.type === t ? '#00BCD415' : '#1A1A24', border: cdForm.type === t ? '1px solid #00BCD4' : '1px solid transparent', color: cdForm.type === t ? '#00BCD4' : '#888', fontWeight: 800, textTransform: 'capitalize', fontSize: 13, cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center' }}>{t}</button>
                   ))}
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, color: '#888', textTransform: 'uppercase', fontWeight: 800, marginBottom: 8, letterSpacing: 1 }}>Event Name</div>
                <input type="text" placeholder="e.g. Math Final" value={cdForm.name} onChange={e => setCdForm({...cdForm, name: e.target.value})} style={{ width: '100%', background: '#1A1A24', border: '1px solid #2A2A3A', color: '#fff', padding: 16, borderRadius: 16, fontSize: 16, outline: 'none', fontWeight: 600 }} />
              </div>
              
              <div style={{ marginBottom: 32 }}>
                <div style={{ fontSize: 10, color: '#888', textTransform: 'uppercase', fontWeight: 800, marginBottom: 8, letterSpacing: 1 }}>Date</div>
                <input type="date" value={cdForm.date} onChange={e => setCdForm({...cdForm, date: e.target.value})} style={{ width: '100%', background: '#1A1A24', border: '1px solid #2A2A3A', color: '#fff', padding: 16, borderRadius: 16, fontSize: 16, outline: 'none', fontWeight: 600 }} />
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={() => setShowCdModal(false)} style={{ flex: 1, padding: 16, background: '#1A1A24', border: 'none', borderRadius: 16, color: '#E8E8F0', fontWeight: 800, cursor: 'pointer' }}>Cancel</button>
                <button onClick={saveCd} style={{ flex: 2, padding: 16, background: 'linear-gradient(180deg, #67E8F9 0%, #06B6D4 100%)', border: 'none', borderRadius: 16, color: '#083344', fontWeight: 900, cursor: 'pointer', boxShadow: '0 4px 14px rgba(6, 182, 212, 0.3)' }}>Save Countdown</button>
              </div>
           </div>
        </div>
      )}
    </div>
  )
}
