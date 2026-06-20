import React from 'react';
import { CupSoda, GlassWater } from 'lucide-react';
import { C, Card, ProgressBar } from './shared.jsx';

export default function WaterCard({ todayWater = 0, dynamicTarget = 3000, onLogWater }) {
  const isTargetMet = todayWater >= dynamicTarget;

  return (
    <Card accent={C.water} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <GlassWater size={16} color={C.water} />
          <span style={{ fontSize: '11px', fontWeight: 800, color: C.text }}>WATER</span>
        </div>
        <span style={{ fontSize: '10px', color: isTargetMet ? C.optimal : C.sub, fontWeight: 700 }}>
          {isTargetMet ? 'Goal Met' : `${dynamicTarget - todayWater}ml left`}
        </span>
      </div>

      <div>
        <div style={{ fontSize: '18px', fontWeight: 900 }}>{todayWater} <span style={{ fontSize: '11px', fontWeight: 500, color: C.muted }}>/ {dynamicTarget}ml</span></div>
        <div style={{ fontSize: '9px', color: C.muted, marginTop: '2px' }}>Base 3L + 500ml per 30m exercise</div>
      </div>

      <ProgressBar value={todayWater} max={dynamicTarget} color={C.water} height={4} />

      {/* QUICK BUTTONS */}
      <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
        {[250, 500, 750].map(amt => (
          <button key={amt} onClick={() => onLogWater(amt)}
            style={{
              flex: 1, padding: '7px 0', borderRadius: '10px',
              background: `${C.water}12`, border: `1px solid ${C.water}25`,
              color: C.water, fontSize: '10px', fontWeight: 800, cursor: 'pointer',
              transition: 'all 0.15s'
            }}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            +{amt}
          </button>
        ))}
      </div>
    </Card>
  );
}
