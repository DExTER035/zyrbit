import React from 'react';

export default function DesktopPanel() {
  const score = parseInt(localStorage.getItem('zyrbit_score') || '0', 10);
  const doneHabits = parseInt(localStorage.getItem('zyrbit_done_habits') || '0', 10);
  const totalHabits = parseInt(localStorage.getItem('zyrbit_total_habits') || '3', 10);
  
  const completionPercent = totalHabits > 0 ? Math.round((doneHabits / totalHabits) * 100) : 0;

  return (
    <div className="desktop-panel" style={{
      width: 300,
      background: '#000',
      borderLeft: '1px solid #1A1A24',
      padding: '24px 16px',
      position: 'fixed',
      right: 0,
      top: 60,
      height: 'calc(100vh - 60px)',
      display: 'none', // Handled by CSS media query
      overflowY: 'auto'
    }}>
      <div style={{ padding: '0 8px 16px', fontSize: 11, fontWeight: 700, letterSpacing: 1, color: '#555566', textTransform: 'uppercase' }}>
        Quick Stats
      </div>

      <div style={{ background: '#0a0a12', border: '1px solid #1A1A24', borderRadius: 16, padding: '16px', marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: '#888899', marginBottom: 8 }}>Today's Gravity Score</div>
        <div style={{ fontSize: 32, fontWeight: 900, color: '#ce93d8', letterSpacing: -1 }}>
          {score.toLocaleString()} <span style={{ fontSize: 16, color: '#555566' }}>pts</span>
        </div>
      </div>

      <div style={{ background: '#0a0a12', border: '1px solid #1A1A24', borderRadius: 16, padding: '16px', marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: '#888899', marginBottom: 8 }}>Habit Completion</div>
        <div style={{ display: 'flex', alignItems: 'end', gap: 8, marginBottom: 12 }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: completionPercent === 100 ? '#4caf50' : '#fff' }}>
            {completionPercent}%
          </div>
          <div style={{ fontSize: 13, color: '#555566', paddingBottom: 4 }}>
            ({doneHabits}/{totalHabits})
          </div>
        </div>
        <div style={{ height: 6, background: '#1E1E28', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', background: completionPercent === 100 ? '#4caf50' : '#ce93d8', width: `${completionPercent}%`, transition: 'width 1s cubic-bezier(0.16, 1, 0.3, 1)' }}></div>
        </div>
      </div>

      <div style={{ padding: '0 8px 16px', fontSize: 11, fontWeight: 700, letterSpacing: 1, color: '#555566', textTransform: 'uppercase', marginTop: 32 }}>
        Active Boosts
      </div>
      
      <div style={{ padding: '12px 16px', background: '#e6510015', border: '1px solid #e6510040', borderRadius: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
        <div style={{ fontSize: 24 }}>🔥</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#ff9800' }}>2x Zyron Multiplier</div>
          <div style={{ fontSize: 12, color: '#ff980080' }}>Expires in 4h 12m</div>
        </div>
      </div>
    </div>
  );
}
