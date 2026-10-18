/**
 * WealthRecentEvents — Recent Outflows and Inflows with Cross-Domain Badges
 * Shows real persisted transactions from Supabase (expenses, incomes, promises).
 * Single Source of Truth: Derived strictly from database records. Zero mock data.
 * Updated to Zenith Dark Forest Design System.
 */
import React, { useState } from 'react';
import {
  Utensils,
  ShoppingBag,
  ArrowDownLeft,
  ChevronRight,
  User,
  CreditCard,
  FileText,
  Car,
  HeartPulse,
} from 'lucide-react';

/**
 * Formats a transaction date using the user's local timezone.
 * Uses 'Today', 'Yesterday', or 'D MMM' (e.g. '8 Oct') with optional local time.
 */
function formatEventDate(dateStr, createdAtStr) {
  if (!dateStr && !createdAtStr) return 'Recently';

  const now = new Date();
  const todayYMD = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0];
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayYMD = new Date(yesterday.getTime() - yesterday.getTimezoneOffset() * 60000).toISOString().split('T')[0];

  const ymd = dateStr || (createdAtStr ? createdAtStr.split('T')[0] : '');

  let timeStr = '';
  if (createdAtStr) {
    try {
      const timeDate = new Date(createdAtStr);
      timeStr = timeDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
    } catch {
      timeStr = '';
    }
  }

  if (ymd === todayYMD) {
    return timeStr ? `Today, ${timeStr}` : 'Today';
  }
  if (ymd === yesterdayYMD) {
    return timeStr ? `Yesterday, ${timeStr}` : 'Yesterday';
  }

  try {
    const d = new Date(ymd + 'T00:00:00');
    const day = d.getDate();
    const month = d.toLocaleDateString([], { month: 'short' });
    return timeStr ? `${day} ${month}, ${timeStr}` : `${day} ${month}`;
  } catch {
    return ymd;
  }
}

export default function WealthRecentEvents({
  expenses = [],
  incomes = [],
  promises = [],
  onSeeAll,
  onTransactionClick,
}) {
  const [filter, setFilter] = useState('all'); // 'all' | 'expense' | 'income'

  // Merge and sort real persisted transactions descending by date/timestamp
  const allTransactions = [
    ...expenses.map((e) => {
      const cat = (e.category || '').toLowerCase();
      let icon = CreditCard;
      let iconColor = '#F1F5F3';
      let iconBg = 'rgba(255, 255, 255, 0.08)';

      if (cat.includes('food') || cat.includes('swiggy') || cat.includes('zomato') || cat.includes('dinner') || cat.includes('lunch') || cat.includes('cafe')) {
        icon = Utensils;
        iconColor = '#E9B44C';
        iconBg = 'rgba(233, 180, 76, 0.15)';
      } else if (cat.includes('shop') || cat.includes('cloth') || cat.includes('amazon') || cat.includes('flipkart')) {
        icon = ShoppingBag;
        iconColor = '#EF4444';
        iconBg = 'rgba(239, 68, 68, 0.15)';
      } else if (cat.includes('bill') || cat.includes('rent') || cat.includes('recharge') || cat.includes('sub')) {
        icon = FileText;
        iconColor = '#38BDF8';
        iconBg = 'rgba(56, 189, 248, 0.15)';
      } else if (cat.includes('transport') || cat.includes('travel') || cat.includes('cab') || cat.includes('uber') || cat.includes('metro')) {
        icon = Car;
        iconColor = '#A78BFA';
        iconBg = 'rgba(167, 139, 250, 0.15)';
      } else if (cat.includes('health') || cat.includes('med')) {
        icon = HeartPulse;
        iconColor = '#F43F5E';
        iconBg = 'rgba(244, 63, 94, 0.15)';
      }

      return {
        id: e.id,
        title: e.note || e.category || 'Expense',
        amount: -Math.abs(Number(e.amount) || 0),
        rawDate: e.expense_date,
        createdAt: e.created_at,
        time: formatEventDate(e.expense_date, e.created_at),
        icon,
        iconBg,
        iconColor,
        isCredit: false,
        txType: 'expense',
        raw: e,
      };
    }),
    ...incomes.map((i) => {
      return {
        id: i.id,
        title: i.note || i.source || 'Income',
        amount: Math.abs(Number(i.amount) || 0),
        rawDate: i.income_date,
        createdAt: i.created_at,
        time: formatEventDate(i.income_date, i.created_at),
        icon: ArrowDownLeft,
        iconBg: 'rgba(45, 224, 154, 0.15)',
        iconColor: '#2DE09A',
        isCredit: true,
        txType: 'income',
        raw: i,
      };
    }),
  ]
    .sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : (a.rawDate ? new Date(a.rawDate + 'T00:00:00').getTime() : 0);
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : (b.rawDate ? new Date(b.rawDate + 'T00:00:00').getTime() : 0);
      return timeB - timeA;
    });

  const filteredTransactions = allTransactions.filter((tx) => {
    if (filter === 'expense') return tx.txType === 'expense';
    if (filter === 'income') return tx.txType === 'income';
    return true;
  }).slice(0, 6);

  // Active money promises owed to user
  const owedItems = (promises || []).filter(
    (b) => b.status === 'receivable' || (b.name && b.name.toLowerCase().includes('owes you'))
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* ── RECENT TRANSACTIONS STREAM ── */}
      <div style={{
        background: '#111A15',
        border: '1px solid #1A2B23',
        borderRadius: '24px',
        padding: '20px',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.45)',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <div style={{
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: '#7E948A',
              marginBottom: '2px',
            }}>
              TRANSACTION STREAM
            </div>
            <div style={{
              fontSize: '16px',
              fontWeight: 800,
              color: '#F1F5F3',
              fontFamily: "'Space Grotesk', -apple-system, sans-serif",
            }}>
              Recent Activity
            </div>
          </div>

          {allTransactions.length > 0 && (
            <button
              type="button"
              onClick={onSeeAll}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#2DE09A',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                padding: '4px 0',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
              }}
            >
              <span>See all</span>
              <ChevronRight size={14} />
            </button>
          )}
        </div>

        {/* Filter Chips: All | Outflows | Inflows */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {[
            { id: 'all', label: 'All' },
            { id: 'expense', label: 'Outflows' },
            { id: 'income', label: 'Inflows' },
          ].map((tab) => {
            const active = filter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                style={{
                  background: active ? '#2DE09A' : '#15221C',
                  border: `1px solid ${active ? '#2DE09A' : '#1A2B23'}`,
                  borderRadius: '9999px',
                  padding: '4px 12px',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: active ? '#060B08' : '#7E948A',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {filteredTransactions.length === 0 ? (
          <div style={{
            background: '#15221C',
            border: '1px dashed #1A2B23',
            borderRadius: '16px',
            padding: '24px 16px',
            textAlign: 'center',
            color: '#7E948A',
            fontSize: '13px',
          }}>
            No financial events recorded yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredTransactions.map((item) => {
              const Icon = item.icon;
              const isPositive = item.amount > 0;
              return (
                <div
                  key={item.id}
                  onClick={() => onTransactionClick && onTransactionClick(item)}
                  style={{
                    background: '#15221C',
                    border: '1px solid #1A2B23',
                    borderRadius: '16px',
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#2DE09A'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#1A2B23'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: item.iconBg,
                      color: item.iconColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <Icon size={16} />
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#F1F5F3' }}>
                        {item.title}
                      </div>
                      <div style={{ fontSize: '11px', color: '#7E948A', marginTop: '2px' }}>
                        {item.time}
                      </div>
                    </div>
                  </div>

                  <div style={{
                    fontSize: '14px',
                    fontWeight: 800,
                    color: isPositive ? '#2DE09A' : '#F1F5F3',
                    fontFamily: "'Space Grotesk', -apple-system, sans-serif",
                  }}>
                    {isPositive ? `+₹${item.amount.toLocaleString()}` : `−₹${Math.abs(item.amount).toLocaleString()}`}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── OWED TO YOU / PROMISES (Derived from persisted wealth_bills) ── */}
      {owedItems.length > 0 && (
        <div style={{
          background: '#111A15',
          border: '1px solid #1A2B23',
          borderRadius: '24px',
          padding: '20px',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.45)',
        }}>
          <div style={{
            fontSize: '11px',
            fontWeight: 800,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#7E948A',
            marginBottom: '4px',
          }}>
            COMMITTED INFLOWS
          </div>
          <div style={{
            fontSize: '16px',
            fontWeight: 800,
            color: '#F1F5F3',
            fontFamily: "'Space Grotesk', -apple-system, sans-serif",
            marginBottom: '12px',
          }}>
            Owed to you
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {owedItems.map((promise) => {
              const personName = (promise.name || '')
                .replace(/^Owed by\s+/i, '')
                .replace(/\s+owes you$/i, '')
                .trim() || 'Someone';

              return (
                <div
                  key={promise.id}
                  style={{
                    background: '#15221C',
                    border: '1px solid #1A2B23',
                    borderRadius: '16px',
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: 'rgba(56, 189, 248, 0.15)',
                      color: '#38BDF8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <User size={16} />
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#F1F5F3' }}>
                        {personName}
                      </div>
                      <div style={{ fontSize: '11px', color: '#7E948A', marginTop: '2px' }}>
                        {promise.due_date ? `Due ${formatEventDate(promise.due_date, null)}` : 'Due soon'}
                      </div>
                    </div>
                  </div>

                  <div style={{
                    fontSize: '14px',
                    fontWeight: 800,
                    color: '#38BDF8',
                    fontFamily: "'Space Grotesk', -apple-system, sans-serif",
                  }}>
                    ₹{Number(promise.amount || 0).toLocaleString()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
