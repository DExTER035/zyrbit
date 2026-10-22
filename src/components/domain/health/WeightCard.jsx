import React, { useState } from 'react';
import { Scale, ChevronDown, ChevronUp } from 'lucide-react';
import { C } from './shared.jsx';

export default function WeightCard({
  weightLogs = [],
  onLogWeight,
  onDeleteWeight,
  isSubmitting = false,
}) {
  const latest = weightLogs[0] || null;
  const currentKg = latest ? Number(latest.weight) : null;
  const lastDate = latest ? latest.log_date : null;

  const [expanded, setExpanded] = useState(false);
  const [inputVal, setInputVal] = useState(currentKg != null ? String(currentKg) : '70');

  // Compute 7-day trend
  let trendStr = null;
  if (weightLogs.length >= 2 && currentKg != null) {
    const prev = weightLogs[Math.min(weightLogs.length - 1, 6)];
    if (prev && prev.weight != null) {
      const diff = Number((currentKg - prev.weight).toFixed(1));
      trendStr = diff > 0 ? `+${diff} kg` : diff < 0 ? `${diff} kg` : 'Stable';
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    const n = parseFloat(inputVal);
    if (!isNaN(n) && n >= 20 && n <= 400) {
      onLogWeight(n);
      setExpanded(false);
    }
  };

  return (
    <div
      style={{
        background: '#FFFFFF',
        border: `1.5px solid ${C.border}`,
        borderLeft: `4px solid ${C.weight}`,
        borderRadius: '18px',
        padding: '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        width: '100%',
        boxShadow: '0 2px 8px rgba(17,26,32,0.03)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <Scale size={16} color={C.weight} />
          <span style={{ fontSize: '11px', fontWeight: 800, color: C.text, letterSpacing: '0.8px' }}>
            SCALE WEIGHT
          </span>
        </div>
        {trendStr && (
          <span style={{
            fontSize: '11px',
            color: C.sub,
            fontWeight: 700,
            background: C.elev,
            border: `1px solid ${C.border}`,
            padding: '2px 8px',
            borderRadius: '6px',
          }}>
            {trendStr} (7d)
          </span>
        )}
      </div>

      {/* Main stat display */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: C.text, lineHeight: 1 }}>
            {currentKg != null ? `${currentKg} kg` : '--'}
          </div>
          <div style={{ fontSize: '12px', color: C.sub, marginTop: '6px' }}>
            {lastDate ? `Recorded on ${lastDate}` : 'No scale entry recorded yet'}
          </div>
        </div>

        {onDeleteWeight && latest && (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => onDeleteWeight(latest.id)}
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
        )}
      </div>

      {/* Toggle quick entry */}
      <button
        type="button"
        onClick={() => setExpanded((p) => !p)}
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
        {expanded ? 'Cancel entry' : '+ Record scale weight'}
      </button>

      {/* Quick Input Drawer */}
      {expanded && (
        <form
          onSubmit={handleSubmit}
          style={{
            display: 'flex',
            gap: '8px',
            paddingTop: '10px',
            borderTop: `1px solid ${C.border}`,
            animation: 'fadeSlideUp 0.2s ease',
          }}
        >
          <input
            type="number"
            step="0.1"
            min="20"
            max="400"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="Weight (kg)"
            style={{
              flex: 1,
              minHeight: '44px',
              background: C.elev,
              border: `1.5px solid ${C.border}`,
              borderRadius: '12px',
              padding: '10px 14px',
              color: C.text,
              fontSize: '14px',
              fontWeight: 700,
              outline: 'none',
            }}
          />
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              minHeight: '44px',
              padding: '0 20px',
              borderRadius: '12px',
              background: C.recovery,
              border: 'none',
              color: '#FFFFFF',
              fontSize: '13px',
              fontWeight: 700,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              opacity: isSubmitting ? 0.5 : 1,
              transition: 'all 0.15s ease',
            }}
          >
            Save Weight
          </button>
        </form>
      )}

      {/* Recent weight history */}
      {weightLogs.length > 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: `1px solid ${C.border}`, paddingTop: '10px' }}>
          <span style={{ fontSize: '11px', color: C.sub, fontWeight: 700 }}>Recent Scale Records</span>
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
            {weightLogs.slice(0, 5).map((log) => (
              <div
                key={log.id}
                style={{
                  background: C.elev,
                  border: `1px solid ${C.border}`,
                  borderRadius: '10px',
                  padding: '6px 12px',
                  fontSize: '11px',
                  whiteSpace: 'nowrap',
                }}
              >
                <span style={{ color: C.text, fontWeight: 700 }}>{log.weight} kg</span>
                <span style={{ color: C.sub, marginLeft: '6px' }}>{log.log_date.slice(5)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
