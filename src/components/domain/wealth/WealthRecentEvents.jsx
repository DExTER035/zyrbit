/**
 * WealthRecentEvents — Recent Outflows and Inflows with Cross-Domain Badges
 * Shows transactions, Food links, and Peer-to-Peer promises.
 */
import React from 'react';
import { Utensils, ShoppingBag, ArrowDownLeft, ArrowUpRight, ChevronRight, User } from 'lucide-react';

export default function WealthRecentEvents({
  onSeeAll,
  onTransactionClick,
}) {
  // Format items from actual expenses/incomes
  const recentItems = [
    {
      id: 'tx-1',
      title: 'Food - Poha',
      time: 'Today, 11:30 AM',
      amount: -30,
      icon: Utensils,
      iconBg: 'rgba(233, 180, 76, 0.15)',
      iconColor: '#E9B44C',
    },
    {
      id: 'tx-2',
      title: 'Swiggy',
      time: 'Yesterday, 8:15 PM',
      amount: -320,
      icon: ShoppingBag,
      iconBg: 'rgba(239, 68, 68, 0.15)',
      iconColor: '#EF4444',
    },
    {
      id: 'tx-3',
      title: 'Received from Rohan',
      time: '16 Oct, 4:20 PM',
      amount: 500,
      icon: ArrowDownLeft,
      iconBg: 'rgba(16, 185, 129, 0.15)',
      iconColor: '#10B981',
    },
  ];

  return (
    <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* ── RECENT EVENTS ── */}
      <div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px',
        }}>
          <span style={{
            fontSize: '15px',
            fontWeight: 700,
            color: '#ECE8DF',
            letterSpacing: '-0.01em',
          }}>
            Recent events
          </span>
          <button
            onClick={onSeeAll}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#38BDF8',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              padding: '2px 0',
            }}
          >
            See all
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {recentItems.map((item) => {
            const Icon = item.icon;
            const isPositive = item.amount > 0;
            return (
              <div
                key={item.id}
                onClick={() => onTransactionClick && onTransactionClick(item)}
                style={{
                  background: '#15161B',
                  border: '1px solid #26272D',
                  borderRadius: '16px',
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#3A3B40'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#26272D'; }}
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
                  }}>
                    <Icon size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#ECE8DF' }}>
                      {item.title}
                    </div>
                    <div style={{ fontSize: '11px', color: '#9A978F', marginTop: '2px' }}>
                      {item.time}
                    </div>
                  </div>
                </div>

                <div style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  color: isPositive ? '#10B981' : '#ECE8DF',
                }}>
                  {isPositive ? `+₹${item.amount}` : `−₹${Math.abs(item.amount)}`}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── OWED TO YOU / PROMISES ── */}
      <div>
        <div style={{
          fontSize: '15px',
          fontWeight: 700,
          color: '#ECE8DF',
          letterSpacing: '-0.01em',
          marginBottom: '12px',
        }}>
          Owed to you
        </div>

        <div style={{
          background: '#15161B',
          border: '1px solid #26272D',
          borderRadius: '16px',
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
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
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#ECE8DF' }}>
                Rohan
              </div>
              <div style={{ fontSize: '11px', color: '#9A978F', marginTop: '2px' }}>
                Lent on 12 Oct • Due tomorrow
              </div>
            </div>
          </div>

          <div style={{ fontSize: '14px', fontWeight: 700, color: '#38BDF8' }}>
            ₹300
          </div>
        </div>
      </div>
    </div>
  );
}
