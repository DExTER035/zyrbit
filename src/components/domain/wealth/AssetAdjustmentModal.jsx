import React, { useState } from 'react';
import { X, PiggyBank, Landmark, Sparkles, ArrowRight } from 'lucide-react';

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
};

const ASSET_META = {
  savings: {
    label: 'Savings',
    icon: PiggyBank,
    desc: 'Wealth · Asset holdings',
    subdesc: 'Money intentionally set aside for reserves or near-term safety.',
    transferType: 'TRANSFER',
    category: 'Transfer',
  },
  investments: {
    label: 'Investments',
    icon: Landmark,
    desc: 'Wealth · Asset holdings',
    subdesc: 'Mutual funds, equities, retirement, & long-term capital.',
    transferType: 'INVESTMENT',
    category: 'Investment',
  },
  gold: {
    label: 'Gold Holdings',
    icon: Sparkles,
    desc: 'Wealth · Asset holdings',
    subdesc: 'Physical or digital gold value recorded in your portfolio.',
    transferType: 'SPEND',
    category: 'Gold',
  },
};

export default function AssetAdjustmentModal({
  isOpen,
  onClose,
  assetKey = 'savings', // 'savings' | 'investments' | 'gold'
  currentAmount = 0,
  currentValues = null,
  currencySymbol = '₹',
  onSave,
}) {
  const meta = ASSET_META[assetKey] || ASSET_META.savings;
  const Icon = meta.icon;
  const effectiveCurrentAmount = currentAmount || (currentValues && currentValues[assetKey]) || 0;

  const [mode, setMode] = useState('add'); // 'add' | 'set'
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setAmount('');
      setSaving(false);
    }
  }, [isOpen, assetKey]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0 || saving) return;

    setSaving(true);
    try {
      if (mode === 'add') {
        // Record as an asset movement / transfer
        await onSave({
          type: meta.transferType,
          amount: numAmount,
          category: meta.category,
          title: `Added to ${meta.label}`,
          note: `Manual allocation to ${meta.label}`,
        });
      } else {
        // Calibrate / adjust holding directly
        const diff = numAmount - (effectiveCurrentAmount || 0);
        if (Math.abs(diff) > 0) {
          await onSave({
            type: diff > 0 ? meta.transferType : 'INCOME',
            amount: Math.abs(diff),
            category: meta.category,
            title: `Calibrated ${meta.label}`,
            note: `Set ${meta.label} holding to ${currencySymbol}${numAmount}`,
          });
        }
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

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
        {/* Header with Icon badge, Title, Subtitle, Close */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: W.softTeal, color: W.petrol }}
            >
              <Icon size={20} className="stroke-[2.2]" />
            </div>
            <div>
              <h2 style={{ color: W.text }} className="text-base font-bold leading-snug">
                {meta.label}
              </h2>
              <p className="text-[11px] font-medium text-[#68777B]">
                {meta.desc}
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
            {mode === 'add' ? `Add to ${meta.label}` : `Set ${meta.label} balance`}
          </h3>
          <p className="text-xs text-[#68777B] mt-1 leading-relaxed">
            {meta.subdesc}
          </p>
        </div>

        {/* Current Balance Display pill */}
        <div
          className="p-3.5 rounded-2xl flex items-center justify-between"
          style={{
            background: W.card,
            border: `1px solid ${W.border}`,
          }}
        >
          <span className="text-xs text-[#68777B] font-medium">Recorded balance</span>
          <span className="text-sm font-bold text-[#111A20]">
            {currencySymbol}{Math.round(effectiveCurrentAmount || 0).toLocaleString()}
          </span>
        </div>

        {/* Action Type Toggle */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setMode('add')}
            className="py-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
            style={{
              background: mode === 'add' ? W.softTeal : W.elevated,
              borderColor: mode === 'add' ? W.petrol : W.border,
              color: mode === 'add' ? W.petrol : W.sub,
            }}
          >
            <span>+ Deposit / Add</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('set')}
            className="py-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
            style={{
              background: mode === 'set' ? W.softTeal : W.elevated,
              borderColor: mode === 'set' ? W.petrol : W.border,
              color: mode === 'set' ? W.petrol : W.sub,
            }}
          >
            <span>Set Total Value</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div
            className="p-4 rounded-2xl flex flex-col gap-2.5"
            style={{
              background: W.card,
              border: `1px solid ${W.border}`,
            }}
          >
            <label className="text-xs font-medium text-[#68777B]">
              {mode === 'add' ? 'Amount to allocate' : 'New total value'}
            </label>
            <div className="flex items-center gap-2 pb-2" style={{ borderBottom: `1px solid ${W.border}` }}>
              <span className="text-2xl font-bold text-[#174A55] select-none">
                {currencySymbol}
              </span>
              <input
                type="number"
                step="any"
                min="1"
                required
                autoFocus
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full text-2xl font-bold text-[#111A20] outline-none bg-transparent placeholder:text-[#8A9CA3]"
              />
            </div>
            <div className="text-[11px] text-[#68777B]">
              {mode === 'add' ? 'Recorded as asset allocation' : 'Asset balance will be updated'}
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-1">
            <button
              type="submit"
              disabled={saving || !amount}
              className="w-full py-3.5 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2 transition hover:opacity-95 disabled:opacity-50 cursor-pointer shadow-sm"
              style={{ background: W.petrol }}
            >
              <span>{saving ? 'Saving...' : mode === 'add' ? `Confirm deposit` : `Confirm new balance`}</span>
              <ArrowRight size={15} />
            </button>
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
