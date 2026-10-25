import React, { useState, useEffect } from 'react';
import { X, Calendar, Plus, Trash2, CheckCircle2, ArrowRight, Users } from 'lucide-react';

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
  const [showNote, setShowNote] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (activePromise) {
      const isOwed = activePromise.status === 'receivable' || activePromise.type === 'receivable' || activePromise.type === 'LEND';
      setType(isOwed ? 'owed_to_me' : 'i_owe');
      setPerson(activePromise.person || activePromise.name?.replace(/^return to\s+/i, '').replace(/\s+owes you$/i, '') || '');
      setAmount(activePromise.amount !== undefined ? String(activePromise.amount) : '');
      setDueDate(activePromise.due_date || activePromise.dueDate || getLocalYMD());
      const existingNote = activePromise.note || '';
      setNote(existingNote);
      setShowNote(!!existingNote.trim());
    } else {
      setType(activeInitialType);
      setPerson('');
      setAmount('');
      setDueDate(getLocalYMD());
      setNote('');
      setShowNote(false);
    }
  }, [activePromise, activeInitialType, isOpen]);

  if (!isOpen) return null;

  const isOwedToMe = type === 'owed_to_me';
  const todayYMD = getLocalYMD();
  const isToday = dueDate === todayYMD;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!person.trim() || isNaN(numAmount) || numAmount <= 0 || saving) return;

    setSaving(true);
    try {
      await onSave({
        id: activePromise?.id || null,
        type: isOwedToMe ? 'LEND' : 'BORROW',
        person: person.trim(),
        amount: Math.round(numAmount * 100) / 100,
        dueDate: dueDate || todayYMD,
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

  // Natural contextual phrasing
  const _relationshipSummary = isOwedToMe
    ? (person.trim() ? `${person.trim()} owes me` : 'Someone owes me')
    : (person.trim() ? `I owe ${person.trim()}` : 'I owe someone');

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
              <Users size={20} className="stroke-[2.2]" />
            </div>
            <div>
              <h2 style={{ color: W.text }} className="text-base font-bold leading-snug">
                {activePromise ? 'Edit promise' : 'Peer promise'}
              </h2>
              <p className="text-[11px] font-medium text-[#68777B]">
                Wealth · Plan & Promises
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
            {isOwedToMe ? 'Who owes you money?' : 'Who do you owe money to?'}
          </h3>
          <p className="text-xs text-[#68777B] mt-1 leading-relaxed">
            Record informal peer loans, shared tabs, and expected returns.
          </p>
        </div>

        {/* Direction Toggle: Owed to me vs I owe */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setType('owed_to_me')}
            className="py-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
            style={{
              background: isOwedToMe ? W.softTeal : W.elevated,
              borderColor: isOwedToMe ? W.petrol : W.border,
              color: isOwedToMe ? W.petrol : W.sub,
            }}
          >
            <span>↓ Owed to me</span>
          </button>
          <button
            type="button"
            onClick={() => setType('i_owe')}
            className="py-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
            style={{
              background: !isOwedToMe ? W.softTeal : W.elevated,
              borderColor: !isOwedToMe ? W.petrol : W.border,
              color: !isOwedToMe ? W.petrol : W.sub,
            }}
          >
            <span>↑ I owe</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          {/* Person Name Card */}
          <div
            className="p-3.5 rounded-2xl flex flex-col gap-1.5"
            style={{
              background: W.card,
              border: `1px solid ${W.border}`,
            }}
          >
            <label className="text-xs font-medium text-[#68777B]">
              Person name
            </label>
            <input
              type="text"
              placeholder="e.g. Ninad, Vasu, Ananya"
              value={person}
              onChange={(e) => setPerson(e.target.value)}
              autoFocus
              className="w-full text-sm font-semibold text-[#111A20] outline-none bg-transparent placeholder:text-[#8A9CA3]"
            />
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

          {/* Due date and Note row */}
          <div
            className="p-3.5 rounded-2xl flex flex-col gap-2.5"
            style={{
              background: W.card,
              border: `1px solid ${W.border}`,
            }}
          >
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-[#68777B]">
                Expected date
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

            {/* Note toggle or field */}
            {!showNote ? (
              <button
                type="button"
                onClick={() => setShowNote(true)}
                className="pt-1 flex items-center gap-1 text-xs font-medium text-[#174A55] hover:underline cursor-pointer"
              >
                <Plus size={13} />
                <span>Add note</span>
              </button>
            ) : (
              <div className="pt-2 border-t border-[#E5E0D8]/60 flex flex-col gap-1">
                <label className="text-[11px] font-medium text-[#68777B]">
                  Optional note
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dinner split, trip expenses"
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
              disabled={!person.trim() || !amount || parseFloat(amount) <= 0 || saving}
              className="w-full py-3.5 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2 transition hover:opacity-95 disabled:opacity-50 cursor-pointer shadow-sm"
              style={{ background: W.petrol }}
            >
              <span>{saving ? 'Recording...' : activePromise ? 'Save changes' : 'Record promise'}</span>
              <ArrowRight size={15} />
            </button>

            {/* Mark as settled if existing */}
            {activePromise && onResolve && (
              <button
                type="button"
                onClick={handleResolve}
                disabled={saving}
                className="w-full py-2.5 rounded-2xl font-bold text-xs text-[#174A55] hover:opacity-90 transition cursor-pointer flex items-center justify-center gap-1.5"
                style={{
                  background: W.softTeal,
                  border: `1px solid ${W.border}`,
                }}
              >
                <CheckCircle2 size={14} />
                <span>Mark as settled</span>
              </button>
            )}

            {/* Delete button if existing */}
            {activePromise && onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving}
                className="w-full py-2.5 rounded-2xl font-semibold text-xs text-[#EF4444] hover:bg-red-50 transition cursor-pointer flex items-center justify-center gap-1.5"
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                }}
              >
                <Trash2 size={13} />
                <span>Delete promise</span>
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
