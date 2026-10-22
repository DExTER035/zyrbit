/* eslint-disable react-refresh/only-export-components */
import React from 'react';
import { X } from 'lucide-react';

import { todayStr } from '../../../lib/dateUtils.js';

// ─── Food Module Design Tokens ────────────────────────────────────────────────
// Zyrbit Brand Visual System: Warm Ivory (#F4F0E8), White (#FFFFFF), Border (#E5E0D8), Petrol Teal (#174A55)
export const FC = {
  bg:      'var(--brand-ivory, #F4F0E8)',
  surface: '#FFFFFF',
  elev:    '#FAF7F2',
  border:  'var(--brand-border, #E5E0D8)',
  border2: '#DDD8CE',
  text:    'var(--brand-charcoal, #111A20)',
  sub:     'var(--brand-sub, #68777B)',
  muted:   '#8A9CA3',
  dim:     '#EAE5DB',

  // Primary brand accents
  food:        '#174A55',
  foodDim:     'rgba(23, 74, 85, 0.12)',
  petrolMuted: '#174A55',
  softTeal:    '#DDE9EB',

  // Macro colors
  protein: '#174A55',  // Petrol Teal
  carbs:   '#D97706',  // Warm Amber
  fat:     '#68777B',  // Slate / Charcoal
  fiber:   '#1FA36F',  // Sage Green

  // Status
  optimal:  '#1FA36F',
  moderate: '#D97706',
  over:     '#EF4444',
};

export { todayStr };

// ─── Shared Primitives ────────────────────────────────────────────────────────
export const FCard = ({ children, accent, onClick, style = {} }) => (
  <div onClick={onClick} style={{
    background: '#FFFFFF',
    border: `1px solid ${FC.border}`,
    borderLeft: accent ? `3px solid ${accent}` : `1px solid ${FC.border}`,
    borderRadius: '18px',
    padding: '16px 18px',
    boxShadow: '0 2px 8px rgba(17, 26, 32, 0.03)',
    cursor: onClick ? 'pointer' : 'default',
    transition: 'border-color 0.15s ease',
    ...style,
  }}>
    {children}
  </div>
);

export const FLabel = ({ children }) => (
  <div style={{ fontSize: '11px', color: FC.sub, fontWeight: 700, marginBottom: '8px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
    {children}
  </div>
);

export const FProgressBar = ({ value, max = 100, color = FC.food, height = 5 }) => {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div style={{ background: '#EAE5DB', borderRadius: height, height, overflow: 'hidden', width: '100%' }}>
      <div style={{ background: color, height: '100%', width: `${pct}%`, borderRadius: height, transition: 'width 0.4s ease-out' }} />
    </div>
  );
};

export const FBottomSheet = ({ title, onClose, children }) => (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(17, 26, 32, 0.45)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
    <div style={{ background: '#FFFFFF', border: `1px solid ${FC.border}`, borderRadius: '24px 24px 0 0', width: '100%', maxWidth: '460px', padding: '24px 20px 40px', animation: 'slideUpModal 0.22s cubic-bezier(0.16,1,0.3,1)', maxHeight: '88vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0', boxShadow: '0 -8px 30px rgba(17, 26, 32, 0.12)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <span style={{ fontSize: '17px', fontWeight: 800, color: FC.text, letterSpacing: '-0.01em' }}>{title}</span>
        <button onClick={onClose} style={{ background: '#FAF7F2', border: `1px solid ${FC.border}`, borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: FC.sub }}>
          <X size={15} />
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
      background: disabled ? '#EAE5DB' : color,
      color: disabled ? '#8A9CA3' : '#FFFFFF',
      border: 'none',
      borderRadius: '12px',
      padding: '13px 18px',
      width: '100%',
      fontSize: '13px',
      fontWeight: 800,
      letterSpacing: '0.02em',
      cursor: disabled ? 'not-allowed' : 'pointer',
      transition: 'opacity 0.15s ease',
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
      background: '#FFFFFF',
      border: `1px solid ${FC.border}`,
      borderRadius: '10px',
      color: FC.text,
      padding: '10px 12px',
      fontSize: '13px',
      width: '100%',
      outline: 'none',
      boxSizing: 'border-box',
      ...style,
    }}
    {...rest}
  />
);
