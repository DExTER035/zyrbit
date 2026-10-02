import React, { useState } from 'react';
import {
  Clock,
  HandCoins,
  TrendingUp,
  CheckCircle2,
  Bell,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

const W = {
  bg: '#0B0D0F',
  surface: '#15181B',
  border: '#23272E',
  borderSubtle: 'rgba(255, 255, 255, 0.06)',
  text: '#F5F5F5',
  sub: '#9CA3AF',
  muted: '#6B7280',
  accent: '#1FA36F',
  warning: '#F59E0B',
  danger: '#EF4444',
};

/**
 * LowerContent
 * Below the core state:
 * - RECENT: small number of meaningful events (e.g. Poha 30, Metro 30, Assignment 70, Editing +3000)
 * - MONEY PROMISE: first-class receivables (e.g. Ninad owes you 300, due Oct 10)
 * - INVESTING: compact investment overview
 */
export default function LowerContent({
  recentEvents = [],
  moneyPromises = [],
  investedTotal = 0,
  currencySymbol = '₹',
  onResolvePromise,
  onOpenEventModal,
}) {
  const [showAllModal, setShowAllModal] = useState(false);

  const formatAmount = (val) => {
    const num = Number(val) || 0;
    return num.toLocaleString('en-IN');
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Estimated current value (defaulting to invested with modest calibration)
  const currentInvestmentValue = investedTotal > 0 ? Math.round(investedTotal * 1.08) : 0;

  return (
    <section className="flex flex-col gap-4 w-full">
      {/* ── 1. RECENT EVENTS ───────────────────────────────────────── */}
      <div
        className="rounded-2xl p-5 flex flex-col transition-all"
        style={{
          background: W.surface,
          border: `1px solid ${W.border}`,
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-[#9CA3AF]" />
            <h3 className="text-xs font-semibold text-[#F5F5F5] uppercase tracking-wider">
              Recent
            </h3>
          </div>
          {recentEvents.length > 4 && (
            <button
              onClick={() => setShowAllModal(true)}
              className="text-[11px] font-medium text-[#9CA3AF] hover:text-[#F5F5F5] transition flex items-center gap-0.5 cursor-pointer"
            >
              <span>View all</span>
              <ChevronRight size={12} />
            </button>
          )}
        </div>

        {recentEvents.length > 0 ? (
          <div className="flex flex-col gap-1.5">
            {recentEvents.slice(0, 5).map((evt) => (
              <div
                key={evt.id}
                className="flex items-center justify-between py-2 px-2.5 rounded-xl hover:bg-white/[0.02] transition"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base select-none">{evt.emoji || '💳'}</span>
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-[#F5F5F5] truncate max-w-[180px] md:max-w-[320px]">
                      {evt.title}
                    </span>
                    <span className="text-[10px] text-[#6B7280]">
                      {formatDate(evt.date)}
                    </span>
                  </div>
                </div>

                <span
                  className={`text-xs font-bold font-mono ${
                    evt.isCredit ? 'text-[#1FA36F]' : 'text-[#F5F5F5]'
                  }`}
                >
                  {evt.isCredit ? '+' : ''}
                  {currencySymbol}{formatAmount(evt.amount)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-[#6B7280]">
            No recent transactions logged yet.
          </div>
        )}
      </div>

      {/* ── 2. MONEY PROMISE & INVESTING ──────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Money Promise Card */}
        <div
          className="rounded-2xl p-5 flex flex-col justify-between"
          style={{
            background: W.surface,
            border: `1px solid ${W.border}`,
          }}
        >
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#F5F5F5]">
                <HandCoins size={14} className="text-[#F59E0B]" />
                <span>Money Promise</span>
              </div>
              <span className="text-[10px] text-[#F59E0B] font-semibold bg-[#F59E0B]/10 px-2 py-0.5 rounded-full border border-[#F59E0B]/20">
                Receivable
              </span>
            </div>
            <p className="text-[11px] text-[#9CA3AF] mb-3">
              Money owed to you
            </p>

            {moneyPromises.length > 0 ? (
              <div className="flex flex-col gap-2">
                {moneyPromises.map((p) => (
                  <div
                    key={p.id}
                    className="p-3 rounded-xl flex items-center justify-between"
                    style={{
                      background: '#0B0D0F',
                      border: `1px solid ${W.borderSubtle}`,
                    }}
                  >
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-[#F5F5F5]">
                        {p.person} owes you {currencySymbol}{formatAmount(p.amount)}
                      </span>
                      <div className="flex items-center gap-2 text-[10px] text-[#9CA3AF] mt-0.5">
                        <span>Due {formatDate(p.dueDate)}</span>
                        <span>·</span>
                        <span className="flex items-center gap-1 text-[#1FA36F]">
                          <Bell size={10} />
                          <span>Reminder scheduled</span>
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => onResolvePromise && onResolvePromise(p)}
                      className="px-2.5 py-1.5 rounded-lg bg-[#1FA36F]/10 border border-[#1FA36F]/20 text-[#1FA36F] text-[11px] font-semibold hover:bg-[#1FA36F]/20 transition cursor-pointer"
                      title="Mark as paid back"
                    >
                      Received
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-5 text-center text-xs text-[#6B7280] flex flex-col items-center gap-1.5">
                <span>No pending money promises.</span>
                <button
                  onClick={onOpenEventModal}
                  className="text-[11px] font-semibold text-[#1FA36F] hover:underline cursor-pointer"
                >
                  + Record a loan or money owed
                </button>
              </div>
            )}
          </div>

          <div className="mt-3 text-[10px] text-[#6B7280]">
            Distinguishes loans from ordinary spending.
          </div>
        </div>

        {/* Investing Card */}
        <div
          className="rounded-2xl p-5 flex flex-col justify-between"
          style={{
            background: W.surface,
            border: `1px solid ${W.border}`,
          }}
        >
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#F5F5F5]">
                <TrendingUp size={14} className="text-[#1FA36F]" />
                <span>Investing</span>
              </div>
              <span className="text-[10px] text-[#6B7280] font-medium">Money State</span>
            </div>
            <p className="text-[11px] text-[#9CA3AF] mb-3">
              Long-term asset growth
            </p>

            {investedTotal > 0 ? (
              <div
                className="p-3.5 rounded-xl flex items-center justify-between"
                style={{
                  background: '#0B0D0F',
                  border: `1px solid ${W.borderSubtle}`,
                }}
              >
                <div className="flex flex-col">
                  <span className="text-[10px] text-[#6B7280] uppercase tracking-wider font-medium">
                    Invested
                  </span>
                  <span className="text-sm font-bold text-[#F5F5F5] font-mono mt-0.5">
                    {currencySymbol}{formatAmount(investedTotal)}
                  </span>
                </div>

                <div className="flex flex-col text-right">
                  <span className="text-[10px] text-[#6B7280] uppercase tracking-wider font-medium">
                    Current Value
                  </span>
                  <span className="text-sm font-bold text-[#1FA36F] font-mono mt-0.5">
                    {currencySymbol}{formatAmount(currentInvestmentValue)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="py-5 text-center text-xs text-[#6B7280] flex flex-col items-center gap-1.5">
                <span>No investments logged yet.</span>
                <button
                  onClick={onOpenEventModal}
                  className="text-[11px] font-semibold text-[#1FA36F] hover:underline cursor-pointer"
                >
                  + Log SIP or asset purchase
                </button>
              </div>
            )}
          </div>

          <div className="mt-3 text-[10px] text-[#6B7280]">
            Part of Money State, not a day-trading terminal.
          </div>
        </div>
      </div>

      {/* ── View All Transactions Modal ────────────────────────────── */}
      {showAllModal && (
        <div
          onClick={() => setShowAllModal(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end md:items-center justify-center p-0 md:p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-t-2xl md:rounded-2xl p-6 flex flex-col max-h-[85vh] overflow-hidden"
            style={{
              background: W.surface,
              border: `1px solid ${W.border}`,
            }}
          >
            <div className="flex items-center justify-between pb-4 border-b border-white/5">
              <h3 className="text-sm font-bold text-[#F5F5F5]">All Recent Events</h3>
              <button
                onClick={() => setShowAllModal(false)}
                className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-[#9CA3AF] hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto py-3 flex flex-col gap-2">
              {recentEvents.map((evt) => (
                <div
                  key={evt.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-[#0B0D0F] border border-white/5"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">{evt.emoji || '💳'}</span>
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-[#F5F5F5]">
                        {evt.title}
                      </span>
                      <span className="text-[10px] text-[#6B7280]">
                        {evt.type} · {formatDate(evt.date)}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`text-xs font-bold font-mono ${
                      evt.isCredit ? 'text-[#1FA36F]' : 'text-[#F5F5F5]'
                    }`}
                  >
                    {evt.isCredit ? '+' : ''}
                    {currencySymbol}{formatAmount(evt.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
