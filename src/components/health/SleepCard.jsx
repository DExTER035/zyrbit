import React from 'react';
import { Moon } from 'lucide-react';
import { C, Card } from './shared.jsx';

export default function SleepCard({ sleepLogs = [], sleepDebt = 0, onLogClick }) {
  const lastSleep = sleepLogs[0]; // sleepLogs should be ordered desc
  const sleptHours = lastSleep ? Number(lastSleep.duration_hours) : 0;
  const sleepQuality = lastSleep ? lastSleep.quality : null;

  const qualityLabel = sleepQuality
    ? ['', 'Poor 😔', 'Restless 😐', 'Average 🙂', 'Good 😊', 'Deep 🚀'][sleepQuality]
    : 'No logs';

  const debtLabel = sleepDebt > 0
    ? `+${sleepDebt.toFixed(1)}h debt`
    : sleepDebt < 0
      ? `-${Math.abs(sleepDebt).toFixed(1)}h bank`
      : '0h debt';

  return (
    <Card accent={C.sleep} onClick={onLogClick} style={{ display: 'flex', flexDirection: 'column', gap: '10px', cursor: 'pointer' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Moon size={16} color={C.sleep} />
          <span style={{ fontSize: '11px', fontWeight: 800, color: C.text }}>SLEEP</span>
        </div>
        <span style={{ fontSize: '10px', color: sleepDebt > 4.0 ? C.depleted : sleepDebt > 0 ? C.moderate : C.optimal, fontWeight: 700 }}>
          {debtLabel}
        </span>
      </div>

      <div>
        <div style={{ fontSize: '18px', fontWeight: 900 }}>
          {sleptHours > 0 ? `${sleptHours}h` : '--'}{' '}
          <span style={{ fontSize: '11px', fontWeight: 500, color: C.muted }}>slept</span>
        </div>
        <div style={{ fontSize: '10px', color: C.sub, marginTop: '4px' }}>
          Quality: <span style={{ fontWeight: 700, color: C.sleep }}>{qualityLabel}</span>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4px' }}>
        <div style={{ fontSize: '9px', fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Tap card to log
        </div>
      </div>
    </Card>
  );
}
