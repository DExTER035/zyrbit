import React from 'react';
import { Droplets } from 'lucide-react';
import { C, ProgressBar } from './shared.jsx';

const WATER_PRESETS = [250, 500, 750, 1000];

export default function WaterCard({ todayWater = 0, dynamicTarget = 3000, onLogWater, onDeleteWater, waterLogs = [], isSubmitting = false }) {
  const pct = Math.round(Math.min((todayWater / dynamicTarget) * 100, 100));
  const isTargetMet = todayWater >= dynamicTarget;
  const remaining = Math.max(0, dynamicTarget - todayWater);

  return (
    <div style={{
      background: '#FFFFFF',
      border: `1.5px solid ${C.border}`,
      borderLeft: `4px solid ${C.water}`,
      borderRadius: '18px',
      padding: '18px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
      width: '100%',
      boxShadow: '0 2px 8px rgba(17,26,32,0.03)',
    }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <Droplets size={16} color={C.water} />
          <span style={{ fontSize: '11px', fontWeight: 800, color: C.text, letterSpacing: '0.8px' }}>
            HYDRATION
          </span>
        </div>
        <span style={{
          fontSize: '11px',
          fontWeight: 700,
          color: isTargetMet ? C.optimal : C.sub,
          background: isTargetMet ? `${C.optimal}15` : `${C.elev}`,
          border: `1px solid ${isTargetMet ? `${C.optimal}30` : C.border}`,
          padding: '3px 8px',
          borderRadius: '6px',
        }}>
          {isTargetMet ? '✓ Goal reached' : `${remaining}ml to goal`}
        </span>
      </div>

      {/* ── Counter ── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
          <span style={{ fontSize: '28px', fontWeight: 800, color: C.text, lineHeight: 1 }}>
            {(todayWater / 1000).toFixed(1)}L
          </span>
          <span style={{ fontSize: '13px', color: C.sub, fontWeight: 500 }}>
            / {(dynamicTarget / 1000).toFixed(1)}L target
          </span>
          <span style={{ fontSize: '12px', color: C.water, fontWeight: 700, marginLeft: 'auto' }}>
            {pct}%
          </span>
        </div>
        <div style={{ fontSize: '11px', color: C.sub, marginTop: '5px' }}>
          Dynamic target: Base 3L + 500ml per 30m workout
        </div>
      </div>

      {/* ── Progress bar ── */}
      <ProgressBar value={todayWater} max={dynamicTarget} color={C.water} height={6} />

      {/* ── One-tap presets (Min 44px touch targets) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
        {WATER_PRESETS.map(amt => (
          <button
            key={amt}
            type="button"
            disabled={isSubmitting}
            onClick={() => onLogWater(amt)}
            style={{
              minHeight: '44px',
              padding: '10px 0',
              borderRadius: '12px',
              background: C.elev,
              border: `1.5px solid ${C.border}`,
              color: C.water,
              fontSize: '12px',
              fontWeight: 800,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              opacity: isSubmitting ? 0.5 : 1,
              transition: 'all 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            +{amt >= 1000 ? '1L' : `${amt}ml`}
          </button>
        ))}
      </div>

      {/* ── Recent Water Logs List with Delete ── */}
      {onDeleteWater && waterLogs.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '2px', borderTop: `1px solid ${C.border}`, paddingTop: '10px' }}>
          <span style={{ fontSize: '11px', color: C.sub, fontWeight: 700 }}>Today's Water Entries ({waterLogs.length})</span>
          {waterLogs.slice(-3).map(log => (
            <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: C.text }}>
              <span>💧 +{log.amount_ml}ml</span>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => onDeleteWater(log.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: C.muted,
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '4px 6px',
                }}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
