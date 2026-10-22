import React, { useState, useEffect } from 'react';
import { X, Wallet, ShieldCheck, ArrowRight } from 'lucide-react';

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
              <Wallet size={20} className="stroke-[2.2]" />
            </div>
            <div>
              <h2 style={{ color: W.text }} className="text-base font-bold leading-snug">
                Calibrate cash
              </h2>
              <p className="text-[11px] font-medium text-[#68777B]">
                Wealth · Balance settings
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
            What’s your actual balance?
          </h3>
          <p className="text-xs text-[#68777B] mt-1 leading-relaxed">
            Enter the total cash in your bank accounts and wallet.
          </p>
        </div>

        {/* White Card with Input and Reconciled Note */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div
            className="p-4 rounded-2xl flex flex-col gap-2.5"
            style={{
              background: W.card,
              border: `1px solid ${W.border}`,
            }}
          >
            <label className="text-xs font-medium text-[#68777B]">
              Total liquid cash
            </label>
            <div className="flex items-center gap-2 pb-2" style={{ borderBottom: `1px solid ${W.border}` }}>
              <span className="text-2xl font-bold text-[#174A55] select-none">
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
                placeholder="18,500"
                className="w-full text-2xl font-bold text-[#111A20] outline-none bg-transparent placeholder:text-[#8A9CA3]"
              />
            </div>
            <div className="flex items-center gap-1.5 pt-1 text-[11px] text-[#68777B]">
              <ShieldCheck size={14} className="text-[#174A55] shrink-0" />
              <span>Your recorded balance will be reconciled.</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-2 pt-1">
            <button
              type="submit"
              disabled={saving || !cashAmount}
              className="w-full py-3.5 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2 transition hover:opacity-95 disabled:opacity-50 cursor-pointer shadow-sm"
              style={{ background: W.petrol }}
            >
              <span>{saving ? 'Saving...' : 'Confirm cash balance'}</span>
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
