import React, { useState, useEffect } from 'react'

const CYAN = '#00f5d4'

const genStars = () =>
  Array.from({ length: 32 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    top: Math.random() * 100,
    size: Math.random() * 1.4 + 0.5,
    lo: 0.06 + Math.random() * 0.1,
    hi: 0.22 + Math.random() * 0.25,
    dur: 2 + Math.random() * 2.5,
    delay: Math.random() * 5,
    cyan: Math.random() > 0.7,
  }))

export default function WelcomeAnimation({ userName, onComplete }) {
  const [stars] = useState(genStars)
  const [phase, setPhase] = useState(0)
  // phase: 0=rings drawing, 1=logo in, 2=welcome text, 3=name, 4=day1, 5=rocket, 6=fade out

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 2400),
      setTimeout(() => setPhase(2), 3200),
      setTimeout(() => setPhase(3), 4000),
      setTimeout(() => setPhase(4), 4800),
      setTimeout(() => setPhase(5), 5600),
      setTimeout(() => setPhase(6), 6200),
      setTimeout(() => onComplete(), 6800),
    ]
    return () => timers.forEach(clearTimeout)
  }, [onComplete])

  const firstName = (userName || 'Astronaut').split(' ')[0]

  // Ring circumferences
  const r1 = 130, r2 = 92, r3 = 56
  const c1 = Math.round(2 * Math.PI * r1)
  const c2 = Math.round(2 * Math.PI * r2)
  const c3 = Math.round(2 * Math.PI * r3)

  const fadeIn = (fromPhase, delay = '0s') => ({
    opacity: phase >= fromPhase ? 1 : 0,
    transform: phase >= fromPhase ? 'translateY(0)' : 'translateY(14px)',
    transition: `opacity 0.6s ${delay}, transform 0.6s ${delay}`,
  })

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#000',
      overflow: 'hidden', zIndex: 9999,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      <style>{`
        @keyframes twinkleW {
          0%,100% { opacity: var(--lo); transform: scale(1); }
          50% { opacity: var(--hi); transform: scale(1.3); }
        }
        @keyframes drawRing1 {
          from { stroke-dashoffset: ${c1}; }
          to   { stroke-dashoffset: 0; }
        }
        @keyframes drawRing2 {
          from { stroke-dashoffset: ${c2}; }
          to   { stroke-dashoffset: 0; }
        }
        @keyframes drawRing3 {
          from { stroke-dashoffset: ${c3}; }
          to   { stroke-dashoffset: 0; }
        }
        @keyframes popIn {
          0%   { transform: scale(0.3); opacity: 0; }
          70%  { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1);   opacity: 1; }
        }
        @keyframes rocketLaunch {
          0%   { transform: translateY(0) scale(1);   opacity: 1; }
          100% { transform: translateY(-90px) scale(0.7); opacity: 0; }
        }
        @keyframes fadeToBlack {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>

      {/* Stars */}
      {stars.map(s => (
        <div key={s.id} style={{
          position: 'absolute',
          left: `${s.left}%`, top: `${s.top}%`,
          width: `${s.size}px`, height: `${s.size}px`,
          borderRadius: '50%', pointerEvents: 'none',
          background: s.cyan ? CYAN : '#fff',
          '--lo': s.lo, '--hi': s.hi,
          animation: `twinkleW ${s.dur}s ${s.delay}s infinite ease-in-out`,
        }} />
      ))}

      {/* Content column */}
      <div style={{
        position: 'relative', zIndex: 3,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 0,
        width: '100%', paddingTop: 20,
      }}>
        {/* Ring + Logo container */}
        <div style={{
          position: 'relative',
          width: 280, height: 280,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          {/* SVG rings */}
          <svg
            width="280" height="280"
            viewBox="0 0 280 280"
            style={{ position: 'absolute', inset: 0, overflow: 'visible' }}
          >
            <circle cx="140" cy="140" r={r1}
              stroke={CYAN} strokeWidth="1" fill="none" opacity="0.18"
              strokeDasharray={c1} strokeDashoffset={c1}
              style={{ animation: 'drawRing1 1.2s 0.5s ease forwards' }}
            />
            <circle cx="140" cy="140" r={r2}
              stroke={CYAN} strokeWidth="1.2" fill="none" opacity="0.28"
              strokeDasharray={c2} strokeDashoffset={c2}
              style={{ animation: 'drawRing2 1s 1.1s ease forwards' }}
            />
            <circle cx="140" cy="140" r={r3}
              stroke={CYAN} strokeWidth="1.5" fill="none" opacity="0.4"
              strokeDasharray={c3} strokeDashoffset={c3}
              style={{ animation: 'drawRing3 0.8s 1.8s ease forwards' }}
            />
          </svg>

          {/* Z Logo — pops in at phase 1 */}
          <div style={{
            position: 'relative', zIndex: 2,
            animation: phase >= 1 ? 'popIn 0.5s ease forwards' : 'none',
            opacity: phase >= 1 ? 1 : 0,
          }}>
            <div style={{
              width: 70, height: 70, borderRadius: '50%',
              border: `2px solid rgba(0,245,212,0.4)`,
              background: 'radial-gradient(circle, rgba(0,245,212,0.08) 0%, transparent 70%)',
              boxShadow: `0 0 30px rgba(0,245,212,0.2), 0 0 60px rgba(0,245,212,0.08)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{
                fontSize: 34, fontWeight: 900, color: CYAN,
                textShadow: `0 0 20px ${CYAN}, 0 0 40px ${CYAN}66`,
                lineHeight: 1, userSelect: 'none',
              }}>Z</span>
            </div>
          </div>
        </div>

        {/* Text stack — spaced below the ring container */}
        <div style={{
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: 0,
          width: '100%', paddingLeft: 24, paddingRight: 24,
          boxSizing: 'border-box',
          marginTop: -12,
        }}>
          {/* "Welcome to your orbit," */}
          <div style={{
            fontSize: 13, color: 'rgba(255,255,255,0.45)',
            fontWeight: 500, letterSpacing: '0.3px',
            marginBottom: 10,
            ...fadeIn(2),
          }}>
            Welcome to your orbit,
          </div>

          {/* User name */}
          <div style={{
            fontSize: 38, fontWeight: 900, color: '#fff',
            letterSpacing: '-1.5px', lineHeight: 1,
            textAlign: 'center',
            marginBottom: 14,
            ...fadeIn(3),
          }}>
            {firstName}
          </div>

          {/* "Day 1 begins now." */}
          <div style={{
            fontSize: 12, color: CYAN, fontWeight: 600,
            letterSpacing: '1px',
            marginBottom: 40,
            textShadow: `0 0 16px ${CYAN}88`,
            ...fadeIn(4),
          }}>
            Day 1 begins now.
          </div>

          {/* Rocket */}
          <div style={{
            fontSize: 30,
            opacity: phase >= 5 ? 1 : 0,
            animation: phase >= 5 ? 'rocketLaunch 1s 0.1s ease forwards' : 'none',
          }}>
            🚀
          </div>
        </div>
      </div>

      {/* Black fade-out overlay */}
      {phase >= 6 && (
        <div style={{
          position: 'absolute', inset: 0, background: '#000', zIndex: 10,
          animation: 'fadeToBlack 0.5s ease forwards',
        }} />
      )}
    </div>
  )
}
