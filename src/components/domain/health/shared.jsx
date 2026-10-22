/* eslint-disable react-refresh/only-export-components */
import React from 'react';
import { X } from 'lucide-react';

// ─── Design Tokens ────────────────────────────────────────────────────────────
// Aligned with Zyrbit Design System (Warm Ivory)
export const C = {
  bg:      '#F4F0E8',
  surface: '#FFFFFF',
  elev:    '#FAF7F2',
  border:  '#E5E0D8',
  border2: '#DDE9EB',
  text:    '#111A20',
  sub:     '#68777B',
  muted:   '#8C9B9E',
  dim:     '#E5E0D8',

  // Health pillar accents — used only for data viz / state indicators
  recovery:  '#174A55', // Zyrbit Petrol Teal
  sleep:     '#4F46E5', // Indigo — sleep data only
  water:     '#174A55', // Petrol Teal — water data only
  nutrition: '#174A55', // Petrol Teal — food data only
  protein:   '#059669', // Emerald — protein data
  activity:  '#D97706', // Warm Amber — activity data only
  weight:    '#7C3AED', // Violet — scale weight only

  // Capacity state indicators
  optimal:   '#059669',
  moderate:  '#D97706',
  depleted:  '#DC2626',
};

// ─── Formatting & Date Helpers ────────────────────────────────────────────────
export function todayStr() {
  const d = new Date();
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().split('T')[0];
}

export function fmtHours(hours) {
  if (!hours) return '0h';
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// ─── Shared UI Elements ────────────────────────────────────────────────────────
export const Card = ({ children, accent, onClick, style = {} }) => (
  <div onClick={onClick} style={{
    background: C.surface,
    border: `1.5px solid ${C.border}`,
    borderLeft: accent ? `3.5px solid ${accent}` : `1.5px solid ${C.border}`,
    borderRadius: '18px',
    padding: '18px 20px',
    cursor: onClick ? 'pointer' : 'default',
    boxShadow: '0 2px 8px rgba(17,26,32,0.03)',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    ...style,
  }}>
    {children}
  </div>
);

export const ProgressBar = ({ value, max = 100, color = C.recovery, height = 6 }) => {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div style={{ background: '#EAE5DB', borderRadius: height, height, overflow: 'hidden', width: '100%' }}>
      <div style={{ background: color, height: '100%', width: `${pct}%`, borderRadius: height, transition: 'width 0.4s ease-out' }} />
    </div>
  );
};

export const Pill = ({ label, color = C.muted }) => (
  <span style={{ fontSize: '10px', fontWeight: 800, color, background: `${color}14`, border: `1px solid ${color}30`, borderRadius: '6px', padding: '3px 7px', letterSpacing: '0.5px' }}>
    {label.toUpperCase()}
  </span>
);

export const Modal = ({ title, onClose, children }) => (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(17,26,32,0.45)', backdropFilter: 'blur(8px)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
    <div style={{ background: C.surface, border: `1.5px solid ${C.border}`, borderRadius: '24px 24px 0 0', width: '100%', maxWidth: '440px', padding: '24px 20px 48px', animation: 'slideUpModal 0.25s cubic-bezier(0.4,0,0.2,1)', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 -4px 24px rgba(17,26,32,0.1)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <span style={{ fontSize: '16px', fontWeight: 800, color: C.text }}>{title}</span>
        <button onClick={onClose} style={{ background: C.elev, border: `1px solid ${C.border}`, borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: C.sub }}>
          <X size={16} />
        </button>
      </div>
      {children}
    </div>
    <style>{`
      @keyframes slideUpModal {
        from { transform: translateY(100%); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
    `}</style>
  </div>
);

export const FInput = ({ placeholder, value, onChange, type = 'text', style = {}, ...rest }) => (
  <input type={type} placeholder={placeholder} value={value} onChange={onChange}
    style={{ background: C.elev, border: `1.5px solid ${C.border}`, borderRadius: '12px', color: C.text, padding: '12px 14px', fontSize: '14px', width: '100%', outline: 'none', transition: 'border-color 0.15s', ...style }} {...rest} />
);

export const FLabel = ({ children }) => (
  <div style={{ fontSize: '11px', color: C.sub, fontWeight: 700, marginBottom: '6px', letterSpacing: '0.6px', textTransform: 'uppercase' }}>{children}</div>
);

export const FSelect = ({ value, onChange, children, style = {} }) => (
  <select value={value} onChange={onChange}
    style={{ width: '100%', background: C.elev, border: `1.5px solid ${C.border}`, borderRadius: '12px', color: value ? C.text : C.sub, padding: '12px 14px', fontSize: '14px', outline: 'none', minHeight: '44px', ...style }}>
    {children}
  </select>
);

export const BtnPrimary = ({ label, onClick, color = C.recovery, disabled = false, style = {} }) => (
  <button onClick={onClick} disabled={disabled}
    style={{ background: disabled ? '#E5E0D8' : color, color: disabled ? '#8C9B9E' : '#FFFFFF', border: 'none', borderRadius: '14px', padding: '14px', width: '100%', fontSize: '14px', fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer', minHeight: '44px', transition: 'all 0.2s', ...style }}>
    {label}
  </button>
);
