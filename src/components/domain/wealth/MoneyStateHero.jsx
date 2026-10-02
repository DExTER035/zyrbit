import React from 'react';
import { Sparkles, Calendar, Wallet, ShieldAlert, ArrowUpRight } from 'lucide-react';

const W = {
  bg: '#0B0D0F',
  surface: '#15181B',
  card: '#181B1F',
  border: '#23272E',
  borderSubtle: 'rgba(255, 255, 255, 0.07)',
  text: '#F5F5F5',
  sub: '#9CA3AF',
  muted: '#6B7280',
  accent: '#1FA36F',
  accentSoft: 'rgba(31, 163, 111, 0.12)',
  warning: '#F59E0B',
  danger: '#EF4444',
};

/**
 * MoneyStateHero
 * Large calm hero answering: "Safe to Spend" and overall Money State.
 * Honest uncalibrated state when cash balance is not known.
 */
export default function MoneyStateHero({
  moneyState,
  currencySymbol = '₹',
  onOpenCalibrate,
  onOpenEventModal,
}) {
  const {
    isCalibrated,
    safeToSpendDaily,
    liquidCash,
    committedNext30Total,
    runwayDays,
    runwayHasData,
    dexGuidance,
  } = moneyState;

  // Actual current date e.g. "Friday, October 2"
  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const formatAmount = (val) => {
    const num = Number(val) || 0;
    return num.toLocaleString('en-IN');
  };

  return (
    <section className="w-full flex flex-col gap-3">
      {/* ── Top Date Bar ────────────────────────────────────────── */}
      <div className="flex items-center justify-between text-xs text-[#9CA3AF] px-1 font-medium">
        <span className="tracking-wide text-xs">{formattedDate}</span>
        <span className="text-[11px] font-semibold text-[#1FA36F] uppercase tracking-wider bg-[#1FA36F]/10 px-2 py-0.5 rounded-full border border-[#1FA36F]/20">
          Money State
        </span>
      </div>

      {/* ── Hero Card ───────────────────────────────────────────── */}
      <div
        className="w-full rounded-2xl p-6 relative overflow-hidden transition-all duration-200"
        style={{
          background: 'linear-gradient(180deg, #15181B 0%, #111417 100%)',
          border: `1px solid ${W.border}`,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.36)',
        }}
      >
        {/* Subtle Ambient Radial Highlight */}
        <div
          className="absolute -top-24 -right-24 w-56 h-56 rounded-full pointer-events-none opacity-20 blur-3xl"
          style={{ background: isCalibrated ? '#1FA36F' : '#F59E0B' }}
        />

        {isCalibrated ? (
          /* ── Calibrated Safe-To-Spend State ──────────────────── */
          <div className="flex flex-col gap-5">
            <div>
              <div className="text-[11px] font-bold tracking-[0.16em] uppercase text-[#9CA3AF] mb-2 flex items-center gap-2">
                <span>Safe to Spend</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#1FA36F] animate-pulse" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl md:text-5xl lg:text-6xl font-black text-[#F5F5F5] tracking-tight leading-none">
                  {currencySymbol}{formatAmount(safeToSpendDaily)}
                </span>
                <span className="text-sm font-semibold text-[#9CA3AF] ml-1">/ day</span>
              </div>
              <p className="text-xs text-[#9CA3AF] mt-2 font-normal">
                available for everyday spending
              </p>
            </div>

            {/* Supporting Compact Info Bar */}
            <div
              className="grid grid-cols-3 gap-2 p-3 rounded-xl"
              style={{
                background: '#0B0D0F',
                border: `1px solid ${W.borderSubtle}`,
              }}
            >
              {/* Cash */}
              <button
                onClick={onOpenCalibrate}
                className="text-left flex flex-col p-1.5 rounded-lg hover:bg-white/5 transition cursor-pointer"
                title="Click to calibrate cash balance"
              >
                <span className="text-[10px] text-[#6B7280] uppercase tracking-wider font-semibold">Cash</span>
                <span className="text-sm font-bold text-[#F5F5F5] truncate mt-0.5">
                  {currencySymbol}{formatAmount(liquidCash)}
                </span>
              </button>

              {/* Committed */}
              <div className="flex flex-col p-1.5 border-l border-white/5 pl-3">
                <span className="text-[10px] text-[#6B7280] uppercase tracking-wider font-semibold">Committed</span>
                <span className="text-sm font-bold text-[#F5F5F5] truncate mt-0.5">
                  {currencySymbol}{formatAmount(committedNext30Total)}
                </span>
              </div>

              {/* Runway */}
              <div className="flex flex-col p-1.5 border-l border-white/5 pl-3">
                <span className="text-[10px] text-[#6B7280] uppercase tracking-wider font-semibold">Runway</span>
                <span className="text-sm font-bold text-[#F5F5F5] truncate mt-0.5">
                  {runwayHasData && runwayDays != null ? `${runwayDays} days` : 'Calibrating'}
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* ── Honest Uncalibrated State ────────────────────────── */
          <div className="flex flex-col gap-4 py-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#F59E0B]">
              <ShieldAlert size={16} />
              <span>Cash position uncalibrated</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[#F5F5F5] tracking-tight">
                Set your current cash balance
              </h2>
              <p className="text-xs text-[#9CA3AF] mt-1.5 max-w-md leading-relaxed">
                Tell Zyrbit your available liquid cash so Safe-to-Spend can be calculated honestly without guessing.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                onClick={onOpenCalibrate}
                className="px-4 py-2.5 rounded-xl bg-[#1FA36F] text-[#0B0D0F] font-bold text-xs flex items-center gap-1.5 hover:opacity-90 transition cursor-pointer"
              >
                <Wallet size={14} />
                <span>Set Cash Balance</span>
              </button>
              <button
                onClick={onOpenEventModal}
                className="px-3.5 py-2.5 rounded-xl bg-white/5 text-[#F5F5F5] border border-white/10 font-medium text-xs hover:bg-white/10 transition cursor-pointer"
              >
                Log First Income
              </button>
            </div>
          </div>
        )}

        {/* ── Dex Intelligence Moment ────────────────────────────── */}
        {dexGuidance && (
          <div
            className="mt-4 pt-3 flex items-start gap-2 border-t text-xs font-normal"
            style={{
              borderColor: 'rgba(255, 255, 255, 0.06)',
              color: '#9CA3AF',
            }}
          >
            <Sparkles size={14} className="text-[#1FA36F] shrink-0 mt-0.5" />
            <span className="leading-snug">
              <strong className="text-[#F5F5F5] font-semibold">Dex: </strong>
              {dexGuidance}
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
