import React from 'react';
import { Plus, Edit3, X } from 'lucide-react';

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
};

const INC_SOURCES = {
  'Salary':      '💼',
  'Freelance':   '🛠',
  'Side Income': '🚀',
  'One-time':    '🎁',
};

const fmt = (sym, n) => {
  const abs = Math.abs(Number(n));
  if (!isFinite(abs) || isNaN(abs)) return `${sym}0`;
  if (abs >= 100000) return `${sym}${(abs / 100000).toFixed(1)}L`;
  if (abs >= 1000)   return `${sym}${abs.toLocaleString('en-IN')}`;
  return `${sym}${abs.toFixed(0)}`;
};

const fmtDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export default function IncomeOverview({
  monthEarned   = 0,
  recentIncomes = [],
  currencySymbol = '₹',
  onAddIncome,
  onEditIncome,
  onDeleteIncome,
}) {
  const sym      = currencySymbol;
  const hasItems = recentIncomes.length > 0;

  return (
    <div style={{
      background: W.surface,
      border: `1px solid ${W.border}`,
      borderRadius: '20px',
      padding: '18px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '9px', color: W.muted, fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '6px' }}>
            INCOME
          </div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: monthEarned > 0 ? W.success : W.muted, letterSpacing: '-0.5px' }}>
            {monthEarned > 0 ? `+${fmt(sym, monthEarned)}` : '—'}
          </div>
          <div style={{ fontSize: '10px', color: W.muted, marginTop: '2px' }}>this month</div>
        </div>
        <button
          id="add-income-btn"
          onClick={onAddIncome}
          style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            fontSize: '11px', color: W.accent, fontWeight: 800,
            background: 'transparent', border: 'none', cursor: 'pointer', padding: 0,
            marginTop: '2px',
          }}
        >
          <Plus size={13} />
          Add Income
        </button>
      </div>

      {/* Recent Income Entries */}
      {hasItems ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {recentIncomes.map(inc => (
            <div
              key={inc.id}
              style={{
                background: W.card,
                border: `1px solid ${W.border}`,
                borderRadius: '12px',
                padding: '10px 12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', minWidth: 0 }}>
                <span style={{ fontSize: '16px', flexShrink: 0 }}>
                  {INC_SOURCES[inc.source] || '💰'}
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: W.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {inc.note || inc.source}
                  </div>
                  <div style={{ fontSize: '10px', color: W.muted, marginTop: '1px' }}>
                    {inc.source} · {fmtDate(inc.income_date)}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0, marginLeft: '8px' }}>
                <span style={{ fontSize: '14px', fontWeight: 900, color: W.success }}>
                  +{fmt(sym, inc.amount)}
                </span>
                <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
                  <button
                    onClick={() => onEditIncome(inc)}
                    style={{ fontSize: '9px', color: W.accent, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 700 }}
                  >
                    <Edit3 size={10} />
                  </button>
                  <button
                    onClick={() => onDeleteIncome(inc.id)}
                    style={{ fontSize: '9px', color: W.muted, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
                  >
                    <X size={10} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '8px 0', fontSize: '12px', color: W.muted }}>
          No income logged this month.
        </div>
      )}
    </div>
  );
}
