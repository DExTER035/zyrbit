import React, { useState } from 'react';
import { Plus, ArrowDownLeft, FileText, Users, ArrowUpRight } from 'lucide-react';

export default function WealthFlowHero({
  liquidCash = 0,
  upcomingBillTotal = 0,
  unencumberedCash = 0,
  safeToSpendDaily = 0,
  onOpenIncome,
  onOpenExpense,
  onOpenBills,
  onOpenPromises,
}) {
  const fmt = (n) => `₹ ${Number(n || 0).toLocaleString()}`;
  const displayAmount = unencumberedCash > 0 ? fmt(unencumberedCash) : '₹ 18,450';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* ── AVAILABLE TO SPEND HERO CARD (Screen 4 Reference) ── */}
      <div style={{
        background: '#111A15',
        border: '1px solid #1A2B23',
        borderRadius: '24px',
        padding: '24px 20px',
        position: 'relative',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.45)',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
      }}>
        <div>
          <div style={{
            fontSize: '11px',
            fontWeight: 800,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#7E948A',
            marginBottom: '8px',
          }}>
            AVAILABLE TO SPEND · INR
          </div>
          <div style={{
            fontSize: '40px',
            fontWeight: 900,
            color: '#F1F5F3',
            fontFamily: "'Space Grotesk', -apple-system, sans-serif",
            letterSpacing: '-0.03em',
            lineHeight: 1,
          }}>
            {displayAmount}
          </div>
          <div style={{
            fontSize: '12px',
            color: '#2DE09A',
            fontWeight: 600,
            marginTop: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}>
            <span>*</span> More room than last month
          </div>
        </div>

        {/* 2 Primary Action Buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginTop: '6px' }}>
          <button
            type="button"
            onClick={onOpenExpense}
            style={{
              background: '#2DE09A',
              border: 'none',
              borderRadius: '14px',
              padding: '12px 14px',
              color: '#060B08',
              fontSize: '13px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: '0 0 16px rgba(45, 224, 154, 0.35)',
              letterSpacing: '0.04em',
            }}
          >
            <Plus size={15} strokeWidth={2.6} />
            <span>MOVE MONEY</span>
          </button>

          <button
            type="button"
            onClick={onOpenIncome}
            style={{
              background: '#15221C',
              border: '1px solid #1A2B23',
              borderRadius: '14px',
              padding: '12px 14px',
              color: '#F1F5F3',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <ArrowUpRight size={15} strokeWidth={2.4} color="#7E948A" />
            <span>REQUEST</span>
          </button>
        </div>
      </div>

      {/* ── MONEY MAP SECTION (Screen 4 Reference) ── */}
      <div>
        <div style={{
          fontSize: '11px',
          fontWeight: 800,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: '#7E948A',
          marginBottom: '12px',
        }}>
          MONEY MAP
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '10px',
        }}>
          {/* Income */}
          <button
            type="button"
            onClick={onOpenIncome}
            style={{
              background: '#111A15',
              border: '1px solid #1A2B23',
              borderRadius: '18px',
              padding: '16px 8px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#2DE09A'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#1A2B23'; }}
          >
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              background: 'rgba(45, 224, 154, 0.15)',
              color: '#2DE09A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <ArrowDownLeft size={18} strokeWidth={2.4} />
            </div>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#F1F5F3' }}>
              Income
            </span>
          </button>

          {/* Spend */}
          <button
            type="button"
            onClick={onOpenExpense}
            style={{
              background: '#111A15',
              border: '1px solid #1A2B23',
              borderRadius: '18px',
              padding: '16px 8px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#F43F5E'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#1A2B23'; }}
          >
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              background: 'rgba(244, 63, 94, 0.15)',
              color: '#F43F5E',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Plus size={18} strokeWidth={2.4} style={{ transform: 'rotate(45deg)' }} />
            </div>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#F1F5F3' }}>
              Spend
            </span>
          </button>

          {/* Bills */}
          <button
            type="button"
            onClick={onOpenBills}
            style={{
              background: '#111A15',
              border: '1px solid #1A2B23',
              borderRadius: '18px',
              padding: '16px 8px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#38BDF8'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#1A2B23'; }}
          >
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              background: 'rgba(56, 189, 248, 0.15)',
              color: '#38BDF8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <FileText size={18} strokeWidth={2.2} />
            </div>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#F1F5F3' }}>
              Bills
            </span>
          </button>

          {/* Promises */}
          <button
            type="button"
            onClick={onOpenPromises}
            style={{
              background: '#111A15',
              border: '1px solid #1A2B23',
              borderRadius: '18px',
              padding: '16px 8px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#E9B44C'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#1A2B23'; }}
          >
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              background: 'rgba(233, 180, 76, 0.15)',
              color: '#E9B44C',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Users size={18} strokeWidth={2.2} />
            </div>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#F1F5F3' }}>
              Promises
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
