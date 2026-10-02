import React from 'react';
import { Sparkles, ShieldCheck, AlertCircle } from 'lucide-react';

const W = {
  bg:      '#0B0D0F',
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
  if (!isFinite(abs) || isNaN(abs)) return `${sym}—`;
  if (abs >= 100000) return `${sym}${(abs / 100000).toFixed(1)}L`;
  if (abs >= 1000)   return `${sym}${abs.toLocaleString('en-IN')}`;
  return `${sym}${abs.toFixed(0)}`;
};

function Stat({ label, value, valueColor, badge, hint }) {
  return (
    <div style={{
      background: W.card,
      border: `1px solid ${W.border}`,
      borderRadius: '14px',
      padding: '14px 12px',
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '9px', color: W.muted, fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase' }}>
          {label}
        </span>
        {badge && (
          <span style={{ fontSize: '8px', color: badge.color, fontWeight: 700, letterSpacing: '0.5px', background: `${badge.color}18`, padding: '2px 5px', borderRadius: '4px' }}>
            {badge.text}
          </span>
        )}
      </div>
      <div style={{ fontSize: '18px', fontWeight: 900, color: valueColor || W.text, letterSpacing: '-0.5px' }}>
        {value}
      </div>
      {hint && (
        <div style={{ fontSize: '9px', color: W.muted, fontWeight: 600 }}>{hint}</div>
      )}
    </div>
  );
}

export default function MoneyOverview({ moneyState, currencySymbol = '₹' }) {
  const {
    safeToSpendDaily,
    safeToSpendStatus,
    safeToSpendHint,
    unencumberedCash,
    liquidCash,
    spendingPace,
    upcomingBillTotal,
    daysLeft,
    monthlyBudget,
    budgetRemaining,
  } = moneyState;

  const sym = currencySymbol;
  const isConstrained = safeToSpendStatus !== 'active';
  const accentColor = isConstrained ? W.warning : W.accent;

  const paceColor = spendingPace
    ? (spendingPace.status === 'exceeded' ? W.danger
      : spendingPace.status === 'ahead'   ? W.warning
      : W.success)
    : W.muted;

  return (
    <div style={{
      background: `linear-gradient(160deg, ${W.surface} 0%, ${W.card} 100%)`,
      border: `1px solid ${W.border}`,
      borderTop: `3px solid ${accentColor}`,
      borderRadius: '24px',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '18px',
      boxShadow: `0 0 40px ${accentColor}08, 0 4px 24px rgba(0,0,0,0.3)`,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* ambient glow */}
      <div style={{
        position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
        width: '260px', height: '100px',
        background: `radial-gradient(ellipse at top, ${accentColor}10 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Sparkles size={13} color={accentColor} />
          <span style={{ fontSize: '9px', color: accentColor, fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase' }}>
            MONEY OVERVIEW
          </span>
        </div>
        <span style={{ fontSize: '9px', color: W.muted, fontWeight: 700 }}>
          {daysLeft} {daysLeft === 1 ? 'day' : 'days'} left in month
        </span>
      </div>

      {/* Hero: Safe to Spend */}
      <div>
        <div style={{ fontSize: '10px', color: W.muted, fontWeight: 700, letterSpacing: '0.8px', marginBottom: '6px' }}>
          Safe to spend today
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
          <span style={{ fontSize: '48px', fontWeight: 900, color: W.text, lineHeight: 1, letterSpacing: '-2px' }}>
            {fmt(sym, safeToSpendDaily)}
          </span>
          <span style={{ fontSize: '14px', color: W.sub, fontWeight: 700 }}>/ day</span>
        </div>
        {safeToSpendHint && (
          <div style={{ fontSize: '10px', color: W.warning, fontWeight: 600, marginTop: '4px' }}>
            {safeToSpendHint}
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <Stat
          label="Unencumbered"
          value={fmt(sym, unencumberedCash)}
          valueColor={unencumberedCash > 0 ? W.text : W.muted}
          badge={{ text: 'ESTIMATED', color: W.muted }}
          hint={upcomingBillTotal > 0 ? `After ${fmt(sym, upcomingBillTotal)} in bills` : 'No pending bills'}
        />
        <Stat
          label="Current Balance"
          value={liquidCash > 0 ? fmt(sym, liquidCash) : '—'}
          valueColor={liquidCash > 0 ? W.text : W.muted}
          badge={{ text: 'LOGGED', color: W.accent }}
          hint={liquidCash <= 0 ? 'Log income to track balance' : 'Income minus expenses'}
        />
      </div>

      {/* Spending Pace */}
      {(spendingPace || monthlyBudget) && (
        <div style={{
          borderTop: `1px solid ${W.border}`,
          paddingTop: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <AlertCircle size={12} color={paceColor} />
              <span style={{ fontSize: '10px', color: W.sub, fontWeight: 700 }}>Spending pace</span>
            </div>
            <span style={{ fontSize: '11px', color: paceColor, fontWeight: 800 }}>
              {spendingPace ? spendingPace.label : '—'}
            </span>
          </div>

          {monthlyBudget && spendingPace && (
            <div>
              <div style={{ height: '4px', background: W.dim, borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${spendingPace.budgetPct}%`,
                  background: paceColor,
                  borderRadius: '4px',
                  transition: 'width 0.5s ease',
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '9px', color: W.muted }}>
                <span>Budget: {fmt(sym, monthlyBudget)}</span>
                <span>Remaining: {fmt(sym, budgetRemaining ?? 0)}</span>
              </div>
            </div>
          )}

          {!monthlyBudget && (
            <div style={{ fontSize: '9px', color: W.muted, fontWeight: 600 }}>
              Set a monthly budget in Settings to track pace.
            </div>
          )}
        </div>
      )}

      {/* Bills reserved note */}
      {upcomingBillTotal > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          borderTop: `1px solid ${W.border}`, paddingTop: '10px',
        }}>
          <ShieldCheck size={13} color={W.warning} />
          <span style={{ fontSize: '10px', color: W.sub, fontWeight: 600 }}>
            <span style={{ color: W.warning, fontWeight: 800 }}>{fmt(sym, upcomingBillTotal)}</span>
            {' '}reserved for upcoming bills
          </span>
        </div>
      )}
    </div>
  );
}
