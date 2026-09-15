import React, { useState, useEffect } from 'react';
import { ShieldAlert } from 'lucide-react';
import { C } from './shared.jsx';

export default function RecoveryWidget({ recoveryScore = 100, activeSprint = null, bioPacing = null }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 120);
    return () => clearTimeout(t);
  }, []);

  const isDepleted = recoveryScore < 50;
  const isOptimal = recoveryScore >= 80;

  const statusText = isOptimal
    ? 'OPTIMAL'
    : isDepleted
      ? 'DEPLETED'
      : 'RECOVERING';

  const statusLabel = isOptimal
    ? 'Ready for high-intensity focus.'
    : isDepleted
      ? 'Stamina low. Prioritise rest tonight.'
      : 'Steady output. Maintain routine.';

  const statusColor = isOptimal
    ? C.optimal
    : isDepleted
      ? C.depleted
      : C.moderate;

  // Circumference of r=54 circle ≈ 339.3
  const CIRCUMFERENCE = 2 * Math.PI * 54;
  const strokeDashoffset = mounted
    ? CIRCUMFERENCE - (CIRCUMFERENCE * recoveryScore) / 100
    : CIRCUMFERENCE;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* ── HERO CARD ── */}
      <div style={{
        background: `linear-gradient(145deg, ${C.surface} 0%, ${C.elev} 100%)`,
        border: `1px solid ${C.border}`,
        borderRadius: '16px',
        padding: '24px',
        display: 'flex',
        alignItems: 'center',
        gap: '28px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: `0 0 48px ${statusColor}10, 0 8px 32px rgba(0,0,0,0.4)`,
      }}>
        {/* Ambient glow behind gauge */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '60px',
          transform: 'translate(-50%, -50%)',
          width: '160px',
          height: '160px',
          background: `radial-gradient(circle, ${statusColor}18 0%, transparent 70%)`,
          pointerEvents: 'none',
        }} />

        {/* ── SVG Circular Gauge ── */}
        <div style={{ position: 'relative', width: '120px', height: '120px', flexShrink: 0 }}>
          <svg
            width="120"
            height="120"
            style={{ transform: 'rotate(-90deg)' }}
          >
            {/* Background track */}
            <circle
              cx="60"
              cy="60"
              r="54"
              stroke={C.dim}
              strokeWidth="7"
              fill="transparent"
            />
            {/* Progress arc */}
            <circle
              cx="60"
              cy="60"
              r="54"
              stroke={statusColor}
              strokeWidth="7"
              fill="transparent"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}
            />
          </svg>
          {/* Score label inside gauge */}
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <span style={{ fontSize: '32px', fontWeight: 900, color: C.text, lineHeight: 1 }}>
              {recoveryScore}
            </span>
            <span style={{ fontSize: '10px', color: C.muted, fontWeight: 700, marginTop: '2px' }}>
              / 100
            </span>
          </div>
        </div>

        {/* ── Text Panel ── */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '10px',
            color: C.muted,
            fontWeight: 800,
            letterSpacing: 'var(--ls-caps)',
            textTransform: 'uppercase',
            marginBottom: '6px',
          }}>
            RECOVERY
          </div>
          <div style={{
            fontSize: '22px',
            fontWeight: 900,
            color: statusColor,
            letterSpacing: '-0.5px',
            marginBottom: '8px',
          }}>
            {statusText}
          </div>
          <div style={{
            fontSize: '13px',
            color: C.sub,
            lineHeight: 1.5,
          }}>
            {statusLabel}
          </div>

          {/* Score bar */}
          <div style={{ marginTop: '14px' }}>
            <div style={{
              height: '4px',
              background: C.dim,
              borderRadius: '4px',
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${recoveryScore}%`,
                background: statusColor,
                borderRadius: '4px',
                transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
              }} />
            </div>
          </div>
        </div>
      </div>

      {/* ── SUGGESTED FOCUS PACING CARD ── */}
      {bioPacing && (
        <div style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: '20px',
          padding: '16px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '10px', fontWeight: 800, color: C.recovery, letterSpacing: '1px', textTransform: 'uppercase' }}>
              SUGGESTED FOCUS PACING
            </span>
            <span style={{ fontSize: '10px', color: C.muted }}>{bioPacing.disclaimer}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div style={{ background: C.elev, padding: '10px 12px', borderRadius: '12px', border: `1px solid ${C.border2}` }}>
              <div style={{ fontSize: '9px', color: C.muted, fontWeight: 700, textTransform: 'uppercase' }}>Focus Capacity</div>
              <div style={{ fontSize: '12px', fontWeight: 800, color: C.text, marginTop: '2px' }}>{bioPacing.focusCapacity}</div>
            </div>
            <div style={{ background: C.elev, padding: '10px 12px', borderRadius: '12px', border: `1px solid ${C.border2}` }}>
              <div style={{ fontSize: '9px', color: C.muted, fontWeight: 700, textTransform: 'uppercase' }}>Caffeine Cutoff</div>
              <div style={{ fontSize: '12px', fontWeight: 800, color: C.text, marginTop: '2px' }}>{bioPacing.caffeineCutoff}</div>
            </div>
          </div>

          <div style={{ background: C.elev, padding: '10px 12px', borderRadius: '12px', border: `1px solid ${C.border2}` }}>
            <div style={{ fontSize: '9px', color: C.muted, fontWeight: 700, textTransform: 'uppercase' }}>Recommended Work</div>
            <div style={{ fontSize: '12px', fontWeight: 800, color: C.sub, marginTop: '2px' }}>{bioPacing.recommendedWorkType}</div>
          </div>
        </div>
      )}

      {/* ── DEPLETED PROTOCOL (only shown when score < 50) ── */}
      {isDepleted && (
        <div style={{
          background: `${C.depleted}0D`,
          border: `1px solid ${C.depleted}30`,
          borderRadius: '16px',
          padding: '16px 18px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <ShieldAlert size={14} color={C.depleted} />
            <span style={{
              fontSize: '10px',
              fontWeight: 800,
              color: C.depleted,
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
            }}>
              Recovery Protocol Active
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { label: 'Caffeine', val: 'Cut off after 12:00 PM.' },
              { label: 'Sleep target', val: 'Aim for 8h+ tonight.' },
              { label: 'Movement', val: '15 min light stretching only.' },
            ].map((item, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'baseline' }}>
                <span style={{ fontSize: '10px', color: C.depleted, marginTop: '1px', flexShrink: 0 }}>•</span>
                <div style={{ fontSize: '12px', lineHeight: 1.45 }}>
                  <strong style={{ color: C.text }}>{item.label}: </strong>
                  <span style={{ color: C.sub }}>{item.val}</span>
                </div>
              </div>
            ))}

            {activeSprint && (
              <div style={{ marginTop: '6px', paddingTop: '10px', borderTop: `1px dashed ${C.depleted}25` }}>
                <div style={{ fontSize: '12px', lineHeight: 1.45, color: C.depleted }}>
                  <strong>Sprint Cap:</strong> Focus goal reduced to{' '}
                  {Math.round(activeSprint.daily_focus_minutes / 2)}m today.
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
