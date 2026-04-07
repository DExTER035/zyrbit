import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { computeGravityScore } from '../lib/gravity'

import Logo from '../components/Logo'
import BottomNav from '../components/BottomNav'
import ZoneTab from '../components/ZoneTab'
import GravityRing from '../components/GravityRing'
import HabitCard from '../components/HabitCard'
import RankBanner from '../components/RankBanner'
import { showToast } from '../components/Toast'
import EnergyMap from '../components/EnergyMap'
import Jarvis from '../components/Jarvis'
import StreakShield from '../components/StreakShield'
import ShadowMode from '../components/ShadowMode'
import AlterEgo from '../components/AlterEgo'

const REFLECTION_QUESTIONS = [
  'What was the hardest habit to complete today?',
  'What are you most proud of today?',
  'What would you do differently tomorrow?',
  'Which habit gave you the most energy?',
  'What\u2019s one thing you learned about yourself today?',
]

// Utility mapping
const ZONE_COLORS = {
  mind: 'var(--color-zone-mind)',
  body: 'var(--color-zone-body)',
  growth: 'var(--color-zone-growth)',
  soul: 'var(--color-zone-soul)',
}

export default function Orbit() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const userRef = useRef(null) // always-current ref to avoid stale closures

  // Data
  const [habits, setHabits] = useState([])
  const [activity, setActivity] = useState([])
  const [gravityScore, setGravityScore] = useState(0)
  const [streaks, setStreaks] = useState({})

  // UI State
  const [loading, setLoading] = useState(true)
  const [offline, setOffline] = useState(!navigator.onLine)
  const [activeZone, setActiveZone] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [editHabit, setEditHabit] = useState(null)
  const [skipTarget, setSkipTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null) // replaces window.confirm
  const [rankBanner, setRankBanner] = useState(null)
  const [celebrationShown, setCelebrationShown] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)

  // Reflection
  const [showReflection, setShowReflection] = useState(false)
  const [reflectionText, setReflectionText] = useState('')
  const [reflectionQuestion, setReflectionQuestion] = useState('')

  // Weekly Review
  const [showWeeklyReview, setShowWeeklyReview] = useState(false)

  // Share Card
  const [showShareCard, setShowShareCard] = useState(false)

  // Form
  const [form, setForm] = useState({ name: '', zone: 'mind', icon: '🌱', frequency: 'daily', reminder_enabled: false, reminder_time: '' })

  const today = new Date().toLocaleDateString('en-CA')

  useEffect(() => {
    let authListener
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/login')
      } else {
        userRef.current = session.user
        setUser(session.user)
        loadAll(session.user.id)
      }
    })
    
    authListener = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) navigate('/login')
    })
    
    window.addEventListener('online', () => { setOffline(false); if(user) loadAll(user.id) })
    window.addEventListener('offline', () => setOffline(true))

    const lastCel = localStorage.getItem('zyrbit_celebration_date')
    if (lastCel === today) setCelebrationShown(true)

    // Weekly Review — show every Sunday
    const now = new Date()
    if (now.getDay() === 0) {
      const weekKey = `${now.getFullYear()}-W${Math.ceil(now.getDate() / 7)}`
      const alreadySeen = localStorage.getItem(`zyrbit_weekly_review_${weekKey}`)
      if (!alreadySeen) {
        setTimeout(() => setShowWeeklyReview(true), 2000)
      }
    }

    return () => authListener?.subscription?.unsubscribe()
  }, [])

  const loadAll = async (userId) => {
    try {
      setLoading(true)

      const [{ data: hData }, { data: aData }, { data: sData }] = await Promise.all([
        supabase.from('habits').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
        supabase.from('activity_log').select('*').eq('user_id', userId),
        supabase.from('user_streaks').select('*').eq('user_id', userId)
      ])

      if (hData) setHabits(hData)
      if (aData) setActivity(aData)

      if (sData) {
        const smap = {}
        sData.forEach(s => smap[s.habit_id] = s.current_streak)
        setStreaks(smap)
      }

      const gs = await computeGravityScore(supabase, userId)
      setGravityScore(gs)


    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  // Calc derived stats
  const completedToday = new Set(
    activity.filter(log => log.completed_date === today && log.status === 'completed').map(l => l.habit_id)
  )

  const getGravityStatus = (score) => {
    // Check if user has logged anything in last 2 days
    const today2 = new Date().toLocaleDateString('en-CA')
    const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('en-CA')
    const hasLoggedToday = activity.some(l => l.completed_date === today2 && l.status === 'completed')
    const hasLoggedYesterday = activity.some(l => l.completed_date === yesterday && l.status === 'completed')

    if (!hasLoggedToday && !hasLoggedYesterday) {
      return { label: 'Orbit Decaying 🪐', color: 'var(--color-text2)' }
    }
    if (!hasLoggedToday) {
      return { label: 'Ready for Launch 🚀', color: 'var(--color-orange)' }
    }
    if (score < 60) return { label: 'Stable Orbit 🪐', color: 'var(--color-cyan-dim)' }
    if (score < 85) return { label: 'Strong Orbit 🪐', color: 'var(--color-cyan)' }
    return { label: 'Light Speed 🌟', color: '#00FFFF' }
  }
  const gStatus = getGravityStatus(gravityScore)

  const getHabitLogs = (habitId) => activity.filter(log => log.habit_id === habitId)

  const checkAllDone = async (optimisticActivity) => {
    const currentCompleted = new Set(optimisticActivity.filter(l => l.completed_date === today && l.status === 'completed').map(l => l.habit_id))
    const allDone = habits.every(h => currentCompleted.has(h.id))
    
    if (allDone && habits.length > 0 && !celebrationShown) {
      setCelebrationShown(true)
      localStorage.setItem('zyrbit_celebration_date', today)
      // Show reflection first, then celebration
      const q = REFLECTION_QUESTIONS[Math.floor(Math.random() * REFLECTION_QUESTIONS.length)]
      setReflectionQuestion(q)
      setReflectionText('')
      setTimeout(() => setShowReflection(true), 400)
    }
  }

  // Actions
  const handleToggle = useCallback(async (habit) => {
    const currentUser = userRef.current
    if (!currentUser) return
    const isCompleted = completedToday.has(habit.id)

    if (!isCompleted) {
      // Optimistic UI update
      const newLog = { id: 'opt-' + Date.now(), user_id: currentUser.id, habit_id: habit.id, completed_date: today, status: 'completed' }
      const nextActivity = [...activity, newLog]
      setActivity(nextActivity)

      const { error } = await supabase.from('activity_log').insert({
        user_id: currentUser.id, habit_id: habit.id, completed_date: today, status: 'completed'
      })

      if (!error) {
        showToast('✅ Habit logged!', 'success')
        checkAllDone(nextActivity)
        await loadAll(currentUser.id)
      } else {
        // Rollback optimistic update on DB error
        setActivity(prev => prev.filter(l => l.id !== newLog.id))
        showToast('❌ Failed to log habit. Try again.', 'error')
      }
    } else {
      // Undo completion
      const previousActivity = [...activity]
      setActivity(prev => prev.filter(l => !(l.habit_id === habit.id && l.completed_date === today && l.status === 'completed')))
      const { error } = await supabase.from('activity_log').delete()
        .eq('user_id', currentUser.id).eq('habit_id', habit.id)
        .eq('completed_date', today).eq('status', 'completed')
      
      if (!error) {
        await loadAll(currentUser.id)
      } else {
        setActivity(previousActivity)
        showToast('❌ Failed to uncheck habit.', 'error')
      }
    }
  }, [activity, completedToday, today])

  const handleSkip = async (habit) => {
    if (!user) return
    setSkipTarget(null)
    await supabase.from('activity_log').insert({
      user_id: user.id, habit_id: habit.id, completed_date: today, status: 'skipped'
    })
    showToast('⏭️ Skipped — stay consistent tomorrow!', 'warning')
    await loadAll(user.id)
  }

  const saveHabit = async () => {
    if (!form.name.trim() || !user) return
    const color = ZONE_COLORS[form.zone] || '#00FFFF'
    
    if (editHabit) {
      await supabase.from('habits').update({ ...form, color }).eq('id', editHabit.id)
      showToast('✅ Habit updated!', 'success')
    } else {
      await supabase.from('habits').insert({ user_id: user.id, ...form, color })
      showToast('🌱 New habit added!', 'success')
    }
    
    setShowModal(false)
    await loadAll(user.id)
  }

  const deleteHabit = useCallback((target) => {
    const activeTarget = target || editHabit
    if (!activeTarget) return
    setDeleteTarget(activeTarget) // show confirm modal instead of window.confirm
  }, [editHabit])

  const confirmDelete = async () => {
    const currentUser = userRef.current
    if (!deleteTarget || !currentUser) return
    const { error } = await supabase.from('habits').delete().eq('id', deleteTarget.id)
    if (!error) {
      setShowModal(false)
      setDeleteTarget(null)
      showToast('🗑️ Habit removed', 'info')
      await loadAll(currentUser.id)
    } else {
      showToast('❌ Delete failed. Try again.', 'error')
    }
  }

  const filteredHabits = activeZone === 'all' ? habits : habits.filter(h => h.zone === activeZone)

  const bestStreak = Object.values(streaks).length > 0 ? Math.max(...Object.values(streaks)) : 0
  const doneCount = completedToday.size
  const totalCount = habits.length
  const completionPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0

  const saveReflection = async () => {
    if (!user) return
    try {
      await supabase.from('diary_entries').insert({
        user_id: user.id,
        entry_date: today,
        entry_type: 'reflection',
        content: reflectionText || '(No response)',
        prompt: reflectionQuestion,
        mood: 'neutral'
      })
    } catch (_) { /* silent fail if column not found */ }
    setShowReflection(false)
    setTimeout(() => setShowCelebration(true), 300)
  }

  const generateShareCard = () => setShowShareCard(true)

  const dismissWeeklyReview = () => {
    const now = new Date()
    const weekKey = `${now.getFullYear()}-W${Math.ceil(now.getDate() / 7)}`
    localStorage.setItem(`zyrbit_weekly_review_${weekKey}`, 'seen')
    setShowWeeklyReview(false)
  }

  // Compute this week's stats for weekly review
  const thisWeekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i))
    return d.toLocaleDateString('en-CA')
  })
  const weekCompletions = activity.filter(l => thisWeekDates.includes(l.completed_date) && l.status === 'completed').length
  const mostSkipped = habits.length > 0 ? habits.reduce((prev, h) => {
    const hCount = activity.filter(l => thisWeekDates.includes(l.completed_date) && l.habit_id === h.id && l.status === 'completed').length
    const pCount = activity.filter(l => thisWeekDates.includes(l.completed_date) && l.habit_id === prev.id && l.status === 'completed').length
    return hCount < pCount ? h : prev
  }, habits[0])?.name || '—' : '—'

  return (
    <div className="app-container animate-fadeSlideUp" style={{ background: '#000' }}>
      {offline && <div className="offline-banner">📵 Offline mode</div>}
      {rankBanner && <RankBanner rank={rankBanner} onDone={() => setRankBanner(null)} />}
      <StreakShield user={user} habits={habits} activity={activity} streaks={streaks} />

      <div className="page-content" style={{ padding: '24px 20px 100px' }}>
        
        {/* HEADER SECTION (Avatars Only) */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 40 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <div onClick={() => navigate('/profile')} style={{ width: 44, height: 44, borderRadius: '50%', background: '#111', border: '1px solid #222', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
               <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-cyan)', boxShadow: '0 0 10px var(--color-cyan)' }} />
            </div>
            <div onClick={() => navigate('/profile')} style={{ width: 44, height: 44, borderRadius: '50%', background: '#111', border: '1px solid #222', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
               <div style={{ width: 6, height: 16, background: 'var(--color-orange)', borderRadius: 100, boxShadow: '0 0 10px var(--color-orange)' }} />
            </div>
          </div>
        </div>

        {/* GRAVITY SCORE SECTION */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ fontSize: 10, color: 'var(--color-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>GRAVITY SCORE</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <span style={{ fontSize: 96, fontWeight: 900, color: '#FFF', letterSpacing: -4, lineHeight: 1 }}>{gravityScore}</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-cyan)' }}>+{weekCompletions} this week</div>
              <div style={{ fontSize: 13, color: 'var(--color-muted)', fontWeight: 600 }}>{gStatus.label}</div>
            </div>
          </div>
          <div style={{ height: 4, background: '#111', borderRadius: 100, marginTop: 20 }}>
            <div style={{ width: `${Math.min(gravityScore, 100)}%`, height: '100%', background: 'var(--color-cyan)', borderRadius: 100, boxShadow: '0 0 15px var(--color-cyan)40' }} />
          </div>
        </div>

        {/* LOADING SKELETON */}
        {loading && habits.length === 0 ? (
          <div>
            <div className="skeleton" style={{ height: '100px', borderRadius: '20px', marginBottom: '16px' }}></div>
            {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: '80px', borderRadius: '16px', marginBottom: '12px' }}></div>)}
          </div>
        ) : (
          <>
            {/* MIRROR BAR */}
            <div style={{ background: '#141418', border: '1px solid #1e1e24', borderRadius: 12, padding: 16, marginBottom: 32 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: '#1D9E75', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 16 }}>Mirror</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                
                {/* Screen vs Study */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span style={{ fontSize: 16, fontWeight: 900, color: 3.5 > 2 ? '#D85A30' : '#FFF' }}>3.5h</span>
                    <span style={{ fontSize: 9, color: '#666', fontWeight: 800 }}>vs</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#1D9E75' }}>2h</span>
                  </div>
                  <div style={{ fontSize: 8, color: '#666', fontWeight: 800, textTransform: 'uppercase', marginTop: 6, letterSpacing: 0.5 }}>Screen/Study</div>
                </div>
                
                <div style={{ width: 1, height: 28, background: '#1e1e24' }} />

                {/* Money Spent vs Budget */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span style={{ fontSize: 16, fontWeight: 900, color: 180 > 200 ? '#D85A30' : '#FFF' }}>₹180</span>
                    <span style={{ fontSize: 9, color: '#666', fontWeight: 800 }}>vs</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#1D9E75' }}>₹200</span>
                  </div>
                  <div style={{ fontSize: 8, color: '#666', fontWeight: 800, textTransform: 'uppercase', marginTop: 6, letterSpacing: 0.5 }}>Spent/Budget</div>
                </div>

                <div style={{ width: 1, height: 28, background: '#1e1e24' }} />

                {/* Habits vs Planned */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span style={{ fontSize: 16, fontWeight: 900, color: doneCount > totalCount ? '#D85A30' : '#FFF' }}>{doneCount}</span>
                    <span style={{ fontSize: 9, color: '#666', fontWeight: 800 }}>vs</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#1D9E75' }}>{totalCount}</span>
                  </div>
                  <div style={{ fontSize: 8, color: '#666', fontWeight: 800, textTransform: 'uppercase', marginTop: 6, letterSpacing: 0.5 }}>Done/Plan</div>
                </div>

              </div>
            </div>

            {/* ENERGY MAP (Elite Feature) */}
            <EnergyMap user={user} />

            {/* ZONE FILTERS */}
            <div style={{ marginBottom: 32 }}>
               <ZoneTab active={activeZone} onChange={setActiveZone} />
            </div>
            
            {/* SHADOW MODE (Elite Feature) */}
            <ShadowMode user={user} />

            {/* ALTER EGO (Elite Feature) */}
            <AlterEgo user={user} gravityScore={gravityScore} />

            {/* HABITS LIST */}
            <h3 style={{ fontSize: 11, color: 'var(--color-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 20 }}>TODAY'S HABITS</h3>

            {filteredHabits.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-muted)' }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>🌱</div>
                <p style={{ fontSize: '13px' }}>No habits in this orbit yet.<br/>Tap + to begin tracking.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {filteredHabits.map(habit => {
                  const done = completedToday.has(habit.id)
                  return (
                    <div key={habit.id} style={{ opacity: done ? 0.62 : 1, transition: 'opacity 0.3s' }}>
                      <HabitCard
                        habit={habit}
                        logs={getHabitLogs(habit.id)}
                        streak={streaks[habit.id] || 0}
                        isCompleted={done}
                        onToggle={handleToggle}
                        onLongPress={setSkipTarget}
                        onDelete={deleteHabit}
                        onStats={() => showToast('Stats view coming soon!', 'info')}
                        onEdit={h => { setEditHabit(h); setForm({ name: h.name, zone: h.zone, icon: h.icon||'🌱', frequency: h.frequency||'daily', reminder_enabled: h.reminder_enabled||false, reminder_time: h.reminder_time||'' }); setShowModal(true) }}
                      />
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>

      <BottomNav activeTab="orbit" onTabChange={(t) => navigate(t === 'orbit' ? '/orbit' : `/${t}`)} />

      {/* FAB + SHARE */}
      <button className="fab" onClick={() => { setEditHabit(null); setForm({ name:'', zone:'mind', icon:'🌱', frequency:'daily', reminder_enabled: false, reminder_time: '' }); setShowModal(true); }}>+</button>
      <button
        onClick={generateShareCard}
        style={{
          position: 'fixed', bottom: 85, left: 20, zIndex: 40,
          background: 'linear-gradient(135deg, #9C27B0, #00FFFF)',
          border: 'none', borderRadius: '50px', padding: '10px 16px',
          fontSize: '11px', fontWeight: 800, color: '#fff', cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(0,255,255,0.25)', letterSpacing: '0.5px'
        }}
      >
        📸 Share
      </button>

      {/* DAILY REFLECTION POPUP */}
      {showReflection && (
        <div className="modal-overlay" style={{ background: '#00000090', zIndex: 210, alignItems: 'center' }}>
          <div style={{
            background: 'linear-gradient(135deg, #0D0D18, #111128)',
            border: '1px solid #9C27B030',
            borderRadius: '28px', padding: '32px 28px',
            textAlign: 'center', animation: 'scaleIn 0.4s ease',
            maxWidth: '320px', width: '90%'
          }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>✏️</div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#9C27B0', textTransform: 'uppercase', letterSpacing: 2, marginBottom: '8px' }}>Daily Reflection</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#FFF', lineHeight: 1.5, marginBottom: '20px' }}>{reflectionQuestion}</div>
            <textarea
              autoFocus
              value={reflectionText}
              onChange={e => setReflectionText(e.target.value)}
              placeholder="Type something short..."
              rows={3}
              style={{
                width: '100%', background: '#0A0A12', border: '1px solid #1E1E28',
                borderRadius: '14px', padding: '12px', color: '#FFF', fontSize: '13px',
                resize: 'none', outline: 'none', fontFamily: 'inherit', marginBottom: '16px',
                boxSizing: 'border-box', lineHeight: 1.5
              }}
            />
            <button
              onClick={saveReflection}
              style={{ background: '#9C27B0', color: '#FFF', border: 'none', borderRadius: '14px', padding: '14px', fontSize: '14px', fontWeight: 800, width: '100%', cursor: 'pointer', marginBottom: '8px' }}
            >
              Save & Continue 🚀
            </button>
            <button
              onClick={() => { setShowReflection(false); setTimeout(() => setShowCelebration(true), 300) }}
              style={{ background: 'transparent', color: '#444', border: 'none', fontSize: '12px', cursor: 'pointer', padding: '4px' }}
            >
              Skip for now
            </button>
          </div>
        </div>
      )}

      {/* PERFECT ORBIT CELEBRATION */}
      {showCelebration && (
        <div className="modal-overlay" style={{ background: '#00000090', zIndex: 200, alignItems: 'center' }}>
          {Array.from({ length: 40 }).map((_, i) => (
            <div key={i} style={{
              position: 'absolute',
              top: `${Math.random() * -20}%`, left: `${Math.random() * 100}%`,
              width: '8px', height: '14px',
              background: ['#00FFFF', '#9C27B0', '#4CAF50', '#FF9800'][Math.floor(Math.random() * 4)],
              animation: `toastIn ${1.5 + Math.random()}s linear forwards`,
              transform: `rotate(${Math.random() * 360}deg)`
            }} />
          ))}
          <div style={{ background: '#0D0D18', border: '1px solid #00FFFF30', borderRadius: '24px', padding: '28px', textAlign: 'center', animation: 'scaleIn 0.5s ease', maxWidth: '300px' }}>
            <div style={{ fontSize: '52px', animation: 'shimmer 2s infinite alternate', marginBottom: '8px' }}>🪐</div>
            <div style={{ fontSize: '22px', color: '#00FFFF', fontWeight: 900, marginBottom: '4px' }}>Perfect Orbit!</div>
            <div style={{ fontSize: '13px', color: '#555566', marginBottom: '20px' }}>All habits completed today!</div>
            
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '24px' }}>
              <span style={{ padding: '4px 10px', background: '#00FFFF15', border: '1px solid #00FFFF30', color: '#00FFFF', borderRadius: '100px', fontSize: '11px', fontWeight: 800 }}>💫 Perfect Orbit!</span>
              <span style={{ padding: '4px 10px', background: '#4CAF5015', border: '1px solid #4CAF5030', color: '#4CAF50', borderRadius: '100px', fontSize: '11px', fontWeight: 800 }}>{totalCount}/{totalCount} Done ✅</span>
            </div>

            <button onClick={() => setShowCelebration(false)} style={{ background: '#00FFFF', color: '#000', borderRadius: '14px', padding: '14px 24px', fontSize: '14px', fontWeight: 800, width: '100%', border: 'none', cursor: 'pointer' }}>Keep Orbiting 🚀</button>
          </div>
        </div>
      )}

      {/* SKIP DIALOG */}
      {skipTarget && (
        <div className="modal-overlay" onClick={() => setSkipTarget(null)}>
          <div className="animate-slideUpModal" style={{ background: 'var(--color-card)', borderTop: '1px solid var(--color-border)', borderRadius: '24px 24px 0 0', padding: '24px', width: '100%', maxWidth: '430px' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ color: 'var(--color-text)', fontWeight: 800, fontSize: '18px', marginBottom: '12px' }}>Skip today?</h3>
            <p style={{ color: 'var(--color-muted)', fontSize: '13px', lineHeight: 1.6, marginBottom: '24px' }}>"{skipTarget.name}" — skipping won't break your streak today, but honesty maintains gravity.</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn-ghost" style={{ flex: 1 }} onClick={() => setSkipTarget(null)}>Cancel</button>
              <button className="btn-primary" style={{ flex: 1, background: '#FF9800', color: '#000' }} onClick={() => handleSkip(skipTarget)}>Skip Today</button>
            </div>
          </div>
        </div>
      )}

      {/* HABIT MODAL */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="animate-slideUpModal" style={{ background: 'var(--color-card)', borderTop: '1px solid var(--color-border)', borderRadius: '24px 24px 0 0', padding: '24px', width: '100%', maxWidth: '430px', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ color: 'var(--color-text)', fontWeight: 800, fontSize: '18px' }}>{editHabit ? 'Edit Habit' : 'New Habit'}</h3>
              <div onClick={() => setShowModal(false)} style={{ color: 'var(--color-muted)', fontSize: '24px', cursor: 'pointer' }}>×</div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '10px', fontWeight: 800, color: 'var(--color-hint)', display: 'block', marginBottom: '8px', letterSpacing: '1px' }}>HABIT NAME</label>
              <input autoFocus className="input" placeholder="e.g., Read 10 pages" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
            </div>

            <div style={{ marginBottom: '20px' }}>
               <label style={{ fontSize: '10px', fontWeight: 800, color: 'var(--color-hint)', display: 'block', marginBottom: '8px', letterSpacing: '1px' }}>ZONE</label>
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                 {Object.entries({ mind: '🧠 Mind', body: '💪 Body', growth: '🌱 Growth', soul: '🔮 Soul' }).map(([k, v]) => (
                   <div key={k} onClick={() => setForm({...form, zone: k})} style={{ padding: '12px', borderRadius: '12px', border: form.zone === k ? `1px solid ${ZONE_COLORS[k]}` : '1px solid var(--color-border2)', background: 'var(--color-elevated)', color: form.zone === k ? ZONE_COLORS[k] : 'var(--color-muted)', textAlign: 'center', cursor: 'pointer', fontSize: '13px', fontWeight: 600, transition: 'all 0.2s' }}>
                     {v}
                   </div>
                 ))}
               </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '10px', fontWeight: 800, color: 'var(--color-hint)', display: 'block', marginBottom: '8px', letterSpacing: '1px' }}>ICON</label>
              <div className="emoji-grid">
                {['💧','🏃','📖','🧘','✍️','😴','💪','🔥','⭐','🎯','🌱','💡','🎨','🎵','🧠','❤️','🙏','💰','📚','🤝','🌊','☀️','🍎','🚴','🏋️'].map(e => (
                  <div key={e} className={`emoji-btn ${form.icon === e ? 'selected' : ''}`} onClick={() => setForm({...form, icon: e})}>{e}</div>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <label style={{ fontSize: '10px', fontWeight: 800, color: 'var(--color-hint)', letterSpacing: '1px' }}>SET REMINDER TIME</label>
                <div style={{ width: '40px', height: '24px', background: form.reminder_enabled ? 'var(--color-cyan)' : 'var(--color-border2)', borderRadius: '100px', position: 'relative', cursor: 'pointer', transition: '0.2s' }} onClick={() => setForm({...form, reminder_enabled: !form.reminder_enabled})}>
                  <div style={{ position: 'absolute', top: '2px', left: form.reminder_enabled ? '18px' : '2px', width: '20px', height: '20px', background: '#fff', borderRadius: '50%', transition: '0.2s', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }} />
                </div>
              </div>
              {form.reminder_enabled && (
                <input type="time" className="input" style={{ WebkitAppearance: 'none', background: 'var(--color-elevated)' }} value={form.reminder_time} onChange={e => setForm({...form, reminder_time: e.target.value})} />
              )}
            </div>

            <button className="btn-primary" style={{ width: '100%', marginBottom: '12px' }} onClick={saveHabit}>
              {editHabit ? 'Save Changes' : 'Add Habit ✓'}
            </button>
            {editHabit && <button className="btn-ghost" style={{ width: '100%', borderColor: 'var(--color-border)', color: '#EF4444' }} onClick={() => deleteHabit()}>Delete Habit</button>}
          </div>
        </div>
      )}

      {/* DELETE CONFIRM MODAL */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="animate-slideUpModal" style={{ background: 'var(--color-card)', borderTop: '1px solid var(--color-border)', borderRadius: '24px 24px 0 0', padding: '24px', width: '100%', maxWidth: '430px' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ color: 'var(--color-text)', fontWeight: 800, fontSize: '18px', marginBottom: '12px' }}>Delete Habit?</h3>
            <p style={{ color: 'var(--color-muted)', fontSize: '13px', lineHeight: 1.6, marginBottom: '24px' }}>"{deleteTarget.name}" will be permanently removed along with all its history.</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn-ghost" style={{ flex: 1 }} onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="btn-primary" style={{ flex: 1, background: '#EF4444', color: '#fff' }} onClick={confirmDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* WEEKLY REVIEW MODAL */}
      {showWeeklyReview && (
        <div className="modal-overlay" style={{ background: '#00000095', zIndex: 220, alignItems: 'center' }}>
          <div style={{
            background: 'linear-gradient(135deg, #0D0D18 0%, #0A0A20 100%)',
            border: '1px solid #00FFFF20', borderRadius: '28px',
            padding: '32px 24px', maxWidth: '340px', width: '92%',
            animation: 'scaleIn 0.4s ease'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ fontSize: '42px', marginBottom: '8px' }}>🪐</div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: '#FFF', marginBottom: '4px' }}>Week Wrapped</div>
              <div style={{ fontSize: '11px', color: '#444', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2 }}>Your orbit report</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
              {[
                { label: 'Completions', value: weekCompletions, color: '#00FFFF', icon: '✅' },
                { label: 'Best Streak', value: `${bestStreak}d`, color: '#FF9800', icon: '🔥' },
                { label: 'Most Skipped', value: (mostSkipped || '—').length > 12 ? (mostSkipped || '—').slice(0,10)+'…' : (mostSkipped || '—'), color: '#EF4444', icon: '⚠️' },
                { label: 'Gravity', value: gravityScore, color: '#9C27B0', icon: '⚡' },
              ].map((s, i) => (
                <div key={i} style={{ background: '#111', border: '1px solid #1A1A24', borderRadius: '16px', padding: '14px', textAlign: 'center' }}>
                  <div style={{ fontSize: '18px', marginBottom: '4px' }}>{s.icon}</div>
                  <div style={{ fontSize: '20px', fontWeight: 900, color: s.color, marginBottom: '2px' }}>{s.value}</div>
                  <div style={{ fontSize: '9px', color: '#333', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>{s.label}</div>
                </div>
              ))}
            </div>


            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => {
                  const text = `🪐 My Zyrbit Week Wrapped!\n✅ ${weekCompletions} habits done\n🔥 ${bestStreak} day streak\n⚡ Gravity: ${gravityScore}\n\nBuilding better orbits, one habit at a time.`
                  if (navigator.share) navigator.share({ text }).catch(() => {})
                  else { navigator.clipboard.writeText(text); showToast('📋 Copied to clipboard!', 'success') }
                }}
                style={{ flex: 1, background: 'var(--color-cyan)', color: '#000', border: 'none', borderRadius: '14px', padding: '14px', fontSize: '13px', fontWeight: 800, cursor: 'pointer' }}
              >
                Share 📤
              </button>
              <button
                onClick={dismissWeeklyReview}
                style={{ flex: 1, background: '#111', color: '#666', border: '1px solid #1A1A24', borderRadius: '14px', padding: '14px', fontSize: '13px', fontWeight: 800, cursor: 'pointer' }}
              >
                Done ✓
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ANONYMOUS SHARE CARD MODAL */}
      {showShareCard && (
        <div className="modal-overlay" style={{ background: '#00000095', zIndex: 220, alignItems: 'center' }} onClick={() => setShowShareCard(false)}>
          <div onClick={e => e.stopPropagation()} style={{ maxWidth: '340px', width: '92%', animation: 'scaleIn 0.4s ease' }}>
            {/* The shareable card itself */}
            <div id="share-card" style={{
              background: 'linear-gradient(135deg, #000005 0%, #0A0020 50%, #000010 100%)',
              border: '1px solid #00FFFF20',
              borderRadius: '28px', padding: '32px 28px', marginBottom: '16px',
              textAlign: 'center', position: 'relative', overflow: 'hidden'
            }}>
              {/* bg glow */}
              <div style={{ position: 'absolute', top: -40, left: '50%', transform: 'translateX(-50%)', width: 200, height: 200, background: 'radial-gradient(circle, #00FFFF08, transparent 70%)', borderRadius: '50%' }} />
              <div style={{ fontSize: '36px', marginBottom: '8px' }}>🪐</div>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#444', textTransform: 'uppercase', letterSpacing: 3, marginBottom: '16px' }}>ZYRBIT · ORBIT STATS</div>

              <div style={{ fontSize: '72px', fontWeight: 900, color: '#FFF', letterSpacing: -3, lineHeight: 1, marginBottom: '4px' }}>{gravityScore}</div>
              <div style={{ fontSize: '11px', color: 'var(--color-cyan)', fontWeight: 800, marginBottom: '24px' }}>GRAVITY SCORE</div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginBottom: '20px' }}>
                <div>
                  <div style={{ fontSize: '24px', fontWeight: 900, color: '#FF9800' }}>🔥 {bestStreak}</div>
                  <div style={{ fontSize: '9px', color: '#333', fontWeight: 700, textTransform: 'uppercase' }}>DAY STREAK</div>
                </div>
                <div style={{ width: 1, background: '#1A1A24' }} />
                <div>
                  <div style={{ fontSize: '24px', fontWeight: 900, color: '#4CAF50' }}>{completionPct}%</div>
                  <div style={{ fontSize: '9px', color: '#333', fontWeight: 700, textTransform: 'uppercase' }}>TODAY</div>
                </div>
                <div style={{ width: 1, background: '#1A1A24' }} />
                <div>
                  <div style={{ fontSize: '24px', fontWeight: 900, color: '#9C27B0' }}>{doneCount}/{totalCount}</div>
                  <div style={{ fontSize: '9px', color: '#333', fontWeight: 700, textTransform: 'uppercase' }}>HABITS</div>
                </div>
              </div>

              <div style={{ fontSize: '10px', color: '#222', fontWeight: 700, letterSpacing: 1 }}>zyrbit.app · stay in orbit</div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => {
                  const text = `🪐 My Zyrbit Orbit Stats!\n⚡ Gravity Score: ${gravityScore}\n🔥 Streak: ${bestStreak} days\n✅ Today: ${completionPct}% complete\n\nBuilding better habits, one orbit at a time. 🚀`
                  if (navigator.share) navigator.share({ text, title: 'My Zyrbit Stats' }).catch(() => {})
                  else { navigator.clipboard.writeText(text); showToast('📋 Stats copied!', 'success') }
                  setShowShareCard(false)
                }}
                style={{ flex: 1, background: 'linear-gradient(135deg, #9C27B0, #00FFFF)', color: '#fff', border: 'none', borderRadius: '14px', padding: '14px', fontSize: '13px', fontWeight: 800, cursor: 'pointer' }}
              >
                Share 📤
              </button>
              <button
                onClick={() => setShowShareCard(false)}
                style={{ flex: 1, background: '#111', color: '#666', border: '1px solid #1A1A24', borderRadius: '14px', padding: '14px', fontSize: '13px', fontWeight: 800, cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* JARVIS AI PLANNER */}
      <Jarvis user={user} />

    </div>
  )
}
