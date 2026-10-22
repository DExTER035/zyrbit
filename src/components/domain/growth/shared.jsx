/* eslint-disable react-refresh/only-export-components */
import React from 'react';
import { CheckCircle2, Circle, Flame, X, Play, Lock } from 'lucide-react';

// ─── Design Tokens ────────────────────────────────────────────────────────────
export const C = {
  bg:      'var(--brand-ivory, #F4F0E8)',
  surface: '#FFFFFF',
  elev:    '#FAF7F2',
  border:  'var(--brand-border, #E5E0D8)',
  border2: '#DDD8CE',
  growth:  '#174A55', // petrol teal
  project: '#174A55',
  goal:    '#1FA36F',
  sprint:  '#174A55',
  skill:   '#F59E0B',
  focus:   '#174A55',
  danger:  '#EF4444',
  warn:    '#F59E0B',
  success: '#1FA36F',
  text:    'var(--brand-charcoal, #111A20)',
  sub:     'var(--brand-sub, #68777B)',
  muted:   '#8A9CA3',
  dim:     '#EAE5DB',
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
  <span style={{ fontSize: '10px', fontWeight: 700, color, background: `${color}14`, border: `1px solid ${color}35`, borderRadius: '6px', padding: '2px 7px', letterSpacing: '0.04em' }}>
    {label.toUpperCase()}
  </span>
);

export const SectionLabel = ({ children }) => (
  <div style={{ fontSize: '11px', color: C.sub, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '8px' }}>{children}</div>
);

export const SectionHeader = ({ title, action, actionLabel, actionIcon: ActionIcon }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
    <SectionLabel>{title}</SectionLabel>
    {action && (
      <button onClick={action} style={{ background: 'transparent', border: 'none', color: C.growth, fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
        {ActionIcon ? <ActionIcon size={13} /> : <span>+</span>}
        {actionLabel || 'Add'}
      </button>
    )}
  </div>
);

export const ProgressBar = ({ value, max = 100, color = C.growth, height = 4 }) => {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div style={{ background: '#EAE5DB', borderRadius: height, height, overflow: 'hidden', width: '100%' }}>
      <div style={{ background: color, height: '100%', width: `${pct}%`, borderRadius: height, transition: 'width 0.4s ease-out' }} />
    </div>
  );
};

export const Card = ({ children, accent, onClick, style = {} }) => (
  <div onClick={onClick} style={{
    background: '#FFFFFF', border: `1px solid ${C.border}`,
    borderLeft: accent ? `3px solid ${accent}` : `1px solid ${C.border}`,
    borderRadius: '16px', padding: '16px',
    boxShadow: '0 2px 8px rgba(17, 26, 32, 0.03)',
    cursor: onClick ? 'pointer' : 'default',
    transition: 'border-color 0.15s ease, transform 0.15s ease', ...style,
  }}>
    {children}
  </div>
);

export const EmptyState = ({ icon, title, sub, action, actionLabel, examples = [] }) => (
  <div style={{
    textAlign: 'center', padding: '32px 20px',
    background: '#FFFFFF', borderRadius: '16px', border: `1px solid ${C.border}`,
    boxShadow: '0 2px 8px rgba(17, 26, 32, 0.03)',
  }}>
    <div style={{ fontSize: '32px', marginBottom: '12px' }}>{icon}</div>
    <div style={{ fontSize: '15px', fontWeight: 700, color: C.text, marginBottom: '6px' }}>{title}</div>
    <div style={{ fontSize: '12.5px', color: C.sub, lineHeight: 1.5, marginBottom: examples.length > 0 ? '14px' : (action ? '18px' : 0) }}>{sub}</div>
    {examples.length > 0 && (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center', marginBottom: action ? '18px' : 0 }}>
        {examples.map((ex, i) => (
          <span key={i} onClick={action} style={{
            fontSize: '11px', fontWeight: 650, color: C.growth,
            background: '#DDE9EB', border: '1px solid #C4DCE0',
            borderRadius: '8px', padding: '5px 10px', cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}>{ex}</span>
        ))}
      </div>
    )}
    {action && (
      <button onClick={action} style={{
        background: C.growth, color: '#FFFFFF', border: 'none', borderRadius: '12px',
        padding: '10px 24px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer',
        boxShadow: '0 2px 8px rgba(23, 74, 85, 0.25)',
        transition: 'opacity 0.15s',
      }}>
        {actionLabel}
      </button>
    )}
  </div>
);

export const Modal = ({ title, subtitle, onClose, children }) => (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(17, 26, 32, 0.65)', backdropFilter: 'blur(8px)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
    <div style={{ background: '#FAF7F2', border: `1px solid ${C.border}`, borderRadius: '24px 24px 0 0', width: '100%', maxWidth: '440px', padding: '20px 20px calc(36px + env(safe-area-inset-bottom, 0px))', animation: 'slideUpModal 0.25s cubic-bezier(0.4,0,0.2,1)', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 -4px 24px rgba(0,0,0,0.12)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 800, color: C.growth, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{title}</div>
          {subtitle && (
            <div style={{ fontSize: '12.5px', color: C.sub, marginTop: '2px', fontWeight: 400 }}>{subtitle}</div>
          )}
        </div>
        <button onClick={onClose} style={{ background: '#EAE5DB', border: 'none', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: C.text }}>
          <X size={14} />
        </button>
      </div>
      {children}
    </div>
  </div>
);

export const FInput = ({ placeholder, value, onChange, type = 'text', style = {} }) => (
  <input type={type} placeholder={placeholder} value={value} onChange={onChange}
    style={{ background: '#FFFFFF', border: `1px solid ${C.border}`, borderRadius: '12px', color: C.text, padding: '12px 14px', fontSize: '13.5px', width: '100%', outline: 'none', boxSizing: 'border-box', ...style }} />
);

export const FLabel = ({ children }) => (
  <div style={{ fontSize: '11px', color: C.sub, fontWeight: 700, marginBottom: '6px', letterSpacing: '0.04em' }}>{children}</div>
);

export const BtnPrimary = ({ label, onClick, color = C.growth, disabled = false, style = {} }) => (
  <button onClick={onClick} disabled={disabled}
    style={{ background: disabled ? C.dim : color, color: disabled ? C.muted : '#FFFFFF', border: 'none', borderRadius: '12px', padding: '13px 16px', width: '100%', fontSize: '13.5px', fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer', transition: 'all 0.15s ease', boxShadow: disabled ? 'none' : '0 2px 8px rgba(23, 74, 85, 0.25)', ...style }}>
    {label}
  </button>
);

export const FSelect = ({ value, onChange, children }) => (
  <select value={value} onChange={onChange}
    style={{ width: '100%', background: '#FFFFFF', border: `1px solid ${C.border}`, borderRadius: '12px', color: value ? C.text : C.muted, padding: '11px 12px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}>
    {children}
  </select>
);

// ─── TaskRow ──────────────────────────────────────────────────────────────────
export function TaskRow({
  task,
  onComplete,
  onDelete,
  onFocus,
  projectName,
  state = null,
  blockedReason = null,
}) {
  const days = daysUntil(task.due_date);
  const isOverdue = days !== null && days < 0 && task.status !== 'done';
  const isDueToday = days === 0 && task.status !== 'done';
  const isDueSoon = days !== null && days > 0 && days <= 2 && task.status !== 'done';
  const done = task.status === 'done';
  const isBlocked = state === 'BLOCKED';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '12px',
      background: done ? 'transparent' : '#FFFFFF',
      border: `1px solid ${isBlocked ? `${C.warn}60` : isOverdue ? `${C.danger}60` : done ? C.border : '#E5E0D8'}`,
      borderRadius: '14px', padding: '12px 14px',
      boxShadow: done ? 'none' : '0 2px 6px rgba(17, 26, 32, 0.02)',
      opacity: done ? 0.45 : isBlocked ? 0.8 : 1, transition: 'all 0.15s ease',
    }}>
      <button
        type="button"
        onClick={() => !done && !isBlocked && onComplete && onComplete(task)}
        disabled={done || isBlocked}
        aria-label={done ? 'Completed' : `Complete ${task.name}`}
        style={{
          cursor: done ? 'default' : isBlocked ? 'not-allowed' : 'pointer',
          flexShrink: 0,
          background: 'transparent',
          border: 'none',
          padding: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {done ? (
          <CheckCircle2 size={19} color="#1FA36F" />
        ) : isBlocked ? (
          <Lock size={16} color={C.warn} />
        ) : (
          <Circle size={19} color="#8A9CA3" />
        )}
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '13.5px',
          fontWeight: 650,
          color: isBlocked ? C.sub : C.text,
          textDecoration: done ? 'line-through' : 'none',
          lineHeight: 1.35,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {task.name}
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: '3px', alignItems: 'center', flexWrap: 'wrap' }}>
          {projectName && <span style={{ fontSize: '10.5px', color: C.sub }}>📁 {projectName}</span>}
          {isOverdue && <span style={{ fontSize: '10px', fontWeight: 800, color: C.danger }}>{Math.abs(days)}d overdue</span>}
          {isDueToday && <span style={{ fontSize: '10px', fontWeight: 800, color: C.warn }}>Due today</span>}
          {isDueSoon && <span style={{ fontSize: '10px', fontWeight: 700, color: C.warn }}>In {days}d</span>}
          {isBlocked && (
            <span style={{ fontSize: '10px', fontWeight: 700, color: C.warn }}>
              🔒 {blockedReason || 'Blocked by prerequisite'}
            </span>
          )}
        </div>
      </div>

      {task.priority === 1 && !done && <Flame size={14} color={C.danger} style={{ flexShrink: 0 }} />}
      {task.priority === 2 && !done && <Flame size={14} color={C.warn} style={{ flexShrink: 0 }} />}

      {/* Optional 1-tap focus session button */}
      {onFocus && !done && !isBlocked && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onFocus(task); }}
          style={{
            background: '#DDE9EB',
            border: '1px solid #C4DCE0',
            color: '#174A55',
            borderRadius: '8px',
            padding: '5px 10px',
            fontSize: '11px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            flexShrink: 0,
            transition: 'opacity 0.15s ease',
          }}
        >
          <Play size={10} fill="#174A55" /> Focus
        </button>
      )}

      {onDelete && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(task); }}
          style={{
            background: 'none', border: 'none', padding: '4px', cursor: 'pointer',
            color: C.muted, display: 'flex', alignItems: 'center', justifyContent: 'center',
            outline: 'none', transition: 'color 0.15s ease', flexShrink: 0
          }}
          onMouseEnter={e => e.currentTarget.style.color = C.danger}
          onMouseLeave={e => e.currentTarget.style.color = C.muted}
          aria-label="Delete Task"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

