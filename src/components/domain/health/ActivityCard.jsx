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
  const lastType = todayLogs.length > 0 ? todayLogs[0].activity_type : null;

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
    onLogWorkout(selectedType, parseInt(selectedMins, 10), parseInt(selectedRpe, 10));
    setExpanded(false);
  };

  return (
    <div style={{
      background: '#FFFFFF',
      border: `1.5px solid ${C.border}`,
      borderLeft: `4px solid ${C.activity}`,
      borderRadius: '18px',
      padding: '18px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
      width: '100%',
      boxShadow: '0 2px 8px rgba(17,26,32,0.03)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <Zap size={16} color={C.activity} />
          <span style={{ fontSize: '11px', fontWeight: 800, color: C.text, letterSpacing: '0.8px' }}>WORKOUT & MOVEMENT</span>
        </div>
        {maxRpe != null && (
          <span style={{
            fontSize: '11px',
            color: intensityColor,
            fontWeight: 700,
            background: `${intensityColor}14`,
            border: `1px solid ${intensityColor}30`,
            padding: '2px 8px',
            borderRadius: '6px',
          }}>
            {intensityLabel(maxRpe)} (RPE {maxRpe})
          </span>
        )}
      </div>

      {/* Stats Display */}
      <div>
        <div style={{ fontSize: '28px', fontWeight: 800, color: C.text, lineHeight: 1 }}>
          {totalMinutes > 0 ? `${totalMinutes}m` : '--'}
        </div>
        <div style={{ fontSize: '12px', color: C.sub, marginTop: '6px' }}>
          {lastType
            ? <span>Latest: <strong style={{ color: C.activity }}>{lastType}</strong></span>
            : <span style={{ color: C.muted }}>No workout logged today</span>
          }
        </div>
      </div>

      {/* Progress bar */}
      {totalMinutes > 0 && (
        <ProgressBar value={totalMinutes} max={60} color={C.activity} height={6} />
      )}

      {/* Recent Workout Log List with Delete */}
      {onDeleteWorkout && todayLogs.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: `1px solid ${C.border}`, paddingTop: '10px' }}>
          <span style={{ fontSize: '11px', color: C.sub, fontWeight: 700 }}>Today's Sessions ({todayLogs.length})</span>
          {todayLogs.map(log => (
            <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: C.text }}>
              <span>🏋️ {log.activity_type} ({log.active_minutes}m{log.rpe ? ` · RPE ${log.rpe}` : ''})</span>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => onDeleteWorkout(log.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: C.muted,
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '4px 6px',
                }}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Toggle Log Details */}
      <button
        type="button"
        onClick={() => setExpanded(p => !p)}
        style={{
          background: 'transparent',
          border: 'none',
          color: C.sub,
          fontSize: '12px',
          fontWeight: 700,
          cursor: 'pointer',
          outline: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '4px 0',
        }}
      >
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        {expanded ? 'Hide workout setup' : '+ Log workout / session'}
      </button>

      {expanded && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '10px', borderTop: `1px solid ${C.border}`, animation: 'fadeSlideUp 0.2s ease' }}>
          {/* Type Chips */}
          <div>
            <div style={{ fontSize: '10px', color: C.sub, fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase', marginBottom: '6px' }}>TYPE</div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {TYPE_PRESETS.map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSelectedType(t)}
                  style={{
                    flex: 1,
                    minWidth: '65px',
                    minHeight: '38px',
                    padding: '8px 6px',
                    borderRadius: '10px',
                    background: selectedType === t ? C.activity : C.elev,
                    border: `1.5px solid ${selectedType === t ? C.activity : C.border}`,
                    color: selectedType === t ? '#FFFFFF' : C.text,
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    outline: 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Duration Presets */}
          <div>
            <div style={{ fontSize: '10px', color: C.sub, fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase', marginBottom: '6px' }}>DURATION</div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {DURATION_PRESETS.map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setSelectedMins(m)}
                  style={{
                    flex: 1,
                    minHeight: '38px',
                    borderRadius: '10px',
                    background: selectedMins === m ? C.activity : C.elev,
                    border: `1.5px solid ${selectedMins === m ? C.activity : C.border}`,
                    color: selectedMins === m ? '#FFFFFF' : C.text,
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    outline: 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {m}m
                </button>
              ))}
            </div>
          </div>

          {/* Intensity (RPE) */}
          <div>
            <div style={{ fontSize: '10px', color: C.sub, fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase', marginBottom: '6px' }}>INTENSITY (RPE)</div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {INTENSITY_PRESETS.map(item => (
                <button
                  key={item.rpe}
                  type="button"
                  onClick={() => setSelectedRpe(item.rpe)}
                  style={{
                    flex: 1,
                    minHeight: '38px',
                    borderRadius: '10px',
                    background: selectedRpe === item.rpe ? C.activity : C.elev,
                    border: `1.5px solid ${selectedRpe === item.rpe ? C.activity : C.border}`,
                    color: selectedRpe === item.rpe ? '#FFFFFF' : C.text,
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    outline: 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Action button */}
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleLogClick}
            style={{
              width: '100%',
              minHeight: '44px',
              padding: '12px',
              borderRadius: '12px',
              background: C.recovery,
              border: 'none',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '13px',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              opacity: isSubmitting ? 0.5 : 1,
              outline: 'none',
              marginTop: '4px',
              transition: 'all 0.15s',
            }}
          >
            Log Workout Session ✓
          </button>
        </div>
      )}
    </div>
  );
}
