import React, { useEffect, useState } from 'react'

export default function GravityRing({ score, size = 80 }) {
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    // Trigger animation short delay after mount
    const t = setTimeout(() => setMounted(true), 100)
    return () => clearTimeout(t)
  }, [])

  const radius = 35
  const circumference = 2 * Math.PI * radius
  const cappedScore = Math.min(100, Math.max(0, score))
  // Start from completely empty (circumference), animate to target
  const strokeDashoffset = mounted ? circumference - (cappedScore / 100) * circumference : circumference

  const getColor = (s) => {
    if (s <= 30) return '#EF4444' // Red
    if (s <= 50) return '#F97316' // Orange
    if (s <= 70) return '#EAB308' // Yellow
    if (s <= 85) return '#9C27B0' // Purple
    return '#00FFFF'              // Cyan
  }

  const ringColor = getColor(cappedScore)

  return (
    <div style={{ position: 'relative', width: size, height: size, minWidth: size, minHeight: size, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={size} height={size} viewBox="0 0 80 80" style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}>
        <defs>
          <filter id={`ringGlow-${cappedScore}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Track backdrop */}
        <circle 
          cx="40" cy="40" r={radius}
          stroke="#1E1E2A" strokeWidth="7" fill="none"
        />
        
        {/* Animated Score Arc */}
        <circle 
          cx="40" cy="40" r={radius}
          stroke={ringColor} 
          strokeWidth="7" 
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          style={{
            strokeDashoffset,
            transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
            filter: `url(#ringGlow-${cappedScore})`
          }}
        />
      </svg>
      
      <div style={{ position: 'absolute', textAlign: 'center' }}>
        <div style={{ fontSize: '22px', fontWeight: 900, color: ringColor, lineHeight: 1 }}>
          {cappedScore}
        </div>
        <div style={{ fontSize: '7px', fontWeight: 800, letterSpacing: '2px', color: 'var(--color-muted)', marginTop: '2px' }}>
          GRAVITY
        </div>
      </div>
    </div>
  )
}
