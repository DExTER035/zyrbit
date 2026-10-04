import React, { useState, useEffect } from 'react';
import { X, Wallet, Check } from 'lucide-react';

const W = {
  surface: '#15181B',
  border: '#23272E',
  borderSubtle: 'rgba(255, 255, 255, 0.07)',
  text: '#F5F5F5',
  sub: '#9CA3AF',
  accent: '#1FA36F',
};

export default function CashCalibrationModal({
  isOpen,
  currentCash = 0,
  currencySymbol = '₹',
  onClose,
  onSave,
}) {
  const [cashAmount, setCashAmount] = useState(() => (currentCash > 0 ? String(currentCash) : ''));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCashAmount(currentCash > 0 ? String(currentCash) : '');
      setSaving(false);
    }
  }, [isOpen, currentCash]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    const val = Number(cashAmount);
    if (isNaN(val) || val < 0) return;

    setSaving(true);
    try {
      await onSave(val);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end md:items-center justify-center p-0 md:p-4 animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-3xl md:rounded-2xl p-6 flex flex-col"
        style={{
          background: W.surface,
          border: `1px solid ${W.border}`,
          boxShadow: '0 20px 48px rgba(0, 0, 0, 0.6)',
        }}
      >
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Wallet size={16} className="text-[#1FA36F]" />
            <h2 className="text-base font-bold text-[#F5F5F5]">
              Calibrate Cash Balance
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-[#9CA3AF] hover:text-white transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-4">
          <p className="text-xs text-[#9CA3AF] leading-relaxed">
            Enter your total liquid cash (bank account + wallet) so Zyrbit knows your starting position honestly.
          </p>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-[#9CA3AF]">
              Current Liquid Cash ({currencySymbol})
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-3 text-lg font-bold text-[#1FA36F]">
                {currencySymbol}
              </span>
              <input
                type="number"
                step="any"
                min="0"
                required
                autoFocus
                value={cashAmount}
                onChange={(e) => setCashAmount(e.target.value)}
                placeholder="18500"
                className="w-full pl-9 pr-3.5 py-3 rounded-xl text-xl font-bold font-mono text-[#F5F5F5] outline-none"
                style={{
                  background: '#0B0D0F',
                  border: `1px solid ${W.borderSubtle}`,
                }}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-white/5 text-[#9CA3AF] font-bold text-xs hover:text-white transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !cashAmount}
              className="flex-1 py-3 rounded-xl bg-[#1FA36F] text-[#0B0D0F] font-bold text-xs flex items-center justify-center gap-1.5 hover:opacity-90 transition disabled:opacity-40 cursor-pointer"
            >
              <Check size={14} className="stroke-[3]" />
              <span>{saving ? 'Saving...' : 'Set Cash Balance'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
