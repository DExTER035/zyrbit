import React, { useState } from 'react'
import { supabase } from '../lib/supabase'

const GOALS = [
  {
    id: 'discipline',
    icon: '⚡',
    label: 'Build Discipline',
    desc: 'Master self-control & consistency',
    color: '#FF9800',
    habits: [
      { name: 'Morning Routine', icon: '🌅', zone: 'mind' },
      { name: 'No Phone First Hour', icon: '📵', zone: 'mind' },
      { name: 'Cold Shower', icon: '🚿', zone: 'body' },
      { name: 'Journal 3 Lines', icon: '✍️', zone: 'soul' },
      { name: 'Sleep by 11pm', icon: '🌙', zone: 'soul' },
    ]
  },
  {
    id: 'study',
    icon: '📚',
    label: 'Study Better',
    desc: 'Level up your focus & retention',
    color: '#00BCD4',
    habits: [
      { name: '2hr Deep Work', icon: '📖', zone: 'mind' },
      { name: 'Pomodoro Sessions', icon: '⏱️', zone: 'mind' },
      { name: 'Review Notes Daily', icon: '📝', zone: 'growth' },
      { name: 'No Social While Studying', icon: '🚫', zone: 'mind' },
      { name: 'Read 20 Pages', icon: '📚', zone: 'growth' },
    ]
  },
  {
    id: 'dopamine',
    icon: '🧘',
    label: 'Dopamine Detox',
    desc: 'Reset your brain, reclaim focus',
    color: '#9C27B0',
    habits: [
      { name: 'No Social Media', icon: '📵', zone: 'mind' },
      { name: 'No Junk Food', icon: '🥗', zone: 'body' },
      { name: 'No Binge Watching', icon: '🎬', zone: 'soul' },
      { name: 'Walk 30 Minutes', icon: '🚶', zone: 'body' },
      { name: 'Meditate 10 Minutes', icon: '🧘', zone: 'soul' },
    ]
  },
  {
    id: 'fitness',
    icon: '💪',
    label: 'Get Fit',
    desc: 'Build your strongest body yet',
    color: '#4CAF50',
    habits: [
      { name: 'Workout 30 Minutes', icon: '🏋️', zone: 'body' },
      { name: '10k Steps', icon: '👟', zone: 'body' },
      { name: 'Drink 3L Water', icon: '💧', zone: 'body' },
      { name: 'No Late Night Snacks', icon: '🚫', zone: 'body' },
      { name: 'Morning Stretch', icon: '🧘', zone: 'body' },
    ]
  },
  {
    id: 'sleep',
    icon: '😴',
    label: 'Sleep Better',
    desc: 'Optimize recovery & rest',
    color: '#5C6BC0',
    habits: [
      { name: 'No Screens After 10pm', icon: '📵', zone: 'soul' },
      { name: 'Sleep by 11pm', icon: '🌙', zone: 'soul' },
      { name: 'No Caffeine After 3pm', icon: '☕', zone: 'body' },
      { name: 'Morning Sunlight', icon: '☀️', zone: 'body' },
      { name: 'Wind-down Journal', icon: '✍️', zone: 'soul' },
    ]
  }
]

const ZONE_COLORS = {
  mind: '#00BCD4',
  body: '#4CAF50',
  growth: '#FF9800',
  soul: '#9C27B0',
}

export default function GoalSetupScreen({ onComplete, userId }) {
  const [selected, setSelected] = useState(null)
  const [step, setStep] = useState('pick') // 'pick' | 'pack'
  const [adding, setAdding] = useState(false)

  const goal = GOALS.find(g => g.id === selected)

  const addAllHabits = async () => {
    if (!goal || !userId) return
    setAdding(true)
    try {
      const habitsToInsert = goal.habits.map(h => ({
        user_id: userId,
        name: h.name,
        icon: h.icon,
        zone: h.zone,
        frequency: 'daily',
        color: ZONE_COLORS[h.zone] || '#00FFFF',
        reminder_enabled: false,
      }))
      await supabase.from('habits').insert(habitsToInsert)
      onComplete()
    } catch (err) {
      console.error(err)
      onComplete()
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'linear-gradient(180deg, #000 0%, #05050F 100%)',
      display: 'flex', flexDirection: 'column', padding: '0 20px 40px', color: '#FFF',
      fontFamily: 'inherit'
    }}>
      {/* Header */}
      <div style={{ paddingTop: 60, paddingBottom: 32, textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🪐</div>
        {step === 'pick' ? (
          <>
            <h1 style={{ fontSize: 26, fontWeight: 900, letterSpacing: -0.5, marginBottom: 8 }}>
              What's your main goal?
            </h1>
            <p style={{ fontSize: 13, color: '#444', fontWeight: 600 }}>
              We'll suggest a starter habit pack just for you
            </p>
          </>
        ) : (
          <>
            <div style={{ fontSize: 28, marginBottom: 4 }}>{goal.icon}</div>
            <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: -0.5, marginBottom: 6 }}>
              {goal.label}
            </h1>
            <p style={{ fontSize: 13, color: '#444', fontWeight: 600 }}>
              Your 5-habit starter pack
            </p>
          </>
        )}
      </div>

      <div style={{ flex: 1 }}>
        {step === 'pick' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {GOALS.map(g => (
              <div
                key={g.id}
                onClick={() => { setSelected(g.id); setStep('pack') }}
                style={{
                  background: selected === g.id ? `${g.color}12` : '#0A0A12',
                  border: `1px solid ${selected === g.id ? g.color + '40' : '#1A1A24'}`,
                  borderRadius: 20, padding: '18px 20px',
                  display: 'flex', alignItems: 'center', gap: 16,
                  cursor: 'pointer', transition: 'all 0.2s',
                }}
              >
                <div style={{
                  width: 48, height: 48, borderRadius: 14,
                  background: `${g.color}18`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, flexShrink: 0
                }}>{g.icon}</div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#FFF', marginBottom: 3 }}>{g.label}</div>
                  <div style={{ fontSize: 12, color: '#444', fontWeight: 600 }}>{g.desc}</div>
                </div>
                <div style={{ marginLeft: 'auto', color: '#333', fontSize: 18 }}>›</div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {goal.habits.map((h, i) => (
              <div key={i} style={{
                background: '#0A0A12', border: `1px solid ${ZONE_COLORS[h.zone]}25`,
                borderLeft: `3px solid ${ZONE_COLORS[h.zone]}`,
                borderRadius: 16, padding: '14px 16px',
                display: 'flex', alignItems: 'center', gap: 14,
                animation: `fadeSlideUp 0.3s ease ${i * 0.06}s both`
              }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 12,
                  background: `${ZONE_COLORS[h.zone]}18`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, flexShrink: 0
                }}>{h.icon}</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#FFF' }}>{h.name}</div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: ZONE_COLORS[h.zone], textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 }}>{h.zone}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ paddingTop: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {step === 'pack' ? (
          <>
            <button
              onClick={addAllHabits}
              disabled={adding}
              style={{
                background: goal?.color || 'var(--color-cyan)',
                color: '#000', border: 'none', borderRadius: 16, padding: '16px',
                fontSize: 15, fontWeight: 900, cursor: 'pointer',
                opacity: adding ? 0.7 : 1, transition: 'opacity 0.2s'
              }}
            >
              {adding ? 'Adding Habits...' : `Add All 5 Habits ✓`}
            </button>
            <button
              onClick={() => setStep('pick')}
              style={{ background: 'transparent', color: '#444', border: 'none', fontSize: 13, cursor: 'pointer', padding: '8px' }}
            >
              ← Change Goal
            </button>
          </>
        ) : (
          <button
            onClick={onComplete}
            style={{ background: 'transparent', color: '#333', border: '1px solid #1A1A24', borderRadius: 16, padding: '14px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
          >
            Skip for now
          </button>
        )}
      </div>
    </div>
  )
}
