import React, { useState, useEffect } from 'react';
import { X, Trash2, CheckCircle2 } from 'lucide-react';

const W = {
  bg: '#0B0D0F',
  surface: '#15181B',
  border: '#1F242C',
  borderMid: '#262C36',
  text: '#F5F5F5',
  sub: '#9CA3AF',
  muted: '#6B7280',
  accent: '#E9B44C',
  emerald: '#1FA36F',
  danger: '#EF4444',
};

const getLocalYMD = (d = new Date()) => {
  const o = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return o.toISOString().split('T')[0];
};

export default function PromiseFormModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  onResolve,
  editingPromise = null,
  initialData = null,
  initialType = 'owed_to_me',
  defaultType = 'owed_to_me',
  currencySymbol = '₹',
}) {
  const activePromise = editingPromise || initialData;
  const activeInitialType = defaultType || initialType || 'owed_to_me';

  const [type, setType] = useState(activeInitialType);
  const [person, setPerson] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(getLocalYMD());
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (activePromise) {
      const isOwed = activePromise.status === 'receivable' || activePromise.type === 'receivable' || activePromise.type === 'LEND';
      setType(isOwed ? 'owed_to_me' : 'i_owe');
      setPerson(activePromise.person || activePromise.name?.replace(/^return to\s+/i, '').replace(/\s+owes you$/i, '') || '');
      setAmount(activePromise.amount !== undefined ? String(activePromise.amount) : '');
      setDueDate(activePromise.due_date || activePromise.dueDate || getLocalYMD());
      setNote(activePromise.note || '');
    } else {
      setType(activeInitialType);
      setPerson('');
      setAmount('');
      setDueDate(getLocalYMD());
      setNote('');
    }
  }, [activePromise, activeInitialType, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!person.trim() || isNaN(numAmount) || numAmount <= 0 || saving) return;

    setSaving(true);
    try {
      await onSave({
        id: activePromise?.id || null,
        type: type === 'owed_to_me' ? 'LEND' : 'BORROW',
        person: person.trim(),
        amount: numAmount,
        dueDate: dueDate || getLocalYMD(),
        note: note.trim(),
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!activePromise?.id || !onDelete || saving) return;
    setSaving(true);
    try {
      await onDelete(activePromise.id);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleResolve = async () => {
    if (!activePromise || !onResolve || saving) return;
    setSaving(true);
    try {
      await onResolve(activePromise);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end md:items-center justify-center p-0 md:p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-3xl md:rounded-2xl p-6 flex flex-col"
        style={{ background: W.surface, border: `1px solid ${W.border}` }}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <div>
            <h3 className="text-base font-bold text-[#F5F5F5]">
              {activePromise ? 'Edit Money Relationship' : 'Add Promise / Loan'}
            </h3>
            <p className="text-xs text-[#9CA3AF]">People and money obligations</p>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-[#9CA3AF] hover:text-white"
          >
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-4">
          {/* Direction toggle */}
          {!activePromise && (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType('owed_to_me')}
                className="py-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5"
                style={{
                  background: type === 'owed_to_me' ? 'rgba(31, 163, 111, 0.15)' : '#0B0D0F',
                  borderColor: type === 'owed_to_me' ? W.emerald : 'rgba(255, 255, 255, 0.08)',
                  color: type === 'owed_to_me' ? W.emerald : '#9CA3AF',
                }}
              >
                <span>↑ Someone owes me</span>
              </button>
              <button
                type="button"
                onClick={() => setType('i_owe')}
                className="py-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5"
                style={{
                  background: type === 'i_owe' ? 'rgba(239, 68, 68, 0.15)' : '#0B0D0F',
                  borderColor: type === 'i_owe' ? W.danger : 'rgba(255, 255, 255, 0.08)',
                  color: type === 'i_owe' ? W.danger : '#9CA3AF',
                }}
              >
                <span>↓ I owe someone</span>
              </button>
            </div>
          )}

          {/* Person name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#9CA3AF]">Person *</label>
            <input
              type="text"
              required
              placeholder="e.g. Ninad, Vasu, Alex"
              value={person}
              onChange={(e) => setPerson(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl bg-[#0B0D0F] border border-white/10 text-sm font-semibold text-[#F5F5F5] outline-none"
            />
          </div>

          {/* Amount */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#9CA3AF]">Amount ({currencySymbol}) *</label>
            <input
              type="number"
              step="any"
              min="1"
              required
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl bg-[#0B0D0F] border border-white/10 text-sm font-bold font-mono text-[#F5F5F5] outline-none"
            />
          </div>

          {/* Due date */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#9CA3AF]">Expected Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl bg-[#0B0D0F] border border-white/10 text-sm text-[#F5F5F5] outline-none"
            />
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#9CA3AF]">Note (Optional)</label>
            <input
              type="text"
              placeholder="Dinner split, trip cab, borrowed for books"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl bg-[#0B0D0F] border border-white/10 text-xs text-[#F5F5F5] outline-none"
            />
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 pt-2">
            <button
              type="submit"
              disabled={saving || !person.trim() || !amount}
              className="w-full py-3 rounded-xl bg-[#1FA36F] text-[#0B0D0F] font-bold text-xs cursor-pointer hover:bg-[#1FA36F]/90 transition disabled:opacity-50"
            >
              {saving ? 'Saving...' : activePromise ? 'Save Changes' : 'Record Promise'}
            </button>

            {activePromise && onResolve && (
              <button
                type="button"
                onClick={handleResolve}
                disabled={saving}
                className="w-full py-2.5 rounded-xl bg-[#1F2922] border border-[#1FA36F]/40 text-[#1FA36F] font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-[#1F2922]/80 transition cursor-pointer"
              >
                <CheckCircle2 size={14} />
                <span>Mark as Settled / {type === 'owed_to_me' ? 'Received' : 'Paid'}</span>
              </button>
            )}

            {activePromise && onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving}
                className="w-full py-2 rounded-xl bg-transparent text-[#EF4444] font-semibold text-xs flex items-center justify-center gap-1.5 hover:bg-[#EF4444]/10 transition cursor-pointer"
              >
                <Trash2 size={13} />
                <span>Delete Promise</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
