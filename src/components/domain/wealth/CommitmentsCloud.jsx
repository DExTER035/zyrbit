import React from 'react';
import { Cloud, Check, Clock, Calendar, Plus } from 'lucide-react';

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
 * CommitmentsCloud
 * Full-width section for "Money already promised"
 * Lists bills, subscriptions, debt repayments, scheduled SIPs.
 */
export default function CommitmentsCloud({
  commitments = [],
  committedNext30Total = 0,
  currencySymbol = '₹',
  onTogglePaid,
  onOpenEventModal,
}) {
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

  return (
    <section
      className="w-full rounded-2xl p-5 flex flex-col transition-all"
      style={{
        background: W.surface,
        border: `1px solid ${W.border}`,
      }}
    >
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#F5F5F5]">
            <Cloud size={14} className="text-[#9CA3AF]" />
            <span>Commitments</span>
          </div>
          <p className="text-[11px] text-[#9CA3AF] mt-0.5">
            Money already promised
          </p>
        </div>

        {/* Right side next 30 days total */}
        <div className="text-right">
          <div className="text-[10px] text-[#6B7280] font-medium tracking-wide uppercase">
            Next 30 days
          </div>
          <div className="text-sm font-bold text-[#F5F5F5] font-mono mt-0.5">
            {currencySymbol}{formatAmount(committedNext30Total)}
          </div>
        </div>
      </div>

      {/* ── Commitments List ────────────────────────────────────── */}
      {commitments.length > 0 ? (
        <div className="flex flex-col gap-2">
          {commitments.map((item) => {
            const isDueSoon = item.daysUntil <= 3 && item.daysUntil >= 0;
            const isOverdue = item.daysUntil < 0;

            return (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 rounded-xl transition hover:bg-white/[0.02]"
                style={{
                  background: '#0B0D0F',
                  border: `1px solid ${W.borderSubtle}`,
                }}
              >
                {/* Left: Checkbox + Name + Date */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => onTogglePaid && onTogglePaid(item.id, item.status)}
                    className="w-5 h-5 rounded-md border flex items-center justify-center transition cursor-pointer hover:border-[#1FA36F]"
                    style={{
                      borderColor: item.status === 'paid' ? '#1FA36F' : W.muted,
                      background: item.status === 'paid' ? '#1FA36F' : 'transparent',
                    }}
                    title={item.status === 'paid' ? 'Mark unpaid' : 'Mark paid'}
                  >
                    {item.status === 'paid' && <Check size={12} className="text-black stroke-[3]" />}
                  </button>

                  <div className="flex flex-col">
                    <span
                      className={`text-xs font-medium ${
                        item.status === 'paid' ? 'line-through text-[#6B7280]' : 'text-[#F5F5F5]'
                      }`}
                    >
                      {item.name}
                    </span>
                    <span className="text-[10px] text-[#6B7280]">
                      {item.frequency === 'monthly' ? 'Monthly subscription' : 'One-time commitment'}
                    </span>
                  </div>
                </div>

                {/* Right: Amount · Due Date · Badge */}
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-xs font-bold text-[#F5F5F5] font-mono">
                      {currencySymbol}{formatAmount(item.amount)}
                    </span>
                    <div className="text-[10px] text-[#9CA3AF] flex items-center justify-end gap-1">
                      <span>·</span>
                      <span>{formatDate(item.due_date)}</span>
                    </div>
                  </div>

                  {/* Relative due badge */}
                  {isOverdue ? (
                    <span className="text-[9px] font-semibold text-[#EF4444] bg-[#EF4444]/10 px-1.5 py-0.5 rounded border border-[#EF4444]/20">
                      Overdue
                    </span>
                  ) : isDueSoon ? (
                    <span className="text-[9px] font-semibold text-[#F59E0B] bg-[#F59E0B]/10 px-1.5 py-0.5 rounded border border-[#F59E0B]/20">
                      {item.daysUntil === 0 ? 'Today' : `In ${item.daysUntil}d`}
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-8 text-center text-xs text-[#6B7280] flex flex-col items-center gap-2">
          <span>No upcoming commitments scheduled.</span>
          <button
            onClick={onOpenEventModal}
            className="text-[11px] font-semibold text-[#1FA36F] hover:underline cursor-pointer"
          >
            + Schedule rent, bill, or SIP
          </button>
        </div>
      )}
    </section>
  );
}
