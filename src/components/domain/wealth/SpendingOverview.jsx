import React from 'react';

const W = {
  surface: '#15181B',
  card:    '#1B1F23',
  border:  '#1C1D21',
  border2: '#26272C',
  text:    '#F5F5F5',
  sub:     '#9CA3AF',
  muted:   '#71717A',
  dim:     '#2A3038',
  accent:  '#1FA36F',
  success: '#22C55E',
  warning: '#F59E0B',
  danger:  '#EF4444',
};

const fmt = (sym, n) => {
  const abs = Math.abs(Number(n));
  if (!isFinite(abs) || isNaN(abs)) return `${sym}0`;
  if (abs >= 100000) return `${sym}${(abs / 100000).toFixed(1)}L`;
  if (abs >= 1000)   return `${sym}${abs.toLocaleString('en-IN')}`;
  return `${sym}${abs.toFixed(0)}`;
};

export default function SpendingOverview({
  monthSpend = 0,
  todaySpend = 0,
  zoneBreakdown = [],
  spendingPace = null,
  currencySymbol = '₹',
}) {
  const sym        = currencySymbol;
  const hasSpend   = monthSpend > 0;
  const paceColor  = spendingPace
    ? (spendingPace.status === 'exceeded' ? W.danger
      : spendingPace.status === 'ahead'   ? W.warning
      : W.success)
    : W.muted;

  return (
    <div style={{
      background: W.surface,
      border: `1px solid ${W.border}`,
      borderRadius: '20px',
      padding: '18px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '9px', color: W.muted, fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '6px' }}>
            SPENDING
          </div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: hasSpend ? W.text : W.muted, letterSpacing: '-0.5px' }}>
            {fmt(sym, monthSpend)}
          </div>
          <div style={{ fontSize: '10px', color: W.muted, marginTop: '2px' }}>this month</div>
        </div>
        {todaySpend > 0 && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '9px', color: W.muted, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '4px' }}>TODAY</div>
            <div style={{ fontSize: '16px', fontWeight: 900, color: W.danger }}>−{fmt(sym, todaySpend)}</div>
          </div>
        )}
      </div>

      {/* Spending pace */}
      {spendingPace && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '9px', color: W.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
              Pace vs Time
            </span>
            <span style={{ fontSize: '10px', color: paceColor, fontWeight: 800 }}>{spendingPace.label}</span>
          </div>
          <div style={{ position: 'relative', height: '6px', background: W.dim, borderRadius: '4px', overflow: 'hidden' }}>
            {/* Time elapsed bar */}
            <div style={{
              position: 'absolute', top: 0, left: 0,
              height: '100%', width: `${spendingPace.timePct}%`,
              background: `${W.muted}40`, borderRadius: '4px',
            }} />
            {/* Budget used bar */}
            <div style={{
              position: 'absolute', top: 0, left: 0,
              height: '100%', width: `${spendingPace.budgetPct}%`,
              background: paceColor, borderRadius: '4px',
              transition: 'width 0.5s ease',
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: W.muted }}>
            <span>{spendingPace.timePct}% of month elapsed</span>
            <span>{spendingPace.budgetPct}% of budget used</span>
          </div>
        </div>
      )}

      {/* 4-Zone Breakdown */}
      {hasSpend ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ fontSize: '9px', color: W.muted, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase' }}>
            SPENDING ZONES
          </div>
          {zoneBreakdown.map(z => (
            <div key={z.key}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '13px' }}>{z.emoji}</span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: z.amount > 0 ? W.text : W.muted }}>
                    {z.label}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 900, color: z.amount > 0 ? W.text : W.muted }}>
                    {z.amount > 0 ? fmt(sym, z.amount) : '—'}
                  </span>
                  {z.pct > 0 && (
                    <span style={{ fontSize: '10px', color: W.muted, fontWeight: 600, minWidth: '28px', textAlign: 'right' }}>
                      {z.pct}%
                    </span>
                  )}
                </div>
              </div>
              <div style={{ height: '3px', background: W.dim, borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${z.pct}%`,
                  background: z.pct > 0 ? z.color : 'transparent',
                  borderRadius: '3px',
                  transition: 'width 0.4s ease',
                }} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '8px 0', fontSize: '12px', color: W.muted }}>
          No spending logged this month.
        </div>
      )}
    </div>
  );
}
