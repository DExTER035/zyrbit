/* eslint-disable react-refresh/only-export-components */
import React from 'react';
import { X } from 'lucide-react';

// ─── Food Module Design Tokens ────────────────────────────────────────────────
// Inherits from DexOS design system. Food accent = amber/warm.
export const FC = {
  bg:      'var(--bg-page, #F5F8FC)',
  surface: 'var(--bg-card, #FFFFFF)',
  elev:    'var(--bg-page, #F5F8FC)',
  border:  'var(--border-primary, #E4EAF2)',
  border2: 'var(--border-primary, #E4EAF2)',
  text:    'var(--text-primary, #172033)',
  sub:     'var(--text-secondary, #68758A)',
  muted:   '#94A3B8',
  dim:     '#E2E8F0',

  // Food pillar accent — emerald / warm
  food:    '#08B878',
  foodDim: 'rgba(8, 184, 120, 0.12)',

  // Macro colors
  protein: '#08B878',  // emerald
  carbs:   '#D97706',  // amber
  fat:     '#8866E9',  // violet
  fiber:   '#3296F4',  // blue

  // Status
  optimal:  '#08B878',
  moderate: '#D97706',
  over:     '#EF4444',
};

// ─── Date Helper ──────────────────────────────────────────────────────────────
export function todayStr() {
  const d = new Date();
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().split('T')[0];
}

// ─── Shared Primitives ────────────────────────────────────────────────────────
export const FCard = ({ children, accent, onClick, style = {} }) => (
  <div onClick={onClick} style={{
    background: FC.surface,
    border: `1px solid ${FC.border}`,
    borderLeft: accent ? `3px solid ${accent}` : `1px solid ${FC.border}`,
    borderRadius: '16px',
    padding: '16px 18px',
    cursor: onClick ? 'pointer' : 'default',
    transition: 'border-color 0.2s',
    ...style,
  }}>
    {children}
  </div>
);

export const FLabel = ({ children }) => (
  <div style={{ fontSize: '10px', color: FC.muted, fontWeight: 700, marginBottom: '8px', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
    {children}
  </div>
);

export const FProgressBar = ({ value, max = 100, color = FC.food, height = 5 }) => {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div style={{ background: FC.dim, borderRadius: height, height, overflow: 'hidden', width: '100%' }}>
      <div style={{ background: color, height: '100%', width: `${pct}%`, borderRadius: height, transition: 'width 0.4s ease-out' }} />
    </div>
  );
};

export const FBottomSheet = ({ title, onClose, children }) => (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(16px)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
    <div style={{ background: FC.surface, border: `1px solid ${FC.border}`, borderRadius: '16px 16px 0 0', width: '100%', maxWidth: '430px', padding: '24px 20px 40px', animation: 'slideUpModal 0.25s cubic-bezier(0.4,0,0.2,1)', maxHeight: '88vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <span style={{ fontSize: '16px', fontWeight: 700, color: FC.text }}>{title}</span>
        <button onClick={onClose} style={{ background: FC.dim, border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: FC.sub }}>
          <X size={14} />
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

export const FBtn = ({ label, onClick, color = FC.food, disabled = false, style = {} }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      background: disabled ? FC.dim : color,
      color: disabled ? FC.muted : '#000',
      border: 'none',
      borderRadius: '14px',
      padding: '14px',
      width: '100%',
      fontSize: '13px',
      fontWeight: 800,
      cursor: disabled ? 'not-allowed' : 'pointer',
      transition: 'all 0.2s',
      ...style,
    }}
  >
    {label}
  </button>
);

export const FInput = ({ placeholder, value, onChange, type = 'text', style = {}, ...rest }) => (
  <input
    type={type}
    placeholder={placeholder}
    value={value}
    onChange={onChange}
    style={{
      background: FC.elev,
      border: `1px solid ${FC.border2}`,
      borderRadius: '12px',
      color: FC.text,
      padding: '12px 14px',
      fontSize: '13px',
      width: '100%',
      outline: 'none',
      boxSizing: 'border-box',
      ...style,
    }}
    {...rest}
  />
);
