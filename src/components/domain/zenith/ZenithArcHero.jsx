/**
 * ZenithArcHero — The 24-Hour Solar Arc Hero
 * Metaphor: ARC ("Today is unfolding.")
 * Renders the 24-hour circadian solar arc with NOW position, daylight spectrum,
 * plotted events, and editorial State Sentence.
 */
import React, { useMemo } from 'react';
import { Sun, Sparkles } from 'lucide-react';

export default function ZenithArcHero({
  events = [],
  stateHeadline = "Today is unfolding.",
  stateSubtext = "Maintain your steady rhythm across focus and recovery.",
}) {
  // Current time representation
  const now = new Date();
  const currentHour = now.getHours() + now.getMinutes() / 60;
  
  // Format current time string (e.g. "2:30 PM")
  const timeFormatted = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  // Arc math: 6 AM (0%) to 10 PM / 22:00 (100%)
  // Range is 16 hours. Clamp between 0 and 1
  const startHour = 6;
  const endHour = 22;
  const progressRatio = Math.max(0, Math.min(1, (currentHour - startHour) / (endHour - startHour)));

  // SVG Geometry: Center (160, 150), Radius 110. Semicircle from left to right.
  // Angle: from Math.PI (left, 6 AM) to 0 (right, 10 PM)
  const angle = Math.PI - progressRatio * Math.PI;
  const cx = 160;
  const cy = 145;
  const r = 105;

  const sunX = cx + r * Math.cos(angle);
  const sunY = cy - r * Math.sin(angle);

  // Map events to positions on the arc
  const mappedEvents = useMemo(() => {
    return events.slice(0, 8).map((evt, idx) => {
      let evtHour = 12; // default midday
      if (evt.time) {
        const parts = evt.time.split(':');
        if (parts.length >= 2) {
          evtHour = parseInt(parts[0], 10) + parseInt(parts[1], 10) / 60;
        }
      } else if (evt.created_at) {
        const d = new Date(evt.created_at);
        evtHour = d.getHours() + d.getMinutes() / 60;
      } else {
        evtHour = 7 + (idx * 2);
      }

      const ratio = Math.max(0.05, Math.min(0.95, (evtHour - startHour) / (endHour - startHour)));
      const evtAngle = Math.PI - ratio * Math.PI;
      const x = cx + r * Math.cos(evtAngle);
      const y = cy - r * Math.sin(evtAngle);

      return {
        ...evt,
        x,
        y,
        isPast: evtHour <= currentHour,
      };
    });
  }, [events, currentHour]);

  return (
    <div style={{
      background: 'linear-gradient(180deg, #15161B 0%, #0E0F13 100%)',
      borderRadius: '24px',
      border: '1px solid #26272D',
      padding: '24px 20px 20px',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: '0 12px 36px rgba(0,0,0,0.4)',
    }}>
      {/* Ambient background glow from sun position */}
      <div style={{
        position: 'absolute',
        left: `${(sunX / 320) * 100}%`,
        top: `${(sunY / 170) * 100}%`,
        width: '160px',
        height: '160px',
        transform: 'translate(-50%, -50%)',
        background: 'radial-gradient(circle, rgba(233, 180, 76, 0.18) 0%, rgba(233, 180, 76, 0) 70%)',
        pointerEvents: 'none',
      }} />

      {/* SVG Arc Container */}
      <div style={{ position: 'relative', width: '100%', maxWidth: '320px', margin: '0 auto' }}>
        <svg viewBox="0 0 320 165" style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
          <defs>
            {/* Master Arc Gradient: Teal -> Emerald -> Amber -> Crimson */}
            <linearGradient id="arcSpectrum" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#06B6D4" />
              <stop offset="35%" stopColor="#10B981" />
              <stop offset="65%" stopColor="#E9B44C" />
              <stop offset="100%" stopColor="#F43F5E" />
            </linearGradient>

            {/* Inner dashed guide gradient */}
            <linearGradient id="innerDashed" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(6, 182, 212, 0.3)" />
              <stop offset="100%" stopColor="rgba(244, 63, 94, 0.3)" />
            </linearGradient>

            <filter id="glowSun" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Semicircle Track Background (Subtle tick marks) */}
          <path
            d="M 55 145 A 105 105 0 0 1 265 145"
            fill="none"
            stroke="#1F2026"
            strokeWidth="14"
            strokeLinecap="round"
          />

          {/* Inner Dashed Rhythm Line */}
          <path
            d="M 75 145 A 85 85 0 0 1 245 145"
            fill="none"
            stroke="url(#innerDashed)"
            strokeWidth="1.5"
            strokeDasharray="4 6"
          />

          {/* The Vibrant Color Spectrum Arc */}
          <path
            d="M 55 145 A 105 105 0 0 1 265 145"
            fill="none"
            stroke="url(#arcSpectrum)"
            strokeWidth="8"
            strokeLinecap="round"
            opacity="0.9"
          />

          {/* Plotted Events along the Arc */}
          {mappedEvents.map((evt, idx) => (
            <g key={evt.id || idx}>
              <circle
                cx={evt.x}
                cy={evt.y}
                r="4.5"
                fill={evt.isPast ? '#ECE8DF' : '#15161B'}
                stroke={evt.isPast ? '#E9B44C' : '#9A978F'}
                strokeWidth="2"
              />
            </g>
          ))}

          {/* Glowing NOW Orb Node */}
          <g transform={`translate(${sunX}, ${sunY})`} filter="url(#glowSun)">
            <circle r="12" fill="rgba(233, 180, 76, 0.25)" />
            <circle r="8" fill="#E9B44C" stroke="#ECE8DF" strokeWidth="2.5" />
          </g>

          {/* Radial Solar Ray Accents at Apex */}
          <line x1="160" y1="20" x2="160" y2="28" stroke="#E9B44C" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
          <line x1="140" y1="24" x2="144" y2="31" stroke="#E9B44C" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
          <line x1="180" y1="24" x2="176" y2="31" stroke="#E9B44C" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />

          {/* 6 AM & 10 PM Hour Markers */}
          <text x="42" y="155" fill="#6B7280" fontSize="10" fontWeight="600" textAnchor="middle">6 AM</text>
          <text x="278" y="155" fill="#6B7280" fontSize="10" fontWeight="600" textAnchor="middle">10 PM</text>
        </svg>

        {/* NOW Badge Centered inside the Arc */}
        <div style={{
          position: 'absolute',
          bottom: '12px',
          left: '50%',
          transform: 'translateX(-50%)',
          textAlign: 'center',
          pointerEvents: 'none',
        }}>
          <div style={{ fontSize: '11px', color: '#9A978F', fontWeight: 600, letterSpacing: '0.04em' }}>
            Now
          </div>
          <div style={{
            fontSize: '18px',
            fontWeight: 800,
            color: '#E9B44C',
            letterSpacing: '-0.02em',
          }}>
            {timeFormatted}
          </div>
        </div>
      </div>

      {/* ── State Sentence Editorial Block ── */}
      <div style={{
        marginTop: '16px',
        paddingTop: '16px',
        borderTop: '1px solid #26272D',
      }}>
        <div style={{
          fontSize: '16px',
          fontWeight: 700,
          color: '#E9B44C',
          letterSpacing: '-0.01em',
          marginBottom: '4px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}>
          <span>{stateHeadline}</span>
        </div>
        <div style={{
          fontSize: '13px',
          color: '#9A978F',
          lineHeight: 1.45,
          fontWeight: 400,
        }}>
          {stateSubtext}
        </div>
      </div>
    </div>
  );
}
