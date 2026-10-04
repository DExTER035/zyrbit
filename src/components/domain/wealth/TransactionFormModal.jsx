import React, { useState, useEffect } from 'react';
import { X, Calendar, Plus, Trash2 } from 'lucide-react';

const W = {
  bg: '#0E0F13',
  surface: '#15161B',
  border: '#26272D',
  borderFocus: '#3A3B40',
  text: '#ECE8DF',
  sub: '#9A978F',
  muted: '#6B7280',
  dim: '#1F2026',
  accent: '#E9B44C',
  emerald: '#1FA36F',
  danger: '#EF4444',
};

const EXPENSE_CHIPS = [
  { id: 'Food', label: 'Food', icon: '🍲' },
  { id: 'Bills', label: 'Bills', icon: '📄' },
  { id: 'Transport', label: 'Transport', icon: '🚗' },
  { id: 'Shopping', label: 'Shopping', icon: '🛍️' },
  { id: 'Health', label: 'Health', icon: '💊' },
  { id: 'Other', label: 'Other', icon: '✦' },
];

const INCOME_CHIPS = [
  { id: 'Salary', label: 'Salary', icon: '💼' },
  { id: 'Freelance', label: 'Freelance', icon: '💻' },
  { id: 'Side income', label: 'Side income', icon: '⚡' },
  { id: 'Other', label: 'Other', icon: '✦' },
];

export default function TransactionFormModal({
  isOpen = true,
  type = 'expense', // 'expense' | 'income'
  editingItem = null,
  initialData = null,
  currencySymbol = '₹',
  onSave,
  onClose,
  onDelete,
}) {
  const activeItem = editingItem || initialData;
  const isExpense = type === 'expense';
  const todayYMD = new Date().toISOString().split('T')[0];

  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(isExpense ? 'Food' : 'Salary');
  const [note, setNote] = useState('');
  const [showNote, setShowNote] = useState(false);
  const [date, setDate] = useState(todayYMD);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (activeItem) {
      setAmount(activeItem.amount !== undefined ? String(activeItem.amount) : '');
      const rawCat = isExpense ? (activeItem.category || 'Food') : (activeItem.source || 'Salary');
      setCategory(rawCat);
      const existingNote = activeItem.note || activeItem.title || '';
      setNote(existingNote);
      setShowNote(!!existingNote.trim());
      setDate(activeItem.expense_date || activeItem.income_date || activeItem.date || todayYMD);
    } else {
      setAmount('');
      setCategory(isExpense ? 'Food' : 'Salary');
      setNote('');
      setShowNote(false);
      setDate(todayYMD);
    }
  }, [activeItem, isExpense, isOpen, todayYMD]);

  if (!isOpen) return null;

  // Preset amounts tailored to the selected currency
  const presets = currencySymbol === '₹'
    ? (isExpense
        ? [{ label: '₹100', val: 100 }, { label: '₹200', val: 200 }, { label: '₹500', val: 500 }, { label: '₹1,000', val: 1000 }]
        : [{ label: '₹5k', val: 5000 }, { label: '₹10k', val: 10000 }, { label: '₹25k', val: 25000 }, { label: '₹50k', val: 50000 }])
    : (isExpense
        ? [{ label: `${currencySymbol}10`, val: 10 }, { label: `${currencySymbol}25`, val: 25 }, { label: `${currencySymbol}50`, val: 50 }, { label: `${currencySymbol}100`, val: 100 }]
        : [{ label: `${currencySymbol}500`, val: 500 }, { label: `${currencySymbol}1k`, val: 1000 }, { label: `${currencySymbol}2.5k`, val: 2500 }, { label: `${currencySymbol}5k`, val: 5000 }]);

  const chips = isExpense ? EXPENSE_CHIPS : INCOME_CHIPS;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (isNaN(amt) || !isFinite(amt) || amt <= 0 || amt > 100000000 || isSaving) {
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        id: activeItem ? activeItem.id : null,
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

  const isToday = date === todayYMD;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.82)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: W.surface,
          border: `1px solid ${W.border}`,
          borderRadius: '24px 24px 0 0',
          width: '100%',
          maxWidth: '430px',
          padding: '24px 20px 36px',
          animation: 'slideUpSheet 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 -8px 40px rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* ── Compact Header & Purpose Sentence ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <div style={{
              fontSize: '11px',
              fontWeight: 800,
              color: isExpense ? '#F43F5E' : W.emerald,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              marginBottom: '3px',
            }}>
              {activeItem ? `Edit ${isExpense ? 'Expense' : 'Income'}` : (isExpense ? 'Log Expense' : 'Log Income')}
            </div>
            <div style={{
              fontSize: '15px',
              fontWeight: 600,
              color: W.text,
              letterSpacing: '-0.01em',
            }}>
              {isExpense ? 'What did you spend?' : 'What came in?'}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: W.dim,
              border: `1px solid ${W.border}`,
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: W.sub,
              transition: 'all 0.15s ease',
            }}
          >
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* ── Primary Hero Input: Large Amount ── */}
          <div style={{
            background: W.bg,
            border: `1px solid ${W.border}`,
            borderRadius: '20px',
            padding: '16px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            transition: 'border-color 0.15s ease',
          }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{
                fontSize: '28px',
                fontWeight: 800,
                color: amount ? W.text : W.muted,
                lineHeight: 1,
              }}>
                {currencySymbol}
              </span>
              <input
                type="number"
                step="any"
                inputMode="decimal"
                placeholder="0"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                autoFocus
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  fontSize: '36px',
                  fontWeight: 900,
                  color: W.text,
                  outline: 'none',
                  padding: 0,
                  margin: 0,
                  lineHeight: 1,
                  fontFamily: 'inherit',
                  letterSpacing: '-0.03em',
                  MozAppearance: 'textfield',
                  WebkitAppearance: 'none',
                }}
              />
            </div>

            {/* Quick Amount Presets */}
            <div style={{ display: 'flex', gap: '6px' }}>
              {presets.map(p => (
                <button
                  key={p.val}
                  type="button"
                  onClick={() => setAmount(String(p.val))}
                  style={{
                    flex: 1,
                    padding: '7px 4px',
                    borderRadius: '10px',
                    background: W.dim,
                    border: `1px solid ${W.border}`,
                    color: W.sub,
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = W.borderFocus;
                    e.currentTarget.style.color = W.text;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = W.border;
                    e.currentTarget.style.color = W.sub;
                  }}
                >
                  +{p.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Compact Category / Source Selector Chips ── */}
          <div>
            <div style={{
              display: 'flex',
              gap: '6px',
              flexWrap: 'wrap',
            }}>
              {chips.map(chip => {
                const isSelected = category.toLowerCase() === chip.id.toLowerCase();
                const activeColor = isExpense ? '#F43F5E' : W.emerald;
                return (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => setCategory(chip.id)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '12px',
                      background: isSelected ? `${activeColor}1A` : W.bg,
                      border: `1px solid ${isSelected ? activeColor : W.border}`,
                      color: isSelected ? activeColor : W.sub,
                      fontSize: '12px',
                      fontWeight: isSelected ? 700 : 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span>{chip.icon}</span>
                    <span>{chip.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Date Indicator & Progressive Note ── */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            paddingTop: '4px',
          }}>
            {/* Date selector */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: W.bg,
              border: `1px solid ${W.border}`,
              borderRadius: '10px',
              padding: '6px 10px',
              position: 'relative',
            }}>
              <Calendar size={13} color={W.sub} />
              <span style={{ fontSize: '11px', fontWeight: 600, color: W.text }}>
                {isToday ? 'Today' : date}
              </span>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                style={{
                  position: 'absolute',
                  inset: 0,
                  opacity: 0,
                  cursor: 'pointer',
                  width: '100%',
                }}
              />
            </div>

            {/* Note disclosure toggle */}
            {!showNote && (
              <button
                type="button"
                onClick={() => setShowNote(true)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: W.sub,
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '6px 4px',
                }}
              >
                <Plus size={13} />
                <span>Add note</span>
              </button>
            )}
          </div>

          {/* Collapsible Note Input */}
          {showNote && (
            <div style={{
              background: W.bg,
              border: `1px solid ${W.border}`,
              borderRadius: '14px',
              padding: '10px 14px',
            }}>
              <input
                type="text"
                placeholder={isExpense ? 'e.g. Swiggy lunch, Coffee with client' : 'e.g. Monthly salary, UI design retainer'}
                value={note}
                onChange={e => setNote(e.target.value)}
                autoFocus
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  fontSize: '13px',
                  color: W.text,
                  outline: 'none',
                  padding: 0,
                }}
              />
            </div>
          )}

          {/* ── Primary Action Button ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
            <button
              type="submit"
              disabled={!amount || parseFloat(amount) <= 0 || isSaving}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '16px',
                background: isExpense ? '#F43F5E' : W.emerald,
                border: 'none',
                color: '#0E0F13',
                fontSize: '14px',
                fontWeight: 800,
                letterSpacing: '0.01em',
                cursor: (!amount || parseFloat(amount) <= 0 || isSaving) ? 'not-allowed' : 'pointer',
                opacity: (!amount || parseFloat(amount) <= 0 || isSaving) ? 0.45 : 1,
                transition: 'all 0.15s ease',
              }}
            >
              {isSaving
                ? 'Recording...'
                : (activeItem ? 'Save changes' : (isExpense ? 'Record expense' : 'Record income'))}
            </button>

            {activeItem && onDelete && (
              <button
                type="button"
                onClick={async () => {
                  if (isSaving) return;
                  setIsSaving(true);
                  try {
                    await onDelete(activeItem.id);
                    onClose();
                  } finally {
                    setIsSaving(false);
                  }
                }}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '12px',
                  background: 'transparent',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  color: '#EF4444',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                }}
              >
                <Trash2 size={13} />
                <span>Delete {isExpense ? 'expense' : 'income'}</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
