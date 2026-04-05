import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import BottomNav from '../components/BottomNav'
import { showToast } from '../components/Toast'

const DURATIONS = [7, 21, 30]

export default function Challenge() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [habits, setHabits] = useState([])
  const [challenges, setChallenges] = useState([])
  const [activityLog, setActivityLog] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [selected, setSelected] = useState(null)

  // New challenge form
  const [form, setForm] = useState({ name: '', duration: 21, habitIds: [] })

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { navigate('/orbit'); return }
      setUser(session.user)
      loadData(session.user.id)
    })
  }, [])

  const loadData = async (uid) => {
    setLoading(true)
    try {
      const [{ data: hData }, { data: alData }, { data: cData }] = await Promise.all([
        supabase.from('habits').select('*').eq('user_id', uid),
        supabase.from('activity_log').select('*').eq('user_id', uid),
        supabase.from('challenges').select('*').eq('user_id', uid).order('created_at', { ascending: false })
      ])
      if (hData) setHabits(hData)
      if (alData) setActivityLog(alData)
      if (cData) setChallenges(cData)
    } catch (e) {
      // challenges table may not exist yet — that's fine
    }
    setLoading(false)
  }

  const createChallenge = async () => {
    if (!form.name.trim() || form.habitIds.length === 0 || !user) return
    const startDate = new Date().toLocaleDateString('en-CA')
    const endDate = new Date(Date.now() + form.duration * 86400000).toLocaleDateString('en-CA')
    try {
      const { error } = await supabase.from('challenges').insert({
        user_id: user.id,
        name: form.name,
        duration_days: form.duration,
        habit_ids: form.habitIds,
        start_date: startDate,
        end_date: endDate,
        status: 'active'
      })
      if (error) throw error
      showToast('🎯 Challenge started!', 'success')
      setShowNew(false)
      setForm({ name: '', duration: 21, habitIds: [] })
      await loadData(user.id)
    } catch (e) {
      showToast('⚠️ Could not create challenge. Run the challenges SQL first.', 'warning')
    }
  }

  const getDayGrid = (challenge) => {
    const start = new Date(challenge.start_date)
    const habitIds = challenge.habit_ids || []
    return Array.from({ length: challenge.duration_days }, (_, i) => {
      const d = new Date(start)
      d.setDate(d.getDate() + i)
      const dateStr = d.toLocaleDateString('en-CA')
      const completed = activityLog.filter(l =>
        l.completed_date === dateStr &&
        l.status === 'completed' &&
        habitIds.includes(l.habit_id)
      ).length
      const total = habitIds.length
      const isPast = d < new Date()
      const isToday = dateStr === new Date().toLocaleDateString('en-CA')
      return { dateStr, completed, total, isPast, isToday, dayNum: i + 1 }
    })
  }

  const getCompletionPct = (challenge) => {
    const grid = getDayGrid(challenge)
    const pastDays = grid.filter(d => d.isPast || d.isToday)
    if (pastDays.length === 0) return 0
    const totalPossible = pastDays.reduce((s, d) => s + d.total, 0)
    const totalDone = pastDays.reduce((s, d) => s + d.completed, 0)
    return totalPossible > 0 ? Math.round((totalDone / totalPossible) * 100) : 0
  }

  const getDaysLeft = (challenge) => {
    const end = new Date(challenge.end_date)
    const now = new Date()
    const diff = Math.ceil((end - now) / 86400000)
    return Math.max(0, diff)
  }

  const ZONE_COLORS = { mind: '#00BCD4', body: '#4CAF50', growth: '#FF9800', soul: '#9C27B0' }

  return (
    <div style={{ background: '#000', minHeight: '100vh', padding: '0 20px 100px', color: '#FFF' }}>
      {/* HEADER */}
      <div style={{ padding: '32px 0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: -1, marginBottom: 4 }}>Challenge Mode</h1>
          <p style={{ fontSize: 12, color: '#444', fontWeight: 600 }}>Commit. Streak. Conquer.</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          style={{ background: 'var(--color-cyan)', color: '#000', border: 'none', borderRadius: 14, padding: '10px 18px', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}
        >
          + New
        </button>
      </div>

      {/* CHALLENGE LIST */}
      {loading ? (
        <div style={{ height: 120, borderRadius: 20, background: 'linear-gradient(90deg, #1E1E28 25%, #2A2A38 50%, #1E1E28 75%)', animation: 'skeletonPulse 1.5s infinite' }} />
      ) : challenges.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎯</div>
          <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 8 }}>No Challenges Yet</div>
          <div style={{ fontSize: 13, color: '#444' }}>Start a 7, 21, or 30-day challenge to push your limits.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {challenges.map(ch => {
            const pct = getCompletionPct(ch)
            const daysLeft = getDaysLeft(ch)
            const grid = getDayGrid(ch)
            return (
              <div
                key={ch.id}
                onClick={() => setSelected(selected?.id === ch.id ? null : ch)}
                style={{
                  background: '#0A0A12', border: '1px solid #1A1A24',
                  borderRadius: 24, padding: 20, cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {/* Header row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 900, color: '#FFF', marginBottom: 4 }}>{ch.name}</div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: 10, fontWeight: 800, color: '#00FFFF', background: '#00FFFF10', padding: '2px 8px', borderRadius: 100 }}>
                        {ch.duration_days}-DAY
                      </span>
                      <span style={{ fontSize: 10, color: '#444' }}>
                        {daysLeft > 0 ? `${daysLeft} days left` : 'Completed 🎉'}
                      </span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 24, fontWeight: 900, color: pct === 100 ? '#4CAF50' : '#FFF' }}>{pct}%</div>
                    <div style={{ fontSize: 9, color: '#333', textTransform: 'uppercase', fontWeight: 700 }}>Complete</div>
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ height: 4, background: '#111', borderRadius: 100, marginBottom: 16 }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: 'var(--color-cyan)', borderRadius: 100, transition: 'width 0.5s ease' }} />
                </div>

                {/* Day grid — shown when expanded */}
                {selected?.id === ch.id && (
                  <div style={{ marginTop: 4 }}>
                    <div style={{ fontSize: 9, fontWeight: 800, color: '#222', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10 }}>DAY GRID</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {grid.map(day => {
                        const allDone = day.completed >= day.total && day.total > 0
                        const partDone = day.completed > 0 && !allDone
                        const bg = allDone ? '#4CAF50' : partDone ? '#FF9800' : day.isPast ? '#111' : '#0A0A12'
                        const border = day.isToday ? '1px solid #00FFFF' : '1px solid #1A1A24'
                        return (
                          <div key={day.dayNum} style={{
                            width: 28, height: 28, borderRadius: 8,
                            background: bg, border,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 8, fontWeight: 800, color: allDone ? '#000' : '#333'
                          }}>
                            {day.dayNum}
                          </div>
                        )
                      })}
                    </div>
                    {/* Habit list for this challenge */}
                    <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {(ch.habit_ids || []).map(hid => {
                        const h = habits.find(hb => hb.id === hid)
                        if (!h) return null
                        return (
                          <span key={hid} style={{
                            fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 100,
                            background: `${ZONE_COLORS[h.zone] || '#00FFFF'}15`,
                            color: ZONE_COLORS[h.zone] || '#00FFFF',
                            border: `1px solid ${ZONE_COLORS[h.zone] || '#00FFFF'}30`
                          }}>
                            {h.icon} {h.name}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <BottomNav activeTab="orbit" onTabChange={(t) => navigate(t === 'orbit' ? '/orbit' : `/${t}`)} />

      {/* NEW CHALLENGE MODAL */}
      {showNew && (
        <div className="modal-overlay" onClick={() => setShowNew(false)}>
          <div
            className="animate-slideUpModal"
            onClick={e => e.stopPropagation()}
            style={{ background: 'var(--color-card)', borderTop: '1px solid var(--color-border)', borderRadius: '24px 24px 0 0', padding: '24px', width: '100%', maxWidth: '430px', maxHeight: '90vh', overflowY: 'auto' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ color: 'var(--color-text)', fontWeight: 800, fontSize: '18px' }}>New Challenge 🎯</h3>
              <div onClick={() => setShowNew(false)} style={{ color: 'var(--color-muted)', fontSize: '24px', cursor: 'pointer' }}>×</div>
            </div>

            {/* Name */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 10, fontWeight: 800, color: 'var(--color-hint)', display: 'block', marginBottom: 8, letterSpacing: 1 }}>CHALLENGE NAME</label>
              <input
                autoFocus className="input" placeholder="e.g., 21-Day Discipline Run"
                value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              />
            </div>

            {/* Duration */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 10, fontWeight: 800, color: 'var(--color-hint)', display: 'block', marginBottom: 8, letterSpacing: 1 }}>DURATION</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {DURATIONS.map(d => (
                  <div
                    key={d}
                    onClick={() => setForm({ ...form, duration: d })}
                    style={{
                      flex: 1, padding: '14px 8px', borderRadius: 14, textAlign: 'center',
                      border: form.duration === d ? '1px solid var(--color-cyan)' : '1px solid var(--color-border2)',
                      background: form.duration === d ? '#00FFFF10' : 'var(--color-elevated)',
                      color: form.duration === d ? 'var(--color-cyan)' : 'var(--color-muted)',
                      fontSize: 14, fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s'
                    }}
                  >
                    {d}d
                  </div>
                ))}
              </div>
            </div>

            {/* Habits */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 10, fontWeight: 800, color: 'var(--color-hint)', display: 'block', marginBottom: 8, letterSpacing: 1 }}>SELECT HABITS</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 200, overflowY: 'auto' }}>
                {habits.map(h => {
                  const isSelected = form.habitIds.includes(h.id)
                  const zc = ZONE_COLORS[h.zone] || '#00FFFF'
                  return (
                    <div
                      key={h.id}
                      onClick={() => setForm(prev => ({
                        ...prev,
                        habitIds: isSelected ? prev.habitIds.filter(id => id !== h.id) : [...prev.habitIds, h.id]
                      }))}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                        borderRadius: 12, cursor: 'pointer',
                        background: isSelected ? `${zc}12` : 'var(--color-elevated)',
                        border: isSelected ? `1px solid ${zc}40` : '1px solid var(--color-border2)',
                        transition: 'all 0.15s'
                      }}
                    >
                      <div style={{ width: 20, height: 20, borderRadius: '50%', border: isSelected ? 'none' : `2px solid ${zc}50`, background: isSelected ? zc : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {isSelected && <svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 5.5L4 7.5L8 3" stroke="#000" strokeWidth="2" strokeLinecap="round"/></svg>}
                      </div>
                      <span style={{ fontSize: 16 }}>{h.icon}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: isSelected ? '#FFF' : 'var(--color-muted)' }}>{h.name}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            <button
              className="btn-primary"
              style={{ width: '100%' }}
              onClick={createChallenge}
              disabled={!form.name.trim() || form.habitIds.length === 0}
            >
              Start Challenge 🚀
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
