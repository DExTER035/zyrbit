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
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderTop: `3px solid ${C.weight}`,
        borderRadius: '16px',
        padding: '18px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        width: '100%',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Scale size={14} color={C.weight} />
          <span style={{ fontSize: '11px', fontWeight: 800, color: C.text, letterSpacing: 'var(--ls-caps)' }}>
            SCALE WEIGHT
          </span>
        </div>
        {trendStr && (
          <span style={{ fontSize: '10px', color: C.sub, fontWeight: 700 }}>
            {trendStr} (7d)
          </span>
        )}
      </div>

      {/* Main stat display */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '26px', fontWeight: 900, color: C.text, lineHeight: 1 }}>
            {currentKg != null ? `${currentKg} kg` : '--'}
          </div>
          <div style={{ fontSize: '11px', color: C.muted, marginTop: '5px' }}>
            {lastDate ? `Logged ${lastDate}` : 'No scale entry yet'}
          </div>
        </div>

        {onDeleteWeight && latest && (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => onDeleteWeight(latest.id)}
            style={{ background: 'none', border: 'none', color: C.muted, fontSize: '10px', cursor: 'pointer' }}
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
          color: C.weight,
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
        {expanded ? 'Cancel entry' : '+ Record scale weight'}
      </button>

      {/* Quick Input Drawer */}
      {expanded && (
        <form
          onSubmit={handleSubmit}
          style={{
            display: 'flex',
            gap: '8px',
            paddingTop: '8px',
            borderTop: `1px solid ${C.border2}`,
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
              background: C.elev,
              border: `1px solid ${C.border2}`,
              borderRadius: '10px',
              padding: '10px 12px',
              color: C.text,
              fontSize: '13px',
              fontWeight: 700,
              outline: 'none',
            }}
          />
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              padding: '10px 16px',
              borderRadius: '10px',
              background: C.weight,
              border: 'none',
              color: '#000',
              fontSize: '12px',
              fontWeight: 800,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              opacity: isSubmitting ? 0.5 : 1,
            }}
          >
            Save
          </button>
        </form>
      )}

      {/* Recent weight history */}
      {weightLogs.length > 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderTop: `1px solid ${C.border2}`, paddingTop: '8px' }}>
          <span style={{ fontSize: '10px', color: C.muted, fontWeight: 700 }}>Recent Scale Entries</span>
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
            {weightLogs.slice(0, 5).map((log) => (
              <div
                key={log.id}
                style={{
                  background: C.elev,
                  border: `1px solid ${C.border2}`,
                  borderRadius: '8px',
                  padding: '6px 10px',
                  fontSize: '10px',
                  whiteSpace: 'nowrap',
                }}
              >
                <span style={{ color: C.text, fontWeight: 700 }}>{log.weight} kg</span>
                <span style={{ color: C.muted, marginLeft: '6px' }}>{log.log_date.slice(5)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
