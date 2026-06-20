import React from 'react';
import { Scale } from 'lucide-react';
import { C, Card, ProgressBar } from './shared.jsx';

export default function WeightWidget({ weightLogs = [], targetWeight = 72, onLogClick }) {
  const currentLog = weightLogs[0]; // ordered desc
  const currentVal = currentLog ? Number(currentLog.weight) : null;

  const validWeights = weightLogs.map(l => Number(l.weight)).filter(w => !isNaN(w));
  const avgWma = validWeights.length > 0
    ? (validWeights.reduce((s, x) => s + x, 0) / validWeights.length).toFixed(1)
    : null;

  const diff = currentVal && targetWeight
    ? Math.abs(currentVal - targetWeight).toFixed(1)
    : null;

  const progressPct = currentVal && targetWeight
    ? Math.min(100, Math.round((targetWeight / currentVal) * 100))
    : 0;

  return (
    <Card accent={C.weight} onClick={onLogClick} style={{ display: 'flex', flexDirection: 'column', gap: '10px', cursor: 'pointer' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Scale size={16} color={C.weight} />
          <span style={{ fontSize: '11px', fontWeight: 800, color: C.text }}>WEIGHT INDEX</span>
        </div>
        <span style={{ fontSize: '10px', color: C.weight, fontWeight: 700 }}>
          Goal: {targetWeight} kg
        </span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: '18px', fontWeight: 900 }}>
            {currentVal ? `${currentVal} kg` : '--'}{' '}
            {avgWma && (
              <span style={{ fontSize: '11px', fontWeight: 500, color: C.muted }}>
                (WMA: {avgWma} kg)
              </span>
            )}
          </div>
          {diff !== null && (
            <div style={{ fontSize: '10px', color: C.sub, marginTop: '2px' }}>
              {currentVal > targetWeight ? `+${diff}kg above goal` : `-${diff}kg below goal`}
            </div>
          )}
        </div>
      </div>

      <ProgressBar value={progressPct} max={100} color={C.weight} height={4} />

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4px' }}>
        <div style={{ fontSize: '9px', fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Tap card to log weight
        </div>
      </div>
    </Card>
  );
}
