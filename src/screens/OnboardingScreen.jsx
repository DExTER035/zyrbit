import React, { useState } from 'react'

const CYAN = '#00f5d4'
const BG = '#000'

// ── Progress dots ──────────────────────────────────────────────────────────────
const Dots = ({ current, total }) => (
  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
    {Array.from({ length: total }, (_, i) => {
      const active = i === current
      return (
        <div key={i} style={{
          height: 3, borderRadius: 99,
          width: active ? 22 : 12,
          background: active ? CYAN : '#1e1e1e',
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
    width: '100%', border: 'none', borderRadius: 12,
    padding: '13px', fontSize: 11, fontWeight: 800,
    cursor: 'pointer', letterSpacing: '1.5px',
    background: gradient ? 'linear-gradient(90deg, #00f5d4, #00c4a8)' : CYAN,
    color: '#000',
    boxShadow: gradient
      ? '0 0 30px rgba(0,245,212,0.4), 0 4px 16px rgba(0,245,212,0.22)'
      : '0 0 20px rgba(0,245,212,0.3), 0 4px 10px rgba(0,245,212,0.18)',
    fontFamily: 'inherit',
    flexShrink: 0,
  }}
    onTouchStart={e => e.currentTarget.style.transform = 'scale(0.97)'}
    onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}
  >{children}</button>
)

// ── Slide shell — fixed full-screen, flex column ───────────────────────────────
const Slide = ({ children, onSkip, onNext, slide, total, btnLabel, gradient }) => (
  <div style={{
    position: 'fixed', inset: 0, background: BG,
    display: 'flex', flexDirection: 'column',
    padding: '16px 20px 20px',
    boxSizing: 'border-box',
    fontFamily: "'Inter', system-ui, sans-serif",
    overflow: 'hidden',
  }}>
    {/* Top bar — fixed height */}
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      marginBottom: 14, flexShrink: 0, height: 28,
    }}>
      <Dots current={slide} total={total} />
      {slide < total - 1 && (
        <button onClick={onSkip} style={{
          background: 'none', border: 'none', color: '#2a2a2a',
          fontSize: 8, letterSpacing: '1px', textTransform: 'uppercase',
          cursor: 'pointer', padding: 0, fontFamily: 'inherit',
        }}>SKIP</button>
      )}
    </div>

    {/* Scrollable content middle — grows to fill remaining space */}
    <div style={{
      flex: 1, minHeight: 0,
      overflowY: 'auto', overflowX: 'hidden',
      display: 'flex', flexDirection: 'column',
      gap: 0,
      // hide scrollbar but allow scroll
      msOverflowStyle: 'none', scrollbarWidth: 'none',
    }}>
      {children}
    </div>

    {/* Button — fixed at bottom */}
    <div style={{ flexShrink: 0, marginTop: 14 }}>
      <CyanBtn onClick={onNext} gradient={gradient}>{btnLabel}</CyanBtn>
    </div>
  </div>
)

// ─── Slide 1: Gravity ──────────────────────────────────────────────────────────
const Slide1 = () => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, paddingBottom: 4 }}>

    {/* Planet + Saturn rings */}
    <div style={{ position: 'relative', width: 150, height: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <div style={{ position: 'absolute', width: 140, height: 36, borderRadius: '50%', border: '1.5px solid rgba(0,245,212,0.2)' }} />
      <div style={{ position: 'absolute', width: 118, height: 30, borderRadius: '50%', border: '1.5px solid rgba(0,245,212,0.3)' }} />
      <div style={{
        width: 72, height: 72, borderRadius: '50%', position: 'relative', zIndex: 1,
        background: 'radial-gradient(circle at 40% 35%, rgba(0,245,212,0.2) 0%, #001a15 40%, #000 100%)',
        border: '2px solid rgba(0,245,212,0.28)',
        boxShadow: '0 0 24px rgba(0,245,212,0.22), 0 0 48px rgba(0,245,212,0.07)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: 20, fontWeight: 900, color: CYAN, lineHeight: 1, textShadow: `0 0 10px ${CYAN}` }}>84</span>
        <span style={{ fontSize: 6, color: CYAN, letterSpacing: '2px', marginTop: 2, fontWeight: 700 }}>GRAVITY</span>
      </div>
      <div style={{
        position: 'absolute', right: 4, top: '50%', marginTop: -3,
        width: 7, height: 7, borderRadius: '50%', background: CYAN,
        boxShadow: `0 0 10px ${CYAN}, 0 0 20px ${CYAN}88`, zIndex: 2,
      }} />
    </div>

    {/* Orbit trail */}
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, flexShrink: 0 }}>
      <div style={{ display: 'flex', gap: 4 }}>
        {[0,1,2,3,4,5,6,7,8,9].map(i => {
          const filled = [0,1,2,4,5].includes(i)
          const orange = i === 3
          return (
            <div key={i} style={{
              width: 7, height: 7, borderRadius: '50%',
              background: orange ? 'rgba(255,107,53,0.55)' : filled ? CYAN : '#111',
              border: (filled || orange) ? 'none' : '1px solid #1a1a1a',
              boxShadow: filled ? `0 0 5px ${CYAN}88` : 'none',
            }} />
          )
        })}
      </div>
      <div style={{ fontSize: 6, color: '#1e1e1e', letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: 700 }}>
        ORBIT TRAIL — 10 DAY VIEW
      </div>
    </div>

    {/* 3 stat tiles */}
    <div style={{ display: 'flex', gap: 6, width: '100%', flexShrink: 0 }}>
      {[
        { label: 'STREAK',    val: '7',   color: '#ff9900', bg: '#0f0800', border: 'rgba(255,153,0,0.2)' },
        { label: 'DONE TODAY',val: '6/8', color: CYAN,      bg: '#00100d', border: 'rgba(0,245,212,0.13)' },
        { label: 'DAYS',      val: '21',  color: '#8899ff', bg: '#0a0a18', border: 'rgba(136,153,255,0.13)' },
      ].map(s => (
        <div key={s.label} style={{
          flex: 1, background: s.bg, border: `1px solid ${s.border}`,
          borderRadius: 10, padding: '8px 4px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 15, fontWeight: 900, color: s.color, textShadow: `0 0 9px ${s.color}99`, lineHeight: 1 }}>{s.val}</div>
          <div style={{ fontSize: 6, color: '#333', letterSpacing: '0.5px', marginTop: 3, fontWeight: 700 }}>{s.label}</div>
        </div>
      ))}
    </div>

    {/* Text */}
    <div style={{ width: '100%' }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', lineHeight: 1.3, marginBottom: 6 }}>
        Your habits have <span style={{ color: CYAN }}>gravity.</span>
      </div>
      <div style={{ fontSize: 9, color: '#444', lineHeight: 1.6 }}>
        Every habit completed raises your Gravity Score. Miss a day and it falls. Track every step on your Orbit Trail.
      </div>
    </div>
  </div>
)

// ─── Slide 2: Build your Orbit ─────────────────────────────────────────────────
const Slide2 = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 4 }}>

    {/* 2×2 zone pills */}
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
      {[
        { emoji: '🧠', label: 'Mind',   bg: '#0c0c22', border: 'rgba(51,68,221,0.2)',   color: '#8899ff' },
        { emoji: '💪', label: 'Body',   bg: '#0c1c0c', border: 'rgba(51,187,34,0.2)',   color: '#55ee66' },
        { emoji: '🚀', label: 'Growth', bg: '#1c0c0c', border: 'rgba(221,51,51,0.2)',   color: '#ff7766' },
        { emoji: '🌙', label: 'Soul',   bg: '#1c1c0c', border: 'rgba(221,187,34,0.2)', color: '#ffcc55' },
      ].map(z => (
        <div key={z.label} style={{
          background: z.bg, border: `1px solid ${z.border}`,
          borderRadius: 9, padding: '8px 10px',
          fontSize: 9, fontWeight: 600, color: z.color,
        }}>
          {z.emoji} {z.label}
        </div>
      ))}
    </div>

    {/* Habit cards */}
    {[
      { icon: '🚿', name: 'Cold Shower',   streak: '🔥 5 streak', time: '⏰ 6:45 AM', done: true,  bg: '#00100d', border: 'rgba(0,245,212,0.1)' },
      { icon: '📖', name: 'Read 20 Pages', streak: '🔥 3 streak', time: '⏰ 9:15 PM', done: false, bg: '#080808', border: '#141414' },
    ].map(h => (
      <div key={h.name} style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: h.bg, border: `1px solid ${h.border}`,
        borderRadius: 9, padding: '10px 12px',
      }}>
        <span style={{ fontSize: 18, flexShrink: 0 }}>{h.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 3 }}>{h.name}</div>
          <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 9, color: '#ff9900', fontWeight: 600 }}>{h.streak}</span>
            <span style={{ fontSize: 8, color: '#553300', background: '#1a0e00', border: '1px solid #331800', borderRadius: 4, padding: '1px 5px', fontWeight: 600 }}>{h.time}</span>
          </div>
        </div>
        <div style={{
          width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
          background: h.done ? CYAN : 'transparent',
          border: h.done ? 'none' : '2px solid #222',
          boxShadow: h.done ? `0 0 10px ${CYAN}88` : 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {h.done && <span style={{ fontSize: 11, color: '#000', fontWeight: 900 }}>✓</span>}
        </div>
      </div>
    ))}

    {/* Text */}
    <div>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', lineHeight: 1.3, marginBottom: 6 }}>
        Build your <span style={{ color: CYAN }}>Orbit.</span>
      </div>
      <div style={{ fontSize: 9, color: '#444', lineHeight: 1.6 }}>
        Create habits across Mind, Body, Growth and Soul. Set best-before times, track streaks and never break the chain.
      </div>
    </div>
  </div>
)

// ─── Slide 3: Rise together ────────────────────────────────────────────────────
const Slide3 = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 4 }}>

    <div style={{ fontSize: 6.5, color: '#222', letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: 700 }}>🏆 GLOBAL LEADERBOARD</div>

    {[
      { rank: '1', name: 'silent.grind', pts: '247 pts', rankColor: '#ffd700', bg: '#080808', border: '#141414', you: false },
      { rank: '2', name: 'd3xter_',      pts: '198 pts', rankColor: '#c0c0c0', bg: '#080808', border: '#141414', you: false },
      { rank: '3', name: 'you',          pts: '156 pts', rankColor: CYAN,      bg: '#00100d', border: 'rgba(0,245,212,0.25)', you: true },
      { rank: '4', name: 'wizz',         pts: '120 pts', rankColor: '#444',    bg: '#080808', border: '#141414', you: false },
    ].map(r => (
      <div key={r.rank} style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: r.bg, border: `1px solid ${r.border}`,
        borderRadius: 9, padding: '8px 10px',
        boxShadow: r.you ? '0 0 12px rgba(0,245,212,0.08)' : 'none',
      }}>
        <span style={{ fontSize: 11, fontWeight: 900, color: r.rankColor, width: 14, textAlign: 'center' }}>{r.rank}</span>
        <div style={{
          width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
          background: r.you ? 'rgba(0,245,212,0.12)' : '#111',
          border: `1px solid ${r.you ? 'rgba(0,245,212,0.3)' : '#1a1a1a'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11,
        }}>
          {r.you ? '⭐' : r.name.charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1, fontSize: 11, fontWeight: 700, color: r.you ? CYAN : '#aaa' }}>{r.name}</div>
        <div style={{ fontSize: 10, fontWeight: 800, color: r.you ? CYAN : '#333' }}>{r.pts}</div>
      </div>
    ))}

    {/* Friend Battle */}
    <div style={{
      background: '#09091a', border: '1px solid rgba(51,68,170,0.27)',
      borderRadius: 10, padding: '10px 12px',
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
        {['A','B'].map((l, i) => (
          <div key={i} style={{
            width: 22, height: 22, borderRadius: '50%',
            background: '#1a1a2e', border: '1px solid #2a2a4a',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 9, color: '#8899ff', fontWeight: 700,
          }}>{l}</div>
        ))}
        <span style={{ fontSize: 9, color: '#333', fontWeight: 800, marginLeft: 3 }}>VS</span>
      </div>
      <div>
        <div style={{ fontSize: 10, fontWeight: 800, color: '#8899ff', marginBottom: 2 }}>⚔️ Friend Battle Mode</div>
        <div style={{ fontSize: 8, color: '#333', lineHeight: 1.4 }}>Challenge friends. Compete on habits. Rise together.</div>
      </div>
    </div>

    {/* Text */}
    <div>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', lineHeight: 1.3, marginBottom: 6 }}>
        Rise <span style={{ color: CYAN }}>together.</span>
      </div>
      <div style={{ fontSize: 9, color: '#444', lineHeight: 1.6 }}>
        Compete on global leaderboards, challenge friends to habit battles and climb the ranks. Accountability hits different.
      </div>
    </div>
  </div>
)

// ─── Slide 4: More than a tracker ─────────────────────────────────────────────
const Slide4 = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 4 }}>

    {/* Large card */}
    <div style={{
      background: '#08080f', border: '1px solid #1a2255',
      borderRadius: 11, padding: '12px',
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <span style={{ fontSize: 22, flexShrink: 0 }}>📓</span>
      <div>
        <div style={{ fontSize: 12, fontWeight: 800, color: '#fff', marginBottom: 4 }}>Daily Journal</div>
        <div style={{ fontSize: 8, color: '#3a3a3a', lineHeight: 1.5 }}>Reflect on your day. One honest entry a night. Watch your mindset shift over 21 days.</div>
      </div>
    </div>

    {/* 2 smaller cards */}
    <div style={{ display: 'flex', gap: 8 }}>
      <div style={{ flex: 1, background: '#00100d', border: '1px solid rgba(0,245,212,0.1)', borderRadius: 11, padding: '10px' }}>
        <div style={{ fontSize: 18, marginBottom: 5 }}>🏁</div>
        <div style={{ fontSize: 11, fontWeight: 800, color: '#fff', marginBottom: 3 }}>Challenges</div>
        <div style={{ fontSize: 7.5, color: '#3a3a3a', lineHeight: 1.45, marginBottom: 7 }}>Commit to a streak and prove it.</div>
        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          {['7 days','21 days','30 days'].map(t => (
            <span key={t} style={{
              fontSize: 6, color: CYAN,
              border: `1px solid rgba(0,245,212,0.3)`,
              borderRadius: 4, padding: '2px 5px',
              background: 'rgba(0,245,212,0.04)', fontWeight: 700,
            }}>{t}</span>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, background: '#080808', border: '1px solid #141414', borderRadius: 11, padding: '10px' }}>
        <div style={{ fontSize: 18, marginBottom: 5 }}>📊</div>
        <div style={{ fontSize: 11, fontWeight: 800, color: '#fff', marginBottom: 3 }}>Weekly Stats</div>
        <div style={{ fontSize: 7.5, color: '#3a3a3a', lineHeight: 1.45 }}>See your completion rate and best streak every week.</div>
      </div>
    </div>

    {/* Text */}
    <div>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', lineHeight: 1.3, marginBottom: 6 }}>
        More than a <span style={{ color: CYAN }}>tracker.</span>
      </div>
      <div style={{ fontSize: 9, color: '#444', lineHeight: 1.6 }}>
        Journal your growth, commit to challenges and review your weekly stats — all inside one orbit.
      </div>
    </div>
  </div>
)

// ─── Slide 5: Ready for launch ─────────────────────────────────────────────────
const Slide5 = () => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, paddingBottom: 4 }}>

    {/* Rocket icon */}
    <div style={{
      width: 68, height: 68, borderRadius: '50%',
      background: 'rgba(0,245,212,0.04)',
      border: '2px solid rgba(0,245,212,0.2)',
      boxShadow: '0 0 36px rgba(0,245,212,0.12), 0 0 70px rgba(0,245,212,0.05)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 26, flexShrink: 0,
    }}>
      🚀
    </div>

    <div style={{ fontSize: 8.5, color: '#2a2a2a', textAlign: 'center', fontWeight: 500 }}>
      Everything you need. All in one orbit.
    </div>

    {/* 2×2 feature grid */}
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, width: '100%' }}>
      {[
        { icon: '🪐', name: 'Gravity Score', desc: 'Track your rise',  border: 'rgba(0,245,212,0.13)' },
        { icon: '⚔️', name: 'Friend Battles', desc: 'Compete & rise',  border: 'rgba(136,153,255,0.2)' },
        { icon: '📓', name: 'Daily Journal',  desc: 'Reflect & grow',  border: 'rgba(255,204,85,0.2)' },
        { icon: '🏁', name: 'Challenges',     desc: '7, 21, 30 days', border: 'rgba(255,153,0,0.2)' },
      ].map(f => (
        <div key={f.name} style={{
          background: '#080808', border: `1px solid ${f.border}`,
          borderRadius: 10, padding: '11px 8px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 18, marginBottom: 5 }}>{f.icon}</div>
          <div style={{ fontSize: 8.5, fontWeight: 800, color: '#fff', marginBottom: 3 }}>{f.name}</div>
          <div style={{ fontSize: 7, color: '#333' }}>{f.desc}</div>
        </div>
      ))}
    </div>

    {/* Text */}
    <div style={{ width: '100%', textAlign: 'center' }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', lineHeight: 1.3, marginBottom: 6 }}>
        Ready for <span style={{ color: CYAN }}>launch.</span>
      </div>
      <div style={{ fontSize: 9, color: '#444', lineHeight: 1.6 }}>
        Your first orbit begins the moment you tap below. Show up every day and watch gravity do its thing.
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
