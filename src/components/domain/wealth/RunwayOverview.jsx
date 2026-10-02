import React from 'react';
import { Activity } from 'lucide-react';

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

const fmtDate = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

function runwayColor(days) {
  if (days == null) return W.muted;
  if (days === 0)   return W.danger;
  if (days < 14)    return W.danger;
  if (days < 30)    return W.warning;
  if (days < 60)    return W.accent;
  return W.success;
}

function runwayLabel(days) {
  if (days == null) return null;
  if (days === 0)   return { color: W.danger,  text: 'Depleted' };
  if (days < 14)    return { color: W.danger,  text: 'Critical' };
  if (days < 30)    return { color: W.warning, text: 'Low' };
  if (days < 60)    return { color: W.accent,  text: 'Steady' };
  if (days < 90)    return { color: W.success, text: 'Safe' };
  return              { color: W.success, text: 'Strong' };
}

export default function RunwayOverview({
  runwayDays    = null,
  runwayHasData = false,
  dailyBurnRate = null,
  safeUntil     = null,
  liquidCash    = 0,
  unpaidBills   = [],
  currencySymbol = '₹',
}) {
  const sym   = currencySymbol;
  const color = runwayColor(runwayDays);
  const label = runwayLabel(runwayDays);

  return (
    <div style={{
      background: `linear-gradient(145deg, ${W.surface} 0%, ${W.card} 100%)`,
      border: `1px solid ${W.border}`,
      borderTop: `3px solid ${color}`,
      borderRadius: '20px',
      padding: '18px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
      boxShadow: `0 0 30px ${color}06, 0 4px 20px rgba(0,0,0,0.25)`,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Activity size={13} color={color} />
          <span style={{ fontSize: '9px', color, fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase' }}>
            MONEY OUTLOOK
          </span>
        </div>
        {label && (
          <span style={{ fontSize: '10px', color: label.color, fontWeight: 800 }}>
            {label.text}
          </span>
        )}
      </div>

      {/* Runway hero */}
      {runwayHasData ? (
        <>
          <div>
            <div style={{ fontSize: '10px', color: W.muted, fontWeight: 700, letterSpacing: '0.8px', marginBottom: '4px' }}>
              Estimated runway
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              {runwayDays === 0 ? (
                <span style={{ fontSize: '32px', fontWeight: 900, color: W.danger }}>Depleted</span>
              ) : (
                <>
                  <span style={{ fontSize: '48px', fontWeight: 900, color: W.text, lineHeight: 1, letterSpacing: '-2px' }}>
                    {runwayDays}
                  </span>
                  <span style={{ fontSize: '16px', color: W.sub, fontWeight: 700 }}>days</span>
                </>
              )}
            </div>
            {safeUntil && runwayDays > 0 && (
              <div style={{ fontSize: '11px', color: W.sub, marginTop: '4px' }}>
                Safe until <span style={{ color, fontWeight: 700 }}>{fmtDate(safeUntil)}</span>
              </div>
            )}
          </div>

          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div style={{ background: W.dim, borderRadius: '12px', padding: '10px 12px' }}>
              <div style={{ fontSize: '9px', color: W.muted, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '4px' }}>
                Burn Rate
              </div>
              <div style={{ fontSize: '16px', fontWeight: 900, color: W.text }}>
                {dailyBurnRate != null ? `${fmt(sym, dailyBurnRate)}/day` : '—'}
              </div>
              <div style={{ fontSize: '9px', color: W.muted, marginTop: '2px' }}>30-day average</div>
            </div>
            <div style={{ background: W.dim, borderRadius: '12px', padding: '10px 12px' }}>
              <div style={{ fontSize: '9px', color: W.muted, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '4px' }}>
                Available Cash
              </div>
              <div style={{ fontSize: '16px', fontWeight: 900, color: liquidCash > 0 ? W.text : W.danger }}>
                {fmt(sym, Math.max(0, liquidCash))}
              </div>
              <div style={{ fontSize: '9px', color: W.muted, marginTop: '2px' }}>logged balance</div>
            </div>
          </div>

          {/* Upcoming bills impact */}
          {unpaidBills.length > 0 && (
            <div style={{
              borderTop: `1px solid ${W.border}`,
              paddingTop: '12px',
              fontSize: '10px',
              color: W.sub,
            }}>
              <span style={{ color: W.warning, fontWeight: 700 }}>
                {unpaidBills.length} upcoming bill{unpaidBills.length > 1 ? 's' : ''}
              </span>
              {' '}will reduce runway when paid.
            </div>
          )}
        </>
      ) : (
        <div style={{ padding: '8px 0' }}>
          <div style={{ fontSize: '13px', color: W.muted, fontWeight: 600, marginBottom: '8px' }}>
            Not enough data to estimate runway.
          </div>
          <div style={{ fontSize: '11px', color: W.muted }}>
            Log at least 3 expenses over the past 30 days to calculate your burn rate and runway.
          </div>
          {liquidCash > 0 && (
            <div style={{
              marginTop: '14px',
              background: W.dim, borderRadius: '12px', padding: '10px 12px',
            }}>
              <div style={{ fontSize: '9px', color: W.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
                Logged Balance
              </div>
              <div style={{ fontSize: '18px', fontWeight: 900, color: W.text }}>
                {fmt(sym, liquidCash)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
