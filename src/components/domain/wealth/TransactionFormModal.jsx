import React, { useState } from 'react';
import { X } from 'lucide-react';

const W = {
  bg:      '#0B0D0F',
  surface: '#15181B',
  border2: '#262B31',
  text:    '#F8FAFC',
  sub:     '#94A3B8',
  muted:   '#64748B',
  dim:     '#2A3038',
  accent:  '#1FA36F',
  danger:  '#EF4444',
};

const EXP_CATEGORIES = ['Food', 'Rent & Bills', 'Tools & Subscriptions', 'Leisure', 'Other'];
const INC_SOURCES = ['Salary', 'Freelance', 'Side Income', 'One-time'];

export default function TransactionFormModal({
  type = 'expense', // 'expense' | 'income'
  editingItem = null,
  currencySymbol = '₹',
  onSave,
  onClose,
}) {
  const isExpense = type === 'expense';
  const todayYMD = new Date().toISOString().split('T')[0];

  const [amount, setAmount]     = useState(editingItem ? String(editingItem.amount) : '');
  const [category, setCategory] = useState(editingItem ? (isExpense ? editingItem.category : editingItem.source) : (isExpense ? 'Food' : 'Side Income'));
  const [note, setNote]         = useState(editingItem ? (editingItem.note || '') : '');
  const [date, setDate]         = useState(editingItem ? (editingItem.expense_date || editingItem.income_date) : todayYMD);
  const [isSaving, setIsSaving] = useState(false);

  const presets = currencySymbol === '₹'
    ? (isExpense ? [100, 200, 500, 1000] : [5000, 10000, 25000, 50000])
    : (isExpense ? [5, 10, 20, 50] : [100, 500, 1000, 2000]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (isNaN(amt) || !isFinite(amt) || amt <= 0 || amt > 100000000 || isSaving) {
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        id: editingItem ? editingItem.id : null,
        amount: Math.round(amt * 100) / 100,
        category: category,
        source: category,
        note: (note || category).trim().slice(0, 200),
        date: date || todayYMD,
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.88)',
        backdropFilter: 'blur(16px)',
        zIndex: 200,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: W.surface,
          border: `1px solid ${W.border2}`,
          borderRadius: '24px 24px 0 0',
          width: '100%', maxWidth: '430px',
          padding: '24px 20px 40px',
          animation: 'slideUpSheet 0.25s cubic-bezier(0.4,0,0.2,1)',
          maxHeight: '90vh', overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <span style={{ fontSize: '16px', fontWeight: 800, color: W.text }}>
            {editingItem ? `Edit ${isExpense ? 'Expense' : 'Income'}` : `Log ${isExpense ? 'Expense' : 'Income'}`}
          </span>
          <button
            onClick={onClose}
            style={{ background: W.dim, border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: W.sub }}
          >
            <X size={14} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Amount input */}
          <div>
            <div style={{ fontSize: '10px', color: W.muted, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '8px' }}>
              Amount ({currencySymbol}) *
            </div>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <span style={{ position: 'absolute', left: '16px', fontSize: '24px', fontWeight: 900, color: W.text, pointerEvents: 'none' }}>
                {currencySymbol}
              </span>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                autoFocus
                style={{
                  width: '100%',
                  background: W.bg,
                  border: `1px solid ${W.border2}`,
                  borderRadius: '16px',
                  padding: '14px 14px 14px 42px',
                  fontSize: '24px',
                  fontWeight: 900,
                  color: W.text,
                  outline: 'none',
                }}
              />
            </div>

            {/* Amount Presets */}
            <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
              {presets.map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setAmount(String(p))}
                  style={{
                    flex: 1, padding: '6px 4px', borderRadius: '8px',
                    background: W.dim, border: `1px solid ${W.border2}`,
                    color: W.sub, fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  +{currencySymbol}{p}
                </button>
              ))}
            </div>
          </div>

          {/* Category / Source selector */}
          <div>
            <div style={{ fontSize: '10px', color: W.muted, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '8px' }}>
              {isExpense ? 'Category' : 'Source'}
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {(isExpense ? EXP_CATEGORIES : INC_SOURCES).map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '100px',
                    background: category === cat ? W.accent : W.dim,
                    border: `1px solid ${category === cat ? W.accent : W.border2}`,
                    color: category === cat ? '#000' : W.text,
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Description note */}
          <div>
            <div style={{ fontSize: '10px', color: W.muted, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '8px' }}>
              Note / Description
            </div>
            <input
              type="text"
              placeholder="e.g. Grocery store, Client invoice"
              value={note}
              onChange={e => setNote(e.target.value)}
              style={{
                width: '100%',
                background: W.bg,
                border: `1px solid ${W.border2}`,
                borderRadius: '14px',
                padding: '12px 14px',
                fontSize: '13px',
                color: W.text,
                outline: 'none',
              }}
            />
          </div>

          {/* Date picker */}
          <div>
            <div style={{ fontSize: '10px', color: W.muted, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '8px' }}>
              Transaction Date
            </div>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              style={{
                width: '100%',
                background: W.bg,
                border: `1px solid ${W.border2}`,
                borderRadius: '14px',
                padding: '12px 14px',
                fontSize: '13px',
                color: W.text,
                outline: 'none',
              }}
            />
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={!amount || parseFloat(amount) <= 0 || isSaving}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '16px',
              background: isExpense ? W.danger : W.accent,
              border: 'none',
              color: isExpense ? '#FFF' : '#000',
              fontSize: '14px',
              fontWeight: 800,
              cursor: 'pointer',
              opacity: (!amount || parseFloat(amount) <= 0 || isSaving) ? 0.5 : 1,
              marginTop: '8px',
            }}
          >
            {isSaving ? 'Saving...' : (editingItem ? 'Save Changes 💾' : `Log ${isExpense ? 'Expense' : 'Income'} ⚡`)}
          </button>
        </form>
      </div>
    </div>
  );
}
