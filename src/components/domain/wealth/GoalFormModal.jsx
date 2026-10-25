import React, { useState, useEffect } from 'react';
import { X, Target, Trash2, Calendar, Check } from 'lucide-react';

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

export default function GoalFormModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  editingGoal = null,
  currencySymbol = '₹',
}) {
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editingGoal) {
      setName(editingGoal.name || '');
      setTargetAmount(editingGoal.target_amount !== undefined ? String(editingGoal.target_amount) : '');
      setCurrentAmount(editingGoal.current_amount !== undefined ? String(editingGoal.current_amount) : '0');
      setDeadline(editingGoal.deadline || '');
    } else {
      setName('');
      setTargetAmount('');
      setCurrentAmount('0');
      setDeadline('');
    }
  }, [editingGoal, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const target = parseFloat(targetAmount);
    const current = parseFloat(currentAmount || '0');
    if (!name.trim() || isNaN(target) || target <= 0 || saving) return;

    setSaving(true);
    try {
      await onSave({
        id: editingGoal?.id || null,
        name: name.trim(),
        targetAmount: target,
        currentAmount: isNaN(current) ? 0 : Math.max(0, current),
        deadline: deadline || null,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingGoal?.id || !onDelete || saving) return;
    setSaving(true);
    try {
      await onDelete(editingGoal.id);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(17, 26, 32, 0.45)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          background: W.card,
          borderTopLeftRadius: '24px',
          borderTopRightRadius: '24px',
          padding: '24px 20px calc(24px + env(safe-area-inset-bottom, 12px))',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.12)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: W.softTeal,
              color: W.petrol,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Target size={18} />
            </div>
            <div>
              <div style={{ fontSize: '17px', fontWeight: 800, color: W.text, fontFamily: "'Space Grotesk', -apple-system, sans-serif" }}>
                {editingGoal ? 'Edit Savings Goal' : 'New Savings Goal'}
              </div>
              <div style={{ fontSize: '11.5px', color: W.sub, marginTop: '1px' }}>
                Track target amount, progress & target date
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: '#FAF7F2',
              border: 'none',
              color: W.sub,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Goal Name */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: W.sub, marginBottom: '6px' }}>
              Goal Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Emergency Fund, Laptop, Vacation"
              required
              style={{
                width: '100%',
                minHeight: '44px',
                padding: '0 14px',
                borderRadius: '12px',
                border: `1.5px solid ${W.border}`,
                background: '#FAF7F2',
                fontSize: '14px',
                color: W.text,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Amounts Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: W.sub, marginBottom: '6px' }}>
                Target Amount ({currencySymbol})
              </label>
              <input
                type="number"
                step="any"
                min="1"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                placeholder="50,000"
                required
                style={{
                  width: '100%',
                  minHeight: '44px',
                  padding: '0 14px',
                  borderRadius: '12px',
                  border: `1.5px solid ${W.border}`,
                  background: '#FAF7F2',
                  fontSize: '14px',
                  color: W.text,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: W.sub, marginBottom: '6px' }}>
                Current Saved ({currencySymbol})
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={currentAmount}
                onChange={(e) => setCurrentAmount(e.target.value)}
                placeholder="10,000"
                style={{
                  width: '100%',
                  minHeight: '44px',
                  padding: '0 14px',
                  borderRadius: '12px',
                  border: `1.5px solid ${W.border}`,
                  background: '#FAF7F2',
                  fontSize: '14px',
                  color: W.text,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Target Date */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: W.sub, marginBottom: '6px' }}>
              Target Date (Optional)
            </label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              style={{
                width: '100%',
                minHeight: '44px',
                padding: '0 14px',
                borderRadius: '12px',
                border: `1.5px solid ${W.border}`,
                background: '#FAF7F2',
                fontSize: '14px',
                color: W.text,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
            {editingGoal && onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving}
                aria-label="Delete Goal"
                style={{
                  minHeight: '44px',
                  padding: '0 16px',
                  borderRadius: '12px',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  background: 'rgba(239, 68, 68, 0.08)',
                  color: W.danger,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <Trash2 size={16} />
              </button>
            )}

            <button
              type="submit"
              disabled={saving}
              style={{
                flex: 1,
                minHeight: '44px',
                padding: '0 18px',
                borderRadius: '12px',
                background: W.petrol,
                border: 'none',
                color: '#FFFFFF',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <Check size={16} />
              <span>{saving ? 'Saving...' : (editingGoal ? 'Update Goal' : 'Save Goal')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
