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
};

const FREQUENCIES = [
  { id: 'monthly', label: 'Monthly' },
  { id: 'weekly',  label: 'Weekly'  },
  { id: 'yearly',  label: 'Yearly'  },
];

export default function BillFormModal({
  editingBill = null,
  currencySymbol = '₹',
  onSave,
  onClose,
}) {
  const todayYMD = new Date().toISOString().split('T')[0];

  const [name, setName]           = useState(editingBill ? editingBill.name : '');
  const [amount, setAmount]       = useState(editingBill ? String(editingBill.amount) : '');
  const [dueDate, setDueDate]     = useState(editingBill ? editingBill.due_date : todayYMD);
  const [frequency, setFrequency] = useState(editingBill ? editingBill.frequency : 'monthly');
  const [isSaving, setIsSaving]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!name.trim() || isNaN(amt) || !isFinite(amt) || amt <= 0 || isSaving) {
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        id: editingBill ? editingBill.id : null,
        name: name.trim().slice(0, 150),
        amount: Math.round(amt * 100) / 100,
        due_date: dueDate || todayYMD,
        frequency: frequency,
        status: editingBill ? editingBill.status : 'unpaid',
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
            {editingBill ? 'Edit Recurring Bill' : 'Add Recurring Bill'}
          </span>
          <button
            onClick={onClose}
            style={{ background: W.dim, border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: W.sub }}
          >
            <X size={14} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Bill Name */}
          <div>
            <div style={{ fontSize: '10px', color: W.muted, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '8px' }}>
              Bill Name *
            </div>
            <input
              type="text"
              placeholder="e.g. WiFi, Netflix, Rent"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
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

          {/* Amount input */}
          <div>
            <div style={{ fontSize: '10px', color: W.muted, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '8px' }}>
              Amount ({currencySymbol}) *
            </div>
            <input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              style={{
                width: '100%',
                background: W.bg,
                border: `1px solid ${W.border2}`,
                borderRadius: '14px',
                padding: '12px 14px',
                fontSize: '14px',
                fontWeight: 700,
                color: W.text,
                outline: 'none',
              }}
            />
          </div>

          {/* Due date picker */}
          <div>
            <div style={{ fontSize: '10px', color: W.muted, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '8px' }}>
              Next Due Date
            </div>
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
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

          {/* Frequency selector */}
          <div>
            <div style={{ fontSize: '10px', color: W.muted, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '8px' }}>
              Frequency
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {FREQUENCIES.map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFrequency(f.id)}
                  style={{
                    flex: 1,
                    padding: '10px 8px',
                    borderRadius: '12px',
                    background: frequency === f.id ? W.accent : W.dim,
                    border: `1px solid ${frequency === f.id ? W.accent : W.border2}`,
                    color: frequency === f.id ? '#000' : W.text,
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={!name.trim() || !amount || parseFloat(amount) <= 0 || isSaving}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '16px',
              background: W.accent,
              border: 'none',
              color: '#000',
              fontSize: '14px',
              fontWeight: 800,
              cursor: 'pointer',
              opacity: (!name.trim() || !amount || parseFloat(amount) <= 0 || isSaving) ? 0.5 : 1,
              marginTop: '8px',
            }}
          >
            {isSaving ? 'Saving...' : (editingBill ? 'Save Bill 💾' : 'Add Bill 📅')}
          </button>
        </form>
      </div>
    </div>
  );
}
