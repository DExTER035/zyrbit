import React from 'react';
import { Droplets } from 'lucide-react';
import { C, ProgressBar } from './shared.jsx';

const WATER_PRESETS = [250, 500, 750, 1000];

export default function WaterCard({ todayWater = 0, dynamicTarget = 3000, onLogWater }) {
  const pct = Math.round(Math.min((todayWater / dynamicTarget) * 100, 100));
  const isTargetMet = todayWater >= dynamicTarget;
  const remaining = Math.max(0, dynamicTarget - todayWater);

  return (
    <div style={{
      background: C.surface,
      border: `1px solid ${C.border}`,
      borderTop: `3px solid ${C.water}`,
      borderRadius: '20px',
      padding: '18px',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
    }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <Droplets size={16} color={C.water} />
          <span style={{ fontSize: '11px', fontWeight: 800, color: C.text, letterSpacing: '0.5px' }}>
            HYDRATION
          </span>
        </div>
        <span style={{
          fontSize: '10px',
          fontWeight: 700,
          color: isTargetMet ? C.optimal : C.sub,
          background: isTargetMet ? `${C.optimal}15` : 'transparent',
          padding: isTargetMet ? '2px 7px' : 0,
          borderRadius: '6px',
        }}>
          {isTargetMet ? '✓ Goal met' : `${remaining}ml left`}
        </span>
      </div>

      {/* ── Counter ── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
          <span style={{ fontSize: '28px', fontWeight: 900, color: C.text, lineHeight: 1 }}>
            {(todayWater / 1000).toFixed(1)}L
          </span>
          <span style={{ fontSize: '12px', color: C.muted, fontWeight: 500 }}>
            / {(dynamicTarget / 1000).toFixed(1)}L
          </span>
          <span style={{ fontSize: '11px', color: C.water, fontWeight: 700, marginLeft: 'auto' }}>
            {pct}%
          </span>
        </div>
        <div style={{ fontSize: '10px', color: C.muted, marginTop: '4px' }}>
          Base 3L + 500ml per 30m exercise
        </div>
      </div>

      {/* ── Progress bar ── */}
      <ProgressBar value={todayWater} max={dynamicTarget} color={C.water} height={5} />

      {/* ── One-tap presets ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
        {WATER_PRESETS.map(amt => (
          <button
            key={amt}
            onClick={() => onLogWater(amt)}
            style={{
              padding: '10px 0',
              borderRadius: '10px',
              background: `${C.water}12`,
              border: `1px solid ${C.water}28`,
              color: C.water,
              fontSize: '11px',
              fontWeight: 800,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.93)'; e.currentTarget.style.background = `${C.water}25`; }}
            onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = `${C.water}12`; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = `${C.water}12`; }}
            onTouchStart={e => { e.currentTarget.style.transform = 'scale(0.93)'; e.currentTarget.style.background = `${C.water}25`; }}
            onTouchEnd={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = `${C.water}12`; }}
          >
            +{amt >= 1000 ? '1L' : `${amt}`}
          </button>
        ))}
      </div>
    </div>
  );
}
