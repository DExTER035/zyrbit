import React, { useState, useEffect } from 'react';
import { X, Calendar, Plus, Trash2, CheckCircle2 } from 'lucide-react';

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
  purple: '#A78BFA',
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
  const relationshipSummary = isOwedToMe
    ? (person.trim() ? `${person.trim()} owes me` : 'Someone owes me')
    : (person.trim() ? `I owe ${person.trim()}` : 'I owe someone');

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
        {/* ── Header & Purpose Sentence ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
          <div>
            <div style={{
              fontSize: '11px',
              fontWeight: 800,
              color: isOwedToMe ? W.emerald : '#F43F5E',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              marginBottom: '3px',
            }}>
              {activePromise ? 'Edit Promise' : 'Promise'}
            </div>
            <div style={{
              fontSize: '15px',
              fontWeight: 600,
              color: W.text,
              letterSpacing: '-0.01em',
            }}>
              Who owes whom?
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

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* ── Large Direction Toggle: OWED TO ME / I OWE ── */}
          <div style={{
            background: W.bg,
            border: `1px solid ${W.border}`,
            borderRadius: '16px',
            padding: '4px',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '4px',
          }}>
            <button
              type="button"
              onClick={() => setType('owed_to_me')}
              style={{
                padding: '10px 12px',
                borderRadius: '12px',
                background: isOwedToMe ? 'rgba(31, 163, 111, 0.18)' : 'transparent',
                border: isOwedToMe ? `1px solid ${W.emerald}` : '1px solid transparent',
                color: isOwedToMe ? W.emerald : W.sub,
                fontSize: '12px',
                fontWeight: isOwedToMe ? 800 : 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <span>↑</span>
              <span>OWED TO ME</span>
            </button>

            <button
              type="button"
              onClick={() => setType('i_owe')}
              style={{
                padding: '10px 12px',
                borderRadius: '12px',
                background: !isOwedToMe ? 'rgba(239, 68, 68, 0.18)' : 'transparent',
                border: !isOwedToMe ? '1px solid #EF4444' : '1px solid transparent',
                color: !isOwedToMe ? '#EF4444' : W.sub,
                fontSize: '12px',
                fontWeight: !isOwedToMe ? 800 : 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <span>↓</span>
              <span>I OWE</span>
            </button>
          </div>

          {/* Contextual Phrasing Pill */}
          <div style={{
            fontSize: '12px',
            fontWeight: 600,
            color: isOwedToMe ? W.emerald : '#EF4444',
            background: isOwedToMe ? 'rgba(31, 163, 111, 0.08)' : 'rgba(239, 68, 68, 0.08)',
            padding: '6px 12px',
            borderRadius: '8px',
            textAlign: 'center',
          }}>
            {relationshipSummary}
          </div>

          {/* ── Person Input ── */}
          <div style={{
            background: W.bg,
            border: `1px solid ${W.border}`,
            borderRadius: '16px',
            padding: '12px 14px',
          }}>
            <input
              type="text"
              required
              placeholder="Person name (e.g. Ninad, Vasu, Alex)"
              value={person}
              onChange={e => setPerson(e.target.value)}
              autoFocus
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                fontSize: '14px',
                fontWeight: 600,
                color: W.text,
                outline: 'none',
                padding: 0,
              }}
            />
          </div>

          {/* ── Primary Hero Input: Large Amount ── */}
          <div style={{
            background: W.bg,
            border: `1px solid ${W.border}`,
            borderRadius: '20px',
            padding: '16px 18px',
            display: 'flex',
            alignItems: 'baseline',
            gap: '8px',
          }}>
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

          {/* ── Expected by Date & Note Disclosure ── */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}>
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
                Expected: {isToday ? 'Today' : dueDate}
              </span>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                style={{
                  position: 'absolute',
                  inset: 0,
                  opacity: 0,
                  cursor: 'pointer',
                  width: '100%',
                }}
              />
            </div>

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
                placeholder="Optional note (e.g. Dinner split, Weekend trip)"
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

          {/* ── Action Buttons ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
            <button
              type="submit"
              disabled={!person.trim() || !amount || parseFloat(amount) <= 0 || saving}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '16px',
                background: isOwedToMe ? W.emerald : '#F43F5E',
                border: 'none',
                color: '#0E0F13',
                fontSize: '14px',
                fontWeight: 800,
                letterSpacing: '0.01em',
                cursor: (!person.trim() || !amount || parseFloat(amount) <= 0 || saving) ? 'not-allowed' : 'pointer',
                opacity: (!person.trim() || !amount || parseFloat(amount) <= 0 || saving) ? 0.45 : 1,
                transition: 'all 0.15s ease',
              }}
            >
              {saving ? 'Recording...' : (activePromise ? 'Save changes' : 'Record promise')}
            </button>

            {/* Resolve button for existing promises */}
            {activePromise && onResolve && (
              <button
                type="button"
                onClick={handleResolve}
                disabled={saving}
                style={{
                  width: '100%',
                  padding: '11px',
                  borderRadius: '12px',
                  background: 'rgba(31, 163, 111, 0.12)',
                  border: `1px solid ${W.emerald}`,
                  color: W.emerald,
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                }}
              >
                <CheckCircle2 size={14} />
                <span>Mark as settled</span>
              </button>
            )}

            {/* Delete button */}
            {activePromise && onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving}
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
                <span>Delete promise</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
