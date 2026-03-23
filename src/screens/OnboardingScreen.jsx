import React, { useState, useEffect } from 'react'

const COLOURS = ['#00e5cc', '#ff9800', '#9c27b0', '#4caf50']
const BTN_TEXT = ['#000', '#000', '#fff', '#000']

export default function OnboardingScreen({ onComplete }) {
  const [slide, setSlide] = useState(0)
  const [stars, setStars] = useState([])

  useEffect(() => {
    const s = Array.from({ length: 55 }, (_, i) => ({
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
  }, [])

  const nextSlide = () => {
    if (slide < 3) setSlide(s => s + 1)
    else onComplete()
  }

  const SplashStarField = () => (
    <>
      {stars.map(s => (
        <div key={s.id} style={{
          position: 'absolute', width: s.size, height: s.size,
          left: `${s.left}%`, top: `${s.top}%`,
          borderRadius: '50%', background: '#fff',
          '--lo': s.lo, '--hi': s.hi,
          animation: `twinkle ${s.duration}s ${s.delay}s infinite ease-in-out alternate`,
        }} />
      ))}
    </>
  )

  const slidesData = [
    {
      chip: 'Welcome to Zyrbit',
      title1: 'Your habits.', title2: 'In orbit.',
      desc: 'Track every habit, build unstoppable streaks, and watch your gravity score rise daily.',
      color: COLOURS[0],
      renderIllustration: () => (
        <svg width="240" height="240" viewBox="0 0 240 240" fill="none">
          <circle cx="120" cy="120" r="100" stroke={COLOURS[0]} strokeWidth="1" opacity="0.06"/>
          <circle cx="120" cy="120" r="70" stroke={COLOURS[0]} strokeWidth="1" opacity="0.10"/>
          <circle cx="120" cy="120" r="40" stroke={COLOURS[0]} strokeWidth="1" opacity="0.18"/>
          
          <path d="M40 120 A80 40 0 0 1 200 120" stroke={COLOURS[0]} strokeWidth="3" strokeLinecap="round" opacity="0.8" filter="url(#glow0)"/>
          <path d="M120 40 A40 80 0 0 1 120 200" stroke={COLOURS[0]} strokeWidth="3" strokeLinecap="round" opacity="0.8" filter="url(#glow0)"/>
          
          <circle cx="120" cy="40" r="6" fill="#fff" />
          <circle cx="40" cy="120" r="5" fill="#fff" />
          <circle cx="120" cy="200" r="5" fill="#fff" />
          
          <rect x="90" y="90" width="60" height="60" rx="14" fill="#000" />
          <line x1="100" y1="105" x2="140" y2="105" stroke="#fff" strokeWidth="4" strokeLinecap="round"/>
          <line x1="140" y1="105" x2="100" y2="135" stroke="#fff" strokeWidth="3.5" strokeLinecap="round"/>
          <line x1="100" y1="135" x2="140" y2="135" stroke={COLOURS[0]} strokeWidth="4" strokeLinecap="round"/>
          
          <defs>
            <filter id="glow0" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="6" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>
        </svg>
      )
    },
    {
      chip: 'Anti-Gravity Engine',
      title1: 'One score.', title2: 'All habits.',
      desc: 'Your Gravity Score rises every time you complete a habit. The higher it goes, the harder it is to fall.',
      color: COLOURS[1],
      renderIllustration: () => (
        <svg width="240" height="240" viewBox="0 0 240 240" fill="none">
          <circle cx="120" cy="120" r="90" stroke={COLOURS[1]} strokeWidth="2" opacity="0.2"/>
          <path d="M30 120 A90 90 0 0 0 210 120" stroke={COLOURS[1]} strokeWidth="4" strokeLinecap="round" filter="url(#glow1)"/>
          
          <circle cx="120" cy="30" r="5" fill="#fff" />
          <circle cx="210" cy="120" r="6" fill="#fde047" />
          
          <text x="120" y="105" fontFamily="'DM Sans', sans-serif" fontSize="11" fontWeight="700" fill={COLOURS[1]} opacity="0.6" letterSpacing="3" textAnchor="middle">GRAVITY</text>
          <text x="120" y="155" fontFamily="'Syne', sans-serif" fontSize="64" fontWeight="900" fill={COLOURS[1]} textAnchor="middle" filter="url(#glow1)">74</text>
          
          <rect x="85" y="185" width="70" height="14" rx="7" fill={COLOURS[1]} opacity="0.15" />
          <circle cx="95" cy="192" r="3" fill={COLOURS[1]} />
          <line x1="105" y1="192" x2="145" y2="192" stroke={COLOURS[1]} strokeWidth="3" strokeLinecap="round" opacity="0.5"/>
          
          <defs>
            <filter id="glow1" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="8" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>
        </svg>
      )
    },
    {
      chip: 'Rise Through Ranks',
      title1: 'Earn Zyrons.', title2: 'Break limits.',
      desc: 'Climb 10 elemental ranks and unlock the legendary Ω rank at 100,000 Zyrons.',
      color: COLOURS[2],
      renderIllustration: () => (
        <svg width="240" height="240" viewBox="0 0 240 240" fill="none">
          <circle cx="120" cy="100" r="75" stroke={COLOURS[2]} strokeWidth="1" opacity="0.3"/>
          <circle cx="120" cy="100" r="60" fill={COLOURS[2]} opacity="0.05"/>
          
          <text x="120" y="80" fontFamily="'DM Sans', sans-serif" fontSize="10" fontWeight="700" fill={COLOURS[2]} opacity="0.6" letterSpacing="2" textAnchor="middle">CURRENT RANK</text>
          <text x="120" y="110" fontFamily="'Syne', sans-serif" fontSize="18" fontWeight="900" fill="#ce93d8" textAnchor="middle" filter="url(#glow2)">Emberon</text>
          <text x="120" y="130" fontFamily="'DM Sans', sans-serif" fontSize="10" fontWeight="600" fill={COLOURS[2]} opacity="0.5" letterSpacing="1" textAnchor="middle">elemental rank 5</text>
          
          {/* Stat chips */}
          <rect x="35" y="190" width="50" height="24" rx="6" fill="#00e5cc" opacity="0.15"/>
          <text x="60" y="206" fontFamily="'Syne', sans-serif" fontSize="12" fontWeight="800" fill="#00e5cc" textAnchor="middle">4.2k</text>
          
          <rect x="95" y="190" width="50" height="24" rx="6" fill="#ff9800" opacity="0.15"/>
          <text x="120" y="206" fontFamily="'Syne', sans-serif" fontSize="12" fontWeight="800" fill="#ff9800" textAnchor="middle">12🔥</text>
          
          <rect x="155" y="190" width="50" height="24" rx="6" fill="#fde047" opacity="0.15"/>
          <text x="180" y="206" fontFamily="'Syne', sans-serif" fontSize="12" fontWeight="800" fill="#fde047" textAnchor="middle">Rank 5</text>

          <defs>
            <filter id="glow2" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="5" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>
        </svg>
      )
    },
    {
      chip: 'Everything Connected',
      title1: 'One app.', title2: 'Infinite growth.',
      desc: 'Zyra AI, journal, stats, social challenges, move-to-earn — all in one seamless universe.',
      color: COLOURS[3],
      renderIllustration: () => (
        <svg width="240" height="240" viewBox="0 0 240 240" fill="none">
          <circle cx="120" cy="120" r="90" stroke={COLOURS[3]} strokeWidth="1" opacity="0.15"/>
          
          <line x1="120" y1="120" x2="120" y2="30" stroke={COLOURS[3]} strokeWidth="1" opacity="0.3"/>
          <circle cx="120" cy="30" r="16" fill="#00e5cc" opacity="0.15"/>
          <circle cx="120" cy="30" r="8" fill="#00e5cc" filter="url(#glow3)"/>
          
          <line x1="120" y1="120" x2="198" y2="75" stroke={COLOURS[3]} strokeWidth="1" opacity="0.3"/>
          <circle cx="198" cy="75" r="14" fill="#ff9800" opacity="0.15"/>
          <circle cx="198" cy="75" r="7" fill="#ff9800" />
          
          <line x1="120" y1="120" x2="198" y2="165" stroke={COLOURS[3]} strokeWidth="1" opacity="0.3"/>
          <circle cx="198" cy="165" r="12" fill="#9c27b0" opacity="0.15"/>
          <circle cx="198" cy="165" r="6" fill="#9c27b0" />
          
          <line x1="120" y1="120" x2="120" y2="210" stroke={COLOURS[3]} strokeWidth="1" opacity="0.3"/>
          <circle cx="120" cy="210" r="18" fill="#4caf50" opacity="0.15"/>
          <circle cx="120" cy="210" r="9" fill="#4caf50" filter="url(#glow3)"/>
          
          <line x1="120" y1="120" x2="42" y2="165" stroke={COLOURS[3]} strokeWidth="1" opacity="0.3"/>
          <circle cx="42" cy="165" r="14" fill="#fde047" opacity="0.15"/>
          <circle cx="42" cy="165" r="7" fill="#fde047" />
          
          <line x1="120" y1="120" x2="42" y2="75" stroke={COLOURS[3]} strokeWidth="1" opacity="0.3"/>
          <circle cx="42" cy="75" r="12" fill="#ef4444" opacity="0.15"/>
          <circle cx="42" cy="75" r="6" fill="#ef4444" />
          
          <rect x="95" y="95" width="50" height="50" rx="14" fill="#000" stroke={COLOURS[3]} strokeWidth="2" filter="url(#glow3)"/>
          <line x1="105" y1="110" x2="135" y2="110" stroke="#fff" strokeWidth="3" strokeLinecap="round"/>
          <line x1="135" y1="110" x2="105" y2="130" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="105" y1="130" x2="135" y2="130" stroke="#fff" strokeWidth="3" strokeLinecap="round"/>

          <defs>
            <filter id="glow3" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="6" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>
        </svg>
      )
    }
  ]

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', overflow: 'hidden', fontFamily: "'DM Sans', sans-serif", zIndex: 1000 }}>
      <SplashStarField />
      
      {/* Top Progress Bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: '#0a0a0a', zIndex: 10 }}>
        <div style={{
          height: '100%',
          width: `${((slide + 1) / 4) * 100}%`,
          background: COLOURS[slide],
          transition: 'width 0.5s ease, background 0.5s ease',
        }} />
      </div>

      {/* Ambient glowing orb representing slide color */}
      <div style={{
        position: 'absolute', top: -100, left: '50%', transform: 'translateX(-50%)',
        width: 300, height: 300, borderRadius: '50%',
        opacity: 0.08,
        background: `radial-gradient(circle, ${COLOURS[slide]} 0%, transparent 70%)`,
        transition: 'background 0.5s ease',
        pointerEvents: 'none', zIndex: 1
      }} />

      {/* Slides container */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          {slidesData.map((s, i) => {
            const isActive = slide === i
            const isPrev = slide > i
            const isNext = slide < i
            return (
              <div key={i} style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                padding: '40px 24px',
                opacity: isActive ? 1 : 0,
                pointerEvents: isActive ? 'auto' : 'none',
                transform: `translateX(${isActive ? 0 : isPrev ? -40 : 40}px) scale(${isActive ? 1 : 0.97})`,
                transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                zIndex: isActive ? 5 : 0
              }}>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                  {s.renderIllustration()}
                </div>
                <div style={{ textAlign: 'center', height: '180px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
                  <div style={{ display: 'inline-block', padding: '4px 12px', background: `${s.color}10`, border: `1px solid ${s.color}30`, borderRadius: 100, color: s.color, fontSize: 11, fontWeight: 700, letterSpacing: 0.5, marginBottom: 16 }}>
                    {s.chip}
                  </div>
                  <h2 style={{ fontSize: 32, fontFamily: "'Syne', sans-serif", fontWeight: 900, color: '#fff', letterSpacing: -1, lineHeight: 1.1, marginBottom: 12 }}>
                    {s.title1} <span style={{ color: s.color }}>{s.title2}</span>
                  </h2>
                  <p style={{ fontSize: 15, color: '#a0a0a0', lineHeight: 1.5, maxWidth: 320, margin: '0 auto', fontWeight: 500 }}>
                    {s.desc}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
        
        {/* Footer Area */}
        <div style={{ padding: '0 24px 40px', position: 'relative', zIndex: 10 }}>
          {/* Progress dots */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 32 }}>
            {[0, 1, 2, 3].map(i => (
              <div key={i} style={{
                height: 6, borderRadius: 3,
                width: slide === i ? 24 : 6,
                background: slide === i ? COLOURS[slide] : '#111',
                transition: 'all 0.4s cubic-bezier(0.34, 1.2, 0.64, 1)'
              }} />
            ))}
          </div>

          <button onClick={nextSlide} style={{
            width: '100%', height: 54, borderRadius: 27,
            background: COLOURS[slide], color: BTN_TEXT[slide],
            fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 800,
            border: 'none', cursor: 'pointer',
            boxShadow: `0 0 28px ${COLOURS[slide]}20`,
            transition: 'background 0.5s ease, box-shadow 0.5s ease, color 0.5s ease',
            marginBottom: 20
          }}>
            {slide === 3 ? 'Get Started 🚀' : 'Continue'}
          </button>

          <button onClick={onComplete} style={{
            width: '100%', border: 'none', background: 'transparent',
            color: '#444', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase',
            fontWeight: 700, cursor: 'pointer',
          }}>
            Skip
          </button>
        </div>
      </div>
    </div>
  )
}
