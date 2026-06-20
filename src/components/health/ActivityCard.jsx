import React from 'react';
import { Activity } from 'lucide-react';
import { C, Card, ProgressBar } from './shared.jsx';

export default function ActivityCard({ moveLogs = [], onLogClick }) {
  const today = new Date().toISOString().split('T')[0];
  
  // Find all workouts for today
  // Let's assume moveLogs contain logs for today
  const todayLogs = moveLogs.filter(m => m.log_date === today);
  const totalMinutes = todayLogs.reduce((sum, item) => sum + item.active_minutes, 0);

  // Get max RPE from today's workouts
  const maxRpe = todayLogs.length > 0
    ? Math.max(...todayLogs.map(m => m.rpe))
    : null;

  return (
    <Card accent={C.activity} onClick={onLogClick} style={{ display: 'flex', flexDirection: 'column', gap: '10px', cursor: 'pointer' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Activity size={16} color={C.activity} />
          <span style={{ fontSize: '11px', fontWeight: 800, color: C.text }}>ACTIVITY</span>
        </div>
        {maxRpe !== null && (
          <span style={{ fontSize: '10px', color: maxRpe >= 8 ? C.depleted : maxRpe >= 5 ? C.moderate : C.optimal, fontWeight: 700 }}>
            RPE {maxRpe}/10
          </span>
        )}
      </div>

      <div>
        <div style={{ fontSize: '18px', fontWeight: 900 }}>
          {totalMinutes}m <span style={{ fontSize: '11px', fontWeight: 500, color: C.muted }}>active today</span>
        </div>
        <div style={{ fontSize: '9px', color: C.muted, marginTop: '2px' }}>
          WHO: 150m weekly consistency
        </div>
      </div>

      <ProgressBar value={totalMinutes} max={45} color={C.activity} height={4} />

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4px' }}>
        <div style={{ fontSize: '9px', fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Tap card to log
        </div>
      </div>
    </Card>
  );
}
