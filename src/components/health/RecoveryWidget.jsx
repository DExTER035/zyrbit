import React from 'react';
import { ShieldAlert, ZapOff, CheckCircle } from 'lucide-react';
import { C, Card, ProgressBar } from './shared.jsx';

export default function RecoveryWidget({ recoveryScore = 100, activeSprint = null }) {
  const isDepleted = recoveryScore < 50;
  const isOptimal = recoveryScore >= 80;

  const statusText = isOptimal
    ? 'OPTIMAL (Ready to build)'
    : isDepleted
      ? 'DEPLETED (Recovery Protocol)'
      : 'MODERATE (Standard Schedule)';

  const statusColor = isOptimal
    ? C.optimal
    : isDepleted
      ? C.depleted
      : C.moderate;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <Card accent={statusColor}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '10px', color: C.muted, fontWeight: 800, letterSpacing: '1px' }}>RECOVERY INDEX</span>
          <span style={{ fontSize: '24px', fontWeight: 900, color: statusColor }}>{recoveryScore}%</span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
          {isDepleted && <ZapOff size={13} color={C.depleted} />}
          <span style={{ fontSize: '12px', fontWeight: 700, color: C.text }}>{statusText}</span>
        </div>

        <ProgressBar value={recoveryScore} max={100} color={statusColor} height={6} />
      </Card>

      {/* DEPLETED PROTOCOL WIDGET */}
      {isDepleted && (
        <div style={{ background: `${C.depleted}10`, border: `1px solid ${C.depleted}35`, borderRadius: '20px', padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <ShieldAlert size={16} color={C.depleted} />
            <span style={{ fontSize: '11px', fontWeight: 800, color: C.depleted, letterSpacing: '1px', textTransform: 'uppercase' }}>
              RECOVERY PROTOCOL ENFORCED
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { label: 'Caffeine Limit', val: 'Limit caffeine intake after 12:00 PM.' },
              { label: 'Sleep Target', val: 'Aim for at least 8.0 hours of sleep tonight.' },
              { label: 'Mobility Active', val: 'Complete a 15-minute light stretching routine.' }
            ].map((item, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '10px', marginTop: '2px' }}>•</span>
                <div style={{ fontSize: '11px', lineHeight: 1.4 }}>
                  <strong style={{ color: C.text }}>{item.label}:</strong> <span style={{ color: C.sub }}>{item.val}</span>
                </div>
              </div>
            ))}
            
            {activeSprint && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginTop: '4px', borderTop: `1px dashed ${C.depleted}25`, paddingTop: '8px' }}>
                <span style={{ fontSize: '10px', marginTop: '2px' }}>⚠️</span>
                <div style={{ fontSize: '11px', lineHeight: 1.4, color: C.depleted }}>
                  <strong>Sprint Cap:</strong> Focus stamina reduced. Daily sprint focus goal is capped at 50% ({Math.round(activeSprint.daily_focus_minutes / 2)}m).
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
