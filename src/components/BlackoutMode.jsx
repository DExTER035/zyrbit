import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useBlackout } from '../lib/BlackoutContext'

const DURATIONS = [
  { label: '25 min', value: 25 },
  { label: '50 min', value: 50 },
  { label: '90 min', value: 90 },
]

export default function BlackoutMode({ user }) {
  const { isActive, remaining, subject, startBlackout, endBlackout, formatMMSS } = useBlackout()
  const [selected, setSelected] = useState(25)
  const [customMin, setCustomMin] = useState('')
  const [subjectInput, setSubjectInput] = useState('')
  const [showCustom, setShowCustom] = useState(false)
  const [showReflection, setShowReflection] = useState(false)
  const [reflection, setReflection] = useState('')
  const [lastSession, setLastSession] = useState(null)

  useEffect(() => {
    if (!user) return
    supabase.from('study_sessions').select('duration_minutes, completed_at').eq('user_id', user.id).eq('source', 'blackout').order('completed_at', { ascending: false }).limit(1).then(({ data }) => {
      if (data && data[0]) setLastSession(data[0])
    })
  }, [user])

  // When timer hits zero, show mandatory reflection
  useEffect(() => {
    if (!isActive && remaining === 0 && subjectInput) {
      setShowReflection(true)
    }
  }, [isActive])

  const handleStart = () => {
    const mins = showCustom ? parseInt(customMin) || 25 : selected
    if (!subjectInput.trim()) {
      setSubjectInput('General Study')
    }
    startBlackout(mins, subjectInput.trim() || 'General Study', user?.id)
  }

  const handleReflectionDone = () => {
    endBlackout(true, reflection)
    setShowReflection(false)
    setReflection('')
    setSubjectInput('')
  }

  // Reflection full-screen (shown when timer completes)
  if (showReflection) {
    return (
      <div className="animate-fadeSlideUp" style={{ position: 'fixed', inset: 0, background: '#0a0a0a', zIndex: 400, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 28 }}>
        <div style={{ fontSize: 11, color: '#7F77DD', fontWeight: 900, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>Session Complete</div>
        <div style={{ fontSize: 28, fontWeight: 900, color: '#FFF', letterSpacing: -1, marginBottom: 24 }}>Before you leave —</div>
        <div style={{ fontSize: 14, color: '#888', marginBottom: 20 }}>What did you actually get done?</div>
        <textarea
          value={reflection}
          onChange={e => setReflection(e.target.value)}
          placeholder="I finished chapter 4, solved 10 problems..."
          style={{
            width: '100%', minHeight: 140,
            background: '#141418', border: '1px solid #7F77DD40',
            borderRadius: 16, color: '#FFF', padding: 16, fontSize: 14,
            resize: 'none', outline: 'none', lineHeight: 1.6, marginBottom: 24
          }}
        />
        <button
          onClick={handleReflectionDone}
          style={{
            width: '100%', background: 'linear-gradient(135deg, #7F77DD, #9FA0FF)',
            color: '#000', border: 'none', borderRadius: 16, padding: 18,
            fontSize: 15, fontWeight: 900, cursor: 'pointer',
            boxShadow: '0 4px 20px #7F77DD40'
          }}
        >
          Done — Unlock App 🔓
        </button>
      </div>
    )
  }

  // Active state: show countdown in study tab
  if (isActive) {
    return (
      <div className="card-elite animate-eliteGlow" style={{ padding: 24, marginBottom: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 10, fontWeight: 900, color: '#7F77DD', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>
          🔒 Blackout Active
        </div>
        {subject && <div style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>Studying: {subject}</div>}
        <div style={{ fontSize: 80, fontWeight: 900, color: '#FFF', letterSpacing: -4, fontVariantNumeric: 'tabular-nums', lineHeight: 1, marginBottom: 8 }}>
          {formatMMSS(remaining)}
        </div>
        <div style={{ fontSize: 11, color: '#555566', marginBottom: 28 }}>Stay locked in. No escape.</div>
        <button
          onClick={() => endBlackout(false)}
          style={{
            background: 'transparent', color: '#555566',
            border: '1px solid #1e1e2e', borderRadius: 100,
            padding: '10px 24px', fontSize: 12, fontWeight: 700, cursor: 'pointer'
          }}
        >
          End early
        </button>
      </div>
    )
  }

  // Default card
  return (
    <div className="card-elite animate-eliteGlow" style={{ padding: 20, marginBottom: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <div style={{ fontSize: 11, fontWeight: 900, color: '#7F77DD', letterSpacing: 1.5 }}>
          BLACKOUT MODE <span style={{ background: '#7F77DD20', border: '1px solid #7F77DD40', color: '#7F77DD', fontSize: 8, fontWeight: 900, padding: '2px 7px', borderRadius: 6, marginLeft: 6 }}>ELITE</span>
        </div>
      </div>
      <div style={{ fontSize: 12, color: '#555566', marginBottom: 20 }}>Full screen. No escape. Just work.</div>

      {/* Subject Input */}
      <input
        type="text"
        value={subjectInput}
        onChange={e => setSubjectInput(e.target.value)}
        placeholder="What are you studying?"
        style={{
          width: '100%', background: '#0a0a0a', border: '1px solid #1e1e2e',
          borderRadius: 12, color: '#FFF', padding: '12px 16px',
          fontSize: 14, outline: 'none', marginBottom: 16
        }}
        onFocus={e => e.target.style.borderColor = '#7F77DD'}
        onBlur={e => e.target.style.borderColor = '#1e1e2e'}
      />

      {/* Duration Pills */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        {DURATIONS.map(d => (
          <button
            key={d.value}
            onClick={() => { setSelected(d.value); setShowCustom(false) }}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 100, cursor: 'pointer', fontWeight: 800, fontSize: 12,
              background: selected === d.value && !showCustom ? '#7F77DD20' : '#0a0a0a',
              border: `1px solid ${selected === d.value && !showCustom ? '#7F77DD' : '#1e1e2e'}`,
              color: selected === d.value && !showCustom ? '#7F77DD' : '#666',
              transition: 'all 0.2s'
            }}
          >{d.label}</button>
        ))}
        <button
          onClick={() => setShowCustom(c => !c)}
          style={{
            flex: 1, padding: '10px 0', borderRadius: 100, cursor: 'pointer', fontWeight: 800, fontSize: 12,
            background: showCustom ? '#7F77DD20' : '#0a0a0a',
            border: `1px solid ${showCustom ? '#7F77DD' : '#1e1e2e'}`,
            color: showCustom ? '#7F77DD' : '#666', transition: 'all 0.2s'
          }}
        >Custom</button>
      </div>

      {showCustom && (
        <input
          type="number" min="1" max="240"
          value={customMin}
          onChange={e => setCustomMin(e.target.value)}
          placeholder="Minutes (e.g. 45)"
          style={{
            width: '100%', background: '#0a0a0a', border: '1px solid #7F77DD40',
            borderRadius: 12, color: '#FFF', padding: '10px 16px',
            fontSize: 14, outline: 'none', marginBottom: 8
          }}
        />
      )}

      <button
        onClick={handleStart}
        style={{
          width: '100%', marginTop: 16,
          background: 'linear-gradient(135deg, #7F77DD, #9FA0FF)',
          color: '#000', border: 'none', borderRadius: 16,
          padding: 16, fontSize: 15, fontWeight: 900, cursor: 'pointer',
          boxShadow: '0 4px 20px #7F77DD40',
          transition: 'all 0.2s'
        }}
      >
        🔒 Enter Blackout
      </button>

      {lastSession && (
        <div style={{ fontSize: 10, color: '#333344', fontWeight: 700, textAlign: 'center', marginTop: 12 }}>
          Last session: {lastSession.duration_minutes}min · {new Date(lastSession.completed_at).toLocaleDateString()}
        </div>
      )}
    </div>
  )
}
