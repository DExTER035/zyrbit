import React, { useState, useEffect } from 'react'
import { ZyrbitMark } from '../components/Logo.jsx'

const CYAN = '#5EE6F5'

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
  // phase: 0=start, 1=logo in, 2=welcome text, 3=name, 4=day1, 5=rocket, 6=fade out

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 1000), // accelerated ringless phase
      setTimeout(() => setPhase(2), 1800),
      setTimeout(() => setPhase(3), 2600),
      setTimeout(() => setPhase(4), 3400),
      setTimeout(() => setPhase(5), 4200),
      setTimeout(() => setPhase(6), 4800),
      setTimeout(() => onComplete(), 5400),
    ]
    return () => timers.forEach(clearTimeout)
  }, [onComplete])

  const firstName = (userName || 'Builder').split(' ')[0]

  const fadeIn = (fromPhase, delay = '0s') => ({
    opacity: phase >= fromPhase ? 1 : 0,
    transform: phase >= fromPhase ? 'translateY(0)' : 'translateY(14px)',
    transition: `opacity 0.6s ${delay}, transform 0.6s ${delay}`,
  })

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#121214',
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
        {/* Logo container */}
        <div style={{
          position: 'relative',
          width: 200, height: 200,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          {/* Z Logo — pops in at phase 1 */}
          <div style={{
            position: 'relative', zIndex: 2,
            animation: phase >= 1 ? 'popIn 0.5s ease forwards' : 'none',
            opacity: phase >= 1 ? 1 : 0,
          }}>
            <ZyrbitMark size={64} variant="default" />
          </div>
        </div>

        {/* Text stack — spaced below the logo container */}
        <div style={{
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: 0,
          width: '100%', paddingLeft: 24, paddingRight: 24,
          boxSizing: 'border-box',
          marginTop: -12,
        }}>
          {/* "Welcome to Zyrbit," */}
          <div style={{
            fontSize: 13, color: 'var(--text-muted)',
            fontWeight: 500, letterSpacing: '0.3px',
            marginBottom: 10,
            ...fadeIn(2),
          }}>
            Welcome to Zyrbit,
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
          position: 'absolute', inset: 0, background: '#121214', zIndex: 10,
          animation: 'fadeToBlack 0.5s ease forwards',
        }} />
      )}
    </div>
  )
}
