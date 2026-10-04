/**
 * WealthFlowHero — The Financial Flow Surface
 * Metaphor: FLOW ("What can I safely spend, and what is already spoken for?")
 * Renders the Safe-to-Spend Big Number, Explainable Waterfall, and 4 Quick Action Pills.
 */
import React, { useState } from 'react';
import { ChevronRight, Plus, ArrowDownLeft, FileText, Users, ChevronDown, ChevronUp } from 'lucide-react';

export default function WealthFlowHero({
  liquidCash = 24000,
  upcomingBillTotal = 12000,
  unencumberedCash = 8400,
  safeToSpendDaily = 280,
  onOpenIncome,
  onOpenExpense,
  onOpenBills,
  onOpenPromises,
}) {
  const [showExplanation, setShowExplanation] = useState(false);

  // Format currency numbers cleanly
  const fmt = (n) => `₹${Number(n || 0).toLocaleString()}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* ── THE SAFE-TO-SPEND HERO CARD ── */}
      <div style={{
        background: '#15161B',
        border: '1px solid #26272D',
        borderRadius: '24px',
        padding: '24px 20px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      }}>
        {/* Ambient emerald/mint flow glow */}
        <div style={{
          position: 'absolute',
          top: '-40px',
          right: '-40px',
          width: '160px',
          height: '160px',
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Hero Number & Title */}
        <div
          onClick={() => setShowExplanation(prev => !prev)}
          style={{ cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{
              fontSize: '38px',
              fontWeight: 900,
              color: '#ECE8DF',
              letterSpacing: '-0.04em',
              lineHeight: 1,
            }}>
              {fmt(unencumberedCash)}
            </span>
            <ChevronRight
              size={20}
              color="#9A978F"
              style={{
                transform: showExplanation ? 'rotate(90deg)' : 'none',
                transition: 'transform 0.2s ease',
              }}
            />
          </div>

          <div style={{
            fontSize: '13px',
            color: '#9A978F',
            fontWeight: 500,
            marginTop: '6px',
            letterSpacing: '0.01em',
          }}>
            Free to spend
          </div>
        </div>

        {/* ── THE EXPLAINABLE WATERFALL ROW ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '8px',
          marginTop: '20px',
          paddingTop: '16px',
          borderTop: '1px solid #26272D',
          textAlign: 'center',
        }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#ECE8DF' }}>
              {fmt(liquidCash)}
            </div>
            <div style={{ fontSize: '10px', color: '#9A978F', marginTop: '2px' }}>
              Balance
            </div>
          </div>

          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#F59E0B' }}>
              {fmt(upcomingBillTotal)}
            </div>
            <div style={{ fontSize: '10px', color: '#9A978F', marginTop: '2px' }}>
              Committed
            </div>
          </div>

          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#10B981' }}>
              {fmt(unencumberedCash)}
            </div>
            <div style={{ fontSize: '10px', color: '#9A978F', marginTop: '2px' }}>
              Free
            </div>
          </div>
        </div>

        {/* Daily Pacing Support Line */}
        <div style={{
          textAlign: 'center',
          fontSize: '12px',
          color: '#9A978F',
          marginTop: '14px',
          fontWeight: 400,
        }}>
          ≈ {fmt(safeToSpendDaily)} per day until 28 Oct
        </div>

        {/* Expandable Line-by-Line Explanation */}
        {showExplanation && (
          <div style={{
            marginTop: '16px',
            paddingTop: '16px',
            borderTop: '1px solid #26272D',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            fontSize: '12px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ECE8DF' }}>
              <span>Total Liquid Balances:</span>
              <span style={{ fontWeight: 700 }}>+ {fmt(liquidCash)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#F59E0B' }}>
              <span>Committed Bills & Promises:</span>
              <span style={{ fontWeight: 700 }}>− {fmt(upcomingBillTotal)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10B981', paddingTop: '4px', borderTop: '1px dashed #26272D', fontWeight: 700 }}>
              <span>Unencumbered Free to Spend:</span>
              <span>= {fmt(unencumberedCash)}</span>
            </div>
          </div>
        )}
      </div>

      {/* ── 4 QUICK ACTION PILLS ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '8px',
      }}>
        {/* Income */}
        <button
          onClick={onOpenIncome}
          style={{
            background: '#15161B',
            border: '1px solid #26272D',
            borderRadius: '14px',
            padding: '12px 6px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '6px',
            color: '#ECE8DF',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#10B981'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#26272D'; }}
        >
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: 'rgba(16, 185, 129, 0.15)',
            color: '#10B981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <ArrowDownLeft size={15} />
          </div>
          <span style={{ fontSize: '11px', fontWeight: 600 }}>Income</span>
        </button>

        {/* Expenses */}
        <button
          onClick={onOpenExpense}
          style={{
            background: '#15161B',
            border: '1px solid #26272D',
            borderRadius: '14px',
            padding: '12px 6px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '6px',
            color: '#ECE8DF',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#EF4444'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#26272D'; }}
        >
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.15)',
            color: '#EF4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Plus size={15} style={{ transform: 'rotate(45deg)' }} />
          </div>
          <span style={{ fontSize: '11px', fontWeight: 600 }}>Expenses</span>
        </button>

        {/* Bills */}
        <button
          onClick={onOpenBills}
          style={{
            background: '#15161B',
            border: '1px solid #26272D',
            borderRadius: '14px',
            padding: '12px 6px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '6px',
            color: '#ECE8DF',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#38BDF8'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#26272D'; }}
        >
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: 'rgba(56, 189, 248, 0.15)',
            color: '#38BDF8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <FileText size={15} />
          </div>
          <span style={{ fontSize: '11px', fontWeight: 600 }}>Bills</span>
        </button>

        {/* Promises */}
        <button
          onClick={onOpenPromises}
          style={{
            background: '#15161B',
            border: '1px solid #26272D',
            borderRadius: '14px',
            padding: '12px 6px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '6px',
            color: '#ECE8DF',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#E9B44C'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#26272D'; }}
        >
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: 'rgba(233, 180, 76, 0.15)',
            color: '#E9B44C',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Users size={15} />
          </div>
          <span style={{ fontSize: '11px', fontWeight: 600 }}>Promises</span>
        </button>
      </div>
    </div>
  );
}
