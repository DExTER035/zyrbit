import React from 'react';

/**
 * ZyrbitMark — Monolith Z icon mark.
 * Three-element wedge slash and Z-shape.
 * Scales from 16px (favicon) to any size.
 *
 * Props:
 *   size      — height in px (width = size × 1.25)
 *   variant   — 'default' | 'monochrome' | 'accent'
 *   className / style — forwarded to outer svg
 */
export const ZyrbitMark = ({
  size = 32,
  variant = 'default',
  className = '',
  style = {},
}) => {
  const w = Math.round(size * 1.25); // 10:8 aspect ratio

  // Use cyan accent on top-left of top bar for default/accent, otherwise monochrome white
  const bodyColor = '#FFFFFF';
  const accentColor = variant === 'monochrome' ? '#FFFFFF' : '#5EE6F5';

  return (
    <svg
      width={w}
      height={size}
      viewBox="0 0 40 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Zyrbit"
      className={className}
      style={style}
    >
      {/* Bottom-left wedge slash */}
      <polygon points="15.48,16.23 0,32 8.17,32 15.91,16.23" fill={bodyColor}/>
      {/* Middle small wedge slash */}
      <polygon points="19.35,9.92 17.2,14.42 21.51,9.92" fill={bodyColor}/>
      {/* Top-right Z-like shape */}
      <polygon points="31.83,0 22.37,9.46 27.96,9.92 18.49,22.08 35.7,22.08 37.85,15.32 27.53,14.42 40,0" fill={accentColor}/>
    </svg>
  );
};

/**
 * ZyrbitIcon — Monolith Z inside a rounded-square container.
 * Styled after Apple/Linear squircle style: graphite dark surface, subtle top-light, white mark.
 */
export const ZyrbitIcon = ({ size = 48 }) => {
  const radius = Math.round(size * 0.215);
  const markH  = Math.round(size * 0.58);
  const markW  = Math.round(markH * 1.25);
  const offY   = Math.round((size - markH) / 2);
  const offX   = Math.round((size - markW) / 2);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Zyrbit App Icon"
    >
      <defs>
        {/* Top-light gradient highlight */}
        <linearGradient id={`toplight-${size}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.08"/>
          <stop offset="30%" stopColor="#FFFFFF" stopOpacity="0.02"/>
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0"/>
        </linearGradient>
      </defs>

      {/* Main Container Fill - Pitch Black background */}
      <rect width={size} height={size} rx={radius} fill="#121214"/>
      
      {/* Subtle Toplight Highlight */}
      <rect width={size} height={size} rx={radius} fill={`url(#toplight-${size})`}/>

      {/* Squircle Border Outline */}
      <rect 
        x="0.5" 
        y="0.5" 
        width={size - 1} 
        height={size - 1} 
        rx={radius - 0.5} 
        stroke="rgba(255, 255, 255, 0.08)" 
        strokeWidth="1.5"
      />

      {/* Monochrome White Zyrbit Mark */}
      <g transform={`translate(${offX}, ${offY})`}>
        <ZyrbitMark size={markH} variant="monochrome" />
      </g>
    </svg>
  );
};

/**
 * ZyrbitWordmark — Icon + "Zyrbit" text lockup.
 * Used for: navbar, landing header, splash screen, footer.
 *
 * Props:
 *   iconSize   — icon height in px (default: 26)
 *   showIcon   — toggle icon visibility
 *   variant    — 'default' | 'monochrome' — passed to ZyrbitMark
 */
export const ZyrbitWordmark = ({
  iconSize = 26,
  showIcon = true,
  variant = 'default',
}) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: iconSize < 24 ? 7 : 10,
    lineHeight: 1,
    userSelect: 'none',
  }}>
    {showIcon && <ZyrbitMark size={iconSize} variant={variant} />}
    <span style={{
      fontFamily: "'Space Grotesk', 'Inter', sans-serif",
      fontSize: iconSize > 40 ? '1.35rem' : iconSize > 28 ? '1.1rem' : '0.95rem',
      fontWeight: 700,
      color: '#FFFFFF',
      letterSpacing: '-0.03em',
      lineHeight: 1,
    }}>
      Zyrbit
    </span>
  </div>
);

/**
 * Default export — backward-compatible <Logo />
 * Renders ZyrbitIcon by default; pass showWordmark for lockup.
 */
export default function Logo({ size = 48, className = '', showWordmark = false }) {
  if (showWordmark) {
    return (
      <div className={className}>
        <ZyrbitWordmark iconSize={Math.round(size * 0.6)} />
      </div>
    );
  }
  return (
    <div className={className}>
      <ZyrbitIcon size={size} />
    </div>
  );
}
