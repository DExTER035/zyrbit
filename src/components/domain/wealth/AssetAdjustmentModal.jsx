import React, { useState } from 'react';
import { X, Wallet, PiggyBank, Landmark, Sparkles } from 'lucide-react';

const W = {
  bg: '#0B0D0F',
  surface: '#15181B',
  border: '#1F242C',
  text: '#F5F5F5',
  sub: '#9CA3AF',
  accent: '#E9B44C',
  emerald: '#1FA36F',
};

const ASSET_META = {
  savings: {
    label: 'Savings',
    icon: PiggyBank,
    desc: 'Money intentionally set aside',
    transferType: 'TRANSFER',
    category: 'Transfer',
  },
  investments: {
    label: 'Investments',
    icon: Landmark,
    desc: 'Mutual funds, equities & long-term capital',
    transferType: 'INVESTMENT',
    category: 'Investment',
  },
  gold: {
    label: 'Gold Holdings',
    icon: Sparkles,
    desc: 'Physical or digital gold value',
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
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end md:items-center justify-center p-0 md:p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-3xl md:rounded-2xl p-6 flex flex-col"
        style={{ background: W.surface, border: `1px solid ${W.border}` }}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#1A1E24] flex items-center justify-center text-[#E9B44C]">
              <Icon size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#F5F5F5]">{meta.label}</h3>
              <p className="text-xs text-[#9CA3AF]">{meta.desc}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-[#9CA3AF] hover:text-white"
          >
            <X size={15} />
          </button>
        </div>

        {/* Current Balance Display */}
        <div className="my-4 p-3.5 rounded-xl bg-[#0B0D0F] border border-white/5 flex items-center justify-between">
          <span className="text-xs text-[#9CA3AF] font-medium">Current Balance</span>
          <span className="text-base font-bold text-[#F5F5F5] font-mono">
            {currencySymbol}{Math.round(currentAmount || 0).toLocaleString()}
          </span>
        </div>

        {/* Action Type Toggle */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            type="button"
            onClick={() => setMode('add')}
            className="py-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1"
            style={{
              background: mode === 'add' ? 'rgba(31, 163, 111, 0.15)' : '#0B0D0F',
              borderColor: mode === 'add' ? W.emerald : 'rgba(255, 255, 255, 0.08)',
              color: mode === 'add' ? W.emerald : '#9CA3AF',
            }}
          >
            <span>+ Deposit / Add</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('set')}
            className="py-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1"
            style={{
              background: mode === 'set' ? 'rgba(233, 180, 76, 0.15)' : '#0B0D0F',
              borderColor: mode === 'set' ? W.accent : 'rgba(255, 255, 255, 0.08)',
              color: mode === 'set' ? W.accent : '#9CA3AF',
            }}
          >
            <span>Set Total Value</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#9CA3AF]">
              {mode === 'add' ? `Amount to allocate (${currencySymbol})` : `New total value (${currencySymbol})`}
            </label>
            <input
              type="number"
              step="any"
              min="1"
              required
              autoFocus
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl bg-[#0B0D0F] border border-white/10 text-base font-bold font-mono text-[#F5F5F5] outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={saving || !amount}
            className="w-full py-3 rounded-xl bg-[#1FA36F] text-[#0B0D0F] font-bold text-xs cursor-pointer hover:bg-[#1FA36F]/90 transition disabled:opacity-50 mt-1"
          >
            {saving ? 'Saving...' : mode === 'add' ? `Record Allocation to ${meta.label}` : `Update ${meta.label} Value`}
          </button>
        </form>
      </div>
    </div>
  );
}
