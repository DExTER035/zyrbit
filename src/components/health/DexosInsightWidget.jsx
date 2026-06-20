import React from 'react';
import { C } from './shared.jsx';

export default function DexosInsightWidget({ insight = 'Every physical indicator compounds. Fuel the system and stretch.' }) {
  return (
    <div style={{ background: `${C.recovery}08`, border: `1px solid ${C.recovery}25`, borderRadius: '18px', padding: '14px 16px' }}>
      <div style={{ fontSize: '9px', color: C.recovery, fontWeight: 800, letterSpacing: '1.5px', marginBottom: '6px' }}>DEXOS</div>
      <div style={{ fontSize: '13px', color: C.sub, lineHeight: 1.5 }}>"{insight}"</div>
    </div>
  );
}
