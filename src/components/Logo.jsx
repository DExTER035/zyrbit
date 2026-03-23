import React from 'react'

export const ZyrbitIcon = ({ size = 32 }) => (
  <svg width={size} height={size} viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="glow" x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation="2.5" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <filter id="dotglow" x="-150%" y="-150%" width="400%" height="400%">
        <feGaussianBlur stdDeviation="3" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
    <rect width="96" height="96" rx="22" fill="#000000"/>
    {/* Ghost orbit rings */}
    <ellipse cx="48" cy="48" rx="31" ry="12" stroke="#00FFCC" strokeWidth="0.8" fill="none" opacity="0.12"/>
    <ellipse cx="48" cy="48" rx="12" ry="31" stroke="#00FFCC" strokeWidth="0.8" fill="none" opacity="0.12"/>
    {/* Glowing arc strokes */}
    <path d="M17 48 A31 12 0 0 1 79 48" stroke="#00FFCC" strokeWidth="2" strokeLinecap="round" fill="none" filter="url(#glow)"/>
    <path d="M48 17 A12 31 0 0 1 48 79" stroke="#00FFCC" strokeWidth="2" strokeLinecap="round" fill="none" filter="url(#glow)"/>
    {/* 3 orbit dots — top, left, bottom */}
    <circle cx="48" cy="17" r="4" fill="#ffffff" filter="url(#dotglow)"/>
    <circle cx="17" cy="48" r="3.5" fill="#ffffff" filter="url(#dotglow)"/>
    <circle cx="48" cy="79" r="3.5" fill="#ffffff" filter="url(#dotglow)"/>
    {/* Z letterform — 3 strokes */}
    <line x1="37" y1="41" x2="59" y2="41" stroke="#ffffff" strokeWidth="5.5" strokeLinecap="round"/>
    <line x1="59" y1="41" x2="37" y2="55" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round"/>
    <line x1="37" y1="55" x2="59" y2="55" stroke="#ffffff" strokeWidth="5.5" strokeLinecap="round"/>
  </svg>
)

export const ZyrbitWordmark = ({ iconSize = 32 }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
    <ZyrbitIcon size={iconSize} />
    <span style={{
      fontFamily: "'Syne', 'Inter', sans-serif",
      fontSize: iconSize > 40 ? '22px' : '18px',
      fontWeight: '900',
      color: '#ffffff',
      letterSpacing: '-0.5px',
      lineHeight: 1,
    }}>
      Zyr<span style={{ color: '#00FFCC' }}>bit</span>
    </span>
  </div>
)

// Default export keeps backward-compat for existing <Logo size={x} /> usage
export default function Logo({ size = 48, className = '', showWordmark = false }) {
  if (showWordmark) return <ZyrbitWordmark iconSize={size} />
  return (
    <div className={className}>
      <ZyrbitIcon size={size} />
    </div>
  )
}
