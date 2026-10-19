/* eslint-disable react-refresh/only-export-components */
import React from 'react';
import { X } from 'lucide-react';

import { todayStr } from '../../../lib/dateUtils.js';

// ─── Food Module Design Tokens ────────────────────────────────────────────────
// Zyrbit Brand Visual System: Deep Charcoal, Petrol Teal (#174A55), Muted Teal (#367887), Warm Ivory (#F4F0E8)
export const FC = {
  bg:      '#0B0D0F',
  surface: '#12161A',
  elev:    '#161B22',
  border:  '#1E252D',
  border2: '#27313B',
  text:    '#F4F0E8',
  sub:     '#9CA3AF',
  muted:   '#7A8D94',
  dim:     '#1B2229',

  // Primary brand accents
  food:        '#174A55',
  foodDim:     'rgba(23, 74, 85, 0.18)',
  petrolMuted: '#367887',
  softTeal:    '#DDE9EB',

  // Macro colors (No neon, No purple)
  protein: '#367887',  // Muted Petrol Teal
  carbs:   '#D97706',  // Warm Amber
  fat:     '#7A8D94',  // Neutral Slate
  fiber:   '#4A7C59',  // Sage Green

  // Status
  optimal:  '#1FA36F',
  moderate: '#D97706',
  over:     '#EF4444',
};

export { todayStr };

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
      color: disabled ? FC.muted : '#FFFFFF',
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
