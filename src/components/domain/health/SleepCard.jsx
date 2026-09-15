import React, { useState } from 'react';
import { Moon, ChevronDown, ChevronUp } from 'lucide-react';
import { C } from './shared.jsx';

const QUALITY_MAP = ['', '😞 Poor', '😐 Okay', '🙂 Good', '😁 Great', '🚀 Deep'];

export default function SleepCard({ sleepLogs = [], sleepDebt = 0, onLogSleep, onDeleteSleep, isSubmitting = false }) {
  const lastSleep = sleepLogs[0];
  const sleptHours = lastSleep ? Number(lastSleep.duration_hours) : null;
  const sleepQuality = lastSleep ? lastSleep.quality : null;
  const qualityLabel = sleepQuality ? (QUALITY_MAP[sleepQuality] || `Q${sleepQuality}`) : null;

  const debtColor = sleepDebt > 4 ? C.depleted : sleepDebt > 1 ? C.moderate : C.optimal;
  const debtLabel = sleepDebt > 0
    ? `+${sleepDebt.toFixed(1)}h debt`
    : sleepDebt < 0
      ? `${Math.abs(sleepDebt).toFixed(1)}h banked`
      : 'On track';

  const [expanded, setExpanded] = useState(false);
  const [customHours, setCustomHours] = useState('8');
  const [customQuality, setCustomQuality] = useState('3');

  const handleSleptWell = () => {
    if (isSubmitting) return;
    onLogSleep(7.5, 3); // Slept Well: 7.5h / Good quality
  };

  const handleSleptPoorly = () => {
    if (isSubmitting) return;
    onLogSleep(6, 1); // Slept Poorly: 6h / Poor quality
  };

  const handleSaveCustom = () => {
    if (isSubmitting) return;
    onLogSleep(parseFloat(customHours), parseInt(customQuality));
    setExpanded(false);
  };

  return (
    <div style={{
      background: C.surface,
      border: `1px solid ${C.border}`,
      borderTop: `3px solid ${C.sleep}`,
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
          <Moon size={14} color={C.sleep} />
          <span style={{ fontSize: '11px', fontWeight: 800, color: C.text, letterSpacing: 'var(--ls-caps)' }}>SLEEP</span>
        </div>
        <span style={{ fontSize: '10px', color: debtColor, fontWeight: 700 }}>{debtLabel}</span>
      </div>

      {/* Main stat display */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '26px', fontWeight: 900, color: C.text, lineHeight: 1 }}>
            {sleptHours != null ? `${sleptHours}h` : '--'}
          </div>
          <div style={{ fontSize: '11px', color: C.sub, marginTop: '5px' }}>
            {qualityLabel
              ? <span style={{ color: C.sleep, fontWeight: 700 }}>{qualityLabel}</span>
              : <span style={{ color: C.muted }}>No log yet</span>
            }
          </div>
        </div>

        {onDeleteSleep && lastSleep && (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => onDeleteSleep(lastSleep.id)}
            style={{ background: 'none', border: 'none', color: C.muted, fontSize: '10px', cursor: 'pointer' }}
          >
            Delete
          </button>
        )}
      </div>

      {/* Presets Row (1-Tap Buttons) */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          disabled={isSubmitting}
          onClick={handleSleptWell}
          style={{
            flex: 1,
            padding: '10px 8px',
            borderRadius: '10px',
            background: `${C.sleep}12`,
            border: `1px solid ${C.sleep}28`,
            color: C.sleep,
            fontSize: '11px',
            fontWeight: 800,
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            opacity: isSubmitting ? 0.5 : 1,
            transition: 'all 0.15s',
            outline: 'none',
          }}
        >
          Slept Well
        </button>
        <button
          disabled={isSubmitting}
          onClick={handleSleptPoorly}
          style={{
            flex: 1,
            padding: '10px 8px',
            borderRadius: '10px',
            background: `${C.depleted}12`,
            border: `1px solid ${C.depleted}28`,
            color: C.depleted,
            fontSize: '11px',
            fontWeight: 800,
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            opacity: isSubmitting ? 0.5 : 1,
            transition: 'all 0.15s',
            outline: 'none',
          }}
        >
          Slept Poorly
        </button>
      </div>

      {/* Custom details expander */}
      <button
        onClick={() => setExpanded(p => !p)}
        style={{
          background: 'transparent',
          border: 'none',
          color: C.muted,
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
        {expanded ? 'Hide custom entry' : 'Add custom details'}
      </button>

      {expanded && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '8px', borderTop: `1px solid ${C.border2}`, animation: 'fadeSlideUp 0.2s ease' }}>
          <div>
            <div style={{ fontSize: '9px', color: C.muted, fontWeight: 800, letterSpacing: 'var(--ls-caps)', textTransform: 'uppercase', marginBottom: '6px' }}>HOURS</div>
            <div style={{ display: 'flex', gap: '4px' }}>
              {['6', '7', '7.5', '8', '9'].map(h => (
                <button
                  key={h}
                  onClick={() => setCustomHours(h)}
                  style={{
                    flex: 1,
                    padding: '8px 4px',
                    borderRadius: '8px',
                    background: customHours === h ? C.sleep : C.dim,
                    border: `1px solid ${customHours === h ? C.sleep : C.border2}`,
                    color: customHours === h ? '#000' : C.text,
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  {h}h
                </button>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '9px', color: C.muted, fontWeight: 800, letterSpacing: 'var(--ls-caps)', textTransform: 'uppercase', marginBottom: '6px' }}>QUALITY</div>
            <div style={{ display: 'flex', gap: '4px' }}>
              {[
                { emoji: '😞', val: '1' },
                { emoji: '😐', val: '2' },
                { emoji: '🙂', val: '3' },
                { emoji: '😁', val: '4' },
              ].map(item => (
                <button
                  key={item.val}
                  onClick={() => setCustomQuality(item.val)}
                  style={{
                    flex: 1,
                    padding: '8px 4px',
                    borderRadius: '8px',
                    background: customQuality === item.val ? C.sleep : C.dim,
                    border: `1px solid ${customQuality === item.val ? C.sleep : C.border2}`,
                    color: C.text,
                    fontSize: '12px',
                    cursor: 'pointer',
                    outline: 'none',
                    display: 'flex',
                    justifyContent: 'center',
                  }}
                >
                  {item.emoji}
                </button>
              ))}
            </div>
          </div>

          <button
            disabled={isSubmitting}
            onClick={handleSaveCustom}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '8px',
              background: C.sleep,
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
            Save Custom Log
          </button>
        </div>
      )}
    </div>
  );
}
