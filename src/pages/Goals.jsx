import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { computeGravityScore } from '../lib/gravity'
import { earnZyrons, getWallet } from '../lib/zyrons'
import { getRankByZyrons } from '../lib/ranks'

import Logo from '../components/Logo'
import BottomNav from '../components/BottomNav'
import ZoneTab from '../components/ZoneTab'
import GravityRing from '../components/GravityRing'
import HabitCard from '../components/HabitCard'
import RankBanner from '../components/RankBanner'
import { showToast } from '../components/Toast'
import EnergyMap from '../components/EnergyMap'
import Detrox from '../components/Detrox'
import StreakShield from '../components/StreakShield'
import ShadowMode from '../components/ShadowMode'
import AlterEgo from '../components/AlterEgo'

const REFLECTION_QUESTIONS = [
  'What was the hardest habit to complete today?',
  'What are you most proud of today?',
  'What would you do differently tomorrow?',
  'Which habit gave you the most energy?',
  'What’s one thing you learned about yourself today?',
]

const ZONE_COLORS = {
  mind: 'var(--color-zone-mind)',
  body: 'var(--color-zone-body)',
  growth: 'var(--color-zone-growth)',
  soul: 'var(--color-zone-soul)',
}

export default function Goals() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const userRef = useRef(null)

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
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [rankBanner, setRankBanner] = useState(null)
  const [celebrationShown, setCelebrationShown] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)

  // Targets Dashboard State
  const [systemGoals, setSystemGoals] = useState({
    cgpa_current: 6.81,
    cgpa_target: 7.50,
    weight_current: 54.00,
    weight_target: 65.00,
    gold_current: 0.00,
    gold_target: 10.00,
    side_income_current: 0.00,
    side_income_target: 10000.00
  })
  const [showGoalsModal, setShowGoalsModal] = useState(false)
  const [goalsForm, setGoalsForm] = useState({ ...systemGoals })

  // XP Popup
  const [wallet, setWallet] = useState(null)
  const [xpPopup, setXpPopup] = useState(null)

  // Reflection
  const [showReflection, setShowReflection] = useState(false)
  const [reflectionText, setReflectionText] = useState('')
  const [reflectionQuestion, setReflectionQuestion] = useState('')

  // Weekly Review
  const [showWeeklyReview, setShowWeeklyReview] = useState(false)

  // Mirror Bar — real data (was hardcoded before)
  const [realScreenHours, setRealScreenHours] = useState(0)
  const [realSpentToday, setRealSpentToday] = useState(0)
  const [realDailyBudget, setRealDailyBudget] = useState(0)

  // Form
  const [form, setForm] = useState({ name: '', zone: 'mind', icon: '🌱', frequency: 'daily', reminder_enabled: false, reminder_time: '' })

  const today = new Date().toLocaleDateString('en-CA')

  const triggerXpPopup = (amount, label) => {
    setXpPopup({ amount, label })
    setTimeout(() => setXpPopup(null), 2000)
  }

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
    
    window.addEventListener('online', () => { setOffline(false); if(userRef.current) loadAll(userRef.current.id) })
    window.addEventListener('offline', () => setOffline(true))

    const lastCel = localStorage.getItem('zyrbit_celebration_date')
    if (lastCel === today) setCelebrationShown(true)

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

      const [{ data: hData }, { data: aData }, { data: sData }, { data: sgData }, { data: screenData }, { data: expData }, { data: moneySettings }] = await Promise.all([
        supabase.from('habits').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
        supabase.from('activity_log').select('*').eq('user_id', userId),
        supabase.from('user_streaks').select('*').eq('user_id', userId),
        supabase.from('system_goals').select('*').eq('user_id', userId).single(),
        // Mirror bar: real screen time for today
        supabase.from('screen_time_logs').select('screen_minutes').eq('user_id', userId).eq('log_date', today).single(),
        // Mirror bar: real spending for today (positive amounts = expense)
        supabase.from('money_expenses').select('amount').eq('user_id', userId).eq('expense_date', today),
        // Mirror bar: monthly budget to derive daily budget
        supabase.from('money_settings').select('monthly_budget').eq('user_id', userId).single()
      ])

      if (hData) setHabits(hData)
      if (aData) setActivity(aData)
      if (sgData) {
        setSystemGoals(sgData)
        setGoalsForm(sgData)
      }

      // Update mirror bar state with real values
      setRealScreenHours(screenData ? (screenData.screen_minutes / 60) : 0)
      if (expData) {
        const spentToday = expData.filter(e => Number(e.amount) > 0).reduce((sum, e) => sum + Number(e.amount), 0)
        setRealSpentToday(spentToday)
      }
      if (moneySettings) {
        setRealDailyBudget(Math.round((moneySettings.monthly_budget || 10000) / 30))
      }

      try {
        const w = await getWallet(userId)
        if (w) setWallet(w)
      } catch (_) {}

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

  const completedToday = new Set(
    activity.filter(log => log.completed_date === today && log.status === 'completed').map(l => l.habit_id)
  )

  const getGravityStatus = (score) => {
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
    const currentUser = userRef.current
    const currentCompleted = new Set(optimisticActivity.filter(l => l.completed_date === today && l.status === 'completed').map(l => l.habit_id))
    const allDone = habits.every(h => currentCompleted.has(h.id))
    
    if (allDone && habits.length > 0 && !celebrationShown) {
      setCelebrationShown(true)
      localStorage.setItem('zyrbit_celebration_date', today)
      if (currentUser) {
        const updatedWallet = await earnZyrons(currentUser.id, 50, 'Perfect Day — all habits done!', 'habits')
        if (updatedWallet) setWallet(updatedWallet)
        triggerXpPopup(50, '+50 ⚡ Perfect Day!')
      }
      const q = REFLECTION_QUESTIONS[Math.floor(Math.random() * REFLECTION_QUESTIONS.length)]
      setReflectionQuestion(q)
      setReflectionText('')
      setTimeout(() => setShowReflection(true), 400)
    }
  }

  const handleToggle = useCallback(async (habit) => {
    const currentUser = userRef.current
    if (!currentUser) return
    const isCompleted = completedToday.has(habit.id)

    if (!isCompleted) {
      const newLog = { id: 'opt-' + Date.now(), user_id: currentUser.id, habit_id: habit.id, completed_date: today, status: 'completed' }
      const nextActivity = [...activity, newLog]
      setActivity(nextActivity)

      const { error } = await supabase.from('activity_log').insert({
        user_id: currentUser.id, habit_id: habit.id, completed_date: today, status: 'completed'
      })

      if (!error) {
        showToast('✅ Habit logged!', 'success')
        const updatedWallet = await earnZyrons(currentUser.id, 10, `Completed: ${habit.name}`, 'habits')
        if (updatedWallet) setWallet(updatedWallet)
        triggerXpPopup(10, '+10 ⚡')
        checkAllDone(nextActivity)
        await loadAll(currentUser.id)
      } else {
        setActivity(prev => prev.filter(l => l.id !== newLog.id))
        showToast('❌ Failed to log habit. Try again.', 'error')
      }
    } else {
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
    setDeleteTarget(activeTarget)
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

  const handleSaveSystemGoals = async (e) => {
    e.preventDefault()
    if (!user) return
    const { error } = await supabase.from('system_goals').upsert({
      user_id: user.id,
      cgpa_current: Number(goalsForm.cgpa_current),
      cgpa_target: Number(goalsForm.cgpa_target),
      weight_current: Number(goalsForm.weight_current),
      weight_target: Number(goalsForm.weight_target),
      gold_current: Number(goalsForm.gold_current),
      gold_target: Number(goalsForm.gold_target),
      side_income_current: Number(goalsForm.side_income_current),
      side_income_target: Number(goalsForm.side_income_target),
      updated_at: new Date().toISOString()
    })
    if (!error) {
      showToast('🎯 Core targets updated!', 'success')
      setSystemGoals(goalsForm)
      setShowGoalsModal(false)
    } else {
      showToast('❌ Failed to update targets.', 'error')
    }
  }

  const filteredHabits = activeZone === 'all' ? habits : habits.filter(h => h.zone === activeZone)
  const bestStreak = Object.values(streaks).length > 0 ? Math.max(...Object.values(streaks)) : 0
  const doneCount = completedToday.size
  const totalCount = habits.length

  const saveReflection = async () => {
    const now = new Date()
    const weekKey = `${now.getFullYear()}-W${Math.ceil(now.getDate() / 7)}`
    localStorage.setItem(`zyrbit_weekly_review_${weekKey}`, 'seen')
    setShowWeeklyReview(false)
  }

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
    <div className="app-container page-enter" style={{ background: 'var(--bg-page)', minHeight: '100vh' }}>
      {offline && <div className="offline-banner">📵 Offline mode</div>}
      {rankBanner && <RankBanner rank={rankBanner} onDone={() => setRankBanner(null)} />}
      <StreakShield user={user} habits={habits} activity={activity} streaks={streaks} />

      {/* XP POPUP */}
      {xpPopup && (
        <div style={{
          position: 'fixed', bottom: 170, right: 24, zIndex: 9999,
          background: '#1a1a1a', border: '1px solid #7F77DD60',
          borderRadius: 100, padding: '8px 18px',
          fontSize: 13, fontWeight: 900, color: '#7F77DD',
          boxShadow: '0 0 20px #7F77DD30',
          animation: 'fadeUp 0.3s ease both',
          pointerEvents: 'none'
        }}>
          {xpPopup.label}
        </div>
      )}

      {/* HEADER SECTION — Zyrons Rank Pill */}
      <div style={{ padding: '32px 20px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--text-primary)', letterSpacing: -0.5, margin: 0 }}>Goals & Habits</h1>
            <p style={{ fontSize: 11, color: '#444', margin: '2px 0 0' }}>Break gravity, complete cycles</p>
          </div>
          {(() => {
            const rankInfo = wallet ? getRankByZyrons(wallet.total_earned || 0) : null
            const balance = wallet?.balance || 0
            return (
              <div
                onClick={() => navigate('/profile')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: 'var(--bg-card)', border: '1px solid var(--border-primary)',
                  borderRadius: 100, padding: '8px 14px', cursor: 'pointer',
                  transition: 'border-color 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--color-cyan)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-primary)'}
              >
                <span style={{ fontSize: 14 }}>{rankInfo?.icon || '⚡'}</span>
                <span style={{ fontSize: 12, fontWeight: 900, color: 'var(--text-primary)' }}>{balance.toLocaleString()}</span>
                <span style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>
                  {rankInfo?.name || 'Orbiter'}
                </span>
              </div>
            )
          })()}
        </div>
      </div>

      <div className="page-content">

        {/* GRAVITY SCORE SECTION */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 10, color: 'var(--color-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>GRAVITY SCORE</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <span style={{ fontSize: 72, fontWeight: 900, color: '#FFF', letterSpacing: -4, lineHeight: 1 }}>{gravityScore}</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-cyan)' }}>+{weekCompletions} this week</div>
              <div style={{ fontSize: 12, color: 'var(--color-muted)', fontWeight: 600 }}>{gStatus.label}</div>
            </div>
          </div>
          <div style={{ height: 4, background: '#111', borderRadius: 100, marginTop: 16 }}>
            <div style={{ width: `${Math.min(gravityScore, 100)}%`, height: '100%', background: 'var(--color-cyan)', borderRadius: 100, boxShadow: '0 0 15px var(--color-cyan)40' }} />
          </div>
        </div>

        {/* CORE TARGETS DASHBOARD */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 10, color: 'var(--color-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 2 }}>CORE TARGETS</div>
            <button onClick={() => { setGoalsForm({ ...systemGoals }); setShowGoalsModal(true); }} style={{ background: 'transparent', border: 'none', color: 'var(--color-cyan)', fontSize: 10, fontWeight: 800, cursor: 'pointer', letterSpacing: 0.5 }}>⚙️ EDIT TARGETS</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {/* CGPA */}
            <div style={{ background: 'rgba(26,26,36,0.5)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 14 }}>
              <div style={{ fontSize: 10, color: '#666', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 4 }}>🎓 CGPA TARGET</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#FFF', margin: '6px 0' }}>{systemGoals.cgpa_current.toFixed(2)} / {systemGoals.cgpa_target.toFixed(2)}</div>
              <div style={{ height: 4, background: '#111', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(100, (systemGoals.cgpa_current / (systemGoals.cgpa_target || 1)) * 100)}%`, height: '100%', background: '#4CAF50', borderRadius: 2 }} />
              </div>
            </div>
            {/* Weight */}
            <div style={{ background: 'rgba(26,26,36,0.5)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 14 }}>
              <div style={{ fontSize: 10, color: '#666', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 4 }}>💪 WEIGHT GOAL</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#FFF', margin: '6px 0' }}>{systemGoals.weight_current.toFixed(1)}kg / {systemGoals.weight_target.toFixed(1)}kg</div>
              <div style={{ height: 4, background: '#111', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(100, (systemGoals.weight_current / (systemGoals.weight_target || 1)) * 100)}%`, height: '100%', background: '#00BCD4', borderRadius: 2 }} />
              </div>
            </div>
            {/* Gold */}
            <div style={{ background: 'rgba(26,26,36,0.5)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 14 }}>
              <div style={{ fontSize: 10, color: '#666', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 4 }}>🪙 GOLD SAVINGS</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#FFF', margin: '6px 0' }}>{systemGoals.gold_current.toFixed(2)}g / {systemGoals.gold_target.toFixed(2)}g</div>
              <div style={{ height: 4, background: '#111', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(100, (systemGoals.gold_current / (systemGoals.gold_target || 1)) * 100)}%`, height: '100%', background: '#FF9800', borderRadius: 2 }} />
              </div>
            </div>
            {/* Side Income */}
            <div style={{ background: 'rgba(26,26,36,0.5)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 14 }}>
              <div style={{ fontSize: 10, color: '#666', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 4 }}>💵 SIDE INCOME</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#FFF', margin: '6px 0' }}>₹{systemGoals.side_income_current.toLocaleString()} / ₹{systemGoals.side_income_target.toLocaleString()}</div>
              <div style={{ height: 4, background: '#111', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(100, (systemGoals.side_income_current / (systemGoals.side_income_target || 1)) * 100)}%`, height: '100%', background: '#E91E63', borderRadius: 2 }} />
              </div>
            </div>
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
                
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span style={{ fontSize: 16, fontWeight: 900, color: realScreenHours > 0 ? '#FFF' : '#555' }}>
                      {realScreenHours > 0 ? `${realScreenHours.toFixed(1)}h` : '—'}
                    </span>
                    <span style={{ fontSize: 9, color: '#666', fontWeight: 800 }}>screen</span>
                  </div>
                  <div style={{ fontSize: 8, color: '#666', fontWeight: 800, textTransform: 'uppercase', marginTop: 6, letterSpacing: 0.5 }}>Today's Screen</div>
                </div>
                
                <div style={{ width: 1, height: 28, background: '#1e1e24' }} />

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span style={{ fontSize: 16, fontWeight: 900, color: realSpentToday > realDailyBudget && realDailyBudget > 0 ? '#EF4444' : '#FFF' }}>
                      {realSpentToday > 0 ? `₹${realSpentToday.toLocaleString()}` : '—'}
                    </span>
                    {realDailyBudget > 0 && (
                      <>
                        <span style={{ fontSize: 9, color: '#666', fontWeight: 800 }}>vs</span>
                        <span style={{ fontSize: 13, fontWeight: 800, color: '#1D9E75' }}>₹{realDailyBudget}</span>
                      </>
                    )}
                  </div>
                  <div style={{ fontSize: 8, color: '#666', fontWeight: 800, textTransform: 'uppercase', marginTop: 6, letterSpacing: 0.5 }}>Spent/Daily Limit</div>
                </div>

                <div style={{ width: 1, height: 28, background: '#1e1e24' }} />

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span style={{ fontSize: 16, fontWeight: 900, color: '#FFF' }}>{doneCount}</span>
                    <span style={{ fontSize: 9, color: '#666', fontWeight: 800 }}>vs</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#1D9E75' }}>{totalCount}</span>
                  </div>
                  <div style={{ fontSize: 8, color: '#666', fontWeight: 800, textTransform: 'uppercase', marginTop: 6, letterSpacing: 0.5 }}>Done/Plan</div>
                </div>

              </div>
            </div>

            {/* ENERGY MAP */}
            <EnergyMap user={user} />

            {/* ZONE FILTERS */}
            <div style={{ marginBottom: 32 }}>
               <ZoneTab active={activeZone} onChange={setActiveZone} />
            </div>
            
            {/* SHADOW MODE */}
            <ShadowMode user={user} />

            {/* ALTER EGO */}
            <AlterEgo user={user} gravityScore={gravityScore} />

            {/* HABITS LIST */}
            {localStorage.getItem('ayanokoji_mode') === 'true' ? (
              <div style={{ textAlign: 'center', marginBottom: 24, padding: 10, borderBottom: '1px solid #222' }}>
                <span style={{ fontSize: 13, color: '#FFF', fontWeight: 900, letterSpacing: 1, textTransform: 'uppercase' }}>"Emotion is weakness. Execute."</span>
              </div>
            ) : (
              <h3 style={{ fontSize: 11, color: 'var(--color-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 20 }}>TODAY'S HABITS</h3>
            )}

            {filteredHabits.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-muted)' }}>
                {localStorage.getItem('ayanokoji_mode') === 'true' ? null : <div style={{ fontSize: '40px', marginBottom: '12px' }}>🌱</div>}
                <p style={{ fontSize: '13px' }}>No targets in this cycle.<br/>Initialize sequence.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {filteredHabits.map((habit, index) => {
                  const done = completedToday.has(habit.id)
                  const ayano = localStorage.getItem('ayanokoji_mode') === 'true'
                  const displayHabit = ayano ? { ...habit, icon: '', name: `TASK 0${index + 1}` } : habit
                  return (
                    <div key={habit.id} style={{
                      opacity: done ? (ayano ? 0.3 : 0.62) : 1, transition: 'opacity 0.3s',
                      filter: ayano && !done ? 'grayscale(100%) brightness(1.2)' : 'none'
                    }}>
                      <HabitCard
                        habit={displayHabit}
                        logs={getHabitLogs(habit.id)}
                        streak={streaks[habit.id] || 0}
                        isCompleted={done}
                        onToggle={(h) => handleToggle(habit)}
                        onLongPress={setSkipTarget}
                        onDelete={(h) => deleteHabit(habit)}
                        onStats={() => showToast('Stats view coming soon!', 'info')}
                        onEdit={(h) => { setEditHabit(habit); setForm({ name: habit.name, zone: habit.zone, icon: habit.icon||'🌱', frequency: habit.frequency||'daily', reminder_enabled: habit.reminder_enabled||false, reminder_time: habit.reminder_time||'' }); setShowModal(true) }}
                      />
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>

      <BottomNav activeTab="growth" onTabChange={(t) => navigate(t === 'zenith' ? '/' : `/${t}`)} />

      {/* FAB */}
      <button className="fab" onClick={() => { setEditHabit(null); setForm({ name:'', zone:'mind', icon:'🌱', frequency:'daily', reminder_enabled: false, reminder_time: '' }); setShowModal(true); }}>+</button>

      {/* EDIT CORE TARGETS MODAL */}
      {showGoalsModal && (
        <div className="modal-overlay" onClick={() => setShowGoalsModal(false)}>
          <div className="animate-slideUpModal" style={{ background: 'var(--color-card)', borderTop: '1px solid var(--color-border)', borderRadius: '24px 24px 0 0', padding: '24px', width: '100%', maxWidth: '430px', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ color: 'var(--color-text)', fontWeight: 800, fontSize: '18px' }}>Edit Core Targets</h3>
              <div onClick={() => setShowGoalsModal(false)} style={{ color: 'var(--color-muted)', fontSize: '24px', cursor: 'pointer' }}>×</div>
            </div>

            <form onSubmit={handleSaveSystemGoals}>
              {/* CGPA */}
              <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '10px', fontWeight: 800, color: 'var(--color-hint)', display: 'block', marginBottom: '6px' }}>CURRENT CGPA</label>
                  <input type="number" step="0.01" min="0" max="10" className="input" value={goalsForm.cgpa_current} onChange={e => setGoalsForm({ ...goalsForm, cgpa_current: e.target.value })} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '10px', fontWeight: 800, color: 'var(--color-hint)', display: 'block', marginBottom: '6px' }}>TARGET CGPA</label>
                  <input type="number" step="0.01" min="0" max="10" className="input" value={goalsForm.cgpa_target} onChange={e => setGoalsForm({ ...goalsForm, cgpa_target: e.target.value })} />
                </div>
              </div>

              {/* Weight */}
              <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '10px', fontWeight: 800, color: 'var(--color-hint)', display: 'block', marginBottom: '6px' }}>CURRENT WEIGHT (KG)</label>
                  <input type="number" step="0.1" min="20" max="300" className="input" value={goalsForm.weight_current} onChange={e => setGoalsForm({ ...goalsForm, weight_current: e.target.value })} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '10px', fontWeight: 800, color: 'var(--color-hint)', display: 'block', marginBottom: '6px' }}>TARGET WEIGHT (KG)</label>
                  <input type="number" step="0.1" min="20" max="300" className="input" value={goalsForm.weight_target} onChange={e => setGoalsForm({ ...goalsForm, weight_target: e.target.value })} />
                </div>
              </div>

              {/* Gold */}
              <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '10px', fontWeight: 800, color: 'var(--color-hint)', display: 'block', marginBottom: '6px' }}>CURRENT GOLD (G)</label>
                  <input type="number" step="0.01" min="0" max="10000" className="input" value={goalsForm.gold_current} onChange={e => setGoalsForm({ ...goalsForm, gold_current: e.target.value })} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '10px', fontWeight: 800, color: 'var(--color-hint)', display: 'block', marginBottom: '6px' }}>TARGET GOLD (G)</label>
                  <input type="number" step="0.01" min="0" max="10000" className="input" value={goalsForm.gold_target} onChange={e => setGoalsForm({ ...goalsForm, gold_target: e.target.value })} />
                </div>
              </div>

              {/* Side Income */}
              <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '10px', fontWeight: 800, color: 'var(--color-hint)', display: 'block', marginBottom: '6px' }}>CURRENT INCOME (₹)</label>
                  <input type="number" min="0" step="100" className="input" value={goalsForm.side_income_current} onChange={e => setGoalsForm({ ...goalsForm, side_income_current: e.target.value })} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '10px', fontWeight: 800, color: 'var(--color-hint)', display: 'block', marginBottom: '6px' }}>TARGET INCOME (₹)</label>
                  <input type="number" min="0" step="100" className="input" value={goalsForm.side_income_target} onChange={e => setGoalsForm({ ...goalsForm, side_income_target: e.target.value })} />
                </div>
              </div>

              <button type="submit" className="btn-primary" style={{ width: '100%' }}>
                Save Targets ✓
              </button>
            </form>
          </div>
        </div>
      )}

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
                onClick={saveReflection}
                style={{ flex: 1, background: '#111', color: '#666', border: '1px solid #1A1A24', borderRadius: '14px', padding: '14px', fontSize: '13px', fontWeight: 800, cursor: 'pointer' }}
              >
                Done ✓
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DETROX AI PLANNER */}
      <Detrox user={user} />

    </div>
  )
}
