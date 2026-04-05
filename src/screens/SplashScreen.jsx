import React, { useState } from 'react'

const generateStars = () =>
  Array.from({ length: 28 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    top: Math.random() * 100,
    size: Math.random() * 1.6 + 0.5,
    lo: 0.08 + Math.random() * 0.12,
    hi: 0.28 + Math.random() * 0.3,
    dur: 2 + Math.random() * 2,
    delay: Math.random() * 4,
    cyan: Math.random() > 0.72,
  }))

export default function SplashScreen({ onGetStarted, onLogin }) {
  const [stars] = useState(generateStars)

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#000',
      overflow: 'hidden', zIndex: 9999,
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      <style>{`
        @keyframes twinkleStar {
          0%, 100% { opacity: var(--lo); transform: scale(1); }
          50% { opacity: var(--hi); transform: scale(1.35); }
        }
        @keyframes splashBtnHover {
          from { box-shadow: 0 0 40px rgba(0,245,212,0.4), 0 8px 24px rgba(0,245,212,0.2); }
          to   { box-shadow: 0 0 56px rgba(0,245,212,0.55), 0 8px 32px rgba(0,245,212,0.3); }
        }
      `}</style>

      {/* Stars */}
      {stars.map(s => (
        <div key={s.id} style={{
          position: 'absolute',
          left: `${s.left}%`, top: `${s.top}%`,
          width: `${s.size}px`, height: `${s.size}px`,
          borderRadius: '50%',
          background: s.cyan ? '#00f5d4' : '#fff',
          '--lo': s.lo, '--hi': s.hi,
          animation: `twinkleStar ${s.dur}s ${s.delay}s infinite ease-in-out`,
          pointerEvents: 'none',
        }} />
      ))}

      {/* Orbit rings SVG — centered at 38% from top */}
      <div style={{
        position: 'absolute', top: '38%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 320, height: 130, pointerEvents: 'none', zIndex: 1,
      }}>
        <svg width="320" height="130" viewBox="0 0 320 130" overflow="visible">
          <defs>
            <filter id="sdg" x="-200%" y="-200%" width="500%" height="500%">
              <feGaussianBlur stdDeviation="4" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <path id="sop" d="M 315 65 A 155 62 0 1 0 5 65 A 155 62 0 1 0 315 65" />
          </defs>
          <ellipse cx="160" cy="65" rx="155" ry="62" stroke="#00f5d4" strokeWidth="0.7" fill="none" opacity="0.07" />
          <ellipse cx="160" cy="65" rx="113" ry="45" stroke="#00f5d4" strokeWidth="0.8" fill="none" opacity="0.11" />
          <ellipse cx="160" cy="65" rx="72"  ry="29" stroke="#00f5d4" strokeWidth="1"   fill="none" opacity="0.17" />
          <circle r="4.5" fill="#00f5d4" filter="url(#sdg)">
            <animateMotion dur="10s" repeatCount="indefinite">
              <mpath href="#sop" />
            </animateMotion>
          </circle>
        </svg>
      </div>

      {/* Logo — sits on top of rings, same center point */}
      <div style={{
        position: 'absolute', top: '38%', left: '50%',
        transform: 'translate(-50%, -50%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 10, zIndex: 2,
      }}>
        {/* Z icon */}
        <div style={{
          width: 62, height: 62, borderRadius: '50%',
          border: '1.5px solid rgba(0,245,212,0.35)',
          background: 'radial-gradient(circle, rgba(0,245,212,0.06) 0%, transparent 70%)',
          boxShadow: '0 0 28px rgba(0,245,212,0.08), inset 0 0 18px rgba(0,245,212,0.05)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{
            fontSize: 30, fontWeight: 900, color: '#00f5d4', lineHeight: 1,
            textShadow: '0 0 18px rgba(0,245,212,0.9), 0 0 40px rgba(0,245,212,0.45)',
            userSelect: 'none',
          }}>Z</span>
        </div>

        {/* Wordmark */}
        <div style={{ fontSize: 30, fontWeight: 700, lineHeight: 1, letterSpacing: '-0.5px', whiteSpace: 'nowrap' }}>
          <span style={{ color: '#fff' }}>Zyr</span>
          <span style={{ color: '#00f5d4' }}>bit</span>
        </div>

        {/* Tagline */}
        <div style={{
          fontSize: 7, letterSpacing: '3px', textTransform: 'uppercase',
          color: 'rgba(0,245,212,0.35)', fontWeight: 600,
          textAlign: 'center', whiteSpace: 'nowrap',
        }}>
          BUILD HABITS THAT BREAK GRAVITY
        </div>
      </div>

      {/* Bottom buttons */}
      <div style={{
        position: 'absolute', bottom: 28, left: 22, right: 22,
        display: 'flex', flexDirection: 'column', gap: 10, zIndex: 2,
      }}>
        <button onClick={onGetStarted} style={{
          width: '100%', background: '#00f5d4', color: '#000',
          border: 'none', borderRadius: 14, padding: '14px',
          fontSize: 14, fontWeight: 800, letterSpacing: '2px', cursor: 'pointer',
          boxShadow: '0 0 40px rgba(0,245,212,0.4), 0 8px 24px rgba(0,245,212,0.22)',
          transition: 'transform 0.15s, box-shadow 0.15s',
          fontFamily: 'inherit',
        }}
          onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
          onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
          onTouchStart={e => e.currentTarget.style.transform = 'scale(0.97)'}
          onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          🚀 GET STARTED
        </button>
        <button onClick={onLogin} style={{
          width: '100%', background: 'transparent', color: '#fff',
          border: '1.5px solid #1e1e1e', borderRadius: 14, padding: '13px',
          fontSize: 11, fontWeight: 700, cursor: 'pointer',
          transition: 'border-color 0.2s',
          fontFamily: 'inherit',
        }}>
          I already have an account
        </button>
      </div>
    </div>
  )
}
