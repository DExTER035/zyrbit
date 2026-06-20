/* eslint-disable react-refresh/only-export-components */
import React from 'react';
import { CheckCircle2, Circle, Flame, X } from 'lucide-react';

// ─── Design Tokens ────────────────────────────────────────────────────────────
export const C = {
  bg:      '#05050B',
  surface: '#0B0B14',
  elev:    '#111118',
  border:  '#1A1A28',
  border2: '#242436',
  growth:  '#00C8D4',
  project: '#FF9800',
  goal:    '#22C55E',
  sprint:  '#2979FF',
  skill:   '#FFB300',
  focus:   '#7F77DD',
  danger:  '#EF4444',
  warn:    '#F59E0B',
  text:    '#E8E8F0',
  sub:     '#9292AA',
  muted:   '#525270',
  dim:     '#32324A',
};

export function fmtTime(secs) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function fmtHours(minutes) {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function daysUntil(dateStr) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr + 'T00:00:00') - new Date().setHours(0, 0, 0, 0)) / 86400000);
}

export function todayStr() {
  return new Date().toISOString().split('T')[0];
}

// ─── Shared UI Primitives ─────────────────────────────────────────────────────
export const Pill = ({ label, color = C.muted }) => (
  <span style={{ fontSize: '9px', fontWeight: 800, color, background: `${color}18`, border: `1px solid ${color}40`, borderRadius: '6px', padding: '2px 7px', letterSpacing: '0.5px' }}>
    {label.toUpperCase()}
  </span>
);

export const SectionLabel = ({ children }) => (
  <div style={{ fontSize: '10px', color: C.muted, fontWeight: 800, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '10px' }}>{children}</div>
);

export const SectionHeader = ({ title, action, actionLabel, actionIcon: ActionIcon }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
    <SectionLabel>{title}</SectionLabel>
    {action && (
      <button onClick={action} style={{ background: 'transparent', border: 'none', color: C.growth, fontSize: '11px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
        {ActionIcon ? <ActionIcon size={12} /> : <span>+</span>}
        {actionLabel || 'Add'}
      </button>
    )}
  </div>
);

export const ProgressBar = ({ value, max = 100, color = C.growth, height = 4 }) => {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div style={{ background: C.dim, borderRadius: height, height }}>
      <div style={{ background: color, height: '100%', width: `${pct}%`, borderRadius: height, transition: 'width 0.6s ease' }} />
    </div>
  );
};

export const Card = ({ children, accent, onClick, style = {} }) => (
  <div onClick={onClick} style={{
    background: C.surface, border: `1px solid ${C.border}`,
    borderLeft: accent ? `3px solid ${accent}` : `1px solid ${C.border}`,
    borderRadius: '18px', padding: '14px 16px',
    cursor: onClick ? 'pointer' : 'default',
    transition: 'border-color 0.2s', ...style,
  }}>
    {children}
  </div>
);

export const EmptyState = ({ icon, title, sub, action, actionLabel, examples = [] }) => (
  <div style={{
    textAlign: 'center', padding: '32px 20px',
    background: C.surface, borderRadius: '20px', border: `1px solid ${C.border}`,
    borderLeft: `3px solid ${C.border2}`,
  }}>
    <div style={{ fontSize: '32px', marginBottom: '12px' }}>{icon}</div>
    <div style={{ fontSize: '15px', fontWeight: 800, color: C.text, marginBottom: '6px' }}>{title}</div>
    <div style={{ fontSize: '12px', color: C.muted, lineHeight: 1.6, marginBottom: examples.length > 0 ? '14px' : (action ? '18px' : 0) }}>{sub}</div>
    {examples.length > 0 && (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center', marginBottom: action ? '18px' : 0 }}>
        {examples.map((ex, i) => (
          <span key={i} onClick={action} style={{
            fontSize: '10px', fontWeight: 700, color: C.growth,
            background: `${C.growth}10`, border: `1px solid ${C.growth}30`,
            borderRadius: '8px', padding: '5px 10px', cursor: 'pointer',
            transition: 'all 0.2s',
          }}>{ex}</span>
        ))}
      </div>
    )}
    {action && (
      <button onClick={action} style={{
        background: C.growth, color: '#000', border: 'none', borderRadius: '14px',
        padding: '10px 24px', fontSize: '12px', fontWeight: 800, cursor: 'pointer',
        boxShadow: `0 4px 16px ${C.growth}30`,
        transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)',
      }}>
        {actionLabel}
      </button>
    )}
  </div>
);

export const Modal = ({ title, onClose, children }) => (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.90)', backdropFilter: 'blur(16px)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
    <div style={{ background: C.surface, border: `1px solid ${C.border2}`, borderRadius: '24px 24px 0 0', width: '100%', maxWidth: '430px', padding: '20px 20px 48px', animation: 'slideUpModal 0.3s cubic-bezier(0.4,0,0.2,1)', maxHeight: '88vh', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <span style={{ fontSize: '16px', fontWeight: 800, color: C.text }}>{title}</span>
        <button onClick={onClose} style={{ background: C.dim, border: 'none', borderRadius: '50%', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: C.sub }}>
          <X size={14} />
        </button>
      </div>
      {children}
    </div>
  </div>
);

export const FInput = ({ placeholder, value, onChange, type = 'text', style = {} }) => (
  <input type={type} placeholder={placeholder} value={value} onChange={onChange}
    style={{ background: C.elev, border: `1px solid ${C.border2}`, borderRadius: '12px', color: C.text, padding: '12px 14px', fontSize: '14px', width: '100%', outline: 'none', ...style }} />
);

export const FLabel = ({ children }) => (
  <div style={{ fontSize: '10px', color: C.muted, fontWeight: 700, marginBottom: '6px', letterSpacing: '0.5px' }}>{children}</div>
);

export const BtnPrimary = ({ label, onClick, color = C.growth, disabled = false, style = {} }) => (
  <button onClick={onClick} disabled={disabled}
    style={{ background: disabled ? C.dim : color, color: disabled ? C.muted : '#000', border: 'none', borderRadius: '14px', padding: '14px', width: '100%', fontSize: '14px', fontWeight: 800, cursor: disabled ? 'not-allowed' : 'pointer', transition: 'all 0.2s', ...style }}>
    {label}
  </button>
);

export const FSelect = ({ value, onChange, children }) => (
  <select value={value} onChange={onChange}
    style={{ width: '100%', background: C.elev, border: `1px solid ${C.border2}`, borderRadius: '10px', color: value ? C.text : C.muted, padding: '10px 12px', fontSize: '13px', outline: 'none' }}>
    {children}
  </select>
);

// ─── TaskRow ──────────────────────────────────────────────────────────────────
export function TaskRow({ task, onComplete, projectName }) {
  const days = daysUntil(task.due_date);
  const isOverdue = days !== null && days < 0 && task.status !== 'done';
  const isDueToday = days === 0 && task.status !== 'done';
  const isDueSoon = days !== null && days > 0 && days <= 2 && task.status !== 'done';
  const done = task.status === 'done';

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: '10px',
      background: done ? 'transparent' : C.surface,
      border: `1px solid ${isOverdue ? C.danger + '60' : done ? C.border : C.border2}`,
      borderRadius: '14px', padding: '12px 14px',
      opacity: done ? 0.45 : 1, transition: 'all 0.2s',
    }}>
      <div onClick={() => !done && onComplete(task)} style={{ cursor: done ? 'default' : 'pointer', flexShrink: 0, marginTop: '1px' }}>
        {done ? <CheckCircle2 size={18} color={C.goal} /> : <Circle size={18} color={C.border2} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: C.text, textDecoration: done ? 'line-through' : 'none', lineHeight: 1.4 }}>{task.name}</div>
        <div style={{ display: 'flex', gap: '8px', marginTop: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
          {projectName && <span style={{ fontSize: '10px', color: C.muted }}>📁 {projectName}</span>}
          {isOverdue && <span style={{ fontSize: '10px', fontWeight: 800, color: C.danger }}>{Math.abs(days)}d overdue</span>}
          {isDueToday && <span style={{ fontSize: '10px', fontWeight: 800, color: C.warn }}>Due today</span>}
          {isDueSoon && <span style={{ fontSize: '10px', fontWeight: 700, color: C.warn }}>In {days}d</span>}
        </div>
      </div>
      {task.priority === 1 && !done && <Flame size={13} color={C.danger} style={{ flexShrink: 0, marginTop: '3px' }} />}
      {task.priority === 2 && !done && <Flame size={13} color={C.warn} style={{ flexShrink: 0, marginTop: '3px' }} />}
    </div>
  );
}
