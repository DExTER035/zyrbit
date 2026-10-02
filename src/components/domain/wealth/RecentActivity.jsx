import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Edit3, X } from 'lucide-react';

const W = {
  surface: '#15181B',
  card:    '#1B1F23',
  border:  '#1C1D21',
  text:    '#F5F5F5',
  sub:     '#9CA3AF',
  muted:   '#71717A',
  dim:     '#2A3038',
  accent:  '#1FA36F',
  success: '#22C55E',
  danger:  '#EF4444',
};

const EXP_ICONS = {
  'Food': '🍔', 'Rent & Bills': '🏠', 'Tools & Subscriptions': '💻',
  'Leisure': '🎉', 'Other': '📦', 'Transport': '🚗', 'Health': '💊',
};
const INC_ICONS = {
  'Salary': '💼', 'Freelance': '🛠', 'Side Income': '🚀', 'One-time': '🎁',
};

const CAT_COLORS = {
  'Food': '#F59E0B', 'Rent & Bills': '#EF4444', 'Tools & Subscriptions': '#8B7FFF',
  'Leisure': '#EC4899', 'Other': '#6B7280', 'Salary': '#10B981',
  'Freelance': '#1FA36F', 'Side Income': '#22C55E', 'One-time': '#F59E0B',
};

const fmt = (sym, n) => {
  const abs = Math.abs(Number(n));
  if (!isFinite(abs) || isNaN(abs)) return `${sym}0`;
  if (abs >= 100000) return `${sym}${(abs / 100000).toFixed(1)}L`;
  if (abs >= 1000)   return `${sym}${abs.toLocaleString('en-IN')}`;
  return `${sym}${abs.toFixed(0)}`;
};

export default function RecentActivity({
  expenses = [],
  incomes  = [],
  currencySymbol = '₹',
  today,
  onEditExpense,
  onDeleteExpense,
  onEditIncome,
  onDeleteIncome,
}) {
  const [showAll, setShowAll] = useState(false);
  const sym = currencySymbol;

  const activityByDate = useMemo(() => {
    const combined = [
      ...expenses.map(e => ({ ...e, _type: 'expense', date: e.expense_date })),
      ...incomes.map(i  => ({ ...i, _type: 'income',  date: i.income_date  })),
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    const groups = {};
    combined.forEach(item => {
      if (!groups[item.date]) groups[item.date] = { date: item.date, items: [], spent: 0, earned: 0 };
      groups[item.date].items.push(item);
      if (item._type === 'expense') groups[item.date].spent  += Number(item.amount) || 0;
      if (item._type === 'income')  groups[item.date].earned += Number(item.amount) || 0;
    });
    return Object.values(groups);
  }, [expenses, incomes]);

  if (activityByDate.length === 0) {
    return (
      <div style={{ textAlign: 'center', color: W.muted, padding: '16px 0', fontSize: '12px' }}>
        No financial activity yet. Log your first expense or income above.
      </div>
    );
  }

  const groupsToShow = showAll ? activityByDate : activityByDate.slice(0, 3);

  const formatGroupDate = (dateStr) => {
    if (dateStr === today) return 'TODAY';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' }).toUpperCase();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <div style={{ fontSize: '9px', color: W.muted, fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '6px' }}>
        RECENT ACTIVITY
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {groupsToShow.map(group => (
          <div key={group.date} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {/* Date header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
              <span style={{ fontSize: '10px', color: W.sub, fontWeight: 700, letterSpacing: '0.5px' }}>
                {formatGroupDate(group.date)}
              </span>
              <div style={{ display: 'flex', gap: '8px', fontSize: '11px', fontWeight: 800 }}>
                {group.earned > 0 && <span style={{ color: W.success }}>+{fmt(sym, group.earned)}</span>}
                {group.spent  > 0 && <span style={{ color: W.danger }}>−{fmt(sym, group.spent)}</span>}
              </div>
            </div>

            {/* Transactions */}
            {group.items.map(t => {
              const isInc   = t._type === 'income';
              const icon    = isInc ? (INC_ICONS[t.source] || '💰') : (EXP_ICONS[t.category] || '📦');
              const catKey  = isInc ? t.source : t.category;
              const dotColor = CAT_COLORS[catKey] || W.muted;
              return (
                <div
                  key={t.id}
                  style={{
                    background: W.surface,
                    border: `1px solid ${W.border}`,
                    borderRadius: '14px',
                    padding: '10px 14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', minWidth: 0 }}>
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <span style={{ fontSize: '17px' }}>{icon}</span>
                      <div style={{
                        position: 'absolute', bottom: '-1px', right: '-2px',
                        width: '7px', height: '7px', borderRadius: '50%',
                        background: dotColor, border: `1.5px solid ${W.surface}`,
                      }} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: W.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.note || t.source || t.category}
                      </div>
                      <div style={{ fontSize: '10px', color: W.muted, marginTop: '1px' }}>
                        {isInc ? t.source : t.category}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0, marginLeft: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 900, color: isInc ? W.success : W.text }}>
                      {isInc ? '+' : '−'}{fmt(sym, t.amount)}
                    </span>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '2px' }}>
                      <button
                        onClick={() => isInc ? onEditIncome(t) : onEditExpense(t)}
                        style={{ fontSize: '9px', color: W.accent, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
                      >
                        <Edit3 size={10} />
                      </button>
                      <button
                        onClick={() => isInc ? onDeleteIncome(t.id) : onDeleteExpense(t.id)}
                        style={{ fontSize: '9px', color: W.muted, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
                      >
                        <X size={10} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        {activityByDate.length > 3 && (
          <button
            onClick={() => setShowAll(v => !v)}
            style={{
              background: 'transparent', border: `1px solid ${W.border}`,
              borderRadius: '12px', padding: '10px',
              color: W.muted, fontSize: '12px', fontWeight: 700,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            }}
          >
            {showAll ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {showAll
              ? 'Show less'
              : `Show ${activityByDate.length - 3} more day${activityByDate.length - 3 > 1 ? 's' : ''}`}
          </button>
        )}
      </div>
    </div>
  );
}
