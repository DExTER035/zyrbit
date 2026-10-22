import React, { useState, useEffect } from 'react';
import { X, Calendar, Plus, Trash2, ArrowRight, ArrowDownLeft, ArrowUpRight } from 'lucide-react';

const W = {
  canvas: '#F4F0E8',
  card: '#FFFFFF',
  border: '#E5E0D8',
  elevated: '#FAF7F2',
  petrol: '#174A55',
  softTeal: '#DDE9EB',
  text: '#111A20',
  sub: '#68777B',
  muted: '#8A9CA3',
  danger: '#EF4444',
  emerald: '#1FA36F',
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

const getLocalYMD = (d = new Date()) => {
  const o = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return o.toISOString().split('T')[0];
};

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
  const todayYMD = getLocalYMD();

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

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

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
      className="fixed inset-0 z-[200] bg-black/45 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4 animate-in fade-in duration-150"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="w-full max-w-sm rounded-t-3xl md:rounded-3xl p-6 pb-8 md:pb-6 flex flex-col gap-4 max-h-[92vh] overflow-y-auto"
        style={{
          background: W.canvas,
          border: `1.5px solid ${W.border}`,
          boxShadow: '0 24px 48px -12px rgba(17, 26, 32, 0.25)',
        }}
      >
        {/* Top bar with icon badge, title/breadcrumbs, and close button */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: W.softTeal, color: W.petrol }}
            >
              {isExpense ? (
                <ArrowUpRight size={20} className="stroke-[2.2]" />
              ) : (
                <ArrowDownLeft size={20} className="stroke-[2.2]" />
              )}
            </div>
            <div>
              <h2 style={{ color: W.text }} className="text-base font-bold leading-snug">
                {activeItem ? `Edit ${isExpense ? 'expense' : 'income'}` : (isExpense ? 'Log expense' : 'Log income')}
              </h2>
              <p className="text-[11px] font-medium text-[#68777B]">
                Wealth · {isExpense ? 'Spending entry' : 'Cash flow'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#68777B] hover:text-[#111A20] hover:bg-black/5 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Section Heading & Subtitle */}
        <div>
          <h3 style={{ color: W.text }} className="text-lg font-bold tracking-tight">
            {isExpense ? 'What did you spend?' : 'What came in?'}
          </h3>
          <p className="text-xs text-[#68777B] mt-1 leading-relaxed">
            {isExpense
              ? 'Enter amount and select a category to keep spending pace honest.'
              : 'Record salary, client payments, or side income into cash balance.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          {/* Amount Input Card & Presets */}
          <div
            className="p-4 rounded-2xl flex flex-col gap-2.5"
            style={{
              background: W.card,
              border: `1px solid ${W.border}`,
            }}
          >
            <label className="text-xs font-medium text-[#68777B]">
              Amount
            </label>
            <div className="flex items-center gap-2 pb-1" style={{ borderBottom: `1px solid ${W.border}` }}>
              <span className="text-2xl font-bold text-[#174A55] select-none">
                {currencySymbol}
              </span>
              <input
                type="number"
                step="any"
                inputMode="decimal"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoFocus
                className="w-full text-2xl font-bold text-[#111A20] outline-none bg-transparent placeholder:text-[#8A9CA3]"
              />
            </div>

            {/* Quick Amount Presets */}
            <div className="flex gap-1.5 pt-1">
              {presets.map((p) => (
                <button
                  key={p.val}
                  type="button"
                  onClick={() => setAmount(String(p.val))}
                  className="flex-1 py-1 rounded-lg text-xs font-semibold transition cursor-pointer text-center"
                  style={{
                    background: W.elevated,
                    border: `1px solid ${W.border}`,
                    color: W.sub,
                  }}
                >
                  +{p.val}
                </button>
              ))}
            </div>
          </div>

          {/* Category Chips Card */}
          <div
            className="p-3.5 rounded-2xl flex flex-col gap-2"
            style={{
              background: W.card,
              border: `1px solid ${W.border}`,
            }}
          >
            <label className="text-xs font-medium text-[#68777B]">
              Category
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {chips.map((c) => {
                const isSelected = category.toLowerCase() === c.id.toLowerCase();
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategory(c.id)}
                    className="py-2 px-2 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
                    style={{
                      background: isSelected ? W.softTeal : W.elevated,
                      border: `1px solid ${isSelected ? W.petrol : W.border}`,
                      color: isSelected ? W.petrol : W.sub,
                    }}
                  >
                    <span>{c.icon}</span>
                    <span>{c.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date & Note Row Card */}
          <div
            className="p-3.5 rounded-2xl flex flex-col gap-2.5"
            style={{
              background: W.card,
              border: `1px solid ${W.border}`,
            }}
          >
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-[#68777B]">
                Date
              </label>
              <div className="relative flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#FAF7F2] border border-[#E5E0D8]">
                <Calendar size={13} className="text-[#68777B]" />
                <span className="text-xs font-semibold text-[#111A20]">
                  {isToday ? 'Today' : date}
                </span>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full"
                />
              </div>
            </div>

            {/* Note toggle or field */}
            {!showNote && (
              <button
                type="button"
                onClick={() => setShowNote(true)}
                className="pt-1 flex items-center gap-1 text-xs font-medium text-[#174A55] hover:underline cursor-pointer"
              >
                <Plus size={13} />
                <span>Add note</span>
              </button>
            )}

            {/* Collapsible Note Input */}
            {showNote && (
              <div className="pt-2 border-t border-[#E5E0D8]/60 flex flex-col gap-1">
                <label className="text-[11px] font-medium text-[#68777B]">
                  Optional note
                </label>
                <input
                  type="text"
                  placeholder={isExpense ? 'e.g. Lunch with team, taxi fare' : 'e.g. Monthly stipend, bonus'}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full text-xs font-medium text-[#111A20] outline-none bg-transparent placeholder:text-[#8A9CA3]"
                />
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-2 pt-1">
            <button
              type="submit"
              disabled={!amount || parseFloat(amount) <= 0 || isSaving}
              className="w-full py-3.5 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2 transition hover:opacity-95 disabled:opacity-50 cursor-pointer shadow-sm"
              style={{ background: W.petrol }}
            >
              <span>{isSaving ? 'Recording...' : activeItem ? 'Save changes' : isExpense ? 'Record expense' : 'Record income'}</span>
              <ArrowRight size={15} />
            </button>

            {/* Delete button if editing */}
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
                className="w-full py-2.5 rounded-2xl font-semibold text-xs text-[#EF4444] hover:bg-red-50 transition cursor-pointer flex items-center justify-center gap-1.5"
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                }}
              >
                <Trash2 size={13} />
                <span>Delete {isExpense ? 'expense' : 'income'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 rounded-2xl font-bold text-sm text-[#68777B] hover:text-[#111A20] transition cursor-pointer"
              style={{
                background: W.elevated,
                border: `1px solid ${W.border}`,
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
