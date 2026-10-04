import React, { useState, useEffect } from 'react';
import { X, Calendar, Trash2 } from 'lucide-react';

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
  amber: '#F59E0B',
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
  const todayYMD = new Date().toISOString().split('T')[0];

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
              color: W.amber,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              marginBottom: '3px',
            }}>
              {activeBill ? 'Edit Commitment' : 'Commitment'}
            </div>
            <div style={{
              fontSize: '15px',
              fontWeight: 600,
              color: W.text,
              letterSpacing: '-0.01em',
            }}>
              What are you already committed to?
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
          {/* ── Name & Presets ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{
              background: W.bg,
              border: `1px solid ${W.border}`,
              borderRadius: '16px',
              padding: '12px 14px',
            }}>
              <input
                type="text"
                placeholder="Commitment name (e.g. Rent, WiFi, Netflix)"
                value={name}
                onChange={e => setName(e.target.value)}
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

            {/* Quick Name Presets */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {COMMITMENT_PRESETS.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setName(p.id)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '8px',
                    background: name === p.id ? 'rgba(245, 158, 11, 0.15)' : W.dim,
                    border: `1px solid ${name === p.id ? W.amber : W.border}`,
                    color: name === p.id ? W.amber : W.sub,
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>{p.icon}</span>
                  <span>{p.label}</span>
                </button>
              ))}
            </div>
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

          {/* ── Due Date & Frequency Row ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {/* Due date picker */}
            <div style={{
              background: W.bg,
              border: `1px solid ${W.border}`,
              borderRadius: '14px',
              padding: '10px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              position: 'relative',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={13} color={W.sub} />
                <span style={{ fontSize: '12px', fontWeight: 600, color: W.text }}>
                  {isToday ? 'Today' : dueDate}
                </span>
              </div>
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

            {/* Frequency selection */}
            <div style={{
              background: W.bg,
              border: `1px solid ${W.border}`,
              borderRadius: '14px',
              padding: '4px',
              display: 'flex',
              gap: '2px',
            }}>
              {FREQUENCIES.map(f => {
                const isSelected = frequency.toLowerCase() === f.id.toLowerCase();
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFrequency(f.id)}
                    style={{
                      flex: 1,
                      padding: '6px 2px',
                      borderRadius: '10px',
                      background: isSelected ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
                      border: isSelected ? `1px solid ${W.amber}` : '1px solid transparent',
                      color: isSelected ? W.amber : W.sub,
                      fontSize: '10px',
                      fontWeight: isSelected ? 700 : 500,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      textAlign: 'center',
                    }}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Primary Action Button ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
            <button
              type="submit"
              disabled={!name.trim() || !amount || parseFloat(amount) <= 0 || isSaving}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '16px',
                background: W.amber,
                border: 'none',
                color: '#0E0F13',
                fontSize: '14px',
                fontWeight: 800,
                letterSpacing: '0.01em',
                cursor: (!name.trim() || !amount || parseFloat(amount) <= 0 || isSaving) ? 'not-allowed' : 'pointer',
                opacity: (!name.trim() || !amount || parseFloat(amount) <= 0 || isSaving) ? 0.45 : 1,
                transition: 'all 0.15s ease',
              }}
            >
              {isSaving ? 'Saving...' : (activeBill ? 'Save commitment' : 'Save commitment')}
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
                <span>Delete commitment</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
