import React, { useState, useEffect } from 'react';
import { X, Calendar, Trash2, ArrowRight, Clock } from 'lucide-react';

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
};

const COMMITMENT_PRESETS = [
  { id: 'Rent', label: 'Rent', icon: '🏠' },
  { id: 'WiFi', label: 'WiFi', icon: '📶' },
  { id: 'Netflix', label: 'Netflix', icon: '🎬' },
  { id: 'College fee', label: 'College fee', icon: '🎓' },
];

const FREQUENCIES = [
  { id: 'monthly', label: 'Monthly' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'yearly', label: 'Yearly' },
  { id: 'one-time', label: 'One-time' },
];

const getLocalYMD = (d = new Date()) => {
  const o = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return o.toISOString().split('T')[0];
};

export default function BillFormModal({
  isOpen = true,
  editingBill = null,
  initialData = null,
  currencySymbol = '₹',
  onSave,
  onClose,
  onDelete,
}) {
  const activeBill = editingBill || initialData;
  const todayYMD = getLocalYMD();

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(todayYMD);
  const [frequency, setFrequency] = useState('monthly');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (activeBill) {
      setName(activeBill.name || '');
      setAmount(activeBill.amount !== undefined ? String(activeBill.amount) : '');
      setDueDate(activeBill.due_date || todayYMD);
      setFrequency(activeBill.frequency || 'monthly');
    } else {
      setName('');
      setAmount('');
      setDueDate(todayYMD);
      setFrequency('monthly');
    }
  }, [activeBill, isOpen, todayYMD]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!name.trim() || isNaN(amt) || !isFinite(amt) || amt <= 0 || isSaving) {
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        id: activeBill ? activeBill.id : null,
        name: name.trim().slice(0, 150),
        amount: Math.round(amt * 100) / 100,
        due_date: dueDate || todayYMD,
        frequency: frequency,
        status: activeBill ? activeBill.status : 'unpaid',
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const isToday = dueDate === todayYMD;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[200] bg-black/45 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4 animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
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
              <Clock size={20} className="stroke-[2.2]" />
            </div>
            <div>
              <h2 style={{ color: W.text }} className="text-base font-bold leading-snug">
                {activeBill ? 'Edit commitment' : 'Add commitment'}
              </h2>
              <p className="text-[11px] font-medium text-[#68777B]">
                Wealth · Plan & Bills
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
            What are you already committed to?
          </h3>
          <p className="text-xs text-[#68777B] mt-1 leading-relaxed">
            Track fixed bills, subscriptions, and recurring obligations.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          {/* Commitment Name Card & Presets */}
          <div
            className="p-3.5 rounded-2xl flex flex-col gap-2"
            style={{
              background: W.card,
              border: `1px solid ${W.border}`,
            }}
          >
            <label className="text-xs font-medium text-[#68777B]">
              Commitment name
            </label>
            <input
              type="text"
              placeholder="e.g. Rent, WiFi, Netflix"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              className="w-full text-sm font-semibold text-[#111A20] outline-none bg-transparent placeholder:text-[#8A9CA3]"
            />
            {/* Quick Name Presets */}
            <div className="flex gap-1.5 flex-wrap pt-1 border-t border-[#E5E0D8]/60">
              {COMMITMENT_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setName(p.id)}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium transition flex items-center gap-1 cursor-pointer"
                  style={{
                    background: name === p.id ? W.softTeal : W.elevated,
                    border: `1px solid ${name === p.id ? W.petrol : W.border}`,
                    color: name === p.id ? W.petrol : W.sub,
                  }}
                >
                  <span>{p.icon}</span>
                  <span>{p.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Amount Input Card */}
          <div
            className="p-4 rounded-2xl flex flex-col gap-2"
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
                className="w-full text-2xl font-bold text-[#111A20] outline-none bg-transparent placeholder:text-[#8A9CA3]"
              />
            </div>
          </div>

          {/* Due date & Frequency Card */}
          <div
            className="p-3.5 rounded-2xl flex flex-col gap-2.5"
            style={{
              background: W.card,
              border: `1px solid ${W.border}`,
            }}
          >
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-[#68777B]">
                Due date
              </label>
              <div className="relative flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#FAF7F2] border border-[#E5E0D8]">
                <Calendar size={13} className="text-[#68777B]" />
                <span className="text-xs font-semibold text-[#111A20]">
                  {isToday ? 'Today' : dueDate}
                </span>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5 pt-1 border-t border-[#E5E0D8]/60">
              <label className="text-xs font-medium text-[#68777B]">
                Frequency
              </label>
              <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-[#FAF7F2] border border-[#E5E0D8]">
                {FREQUENCIES.map((f) => {
                  const isSelected = frequency.toLowerCase() === f.id.toLowerCase();
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFrequency(f.id)}
                      className="py-1.5 rounded-lg text-[11px] font-semibold transition cursor-pointer text-center"
                      style={{
                        background: isSelected ? W.card : 'transparent',
                        color: isSelected ? W.petrol : W.sub,
                        boxShadow: isSelected ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                      }}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-2 pt-1">
            <button
              type="submit"
              disabled={!name.trim() || !amount || parseFloat(amount) <= 0 || isSaving}
              className="w-full py-3.5 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2 transition hover:opacity-95 disabled:opacity-50 cursor-pointer shadow-sm"
              style={{ background: W.petrol }}
            >
              <span>{isSaving ? 'Saving...' : activeBill ? 'Save commitment' : 'Add commitment'}</span>
              <ArrowRight size={15} />
            </button>

            {activeBill && onDelete && (
              <button
                type="button"
                onClick={async () => {
                  if (isSaving) return;
                  setIsSaving(true);
                  try {
                    await onDelete(activeBill.id);
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
                <span>Delete commitment</span>
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
