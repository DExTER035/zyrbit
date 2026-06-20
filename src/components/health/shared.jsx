/* eslint-disable react-refresh/only-export-components */
import React from 'react';
import { X } from 'lucide-react';

// ─── Design Tokens ────────────────────────────────────────────────────────────
export const C = {
  bg:      '#05050B',
  surface: '#0B0B14',
  elev:    '#111118',
  border:  '#1A1A28',
  border2: '#242436',
  text:    '#E8E8F0',
  sub:     '#9292AA',
  muted:   '#525270',
  dim:     '#32324A',
  
  // Health specific colors
  recovery:  '#10B981', // emerald
  sleep:     '#8B5CF6', // purple
  water:     '#06B6D4', // cyan
  nutrition: '#F59E0B', // amber
  activity:  '#EC4899', // pink
  weight:    '#3B82F6', // blue
  
  // Capacity states
  optimal:   '#10B981',
  moderate:  '#F59E0B',
  depleted:  '#EF4444',
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
    background: C.surface, border: `1px solid ${C.border}`,
    borderLeft: accent ? `3.5px solid ${accent}` : `1px solid ${C.border}`,
    borderRadius: '20px', padding: '16px 18px',
    cursor: onClick ? 'pointer' : 'default',
    transition: 'border-color 0.2s', ...style,
  }}>
    {children}
  </div>
);

export const ProgressBar = ({ value, max = 100, color = C.recovery, height = 5 }) => {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div style={{ background: C.dim, borderRadius: height, height, overflow: 'hidden', width: '100%' }}>
      <div style={{ background: color, height: '100%', width: `${pct}%`, borderRadius: height, transition: 'width 0.4s ease-out' }} />
    </div>
  );
};

export const Pill = ({ label, color = C.muted }) => (
  <span style={{ fontSize: '9px', fontWeight: 800, color, background: `${color}15`, border: `1px solid ${color}35`, borderRadius: '6px', padding: '2px 6px', letterSpacing: '0.5px' }}>
    {label.toUpperCase()}
  </span>
);

export const Modal = ({ title, onClose, children }) => (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
    <div style={{ background: C.surface, border: `1px solid ${C.border2}`, borderRadius: '24px 24px 0 0', width: '100%', maxWidth: '430px', padding: '20px 20px 48px', animation: 'slideUpModal 0.25s cubic-bezier(0.4,0,0.2,1)', maxHeight: '85vh', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <span style={{ fontSize: '15px', fontWeight: 800, color: C.text }}>{title}</span>
        <button onClick={onClose} style={{ background: C.dim, border: 'none', borderRadius: '50%', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: C.sub }}>
          <X size={14} />
        </button>
      </div>
      {children}
    </div>
    <style>{`
      @keyframes slideUpModal {
        from { transform: translateY(100%); }
        to { transform: translateY(0); }
      }
    `}</style>
  </div>
);

export const FInput = ({ placeholder, value, onChange, type = 'text', style = {}, ...rest }) => (
  <input type={type} placeholder={placeholder} value={value} onChange={onChange}
    style={{ background: C.elev, border: `1px solid ${C.border2}`, borderRadius: '12px', color: C.text, padding: '12px 14px', fontSize: '13px', width: '100%', outline: 'none', ...style }} {...rest} />
);

export const FLabel = ({ children }) => (
  <div style={{ fontSize: '10px', color: C.muted, fontWeight: 700, marginBottom: '6px', letterSpacing: '0.5px' }}>{children}</div>
);

export const FSelect = ({ value, onChange, children, style = {} }) => (
  <select value={value} onChange={onChange}
    style={{ width: '100%', background: C.elev, border: `1px solid ${C.border2}`, borderRadius: '12px', color: value ? C.text : C.muted, padding: '12px 14px', fontSize: '13px', outline: 'none', ...style }}>
    {children}
  </select>
);

export const BtnPrimary = ({ label, onClick, color = C.recovery, disabled = false, style = {} }) => (
  <button onClick={onClick} disabled={disabled}
    style={{ background: disabled ? C.dim : color, color: disabled ? C.muted : '#000', border: 'none', borderRadius: '14px', padding: '14px', width: '100%', fontSize: '13px', fontWeight: 800, cursor: disabled ? 'not-allowed' : 'pointer', transition: 'all 0.2s', ...style }}>
    {label}
  </button>
);
