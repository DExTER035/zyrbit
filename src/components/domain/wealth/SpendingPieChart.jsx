import React, { useState } from 'react';
import { ArrowDown, Plus } from 'lucide-react';
import { computeCategorySpending } from '../../../engines/wealth/moneyState.js';

const W = {
  bg: '#F4F0E8',
  surface: '#FFFFFF',
  border: '#E5E0D8',
  petrol: '#174A55',
  softTeal: '#DDE9EB',
  text: '#111A20',
  sub: '#68777B',
  muted: '#8A9CA3',
  emerald: '#1FA36F',
  amber: '#E9B44C',
  darkBorder: '#2B3036',
};

/**
 * Calculates SVG arc path for a donut slice.
 */
function describeArc(x, y, innerRadius, outerRadius, startAngle, endAngle) {
  const isFullCircle = (endAngle - startAngle) >= 359.99;
  const safeEndAngle = isFullCircle ? startAngle + 359.99 : endAngle;

  const toRad = (deg) => ((deg - 90) * Math.PI) / 180.0;

  const startOuter = {
    x: x + outerRadius * Math.cos(toRad(startAngle)),
    y: y + outerRadius * Math.sin(toRad(startAngle)),
  };
  const endOuter = {
    x: x + outerRadius * Math.cos(toRad(safeEndAngle)),
    y: y + outerRadius * Math.sin(toRad(safeEndAngle)),
  };
  const startInner = {
    x: x + innerRadius * Math.cos(toRad(startAngle)),
    y: y + innerRadius * Math.sin(toRad(startAngle)),
  };
  const endInner = {
    x: x + innerRadius * Math.cos(toRad(safeEndAngle)),
    y: y + innerRadius * Math.sin(toRad(safeEndAngle)),
  };

  const largeArcFlag = safeEndAngle - startAngle <= 180 ? '0' : '1';

  return [
    'M', startOuter.x, startOuter.y,
    'A', outerRadius, outerRadius, 0, largeArcFlag, 1, endOuter.x, endOuter.y,
    'L', endInner.x, endInner.y,
    'A', innerRadius, innerRadius, 0, largeArcFlag, 0, startInner.x, startInner.y,
    'Z',
  ].join(' ');
}

export default function SpendingPieChart({
  expenses = [],
  incomes = [],
  month,
  currencySymbol = '₹',
  isBalanceHidden = false,
  onAddExpense,
}) {
  const [activeCategory, setActiveCategory] = useState(null);

  const {
    categories,
    grossSpend,
    netSpend,
    refundsTotal,
    hasExpenses,
  } = computeCategorySpending({ expenses, incomes, month });

  // Format month label
  const monthDate = month ? new Date(`${month}-01T00:00:00`) : new Date();
  const monthName = monthDate.toLocaleString('default', { month: 'long' });

  // Calculate arc angles
  let currentAngle = 0;
  const slices = categories.map((cat) => {
    const sliceAngle = grossSpend > 0 ? (cat.amount / grossSpend) * 360 : 0;
    const startAngle = currentAngle;
    const endAngle = currentAngle + sliceAngle;
    currentAngle += sliceAngle;
    return {
      ...cat,
      startAngle,
      endAngle,
      path: describeArc(100, 100, 52, 82, startAngle, endAngle),
    };
  });

  const highlightedCat = activeCategory
    ? categories.find(c => c.category === activeCategory)
    : null;

  return (
    <div
      style={{
        background: W.surface,
        borderRadius: '20px',
        padding: '20px',
        border: `1.5px solid ${W.border}`,
        boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: '17px',
              fontWeight: 800,
              color: W.text,
              letterSpacing: '-0.01em',
              fontFamily: "'Space Grotesk', -apple-system, sans-serif",
            }}
          >
            Where your money went
          </h2>
          <p style={{ margin: '3px 0 0', fontSize: '12px', color: W.sub }}>
            Recorded spending · This month
          </p>
        </div>

        {/* Down Arrow in Dark Circle */}
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: '#111A20',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
          aria-hidden="true"
        >
          <ArrowDown size={16} strokeWidth={2.5} />
        </div>
      </div>

      {/* ── Empty State ── */}
      {!hasExpenses ? (
        <div
          style={{
            padding: '32px 16px',
            textAlign: 'center',
            background: '#FAF7F2',
            borderRadius: '16px',
            border: `1px solid ${W.border}`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <div style={{ fontSize: '32px', marginBottom: '4px' }}>☕</div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: W.text }}>
            No spending recorded this month
          </div>
          <div style={{ fontSize: '12px', color: W.muted, maxWidth: '280px', lineHeight: 1.4 }}>
            Lifestyle expenses you log or import will be categorized here automatically.
          </div>
          {onAddExpense && (
            <button
              type="button"
              onClick={onAddExpense}
              style={{
                marginTop: '10px',
                minHeight: '38px',
                padding: '0 16px',
                borderRadius: '10px',
                background: W.petrol,
                border: 'none',
                color: '#FFFFFF',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 6px rgba(23, 74, 85, 0.2)',
              }}
            >
              <Plus size={15} strokeWidth={2.5} />
              <span>Add Expense</span>
            </button>
          )}
        </div>
      ) : (
        /* ── Populated Chart State ── */
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {/* Centered Donut Chart */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '8px 0',
            }}
          >
            <div style={{ position: 'relative', width: '200px', height: '200px' }}>
              <svg
                viewBox="0 0 200 200"
                style={{ width: '100%', height: '100%' }}
                aria-label="Category spending donut chart"
              >
                {/* Slices */}
                {slices.map((slice) => {
                  const isHovered = activeCategory === slice.category;
                  return (
                    <path
                      key={slice.category}
                      d={slice.path}
                      fill={slice.color}
                      stroke="#2B3036"
                      strokeWidth="2.5"
                      strokeLinejoin="round"
                      style={{
                        cursor: 'pointer',
                        transition: 'opacity 0.2s ease, transform 0.2s ease',
                        opacity: activeCategory && !isHovered ? 0.45 : 1,
                      }}
                      onMouseEnter={() => setActiveCategory(slice.category)}
                      onMouseLeave={() => setActiveCategory(null)}
                      onClick={() => setActiveCategory(activeCategory === slice.category ? null : slice.category)}
                    />
                  );
                })}
                {/* Inner hole border ring */}
                <circle
                  cx="100"
                  cy="100"
                  r="52"
                  fill="none"
                  stroke="#2B3036"
                  strokeWidth="2.5"
                />
                {/* Outer circle border ring */}
                <circle
                  cx="100"
                  cy="100"
                  r="82"
                  fill="none"
                  stroke="#2B3036"
                  strokeWidth="2.5"
                />
              </svg>

              {/* Hover or selected details in center */}
              {highlightedCat && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'none',
                    textAlign: 'center',
                    padding: '10px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      color: highlightedCat.color,
                      letterSpacing: '0.04em',
                      maxWidth: '85px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {highlightedCat.category}
                  </span>
                  <span
                    style={{
                      fontSize: '14px',
                      fontWeight: 800,
                      color: W.text,
                      fontFamily: "'Space Grotesk', -apple-system, sans-serif",
                      letterSpacing: '-0.02em',
                      marginTop: '2px',
                    }}
                  >
                    {isBalanceHidden ? '••••••' : `${currencySymbol} ${highlightedCat.amount.toLocaleString()}`}
                  </span>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: W.muted, marginTop: '1px' }}>
                    {highlightedCat.pct}%
                  </span>
                </div>
              )}
            </div>

            {/* Dot Legend below Donut */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
                gap: '8px 16px',
                marginTop: '16px',
                maxWidth: '320px',
              }}
            >
              {categories.map((cat) => {
                const isSelected = activeCategory === cat.category;
                return (
                  <div
                    key={cat.category}
                    onClick={() => setActiveCategory(isSelected ? null : cat.category)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setActiveCategory(isSelected ? null : cat.category);
                      }
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                      opacity: activeCategory && !isSelected ? 0.5 : 1,
                      transition: 'opacity 0.15s ease',
                    }}
                  >
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: cat.color,
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: isSelected ? 700 : 500,
                        color: isSelected ? W.text : '#9CA3AF',
                      }}
                    >
                      {cat.category}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Total Recorded Spending Row */}
          <div
            style={{
              borderTop: '1px solid #F0ECE4',
              paddingTop: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
            }}
          >
            <span style={{ fontSize: '13.5px', color: W.sub, fontWeight: 500 }}>
              Total recorded spending
            </span>
            <span
              style={{
                fontSize: '18px',
                fontWeight: 800,
                color: W.text,
                fontFamily: "'Space Grotesk', -apple-system, sans-serif",
                letterSpacing: '-0.02em',
              }}
            >
              {isBalanceHidden ? '••••••' : `${currencySymbol} ${grossSpend.toLocaleString()}`}
            </span>
          </div>

          {/* 2-Column Breakdown of Categories */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '12px 24px',
            }}
          >
            {categories.map((cat) => {
              const isSelected = activeCategory === cat.category;
              return (
                <div
                  key={cat.category}
                  onClick={() => setActiveCategory(isSelected ? null : cat.category)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setActiveCategory(isSelected ? null : cat.category);
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    padding: '2px 0',
                    opacity: activeCategory && !isSelected ? 0.45 : 1,
                    transition: 'opacity 0.15s ease',
                  }}
                >
                  <span
                    style={{
                      fontSize: '13px',
                      color: isSelected ? W.text : W.sub,
                      fontWeight: isSelected ? 700 : 500,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      marginRight: '8px',
                    }}
                  >
                    {cat.category}
                  </span>
                  <span
                    style={{
                      fontSize: '13.5px',
                      fontWeight: 700,
                      color: W.text,
                      fontFamily: "'Space Grotesk', -apple-system, sans-serif",
                      flexShrink: 0,
                    }}
                  >
                    {isBalanceHidden ? '••••••' : `${currencySymbol} ${cat.amount.toLocaleString()}`}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Refund Notice (if applicable) */}
          {refundsTotal > 0 && (
            <div
              style={{
                fontSize: '11px',
                color: W.sub,
                background: '#FAF7F2',
                padding: '6px 12px',
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                border: '1px solid #ECE8DF',
                marginTop: '4px',
              }}
            >
              <span>Gross: {currencySymbol} {grossSpend.toLocaleString()}</span>
              <span style={{ color: W.emerald, fontWeight: 600 }}>Refunds: -{currencySymbol} {refundsTotal.toLocaleString()}</span>
              <span style={{ fontWeight: 700, color: W.text }}>Net: {currencySymbol} {netSpend.toLocaleString()}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
