import React from 'react';
import {
  Cloud,
  ArrowUpRight,
  ArrowDownRight,
  HandCoins,
  Repeat,
  TrendingUp,
  Inbox,
  RotateCcw,
  Plus,
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
 * FlowAssetsClouds
 * Two connected visual sections:
 * ☁ Flow — "What happened to your money?"
 * ☁ Assets — "Where your money is now"
 */
export default function FlowAssetsClouds({
  flow = {},
  assets = {},
  currencySymbol = '₹',
  onOpenEventModal,
}) {
  const formatCompact = (val) => {
    const num = Number(val) || 0;
    if (num >= 10000000) return `${(num / 10000000).toFixed(1)}Cr`;
    if (num >= 100000) return `${(num / 100000).toFixed(1)}L`;
    if (num >= 1000) return `${(num / 1000).toFixed(num % 1000 === 0 ? 0 : 1)}k`;
    return num.toLocaleString('en-IN');
  };

  const formatAmount = (val) => {
    const num = Number(val) || 0;
    return num.toLocaleString('en-IN');
  };

  // Flow semantic pills to display
  const flowItems = [
    {
      key: 'income',
      label: 'Income',
      amount: flow.income || 0,
      icon: ArrowUpRight,
      color: '#1FA36F',
      symbolPrefix: '↗',
    },
    {
      key: 'spent',
      label: 'Spent',
      amount: flow.spent || 0,
      icon: ArrowDownRight,
      color: '#F5F5F5',
      symbolPrefix: '↘',
    },
    {
      key: 'lent',
      label: 'Lent',
      amount: flow.lent || 0,
      icon: HandCoins,
      color: '#F59E0B',
      symbolPrefix: '🤝',
    },
    {
      key: 'transfers',
      label: 'Transfers',
      amount: flow.transfers || 0,
      icon: Repeat,
      color: '#9CA3AF',
      symbolPrefix: '↔',
    },
    {
      key: 'invested',
      label: 'Invested',
      amount: flow.invested || 0,
      icon: TrendingUp,
      color: '#1FA36F',
      symbolPrefix: '📈',
    },
    {
      key: 'borrowed',
      label: 'Borrowed',
      amount: flow.borrowed || 0,
      icon: Inbox,
      color: '#F59E0B',
      symbolPrefix: '📥',
    },
    {
      key: 'refunds',
      label: 'Refunds',
      amount: flow.refunds || 0,
      icon: RotateCcw,
      color: '#9CA3AF',
      symbolPrefix: '🔄',
    },
  ].filter((item) => item.amount > 0);

  // Asset holdings
  const assetItems = [
    { key: 'cash', label: 'Cash / Liquid', amount: assets.cash || 0 },
    { key: 'savings', label: 'Savings', amount: assets.savings || 0 },
    { key: 'invested', label: 'Invested', amount: assets.invested || 0 },
    { key: 'gold', label: 'Gold', amount: assets.gold || 0 },
    { key: 'owedToYou', label: 'Owed to you', amount: assets.owedToYou || 0 },
  ].filter((item) => item.amount > 0);

  return (
    <section className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
      {/* ── ☁ FLOW CLOUD ────────────────────────────────────────── */}
      <div
        className="rounded-2xl p-5 flex flex-col justify-between transition-all"
        style={{
          background: W.surface,
          border: `1px solid ${W.border}`,
        }}
      >
        <div>
          {/* Header */}
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#F5F5F5]">
              <Cloud size={14} className="text-[#9CA3AF]" />
              <span>Flow</span>
            </div>
            <span className="text-[10px] text-[#6B7280] font-medium">This Month</span>
          </div>
          <p className="text-[11px] text-[#9CA3AF] mb-4">
            What happened to your money?
          </p>

          {/* Flow Items / Pills */}
          {flowItems.length > 0 ? (
            <div className="flex flex-col gap-2">
              {flowItems.map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between p-2.5 rounded-xl transition"
                  style={{
                    background: '#0B0D0F',
                    border: `1px solid ${W.borderSubtle}`,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs">{item.symbolPrefix}</span>
                    <span className="text-xs font-medium text-[#F5F5F5]">{item.label}</span>
                  </div>
                  <span
                    className="text-xs font-bold font-mono"
                    style={{ color: item.color }}
                  >
                    {currencySymbol}{formatAmount(item.amount)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-[#6B7280] flex flex-col items-center gap-2">
              <span>No money events logged this month.</span>
              <button
                onClick={onOpenEventModal}
                className="text-[11px] font-semibold text-[#1FA36F] hover:underline cursor-pointer"
              >
                + Record a money event
              </button>
            </div>
          )}
        </div>

        {/* Footer Note */}
        {flowItems.length > 0 && (
          <div className="mt-4 pt-2.5 border-t border-white/5 flex items-center justify-between text-[10px] text-[#6B7280]">
            <span>Net movement</span>
            <span
              className={`font-semibold font-mono ${
                (flow.income || 0) >= (flow.spent || 0)
                  ? 'text-[#1FA36F]'
                  : 'text-[#9CA3AF]'
              }`}
            >
              {(flow.income || 0) >= (flow.spent || 0) ? '+' : '-'}
              {currencySymbol}{formatAmount(Math.abs((flow.income || 0) - (flow.spent || 0)))}
            </span>
          </div>
        )}
      </div>

      {/* ── ☁ ASSETS CLOUD ──────────────────────────────────────── */}
      <div
        className="rounded-2xl p-5 flex flex-col justify-between transition-all"
        style={{
          background: W.surface,
          border: `1px solid ${W.border}`,
        }}
      >
        <div>
          {/* Header */}
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#F5F5F5]">
              <Cloud size={14} className="text-[#9CA3AF]" />
              <span>Assets</span>
            </div>
            <span className="text-[10px] text-[#6B7280] font-medium">Position</span>
          </div>
          <p className="text-[11px] text-[#9CA3AF] mb-4">
            Where your money is now
          </p>

          {/* Asset Items */}
          {assetItems.length > 0 ? (
            <div className="flex flex-col gap-2">
              {assetItems.map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between p-2.5 rounded-xl transition"
                  style={{
                    background: '#0B0D0F',
                    border: `1px solid ${W.borderSubtle}`,
                  }}
                >
                  <span className="text-xs font-medium text-[#F5F5F5]">{item.label}</span>
                  <span className="text-xs font-bold text-[#F5F5F5] font-mono">
                    {currencySymbol}{formatCompact(item.amount)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-[#6B7280] flex flex-col items-center gap-2">
              <span>No asset holdings tracked yet.</span>
              <button
                onClick={onOpenEventModal}
                className="text-[11px] font-semibold text-[#1FA36F] hover:underline cursor-pointer"
              >
                + Track an asset or cash
              </button>
            </div>
          )}
        </div>

        {/* Total Assets Summary Footer */}
        <div className="mt-4 pt-2.5 border-t border-white/5 flex items-center justify-between text-[10px] text-[#6B7280]">
          <span>Total tracked</span>
          <span className="font-semibold text-[#F5F5F5] font-mono">
            {currencySymbol}{formatAmount(assets.total || 0)}
          </span>
        </div>
      </div>
    </section>
  );
}
