import React from 'react';
import { Plus, Check } from 'lucide-react';

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

function daysLabel(daysUntil) {
  if (daysUntil < 0)  return { text: `${Math.abs(daysUntil)}d overdue`, color: W.danger };
  if (daysUntil === 0) return { text: 'Due today', color: W.danger };
  if (daysUntil <= 3) return { text: `${daysUntil}d left`, color: W.danger };
  if (daysUntil <= 7) return { text: `${daysUntil}d left`, color: W.warning };
  return { text: `${daysUntil}d left`, color: W.muted };
}

export default function UpcomingCommitments({
  unpaidBills = [],
  allBills    = [],
  currencySymbol = '₹',
  onTogglePaid,
  onEditBill,
  onDeleteBill,
  onAddBill,
}) {
  const sym      = currencySymbol;
  const paidBills = allBills.filter(b => b.status === 'paid');
  const hasPaid   = paidBills.length > 0;

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '9px', color: W.warning, fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase' }}>
            UPCOMING COMMITMENTS
          </span>
          {unpaidBills.length > 0 && (
            <span style={{
              background: `${W.warning}20`,
              color: W.warning,
              fontSize: '9px', fontWeight: 800,
              padding: '2px 6px', borderRadius: '6px',
            }}>
              {unpaidBills.length}
            </span>
          )}
        </div>
        <button
          id="add-bill-btn"
          onClick={onAddBill}
          style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            fontSize: '11px', color: W.accent, fontWeight: 800,
            background: 'transparent', border: 'none', cursor: 'pointer', padding: 0,
          }}
        >
          <Plus size={13} />
          Add Bill
        </button>
      </div>

      {/* Unpaid Bills */}
      {unpaidBills.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {unpaidBills.map(b => {
            const dl = daysLabel(b.daysUntil);
            return (
              <div
                key={b.id}
                style={{
                  background: W.card,
                  border: `1px solid ${b.daysUntil <= 3 ? `${W.danger}30` : W.border2}`,
                  borderRadius: '14px',
                  padding: '12px 14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: W.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {b.name}
                    </span>
                    <span style={{ fontSize: '9px', color: dl.color, fontWeight: 700, flexShrink: 0 }}>
                      {dl.text}
                    </span>
                  </div>
                  <div style={{ fontSize: '10px', color: W.muted }}>
                    {fmtDate(b.due_date)} · {b.frequency}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                  <span style={{ fontSize: '14px', fontWeight: 900, color: W.text }}>
                    {fmt(sym, b.amount)}
                  </span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => onTogglePaid(b.id, b.status)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '3px',
                        background: `${W.accent}18`, border: `1px solid ${W.accent}40`,
                        borderRadius: '8px', color: W.accent,
                        fontSize: '10px', fontWeight: 800, padding: '4px 8px', cursor: 'pointer',
                      }}
                    >
                      <Check size={10} />
                      Paid
                    </button>
                    <button
                      onClick={() => onEditBill(b)}
                      style={{
                        background: 'transparent', border: 'none',
                        color: W.muted, fontSize: '10px', fontWeight: 700, cursor: 'pointer', padding: '4px',
                      }}
                    >
                      Edit
                    </button>
                    {onDeleteBill && (
                      <button
                        onClick={() => onDeleteBill(b.id)}
                        style={{
                          background: 'transparent', border: 'none',
                          color: W.muted, fontSize: '10px', fontWeight: 700, cursor: 'pointer', padding: '4px',
                        }}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '12px 0', fontSize: '12px', color: W.muted }}>
          No upcoming bills. {hasPaid ? `${paidBills.length} bill${paidBills.length > 1 ? 's' : ''} paid this cycle.` : 'Add your first recurring bill.'}
        </div>
      )}

      {/* Paid bills summary (compact) */}
      {hasPaid && (
        <div style={{
          borderTop: `1px solid ${W.border}`,
          paddingTop: '10px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '6px',
        }}>
          {paidBills.map(b => (
            <div
              key={b.id}
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                background: `${W.success}10`,
                border: `1px solid ${W.success}25`,
                borderRadius: '8px', padding: '4px 8px',
              }}
            >
              <Check size={9} color={W.success} />
              <span style={{ fontSize: '10px', color: W.success, fontWeight: 700 }}>{b.name}</span>
              <span style={{ fontSize: '9px', color: W.muted }}>{fmt(sym, b.amount)}</span>
              <button
                onClick={() => onTogglePaid(b.id, b.status)}
                style={{ background: 'none', border: 'none', color: W.muted, fontSize: '9px', cursor: 'pointer', padding: 0 }}
              >
                undo
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
