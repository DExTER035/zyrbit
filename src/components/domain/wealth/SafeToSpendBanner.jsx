import React from 'react';
import { ShieldCheck, Sparkles, AlertCircle } from 'lucide-react';

const W = {
  surface: '#15181B',
  card:    '#1B1F23',
  border:  '#1E2126',
  border2: '#262B31',
  text:    '#F8FAFC',
  sub:     '#94A3B8',
  muted:   '#64748B',
  accent:  '#1FA36F',
  warning: '#F59E0B',
  danger:  '#EF4444',
};

const fmtCurrency = (sym, amount) => {
  const n = Math.abs(Number(amount));
  if (isNaN(n) || !isFinite(n)) return `${sym}0`;
  if (n >= 100000) return `${sym}${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `${sym}${n.toLocaleString('en-IN')}`;
  return `${sym}${n.toFixed(0)}`;
};

export default function SafeToSpendBanner({
  safeData = {},
  paceData = null,
  currencySymbol = '₹',
}) {
  const {
    safeToSpendDaily = 0,
    upcomingBillTotal = 0,
    daysLeftInMonth = 1,
    status = 'active',
    text = 'Safe to spend today',
    hint = 'Based on your logged data.',
  } = safeData;

  const isZero = status === 'zero' || safeToSpendDaily === 0;

  return (
    <div
      style={{
        background: `linear-gradient(145deg, ${W.surface} 0%, ${W.card} 100%)`,
        border: `1px solid ${W.border}`,
        borderTop: `3px solid ${isZero ? W.warning : W.accent}`,
        borderRadius: '24px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        boxShadow: `0 0 30px ${isZero ? W.warning : W.accent}0A, 0 4px 20px rgba(0,0,0,0.3)`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Ambient background glow */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '220px',
          height: '80px',
          background: `radial-gradient(ellipse at top, ${isZero ? W.warning : W.accent}0D 0%, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />

      {/* Header Label */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Sparkles size={14} color={isZero ? W.warning : W.accent} />
          <span style={{ fontSize: '10px', color: isZero ? W.warning : W.accent, fontWeight: 800, letterSpacing: '1.5px', textTransform: 'uppercase' }}>
            SAFE TO SPEND TODAY
          </span>
        </div>
        <span style={{ fontSize: '10px', color: W.muted, fontWeight: 700 }}>
          {daysLeftInMonth} {daysLeftInMonth === 1 ? 'day' : 'days'} left
        </span>
      </div>

      {/* Hero Number Display */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
          <span style={{ fontSize: '42px', fontWeight: 900, color: W.text, lineHeight: 1, letterSpacing: '-1px' }}>
            {fmtCurrency(currencySymbol, safeToSpendDaily)}
          </span>
          <span style={{ fontSize: '14px', color: W.sub, fontWeight: 700 }}>/ day</span>
        </div>
        <div style={{ fontSize: '11px', color: W.sub, marginTop: '4px', fontWeight: 500 }}>
          {text} · <span style={{ color: W.muted }}>{hint}</span>
        </div>
      </div>

      {/* Secondary Intelligence Indicators */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: upcomingBillTotal > 0 ? '1fr 1fr' : '1fr',
          gap: '10px',
          borderTop: `1px solid ${W.border}`,
          paddingTop: '14px',
        }}
      >
        {/* Reserved Bills Shield */}
        {upcomingBillTotal > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={16} color={W.warning} />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '9px', color: W.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                Reserved Bills
              </span>
              <span style={{ fontSize: '12px', fontWeight: 800, color: W.text }}>
                {fmtCurrency(currencySymbol, upcomingBillTotal)}
              </span>
            </div>
          </div>
        )}

        {/* Spending Pace Indicator */}
        {paceData && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} color={paceData.status === 'ahead' ? W.warning : W.accent} />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '9px', color: W.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                Spending Pace
              </span>
              <span style={{ fontSize: '11px', fontWeight: 800, color: paceData.status === 'ahead' ? W.warning : W.text }}>
                {paceData.text}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Honest Disclaimer Tag */}
      <div style={{ fontSize: '9px', color: W.muted, fontWeight: 600, textAlign: 'center', letterSpacing: '0.5px' }}>
        Based on your logged data.
      </div>
    </div>
  );
}
