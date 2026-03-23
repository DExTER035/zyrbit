import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ZyrbitIcon } from '../components/Logo.jsx'
import { supabase } from '../lib/supabase.js'

const ZONES = [
  { id: 'mind', label: 'Mind', icon: '🧠', color: 'var(--color-zone-mind)', desc: 'Focus, clarity, learning' },
  { id: 'body', label: 'Body', icon: '💪', color: 'var(--color-zone-body)', desc: 'Health, fitness, sleep' },
  { id: 'growth', label: 'Growth', icon: '🌱', color: 'var(--color-zone-growth)', desc: 'Skills, career, wealth' },
  { id: 'soul', label: 'Soul', icon: '🔮', color: 'var(--color-zone-soul)', desc: 'Joy, connection, peace' },
]

const QUICK_HABITS = {
  mind: [{ icon: '📖', name: 'Read 20 mins' }, { icon: '🧘', name: 'Meditate' }, { icon: '✍️', name: 'Journal' }],
  body: [{ icon: '🏃', name: 'Morning Run' }, { icon: '💧', name: 'Drink Water' }, { icon: '😴', name: 'Sleep 8hrs' }],
  growth: [{ icon: '💼', name: 'Deep Work' }, { icon: '📈', name: 'Learn Skill' }, { icon: '💰', name: 'Budget Check' }],
  soul: [{ icon: '🙏', name: 'Gratitude' }, { icon: '🤝', name: 'Connect' }, { icon: '🎨', name: 'Create' }],
}

export default function Onboarding() {
  const navigate = useNavigate()
  const [slide, setSlide] = useState(0)
  const [selectedZone, setSelectedZone] = useState('')
  const [selectedHabit, setSelectedHabit] = useState(null)
  const [saving, setSaving] = useState(false)

  const next = () => setSlide(s => s + 1)

  const handleZoneSelect = (zone) => {
    setSelectedZone(zone)
    setSelectedHabit(null)
  }

  const saveAndContinue = async () => {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user && selectedHabit && selectedZone) {
        // Find raw color string for DB to avoid complex raw var parsing later if needed,
        // though Zyrbit handles CSS vars nicely.
        const colorH = selectedZone === 'mind' ? '#00BCD4' : selectedZone === 'body' ? '#4CAF50' : selectedZone === 'growth' ? '#FF9800' : '#E91E63'
        await supabase.from('habits').insert({
          user_id: user.id,
          name: selectedHabit.name,
          zone: selectedZone,
          color: colorH,
          icon: selectedHabit.icon,
          frequency: 'daily',
        })
      }
    } catch (err) {
      console.error('Onboarding save error:', err)
    }
    setSaving(false)
    next()
  }

  const complete = () => {
    localStorage.setItem('zyrbit_onboarded', 'true')
    navigate('/orbit', { replace: true })
  }

  const renderSlides = () => {
    switch (slide) {
      case 0:
        return (
          <div className="animate-fadeSlideUp" style={{ textAlign: 'center', width: '100%' }}>
            <button
              onClick={complete}
              style={{ position: 'absolute', top: 20, right: 20, background: 'none', border: 'none', color: 'var(--color-muted)', fontSize: 14, cursor: 'pointer', fontWeight: 700 }}
            >
              Skip Setup
            </button>
            <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', marginBottom: 40, marginTop: 40 }}>
              <div style={{ position: 'absolute', inset: -20, background: 'radial-gradient(circle, var(--color-cyan-glow) 0%, transparent 60%)', animation: 'glowPulse 3s ease-in-out infinite' }} />
              <ZyrbitIcon size={100} />
            </div>
            <h1 style={{ fontSize: 32, fontWeight: 900, color: 'var(--color-text)', marginBottom: 16, letterSpacing: '-0.5px' }}>
              Welcome to <span style={{ color: 'var(--color-cyan)' }}>Orbit</span>
            </h1>
            <p style={{ fontSize: 16, color: 'var(--color-text2)', marginBottom: 48, lineHeight: 1.6, fontWeight: 500 }}>
              Defy gravity. Build consistency.<br />
              Secure your daily trajectory.
            </p>
            <button className="btn-primary" style={{ width: '100%', padding: '16px', fontSize: 16, borderRadius: 16 }} onClick={next}>
              Initialize Launch Sequence 🚀
            </button>
          </div>
        )
      case 1:
        return (
          <div className="animate-fadeSlideUp" style={{ width: '100%' }}>
            <h2 style={{ fontSize: 24, fontWeight: 900, color: 'var(--color-text)', marginBottom: 8, letterSpacing: '-0.5px' }}>Select Core Zone</h2>
            <p style={{ fontSize: 14, color: 'var(--color-muted)', marginBottom: 32, fontWeight: 500, lineHeight: 1.5 }}>What domain of your life requires the most gravity right now?</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 32 }}>
              {ZONES.map(zone => {
                const isSelected = selectedZone === zone.id
                return (
                  <button
                    key={zone.id}
                    onClick={() => handleZoneSelect(zone.id)}
                    style={{
                      padding: '24px 16px', borderRadius: 20, textAlign: 'center',
                      border: isSelected ? `2px solid ${zone.color}` : '2px solid var(--color-border)',
                      background: isSelected ? `color-mix(in srgb, ${zone.color} 10%, var(--color-elevated))` : 'var(--color-elevated)',
                      cursor: 'pointer', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                      boxShadow: isSelected ? `0 8px 24px color-mix(in srgb, ${zone.color} 20%, transparent)` : 'none'
                    }}
                  >
                    <div style={{ fontSize: 36, marginBottom: 12 }}>{zone.icon}</div>
                    <div style={{ fontWeight: 800, color: isSelected ? zone.color : 'var(--color-text)', fontSize: 16 }}>{zone.label}</div>
                    <div style={{ fontSize: 11, color: isSelected ? 'var(--color-text2)' : 'var(--color-muted)', marginTop: 6, fontWeight: 600 }}>{zone.desc}</div>
                  </button>
                )
              })}
            </div>
            <button className="btn-primary" style={{ width: '100%', padding: '16px', borderRadius: 16 }} onClick={next} disabled={!selectedZone}>
              Lock Trajectory →
            </button>
          </div>
        )
      case 2:
        return (
          <div className="animate-fadeSlideUp" style={{ width: '100%' }}>
            <h2 style={{ fontSize: 24, fontWeight: 900, color: 'var(--color-text)', marginBottom: 8, letterSpacing: '-0.5px' }}>First Ritual</h2>
            <p style={{ fontSize: 14, color: 'var(--color-muted)', marginBottom: 32, fontWeight: 500 }}>Select a starting habit to establish your orbit:</p>

            {selectedZone && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
                {QUICK_HABITS[selectedZone]?.map(habit => {
                  const isSelected = selectedHabit?.name === habit.name
                  const zoneColor = ZONES.find(z => z.id === selectedZone)?.color || 'var(--color-cyan)'
                  return (
                    <button
                      key={habit.name}
                      onClick={() => setSelectedHabit(habit)}
                      style={{
                        padding: '16px 20px', borderRadius: 16, textAlign: 'left',
                        border: isSelected ? `2px solid ${zoneColor}` : '2px solid var(--color-border)',
                        background: isSelected ? `color-mix(in srgb, ${zoneColor} 10%, var(--color-card))` : 'var(--color-card)',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16,
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      }}
                    >
                      <span style={{ fontSize: 28 }}>{habit.icon}</span>
                      <span style={{ fontWeight: 800, color: isSelected ? zoneColor : 'var(--color-text)', fontSize: 16 }}>{habit.name}</span>
                    </button>
                  )
                })}
              </div>
            )}

            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn-ghost" style={{ flex: 1, borderRadius: 16 }} onClick={next}>Skip</button>
              <button className="btn-primary" style={{ flex: 2, borderRadius: 16, background: ZONES.find(z => z.id === selectedZone)?.color || 'var(--color-cyan)' }} onClick={saveAndContinue} disabled={saving || !selectedHabit}>
                {saving ? 'Saving...' : 'Confirm Habit ✓'}
              </button>
            </div>
          </div>
        )
      case 3:
        return (
          <div className="animate-fadeSlideUp" style={{ textAlign: 'center', width: '100%', marginTop: 20 }}>
            <div style={{ fontSize: 60, marginBottom: 24, animation: 'float 3s ease-in-out infinite' }}>🚀</div>
            <h2 style={{ fontSize: 28, fontWeight: 900, color: 'var(--color-cyan)', marginBottom: 16, letterSpacing: '-0.5px' }}>Orbit Achieved</h2>
            <div className="card-base" style={{ padding: '24px', marginBottom: 40, textAlign: 'center', border: '1px solid var(--color-cyan-dim)', background: 'var(--color-cyan-glow)' }}>
              <p style={{ fontSize: 15, color: 'var(--color-text)', lineHeight: 1.7, fontWeight: 600 }}>
                Your Zyrbit dashboard is fully calibrated. Maintain consistency to generate Gravity, and earn Zyrons to unlock the cosmos.
              </p>
            </div>
            <button className="btn-primary" style={{ width: '100%', fontSize: 16, padding: '16px', borderRadius: 16 }} onClick={complete}>
              Enter Station
            </button>
          </div>
        )
      default: return null
    }
  }

  return (
    <div className="app-container" style={{ display: 'flex', flexDirection: 'column', padding: '60px 24px 40px', minHeight: '100vh' }}>
      
      {/* Progress indicators */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 48 }}>
        {[0, 1, 2, 3].map((_, i) => (
          <div key={i} style={{
            width: i === slide ? 24 : 8, height: 8,
            borderRadius: 4, transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            background: i === slide ? 'var(--color-cyan)' : 'var(--color-border)',
            boxShadow: i === slide ? '0 0 10px var(--color-cyan-dim)' : 'none'
          }} />
        ))}
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {renderSlides()}
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
    </div>
  )
}
