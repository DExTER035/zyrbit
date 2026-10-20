import React, { useState } from 'react'

/**
 * Screen 4 — Insights (Personal Analytics)
 * Matches approved visual reference:
 * - Brand header: Zyrbit | PERSONAL OS
 * - Title: Insights (A clear view of your recorded activity.)
 * - Time filters: 7 days, 30 days, 90 days
 * - Summary metric cards: Active days, Logged activities
 * - Hero chart state: Activity over time (honest empty state with CTA)
 * - Across your life grid (Habits, Health, Growth, Wealth)
 * - Trust & verification footnote
 */
export const InsightsMockupView = () => {
  const [activeFilter, setActiveFilter] = useState('7 days')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }}>
      {/* Brand Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '7px',
              backgroundColor: '#174A55',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '13px',
            }}
          >
            Z
          </div>
          <span style={{ fontSize: '13px', fontWeight: 800, letterSpacing: '0.14em', color: '#111A20' }}>
            ZYRBIT
          </span>
        </div>
        <span style={{ fontSize: '9px', fontWeight: 650, letterSpacing: '0.2em', color: '#68777B' }}>
          PERSONAL OS
        </span>
      </div>

      {/* Heading */}
      <div style={{ marginTop: '2px' }}>
        <h2 style={{ margin: 0, fontSize: '23px', fontWeight: 750, color: '#111A20', letterSpacing: '-0.02em' }}>
          Insights
        </h2>
        <div style={{ fontSize: '12px', color: '#68777B', marginTop: '2px', fontWeight: 500 }}>
          A clear view of your recorded activity.
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px' }}>
        {['7 days', '30 days', '90 days'].map((filter) => {
          const isActive = activeFilter === filter
          return (
            <button
              key={filter}
              type="button"
              onClick={() => setActiveFilter(filter)}
              style={{
                flex: 1,
                padding: '7px 0',
                borderRadius: '10px',
                border: isActive ? 'none' : '1.5px solid #E5E0D8',
                backgroundColor: isActive ? '#174A55' : '#FFFFFF',
                color: isActive ? '#FFFFFF' : '#68777B',
                fontSize: '12px',
                fontWeight: 650,
                cursor: 'pointer',
                transition: 'all 0.16s ease',
              }}
            >
              {filter}
            </button>
          )
        })}
      </div>

      {/* Top Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '14px',
            padding: '12px 14px',
            border: '1.5px solid #E5E0D8',
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#68777B' }}>Active days</div>
          <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#111A20', marginTop: '6px' }}>
            &mdash; Awaiting records
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '14px',
            padding: '12px 14px',
            border: '1.5px solid #E5E0D8',
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#68777B' }}>Logged activities</div>
          <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#111A20', marginTop: '6px' }}>
            &mdash; Awaiting records
          </div>
        </div>
      </div>

      {/* Hero Chart Card */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '18px',
          padding: '16px',
          border: '1.5px solid #E5E0D8',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '13.5px', fontWeight: 750, color: '#111A20' }}>Activity over time</span>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#68777B" strokeWidth="2">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
        </div>

        <div style={{ fontSize: '15px', fontWeight: 700, color: '#111A20', lineHeight: 1.3 }}>
          Your patterns start with a record.
        </div>

        <p style={{ margin: 0, fontSize: '12px', color: '#68777B', lineHeight: 1.45 }}>
          Log an activity to begin. Trends appear when enough records are available.
        </p>

        <button
          type="button"
          style={{
            marginTop: '4px',
            width: '100%',
            height: '42px',
            backgroundColor: '#174A55',
            color: '#FFFFFF',
            borderRadius: '12px',
            border: 'none',
            fontSize: '13px',
            fontWeight: 650,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          <span>Log your first activity</span>
          <span>&rarr;</span>
        </button>
      </div>

      {/* Across Your Life Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '13.5px', fontWeight: 750, color: '#111A20' }}>Across your life</span>
          <span style={{ fontSize: '9.5px', fontWeight: 700, letterSpacing: '0.08em', color: '#68777B' }}>
            NOT ENOUGH DATA YET
          </span>
        </div>

        {/* 2x2 Domain Summary Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '10px 12px', border: '1.5px solid #E5E0D8' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#111A20' }}>Habits</div>
            <div style={{ fontSize: '10.5px', color: '#68777B', marginTop: '2px' }}>Consistency</div>
          </div>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '10px 12px', border: '1.5px solid #E5E0D8' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#111A20' }}>Health</div>
            <div style={{ fontSize: '10.5px', color: '#68777B', marginTop: '2px' }}>Nutrition & recovery</div>
          </div>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '10px 12px', border: '1.5px solid #E5E0D8' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#111A20' }}>Growth</div>
            <div style={{ fontSize: '10.5px', color: '#68777B', marginTop: '2px' }}>Focus & study</div>
          </div>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '10px 12px', border: '1.5px solid #E5E0D8' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#111A20' }}>Wealth</div>
            <div style={{ fontSize: '10.5px', color: '#68777B', marginTop: '2px' }}>Cash flow</div>
          </div>
        </div>
      </div>

      {/* Evidence & Verification Note */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10.5px', color: '#68777B', marginTop: '2px' }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
        <span>Only verified, available data is shown. No fabricated scores or assumed performance.</span>
      </div>
    </div>
  )
}
