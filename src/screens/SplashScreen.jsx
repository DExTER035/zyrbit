import React, { useState, useEffect } from 'react'

export default function SplashScreen({ onComplete }) {
  const [stars, setStars] = useState([])
  const [phase, setPhase] = useState(0) // 0=loading, 1=complete (fade out)

  useEffect(() => {
    const s = Array.from({ length: 80 }, (_, i) => ({
      id: i,
      size: Math.random() * 1.8 + 0.4,
      left: Math.random() * 100,
      top: Math.random() * 100,
      duration: 2 + Math.random() * 4,
      delay: Math.random() * 4,
      lo: 0.04 + Math.random() * 0.08,
      hi: 0.3 + Math.random() * 0.5,
    }))
    setStars(s)

    // Start fade-out at 4.8s, call onComplete at 5.6s
    const t1 = setTimeout(() => setPhase(1), 4800)
    const t2 = setTimeout(() => onComplete?.(), 5600)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#000',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', zIndex: 9999,
      opacity: phase === 1 ? 0 : 1,
      transition: 'opacity 0.8s ease',
    }}>
      {/* Stars */}
      {stars.map(s => (
        <div key={s.id} style={{
          position: 'absolute',
          width: s.size, height: s.size,
          left: `${s.left}%`, top: `${s.top}%`,
          borderRadius: '50%', background: '#fff',
          '--lo': s.lo, '--hi': s.hi,
          animation: `twinkle ${s.duration}s ${s.delay}s infinite ease-in-out alternate`,
        }} />
      ))}

      {/* Ambient glow */}
      <div style={{
        position: 'absolute', width: 220, height: 220, borderRadius: '50%',
        background: 'radial-gradient(circle, #00e5cc14 0%, transparent 70%)',
        opacity: 0,
        animation: 'ambientIn 1.2s 0.2s forwards ease',
        pointerEvents: 'none',
      }} />

      {/* Logo SVG — animated build */}
      <svg width="108" height="108" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg"
        style={{ position: 'relative' }}>

        {/* Ghost rings */}
        <ellipse cx="48" cy="48" rx="31" ry="12" stroke="#00e5cc" strokeWidth="0.6" fill="none" opacity="0.08"/>
        <ellipse cx="48" cy="48" rx="12" ry="31" stroke="#00e5cc" strokeWidth="0.6" fill="none" opacity="0.08"/>

        {/* Step 1: Horizontal arc draws */}
        <path d="M17 48 A31 12 0 0 1 79 48"
          stroke="#00e5cc" strokeWidth="2.2" strokeLinecap="round" fill="none"
          strokeDasharray="200" strokeDashoffset="200"
          style={{ animation: 'drawRing 0.9s 0.4s ease forwards' }}/>

        {/* Step 2: Vertical arc draws */}
        <path d="M48 17 A12 31 0 0 1 48 79"
          stroke="#00e5cc" strokeWidth="2.2" strokeLinecap="round" fill="none"
          strokeDasharray="200" strokeDashoffset="200"
          style={{ animation: 'drawRing 0.9s 0.7s ease forwards' }}/>

        {/* Step 3: Three dots pop in */}
        <circle cx="48" cy="17" r="4.5" fill="#ffffff"
          style={{ transformOrigin:'48px 17px', transform:'scale(0)', opacity:0,
            animation: 'popDot 0.4s cubic-bezier(0.34,1.56,0.64,1) 1.3s forwards' }}/>
        <circle cx="17" cy="48" r="3.8" fill="#ffffff"
          style={{ transformOrigin:'17px 48px', transform:'scale(0)', opacity:0,
            animation: 'popDot 0.4s cubic-bezier(0.34,1.56,0.64,1) 1.45s forwards' }}/>
        <circle cx="48" cy="79" r="3.8" fill="#ffffff"
          style={{ transformOrigin:'48px 79px', transform:'scale(0)', opacity:0,
            animation: 'popDot 0.4s cubic-bezier(0.34,1.56,0.64,1) 1.6s forwards' }}/>

        {/* Step 4: Z letterform strokes */}
        <line x1="37" y1="41" x2="59" y2="41" stroke="#fff" strokeWidth="5.5" strokeLinecap="round"
          strokeDasharray="30" strokeDashoffset="30"
          style={{ animation: 'drawZ 0.35s 1.8s ease forwards' }}/>
        <line x1="59" y1="41" x2="37" y2="55" stroke="#fff" strokeWidth="4.5" strokeLinecap="round"
          strokeDasharray="26" strokeDashoffset="26"
          style={{ animation: 'drawZ 0.35s 2.05s ease forwards' }}/>
        <line x1="37" y1="55" x2="59" y2="55" stroke="#fff" strokeWidth="5.5" strokeLinecap="round"
          strokeDasharray="30" strokeDashoffset="30"
          style={{ animation: 'drawZ 0.35s 2.35s ease forwards' }}/>
      </svg>

      {/* Step 5: Wordmark */}
      <div style={{
        opacity: 0, transform: 'translateY(12px)',
        animation: 'fadeSlideUp 0.7s 2.6s ease forwards',
        marginTop: 8,
      }}>
        <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 34, fontWeight: 900, color: '#fff', letterSpacing: -1 }}>
          Zyr<span style={{ color: '#00e5cc' }}>bit</span>
        </span>
      </div>

      {/* Step 6: Tagline */}
      <div style={{
        opacity: 0, transform: 'translateY(12px)',
        animation: 'fadeSlideUp 0.7s 2.9s ease forwards',
        marginTop: 10, fontSize: 10, color: '#222',
        letterSpacing: 4, textTransform: 'uppercase',
        fontFamily: "'DM Sans', sans-serif",
      }}>
        Build habits · Break gravity
      </div>

      {/* Step 7: Loading bar */}
      <div style={{
        opacity: 0, animation: 'ambientIn 0.4s 3s ease forwards',
        marginTop: 48, width: 140, height: 2, background: '#0a0a0a',
        borderRadius: 2, overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          background: 'linear-gradient(90deg, #00e5cc, #9c27b0, #ff9800)',
          width: 0,
          animation: 'fillBar 1.8s 3.1s cubic-bezier(0.4,0,0.2,1) forwards',
        }} />
      </div>
    </div>
  )
}
