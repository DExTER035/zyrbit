import React, { useState } from 'react';
import { Zap, ChevronDown, ChevronUp } from 'lucide-react';
import { C, ProgressBar } from './shared.jsx';
import { todayStr } from './shared.jsx';

const TYPE_PRESETS = ['Strength', 'Cardio', 'Mobility', 'Walk'];
const DURATION_PRESETS = ['15', '30', '45', '60'];
const INTENSITY_PRESETS = [
  { label: 'Easy', rpe: '3' },
  { label: 'Moderate', rpe: '5' },
  { label: 'Hard', rpe: '7' },
  { label: 'Max', rpe: '10' },
];

function intensityLabel(rpe) {
  if (rpe <= 3) return 'Easy';
  if (rpe <= 5) return 'Moderate';
  if (rpe <= 7) return 'Hard';
  return 'Maximum';
}

export default function ActivityCard({ moveLogs = [], onLogWorkout, onDeleteWorkout, isSubmitting = false }) {
  const today = todayStr();
  const todayLogs = moveLogs.filter(m => m.log_date === today);
  const totalMinutes = todayLogs.reduce((sum, m) => sum + (Number(m.active_minutes) || 0), 0);
  const maxRpe = todayLogs.length > 0 ? Math.max(...todayLogs.map(m => Number(m.rpe) || 0)) : null;
  const lastType = todayLogs.length > 0 ? todayLogs[todayLogs.length - 1].activity_type : null;

  const intensityColor = maxRpe == null
    ? C.muted
    : maxRpe >= 8 ? C.depleted
    : maxRpe >= 5 ? C.moderate
    : C.optimal;

  const [expanded, setExpanded] = useState(false);
  const [selectedType, setSelectedType] = useState('Strength');
  const [selectedMins, setSelectedMins] = useState('45');
  const [selectedRpe, setSelectedRpe] = useState('5');

  const handleLogClick = () => {
    if (isSubmitting) return;
    onLogWorkout(selectedType, parseInt(selectedMins), parseInt(selectedRpe));
    setExpanded(false);
  };

  return (
    <div style={{
      background: C.surface,
      border: `1px solid ${C.border}`,
      borderTop: `3px solid ${C.activity}`,
      borderRadius: '16px',
      padding: '18px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      width: '100%',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Zap size={14} color={C.activity} />
          <span style={{ fontSize: '11px', fontWeight: 800, color: C.text, letterSpacing: 'var(--ls-caps)' }}>WORKOUT</span>
        </div>
        {maxRpe != null && (
          <span style={{ fontSize: '10px', color: intensityColor, fontWeight: 700 }}>
            {intensityLabel(maxRpe)}
          </span>
        )}
      </div>

      {/* Stats Display */}
      <div>
        <div style={{ fontSize: '26px', fontWeight: 900, color: C.text, lineHeight: 1 }}>
          {totalMinutes > 0 ? `${totalMinutes}m` : '--'}
        </div>
        <div style={{ fontSize: '11px', color: C.sub, marginTop: '5px' }}>
          {lastType
            ? <span style={{ color: C.activity, fontWeight: 700 }}>{lastType}</span>
            : <span style={{ color: C.muted }}>No log yet</span>
          }
        </div>
      </div>

      {/* Progress bar */}
      {totalMinutes > 0 && (
        <ProgressBar value={totalMinutes} max={60} color={C.activity} height={4} />
      )}

      {/* Recent Workout Log List with Delete */}
      {onDeleteWorkout && todayLogs.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px', borderTop: `1px solid ${C.border}`, paddingTop: '8px' }}>
          <span style={{ fontSize: '10px', color: C.muted, fontWeight: 700 }}>Today's Workouts ({todayLogs.length})</span>
          {todayLogs.map(log => (
            <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: C.sub }}>
              <span>🏋️ {log.activity_type} ({log.active_minutes}m)</span>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => onDeleteWorkout(log.id)}
                style={{ background: 'none', border: 'none', color: C.muted, fontSize: '10px', cursor: 'pointer' }}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Toggle Log Details */}
      <button
        onClick={() => setExpanded(p => !p)}
        style={{
          background: 'transparent',
          border: 'none',
          color: C.activity,
          fontSize: '11px',
          fontWeight: 700,
          cursor: 'pointer',
          outline: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: 0,
        }}
      >
        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        {expanded ? 'Hide workout setup' : '+ Log workout'}
      </button>

      {expanded && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '8px', borderTop: `1px solid ${C.border2}`, animation: 'fadeSlideUp 0.2s ease' }}>
          {/* Type Chips */}
          <div>
            <div style={{ fontSize: '9px', color: C.muted, fontWeight: 800, letterSpacing: 'var(--ls-caps)', textTransform: 'uppercase', marginBottom: '6px' }}>TYPE</div>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {TYPE_PRESETS.map(t => (
                <button
                  key={t}
                  onClick={() => setSelectedType(t)}
                  style={{
                    flex: 1,
                    minWidth: '60px',
                    padding: '8px 4px',
                    borderRadius: '8px',
                    background: selectedType === t ? C.activity : C.dim,
                    border: `1px solid ${selectedType === t ? C.activity : C.border2}`,
                    color: selectedType === t ? '#000' : C.text,
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Duration Presets */}
          <div>
            <div style={{ fontSize: '9px', color: C.muted, fontWeight: 800, letterSpacing: 'var(--ls-caps)', textTransform: 'uppercase', marginBottom: '6px' }}>DURATION</div>
            <div style={{ display: 'flex', gap: '4px' }}>
              {DURATION_PRESETS.map(m => (
                <button
                  key={m}
                  onClick={() => setSelectedMins(m)}
                  style={{
                    flex: 1,
                    padding: '8px 4px',
                    borderRadius: '8px',
                    background: selectedMins === m ? C.activity : C.dim,
                    border: `1px solid ${selectedMins === m ? C.activity : C.border2}`,
                    color: selectedMins === m ? '#000' : C.text,
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  {m}m
                </button>
              ))}
            </div>
          </div>

          {/* Intensity (RPE) */}
          <div>
            <div style={{ fontSize: '9px', color: C.muted, fontWeight: 800, letterSpacing: 'var(--ls-caps)', textTransform: 'uppercase', marginBottom: '6px' }}>INTENSITY (RPE)</div>
            <div style={{ display: 'flex', gap: '4px' }}>
              {INTENSITY_PRESETS.map(item => (
                <button
                  key={item.rpe}
                  onClick={() => setSelectedRpe(item.rpe)}
                  style={{
                    flex: 1,
                    padding: '8px 4px',
                    borderRadius: '8px',
                    background: selectedRpe === item.rpe ? C.activity : C.dim,
                    border: `1px solid ${selectedRpe === item.rpe ? C.activity : C.border2}`,
                    color: selectedRpe === item.rpe ? '#000' : C.text,
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Action button */}
          <button
            disabled={isSubmitting}
            onClick={handleLogClick}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '8px',
              background: C.activity,
              border: 'none',
              color: '#000',
              fontWeight: 800,
              fontSize: '12px',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              opacity: isSubmitting ? 0.5 : 1,
              outline: 'none',
              marginTop: '4px',
            }}
          >
            Log Workout ✓
          </button>
        </div>
      )}
    </div>
  );
}
