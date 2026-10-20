import React from 'react'

/**
 * Screen 2 — Track (Growth, Health, Wealth)
 * Matches approved visual reference:
 * - Brand header: Zyrbit | PERSONAL OS
 * - Title: Track your life (Three focused spaces. One connected system.)
 * - Habit connection banner: Consistency connects it all
 * - 3 Domain Cards: Growth, Health, Wealth
 * - Subtitle pills & Open actions
 * - Connection footnote
 */
export const TrackMockupView = () => {
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
          Track your life
        </h2>
        <div style={{ fontSize: '12px', color: '#68777B', marginTop: '2px', fontWeight: 500 }}>
          Four focused spaces. One connected system.
        </div>
      </div>

      {/* Consistency Banner Card */}
      <div
        style={{
          backgroundColor: '#174A55',
          borderRadius: '16px',
          padding: '12px 16px',
          color: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 255, 255, 0.14)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.2">
            <path d="M21 2v6h-6" />
            <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
            <path d="M3 22v-6h6" />
            <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
          </svg>
        </div>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 700 }}>
            Consistency connects it all
          </div>
          <div style={{ fontSize: '11px', color: '#DDE9EB', marginTop: '1px' }}>
            Manage habits across every area
          </div>
        </div>
      </div>

      {/* Domain Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Card 1: Growth */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            padding: '14px 16px',
            border: '1.5px solid #E5E0D8',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '11px',
                backgroundColor: '#DDE9EB',
                color: '#174A55',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22v-9" />
                <path d="M12 13C8 13 4 9 4 4c5 0 8 4 8 9Z" />
                <path d="M12 10c2-3 5-5 8-5 0 5-3 8-8 8" />
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#111A20' }}>
                Growth
              </div>
              <div style={{ fontSize: '11.5px', color: '#68777B', marginTop: '1px' }}>
                Goals & tasks · Study · Focus · Reflections
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #F0ECE4', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#174A55' }}>Open Growth</span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#174A55' }}>&rarr;</span>
          </div>
        </div>

        {/* Card 2: Food */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            padding: '14px 16px',
            border: '1.5px solid #E5E0D8',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '11px',
                backgroundColor: '#DDE9EB',
                color: '#174A55',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 2v20M6 2v7a3 3 0 0 0 3 3v10M6 2h6" />
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#111A20' }}>
                Food
              </div>
              <div style={{ fontSize: '11.5px', color: '#68777B', marginTop: '1px' }}>
                Meals & nutrition · Calories · Macros · Hydration
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #F0ECE4', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#174A55' }}>Open Food</span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#174A55' }}>&rarr;</span>
          </div>
        </div>

        {/* Card 3: Health */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            padding: '14px 16px',
            border: '1.5px solid #E5E0D8',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '11px',
                backgroundColor: '#DDE9EB',
                color: '#174A55',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#111A20' }}>
                Health
              </div>
              <div style={{ fontSize: '11.5px', color: '#68777B', marginTop: '1px' }}>
                Workouts · Physical activity · Sleep & recovery
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #F0ECE4', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#174A55' }}>Open Health</span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#174A55' }}>&rarr;</span>
          </div>
        </div>

        {/* Card 4: Wealth */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            padding: '14px 16px',
            border: '1.5px solid #E5E0D8',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '11px',
                backgroundColor: '#DDE9EB',
                color: '#174A55',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="6" width="20" height="13" rx="3" />
                <path d="M22 11h-4a2 2 0 0 0 0 4h4" />
                <circle cx="18" cy="13" r="1" />
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#111A20' }}>
                Wealth
              </div>
              <div style={{ fontSize: '11.5px', color: '#68777B', marginTop: '1px' }}>
                Income & expenses · Budgets · Bills · Savings
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #F0ECE4', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#174A55' }}>Open Wealth</span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#174A55' }}>&rarr;</span>
          </div>
        </div>
      </div>

      {/* Footer Connected Note */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#68777B', marginTop: '2px' }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <path d="M9 9h6m-6 4h6m-6 4h4" />
        </svg>
        <span>Your saved records stay connected across these spaces.</span>
      </div>
    </div>
  )
}
