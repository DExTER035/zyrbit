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
      background: '#FFFFFF',
      border: `1.5px solid ${C.border}`,
      borderLeft: `4px solid ${C.sleep}`,
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
          <Moon size={15} color={C.sleep} />
          <span style={{ fontSize: '11px', fontWeight: 800, color: C.text, letterSpacing: '0.8px' }}>SLEEP</span>
        </div>
        <span style={{ fontSize: '11px', color: debtColor, fontWeight: 700 }}>{debtLabel}</span>
      </div>

      {/* Main stat display */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: C.text, lineHeight: 1 }}>
            {sleptHours != null ? `${sleptHours}h` : '--'}
          </div>
          <div style={{ fontSize: '12px', color: C.sub, marginTop: '6px' }}>
            {qualityLabel
              ? <span style={{ color: C.sleep, fontWeight: 700 }}>{qualityLabel}</span>
              : <span style={{ color: C.muted }}>No sleep logged today</span>
            }
          </div>
        </div>

        {onDeleteSleep && lastSleep && (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => onDeleteSleep(lastSleep.id)}
            style={{
              background: 'none',
              border: 'none',
              color: C.muted,
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              padding: '6px 8px',
              borderRadius: '6px',
            }}
          >
            Delete
          </button>
        )}
      </div>

      {/* Presets Row (1-Tap Buttons) */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          type="button"
          disabled={isSubmitting}
          onClick={handleSleptWell}
          style={{
            flex: 1,
            minHeight: '44px',
            padding: '10px 8px',
            borderRadius: '12px',
            background: 'rgba(79, 70, 229, 0.08)',
            border: '1px solid rgba(79, 70, 229, 0.25)',
            color: C.sleep,
            fontSize: '12px',
            fontWeight: 700,
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            opacity: isSubmitting ? 0.5 : 1,
            transition: 'all 0.15s',
            outline: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
          }}
        >
          <span>🙂 Slept Well (7.5h)</span>
        </button>
        <button
          type="button"
          disabled={isSubmitting}
          onClick={handleSleptPoorly}
          style={{
            flex: 1,
            minHeight: '44px',
            padding: '10px 8px',
            borderRadius: '12px',
            background: 'rgba(220, 38, 38, 0.06)',
            border: '1px solid rgba(220, 38, 38, 0.2)',
            color: C.depleted,
            fontSize: '12px',
            fontWeight: 700,
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            opacity: isSubmitting ? 0.5 : 1,
            transition: 'all 0.15s',
            outline: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
          }}
        >
          <span>😞 Slept Poorly (6h)</span>
        </button>
      </div>

      {/* Custom details expander */}
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
        {expanded ? 'Hide custom duration' : '+ Custom duration & quality'}
      </button>

      {expanded && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '10px', borderTop: `1px solid ${C.border}`, animation: 'fadeSlideUp 0.2s ease' }}>
          <div>
            <div style={{ fontSize: '10px', color: C.sub, fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase', marginBottom: '6px' }}>HOURS SLEPT</div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {['6', '6.5', '7', '7.5', '8', '9'].map(h => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setCustomHours(h)}
                  style={{
                    flex: 1,
                    minHeight: '38px',
                    borderRadius: '10px',
                    background: customHours === h ? C.sleep : C.elev,
                    border: `1.5px solid ${customHours === h ? C.sleep : C.border}`,
                    color: customHours === h ? '#FFFFFF' : C.text,
                    fontSize: '12px',
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
            <div style={{ fontSize: '10px', color: C.sub, fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase', marginBottom: '6px' }}>QUALITY</div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {[
                { emoji: '😞 Poor', val: '1' },
                { emoji: '😐 Okay', val: '2' },
                { emoji: '🙂 Good', val: '3' },
                { emoji: '😁 Great', val: '4' },
                { emoji: '🚀 Deep', val: '5' },
              ].map(item => (
                <button
                  key={item.val}
                  type="button"
                  onClick={() => setCustomQuality(item.val)}
                  style={{
                    flex: 1,
                    minHeight: '38px',
                    borderRadius: '10px',
                    background: customQuality === item.val ? C.sleep : C.elev,
                    border: `1.5px solid ${customQuality === item.val ? C.sleep : C.border}`,
                    color: customQuality === item.val ? '#FFFFFF' : C.text,
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    outline: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '2px 4px',
                  }}
                >
                  {item.emoji}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleSaveCustom}
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
            Save Sleep Entry
          </button>
        </div>
      )}
    </div>
  );
}
