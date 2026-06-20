import React from 'react';
import { Apple } from 'lucide-react';
import { C, Card, ProgressBar } from './shared.jsx';

export default function NutritionCard({ proteinTotal = 0, targetProtein = 120, foodLogs = [], onLogClick }) {
  const cleanCount = foodLogs.filter(f => f.quality === 'clean').length;
  const neutralCount = foodLogs.filter(f => f.quality === 'neutral').length;
  const totalCount = foodLogs.length;

  const nqs = totalCount > 0
    ? Math.round(((cleanCount + 0.5 * neutralCount) / totalCount) * 100)
    : 100;

  return (
    <Card accent={C.nutrition} onClick={onLogClick} style={{ display: 'flex', flexDirection: 'column', gap: '10px', cursor: 'pointer' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Apple size={16} color={C.nutrition} />
          <span style={{ fontSize: '11px', fontWeight: 800, color: C.text }}>NUTRITION</span>
        </div>
        <span style={{ fontSize: '10px', color: nqs >= 80 ? C.optimal : nqs >= 50 ? C.moderate : C.depleted, fontWeight: 700 }}>
          {nqs}% NQS
        </span>
      </div>

      <div>
        <div style={{ fontSize: '18px', fontWeight: 900 }}>
          {proteinTotal}g <span style={{ fontSize: '11px', fontWeight: 500, color: C.muted }}>/ {targetProtein}g protein</span>
        </div>
        <div style={{ fontSize: '9px', color: C.muted, marginTop: '2px' }}>
          Meals: {cleanCount}🟢 {neutralCount}🟡 {totalCount - cleanCount - neutralCount}🔴
        </div>
      </div>

      <ProgressBar value={proteinTotal} max={targetProtein} color={C.nutrition} height={4} />

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4px' }}>
        <div style={{ fontSize: '9px', fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Tap card to log
        </div>
      </div>
    </Card>
  );
}
