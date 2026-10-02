/**
 * Zyrbit Shared Primitives
 * Exported from one file to keep the bundle clean.
 * These represent Zyrbit's visual language — not generic UI components.
 */

import React from 'react';
import { Z } from './tokens';

// ─── StateSentence ────────────────────────────────────────────────────────────
// The primary editorial element. Big sentence, optional supporting line.
export function StateSentence({ sentence, support, accentWord, italic = false, size = 'md' }) {
  const sizes = {
    sm: { sentence: '18px', support: '12px' },
    md: { sentence: '24px', support: '13px' },
    lg: { sentence: '30px', support: '14px' },
    xl: { sentence: '36px', support: '14px' },
  };
  const s = sizes[size] || sizes.md;

  // Bold-accent: wrap accentWord in a colored span
  const renderSentence = () => {
    if (!accentWord || !sentence.includes(accentWord)) {
      return sentence;
    }
    const [before, after] = sentence.split(accentWord);
    return (
      <>
        {before}
        <span style={{ color: Z.amber, fontStyle: 'italic' }}>{accentWord}</span>
        {after}
      </>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
      <div style={{
        fontSize: s.sentence,
        fontWeight: 800,
        color: Z.text,
        letterSpacing: '-0.03em',
        lineHeight: 1.2,
        fontStyle: italic ? 'italic' : 'normal',
      }}>
        {renderSentence()}
      </div>
      {support && (
        <div style={{
          fontSize: s.support,
          color: Z.sub,
          fontWeight: 400,
          letterSpacing: '0.01em',
          lineHeight: 1.4,
        }}>
          {support}
        </div>
      )}
    </div>
  );
}

// ─── HairlineDivider ─────────────────────────────────────────────────────────
export function HairlineDivider({ label, mt = 0, mb = 0 }) {
  if (!label) {
    return <div style={{ borderBottom: `1px solid ${Z.border}`, marginTop: mt, marginBottom: mb }} />;
  }
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      marginTop: mt,
      marginBottom: mb,
    }}>
      <div style={{ flex: 1, borderBottom: `1px solid ${Z.border}` }} />
      <span style={{ fontSize: '10px', fontWeight: 700, color: Z.dim, letterSpacing: '0.12em', textTransform: 'uppercase', flexShrink: 0 }}>
        {label}
      </span>
      <div style={{ flex: 1, borderBottom: `1px solid ${Z.border}` }} />
    </div>
  );
}

// ─── ContextLabel ─────────────────────────────────────────────────────────────
// Small uppercase domain label (e.g. HEALTH · WEALTH · GROWTH)
export function ContextLabel({ label, color, dot = false }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
      {dot && (
        <div style={{
          width: '5px', height: '5px', borderRadius: '50%',
          background: color || Z.accent, flexShrink: 0,
        }} />
      )}
      <span style={{
        fontSize: '10px',
        fontWeight: 700,
        color: color || Z.dim,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
      }}>
        {label}
      </span>
    </div>
  );
}

// ─── DomainRow ────────────────────────────────────────────────────────────────
// Used in Zenith — horizontal row: [label | sentence | value]
export function DomainRow({ label, labelColor, sentence, value, valueColor, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 0',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'opacity 0.15s',
      }}
      onMouseEnter={(e) => { if (onClick) e.currentTarget.style.opacity = '0.72'; }}
      onMouseLeave={(e) => { if (onClick) e.currentTarget.style.opacity = '1'; }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, minWidth: 0 }}>
        <ContextLabel label={label} color={labelColor} dot />
        <div style={{
          fontSize: '14px',
          color: Z.sub,
          fontWeight: 400,
          lineHeight: 1.35,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: '240px',
        }}>
          {sentence}
        </div>
      </div>
      {value && (
        <div style={{
          fontSize: '18px',
          fontWeight: 900,
          color: valueColor || Z.text,
          letterSpacing: '-0.03em',
          flexShrink: 0,
          marginLeft: '12px',
        }}>
          {value}
        </div>
      )}
    </div>
  );
}

// ─── MomentumPath ─────────────────────────────────────────────────────────────
// Vertical path with milestone nodes for Growth
export function MomentumPath({ items, onComplete }) {
  if (!items || items.length === 0) {
    return (
      <div style={{ padding: '24px 0', textAlign: 'center' }}>
        <div style={{ fontSize: '13px', color: Z.muted }}>Nothing pending today.</div>
        <div style={{ fontSize: '12px', color: Z.dim, marginTop: '4px' }}>All clear.</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {items.map((item, idx) => {
        const isDone = item.status === 'done';
        const isFirst = idx === 0;
        const isLast = idx === items.length - 1;
        const isOverdue = item.due_date && item.due_date < new Date().toISOString().split('T')[0];

        return (
          <div key={item.id} style={{ display: 'flex', gap: '14px', position: 'relative' }}>
            {/* Vertical line */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
              {/* Node */}
              <div style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: isDone ? Z.accent : 'transparent',
                border: `2px solid ${isDone ? Z.accent : isFirst && !isDone ? Z.text : Z.dim}`,
                marginTop: isFirst ? '18px' : '0',
                flexShrink: 0,
                transition: 'all 0.2s',
                zIndex: 1,
              }} />
              {/* Connector */}
              {!isLast && (
                <div style={{
                  width: '1px',
                  flex: 1,
                  background: isDone ? `${Z.accent}40` : Z.border,
                  minHeight: '20px',
                }} />
              )}
            </div>

            {/* Content */}
            <div style={{
              flex: 1,
              paddingTop: isFirst ? '12px' : '0',
              paddingBottom: isLast ? '4px' : '20px',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: isFirst && !isDone ? '16px' : '14px',
                    fontWeight: isFirst && !isDone ? 700 : 500,
                    color: isDone ? Z.muted : isFirst ? Z.text : Z.sub,
                    lineHeight: 1.3,
                    textDecoration: isDone ? 'line-through' : 'none',
                    transition: 'all 0.2s',
                  }}>
                    {item.name}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '3px', alignItems: 'center' }}>
                    {item.project_name && (
                      <span style={{ fontSize: '11px', color: Z.dim }}>{item.project_name}</span>
                    )}
                    {isOverdue && !isDone && (
                      <span style={{ fontSize: '10px', color: Z.danger, fontWeight: 700 }}>overdue</span>
                    )}
                    {item.priority === 1 && !isDone && (
                      <span style={{ fontSize: '10px', color: Z.amber, fontWeight: 700 }}>critical</span>
                    )}
                  </div>
                </div>
                {!isDone && onComplete && (
                  <button
                    onClick={() => onComplete(item)}
                    style={{
                      background: 'transparent',
                      border: `1px solid ${Z.dim}`,
                      borderRadius: '6px',
                      padding: '4px 10px',
                      color: Z.muted,
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      flexShrink: 0,
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = Z.accent;
                      e.currentTarget.style.color = Z.accent;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = Z.dim;
                      e.currentTarget.style.color = Z.muted;
                    }}
                  >
                    Done
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── BodyRhythmRow ────────────────────────────────────────────────────────────
// Health dimension row: label | state | value
export function BodyRhythmRow({ label, state, value, stateColor, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 0',
        borderBottom: `1px solid ${Z.border}`,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'opacity 0.15s',
      }}
      onMouseEnter={(e) => { if (onClick) e.currentTarget.style.opacity = '0.75'; }}
      onMouseLeave={(e) => { if (onClick) e.currentTarget.style.opacity = '1'; }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <ContextLabel label={label} color={Z.dim} />
        <div style={{ fontSize: '14px', color: stateColor || Z.sub, fontWeight: 500, lineHeight: 1.3 }}>
          {state}
        </div>
      </div>
      {value && (
        <div style={{ fontSize: '15px', fontWeight: 700, color: Z.sub, letterSpacing: '-0.02em', flexShrink: 0 }}>
          {value}
        </div>
      )}
    </div>
  );
}

// ─── PromiseRow ────────────────────────────────────────────────────────────────
// A single money promise / bill row for Wealth
export function PromiseRow({ label, person, amount, dueDate, isPaid, onAction, actionLabel, currencySymbol = '₹' }) {
  const isOverdue = dueDate && dueDate < new Date().toISOString().split('T')[0];

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '13px 0',
      borderBottom: `1px solid ${Z.border}`,
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '14px',
          color: isPaid ? Z.muted : Z.text,
          fontWeight: isPaid ? 400 : 500,
          textDecoration: isPaid ? 'line-through' : 'none',
        }}>
          {person ? `${person} · ` : ''}{label}
        </div>
        <div style={{ fontSize: '11px', color: isOverdue ? Z.danger : Z.dim, fontWeight: isOverdue ? 600 : 400 }}>
          {dueDate ? new Date(dueDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
          {isOverdue && !isPaid ? ' · overdue' : ''}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
        <div style={{
          fontSize: '15px',
          fontWeight: 700,
          color: isPaid ? Z.muted : Z.blue,
          letterSpacing: '-0.02em',
        }}>
          {currencySymbol}{Number(amount || 0).toLocaleString()}
        </div>
        {onAction && (
          <button
            onClick={onAction}
            style={{
              background: isPaid ? 'transparent' : `${Z.accent}15`,
              border: `1px solid ${isPaid ? Z.dim : Z.accent}40`,
              borderRadius: '6px',
              padding: '4px 10px',
              color: isPaid ? Z.muted : Z.accent,
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'all 0.15s',
            }}
          >
            {actionLabel || (isPaid ? 'Undo' : 'Done')}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── MoneyFlowDiagram ─────────────────────────────────────────────────────────
// Simple tree: total → [income sources] → commitments/spending
export function MoneyFlowDiagram({ liquidCash, monthlyIncome, commitments, dailySpend, currencySymbol = '₹' }) {
  const fmt = (n) => {
    if (!n || isNaN(n)) return '—';
    if (Math.abs(n) >= 100000) return `${currencySymbol}${(n / 100000).toFixed(1)}L`;
    if (Math.abs(n) >= 1000) return `${currencySymbol}${(n / 1000).toFixed(1)}k`;
    return `${currencySymbol}${Math.round(n).toLocaleString()}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0', padding: '4px 0' }}>
      {/* Available node */}
      <div style={{ paddingBottom: '16px' }}>
        <div style={{ fontSize: '11px', color: Z.dim, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '4px' }}>Available</div>
        <div style={{ fontSize: '32px', fontWeight: 900, color: liquidCash > 0 ? Z.text : Z.danger, letterSpacing: '-0.04em', lineHeight: 1 }}>
          {fmt(liquidCash)}
        </div>
      </div>

      {/* Flow lines */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingLeft: '16px', borderLeft: `1px solid ${Z.border}` }}>
        {monthlyIncome > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '16px', height: '1px', background: Z.accent }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
              <div style={{ fontSize: '10px', color: Z.dim, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>In</div>
              <div style={{ fontSize: '14px', color: Z.accent, fontWeight: 700 }}>{fmt(monthlyIncome)} / mo</div>
            </div>
          </div>
        )}
        {commitments > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '16px', height: '1px', background: Z.amber }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
              <div style={{ fontSize: '10px', color: Z.dim, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Committed</div>
              <div style={{ fontSize: '14px', color: Z.amber, fontWeight: 700 }}>{fmt(commitments)} this month</div>
            </div>
          </div>
        )}
        {dailySpend > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '16px', height: '1px', background: Z.dim }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
              <div style={{ fontSize: '10px', color: Z.dim, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Spent today</div>
              <div style={{ fontSize: '14px', color: Z.sub, fontWeight: 500 }}>{fmt(dailySpend)}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── TimeSpine ────────────────────────────────────────────────────────────────
// Simple daily arc for Zenith
export function TimeSpine({ events = [] }) {
  const now = new Date();
  const hour = now.getHours();
  const totalHours = 18; // 6am to midnight
  const startHour = 6;
  const pct = Math.max(0, Math.min(1, (hour - startHour) / totalHours));

  return (
    <div style={{ position: 'relative', padding: '8px 0 4px', userSelect: 'none' }}>
      {/* Time labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
        {['Morning', 'Afternoon', 'Evening'].map((t) => (
          <span key={t} style={{ fontSize: '9px', color: Z.dim, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{t}</span>
        ))}
      </div>

      {/* Track */}
      <div style={{ position: 'relative', height: '2px', background: Z.border, borderRadius: '1px' }}>
        {/* Elapsed portion */}
        <div style={{
          position: 'absolute',
          left: 0,
          top: 0,
          height: '100%',
          width: `${pct * 100}%`,
          background: Z.accent,
          borderRadius: '1px',
          transition: 'width 0.5s',
        }} />

        {/* Now indicator */}
        <div style={{
          position: 'absolute',
          left: `${pct * 100}%`,
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: Z.accent,
          boxShadow: `0 0 8px ${Z.accent}80`,
        }} />

        {/* Event dots */}
        {events.map((ev, i) => {
          const evPct = Math.max(0, Math.min(1, (ev.hour - startHour) / totalHours));
          const isPast = ev.hour < hour;
          return (
            <div
              key={i}
              title={ev.label}
              style={{
                position: 'absolute',
                left: `${evPct * 100}%`,
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: isPast ? ev.color || Z.sub : 'transparent',
                border: `1px solid ${ev.color || Z.sub}`,
              }}
            />
          );
        })}
      </div>

      {/* Current time label */}
      <div style={{
        position: 'absolute',
        left: `${pct * 100}%`,
        top: '0',
        transform: 'translateX(-50%)',
        marginTop: '-18px',
        fontSize: '9px',
        color: Z.accent,
        fontWeight: 700,
        whiteSpace: 'nowrap',
      }}>
        {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
      </div>
    </div>
  );
}
