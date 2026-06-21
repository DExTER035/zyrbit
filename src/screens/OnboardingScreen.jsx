import React, { useState } from 'react'

const CYAN = '#00f5d4'
const BG = '#020204'

// ── Progress dots ──────────────────────────────────────────────────────────────
const Dots = ({ current, total }) => (
  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
    {Array.from({ length: total }, (_, i) => {
      const active = i === current
      return (
        <div key={i} style={{
          height: 3, borderRadius: 99,
          width: active ? 22 : 12,
          background: active ? CYAN : '#1a1a2a',
          boxShadow: active ? `0 0 6px ${CYAN}88` : 'none',
          transition: 'width 0.3s, background 0.3s',
        }} />
      )
    })}
  </div>
)

// ── CTA Button ─────────────────────────────────────────────────────────────────
const CyanBtn = ({ onClick, children, gradient }) => (
  <button onClick={onClick} style={{
    width: '100%', borderRadius: 16,
    padding: '16px', fontSize: 13, fontWeight: 800,
    cursor: 'pointer', letterSpacing: '1.5px',
    background: gradient ? 'linear-gradient(135deg, #00f5d4, #00c4a8)' : 'rgba(255,255,255,0.03)',
    color: gradient ? '#000' : 'var(--text-primary)',
    border: gradient ? 'none' : '1px solid var(--border-primary)',
    boxShadow: gradient
      ? '0 0 32px rgba(0,245,212,0.35), 0 4px 16px rgba(0,245,212,0.2)'
      : 'none',
    fontFamily: 'inherit',
    flexShrink: 0,
    transition: 'all 0.2s',
  }}
    onTouchStart={e => e.currentTarget.style.transform = 'scale(0.97)'}
    onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}
    onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
    onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
  >{children}</button>
)

// ── Slide shell — fixed full-screen, flex column ───────────────────────────────
const Slide = ({ children, onSkip, onNext, slide, total, btnLabel, gradient }) => (
  <div style={{
    position: 'fixed', inset: 0, background: BG,
    display: 'flex', flexDirection: 'column',
    padding: '24px 20px 24px',
    boxSizing: 'border-box',
    fontFamily: "'Inter', system-ui, sans-serif",
    overflow: 'hidden',
  }}>
    {/* Top bar — fixed height */}
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      marginBottom: 24, flexShrink: 0, height: 28,
    }}>
      <Dots current={slide} total={total} />
      {slide < total - 1 && (
        <button onClick={onSkip} style={{
          background: 'none', border: 'none', color: 'var(--text-muted)',
          fontSize: 10, letterSpacing: '1.5px', textTransform: 'uppercase',
          fontWeight: 700, cursor: 'pointer', padding: 0, fontFamily: 'inherit',
        }}>SKIP</button>
      )}
    </div>

    {/* Scrollable content middle — grows to fill remaining space */}
    <div style={{
      flex: 1, minHeight: 0,
      overflowY: 'auto', overflowX: 'hidden',
      display: 'flex', flexDirection: 'column',
      justifyContent: 'center',
      gap: 20,
      msOverflowStyle: 'none', scrollbarWidth: 'none',
    }}>
      {children}
    </div>

    {/* Button — fixed at bottom */}
    <div style={{ flexShrink: 0, marginTop: 24 }}>
      <CyanBtn onClick={onNext} gradient={gradient}>{btnLabel}</CyanBtn>
    </div>
  </div>
)

// ─── Slide 1: Zenith (Command Center) ──────────────────────────────────────────
const Slide1 = () => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, paddingBottom: 4 }}>
    {/* Visual Representation of Zenith Orbit / OS Score */}
    <div style={{ position: 'relative', width: 160, height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      {/* Outer Glow Orb */}
      <div style={{ position: 'absolute', width: 140, height: 140, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,127,255,0.15) 0%, transparent 70%)', filter: 'blur(10px)' }} />
      {/* Inner Circles */}
      <div style={{ position: 'absolute', width: 130, height: 130, borderRadius: '50%', border: '1.5px dashed rgba(139,127,255,0.25)', animation: 'spin 40s linear infinite' }} />
      <div style={{ position: 'absolute', width: 100, height: 100, borderRadius: '50%', border: '1px solid rgba(0,229,255,0.2)' }} />
      
      <div style={{
        width: 80, height: 80, borderRadius: '50%', position: 'relative', zIndex: 1,
        background: 'radial-gradient(circle at 40% 30%, #151525 0%, #0A0A14 80%, #020204 100%)',
        border: '2px solid #8B7FFF',
        boxShadow: '0 0 32px rgba(139,127,255,0.35), inset 0 0 12px rgba(139,127,255,0.1)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: 28, fontWeight: 900, color: '#FFF', lineHeight: 1, textShadow: '0 0 12px rgba(139,127,255,0.5)' }}>85</span>
        <span style={{ fontSize: 7, color: 'rgba(139,127,255,0.8)', letterSpacing: '2px', marginTop: 4, fontWeight: 800 }}>OS INDEX</span>
      </div>
    </div>

    {/* Text */}
    <div style={{ width: '100%', textAlign: 'center' }}>
      <div style={{ fontSize: 9, color: '#8B7FFF', fontWeight: 800, letterSpacing: '2.5px', textTransform: 'uppercase', marginBottom: 8 }}>COMMAND CENTER</div>
      <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', lineHeight: 1.2, marginBottom: 8 }}>
        Meet Zenith, your <span style={{ background: 'linear-gradient(135deg, #8B7FFF 0%, #00E5FF 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Personal OS.</span>
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: 320, margin: '0 auto' }}>
        DexOS aggregates your daily habits, task completion, active recovery, and financial health into a single real-time execution index.
      </div>
    </div>
  </div>
)

// ─── Slide 2: Growth Engine ─────────────────────────────────────────────────
const Slide2 = () => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, paddingBottom: 4 }}>
    {/* Focus Sessions & Tasks representation */}
    <div style={{ display: 'flex', gap: 12, width: '100%', maxWidth: 300, flexShrink: 0 }}>
      <div style={{
        flex: 1, background: 'linear-gradient(145deg, #0A0A14 0%, #0E0E1A 100%)', border: '1px solid #1A1A2A', borderLeft: '3.5px solid #8B7FFF',
        borderRadius: 16, padding: '16px 12px', textAlign: 'center', boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
      }}>
        <div style={{ fontSize: 24, marginBottom: 6 }}>🎯</div>
        <div style={{ fontSize: 18, fontWeight: 900, color: '#8B7FFF' }}>90m</div>
        <div style={{ fontSize: 8, color: 'var(--text-muted)', letterSpacing: '1px', marginTop: 4, fontWeight: 700 }}>FOCUS GOAL</div>
      </div>
      <div style={{
        flex: 1, background: 'linear-gradient(145deg, #0A0A14 0%, #0E0E1A 100%)', border: '1px solid #1A1A2A', borderLeft: '3.5px solid #00f5d4',
        borderRadius: 16, padding: '16px 12px', textAlign: 'center', boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
      }}>
        <div style={{ fontSize: 24, marginBottom: 6 }}>📋</div>
        <div style={{ fontSize: 18, fontWeight: 900, color: '#00f5d4' }}>4 / 5</div>
        <div style={{ fontSize: 8, color: 'var(--text-muted)', letterSpacing: '1px', marginTop: 4, fontWeight: 700 }}>TASKS DONE</div>
      </div>
    </div>

    {/* Text */}
    <div style={{ width: '100%', textAlign: 'center' }}>
      <div style={{ fontSize: 9, color: '#00f5d4', fontWeight: 800, letterSpacing: '2.5px', textTransform: 'uppercase', marginBottom: 8 }}>GROWTH PILLAR</div>
      <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', lineHeight: 1.2, marginBottom: 8 }}>
        Supercharge your <span style={{ color: '#00f5d4' }}>Growth Engine.</span>
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: 320, margin: '0 auto' }}>
        Run focus sprints, organize priority backlogs, complete high-impact tasks, and review your daily execution consistency grids.
      </div>
    </div>
  </div>
)

// ─── Slide 3: Bio Telemetry (Health) ──────────────────────────────────────────
const Slide3 = () => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, paddingBottom: 4 }}>
    {/* Vitals representation */}
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 300, flexShrink: 0 }}>
      {[
        { name: 'Recovery Score', val: '92%', icon: '❤️', color: '#10B981', barPct: '92%' },
        { name: 'Sleep Logged', val: '7.8 hrs', icon: '🌙', color: '#8B5CF6', barPct: '80%' },
        { name: 'Water Intake', val: '2,500 ml', icon: '💧', color: '#06B6D4', barPct: '83%' },
      ].map(vital => (
        <div key={vital.name} style={{
          background: 'linear-gradient(145deg, #0A0A14 0%, #0E0E1A 100%)', border: '1px solid #1A1A2A',
          borderRadius: 14, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)'
        }}>
          <span style={{ fontSize: 16 }}>{vital.icon}</span>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, marginBottom: 6 }}>
              <span style={{ color: 'var(--text-primary)' }}>{vital.name}</span>
              <span style={{ color: vital.color }}>{vital.val}</span>
            </div>
            <div style={{ height: 4, background: '#1A1A2A', borderRadius: 2 }}>
              <div style={{ height: '100%', width: vital.barPct, background: vital.color, borderRadius: 2 }} />
            </div>
          </div>
        </div>
      ))}
    </div>

    {/* Text */}
    <div style={{ width: '100%', textAlign: 'center' }}>
      <div style={{ fontSize: 9, color: '#10B981', fontWeight: 800, letterSpacing: '2.5px', textTransform: 'uppercase', marginBottom: 8 }}>HEALTH PILLAR</div>
      <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', lineHeight: 1.2, marginBottom: 8 }}>
        Streamline your <span style={{ color: '#10B981' }}>Bio Telemetry.</span>
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: 320, margin: '0 auto' }}>
        Log water, monitor sleep cycles, calculate heart rate variability / recovery, and track energy levels to prevent burnout.
      </div>
    </div>
  </div>
)

// ─── Slide 4: Capital Runway (Wealth) ─────────────────────────────────────────
const Slide4 = () => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, paddingBottom: 4 }}>
    {/* Capital status design */}
    <div style={{
      width: '100%', maxWidth: 300, background: 'linear-gradient(145deg, #0A0A14 0%, #0E0E1A 100%)',
      border: '1px solid #1A1A2A', borderRadius: 20, padding: '20px', textAlign: 'center',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)', flexShrink: 0
    }}>
      <div style={{ fontSize: 8, color: 'var(--text-muted)', letterSpacing: '2px', fontWeight: 800, textTransform: 'uppercase', marginBottom: 6 }}>CAPITAL RUNWAY</div>
      <div style={{ fontSize: 28, fontWeight: 900, color: '#F59E0B', letterSpacing: '-0.5px' }}>12.4 Months</div>
      <div style={{ fontSize: 11, color: 'var(--text-primary)', marginTop: 8, fontWeight: 600 }}>Liquid Cash: $18,450</div>
      <div style={{ height: 1, background: '#1A1A2A', margin: '14px 0' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)' }}>
        <span>Monthly Budget: $1,500</span>
        <span style={{ color: '#10B981' }}>Within Target ✓</span>
      </div>
    </div>

    {/* Text */}
    <div style={{ width: '100%', textAlign: 'center' }}>
      <div style={{ fontSize: 9, color: '#F59E0B', fontWeight: 800, letterSpacing: '2.5px', textTransform: 'uppercase', marginBottom: 8 }}>WEALTH PILLAR</div>
      <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', lineHeight: 1.2, marginBottom: 8 }}>
        Control your <span style={{ color: '#F59E0B' }}>Capital Runway.</span>
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: 320, margin: '0 auto' }}>
        Log expenses instantly, track recurring billing cycles, calculate exact financial runway, and build disciplined budgeting habits.
      </div>
    </div>
  </div>
)

// ─── Slide 5: Ready for launch ─────────────────────────────────────────────────
const Slide5 = () => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, paddingBottom: 4 }}>
    {/* Glowing logo / welcome icon */}
    <div style={{
      width: 76, height: 76, borderRadius: '50%',
      background: 'radial-gradient(circle, rgba(0,245,212,0.15) 0%, transparent 70%)',
      border: '2px solid #00f5d4',
      boxShadow: '0 0 36px rgba(0,245,212,0.4), inset 0 0 16px rgba(0,245,212,0.1)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 32, flexShrink: 0,
    }}>
      🚀
    </div>

    {/* Text */}
    <div style={{ width: '100%', textAlign: 'center' }}>
      <div style={{ fontSize: 9, color: '#00f5d4', fontWeight: 800, letterSpacing: '3px', textTransform: 'uppercase', marginBottom: 8 }}>SYSTEM INITIALIZED</div>
      <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: '-0.5px', marginBottom: 10 }}>
        Ready for <span style={{ color: '#00f5d4' }}>Launch.</span>
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: 290, margin: '0 auto' }}>
        Welcome to your new daily briefing command center. Commit to consistency, reduce gravity, and level up your execution.
      </div>
    </div>
  </div>
)

// ─── Main ──────────────────────────────────────────────────────────────────────
export default function OnboardingScreen({ onComplete }) {
  const [slide, setSlide] = useState(0)
  const TOTAL = 5
  const slides = [Slide1, Slide2, Slide3, Slide4, Slide5]
  const SlideContent = slides[slide]

  const next = () => {
    if (slide < TOTAL - 1) setSlide(s => s + 1)
    else onComplete()
  }

  const isLast = slide === TOTAL - 1

  return (
    <Slide
      slide={slide} total={TOTAL}
      onSkip={onComplete} onNext={next}
      btnLabel={isLast ? 'Start My Journey 🚀' : 'Continue →'}
      gradient={isLast}
    >
      <SlideContent />
    </Slide>
  )
}
