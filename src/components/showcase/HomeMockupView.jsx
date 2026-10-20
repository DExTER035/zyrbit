import React from 'react'

/**
 * Screen 1 — Home (Daily Command Center)
 * Matches approved visual reference:
 * - Brand header: Zyrbit | PERSONAL OS
 * - Greeting: Good afternoon, Monday, 19 October
 * - Hero intention card: "Make room for what matters."
 * - Today's priorities (Plan study session, Log a habit)
 * - Your daily pulse (Habits, Continue session)
 * - Quick action chips: + Habit, + Meal, + Expense
 * - Dex AI prompt: "Need a starting point? Plan with Dex ↗"
 */
export const HomeMockupView = () => {
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

      {/* Greeting */}
      <div style={{ marginTop: '2px' }}>
        <h2 style={{ margin: 0, fontSize: '23px', fontWeight: 750, color: '#111A20', letterSpacing: '-0.02em' }}>
          Good afternoon
        </h2>
        <div style={{ fontSize: '12px', color: '#68777B', marginTop: '2px', fontWeight: 500 }}>
          Monday, 19 October
        </div>
      </div>

      {/* Hero Card: Your Day With Intention */}
      <div
        style={{
          backgroundColor: '#174A55',
          borderRadius: '18px',
          padding: '16px 18px',
          color: '#FFFFFF',
          boxShadow: '0 8px 20px rgba(23, 74, 85, 0.22)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          position: 'relative',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '9.5px', fontWeight: 750, letterSpacing: '0.12em', color: '#DDE9EB' }}>
            YOUR DAY, WITH INTENTION
          </span>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#DDE9EB" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </div>

        <div style={{ fontSize: '20px', fontWeight: 700, lineHeight: 1.25, letterSpacing: '-0.015em' }}>
          Make room for
          <br />
          what matters.
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: '#DDE9EB', fontWeight: 600, marginTop: '2px' }}>
          <span>Choose your next step</span>
          <span>&rarr;</span>
        </div>
      </div>

      {/* Today's Priorities */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '14px', fontWeight: 750, color: '#111A20' }}>Today's priorities</span>
          <span style={{ fontSize: '9.5px', fontWeight: 700, letterSpacing: '0.08em', color: '#68777B' }}>SUGGESTED</span>
        </div>

        {/* Priority 1 */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '14px',
            padding: '10px 14px',
            border: '1.5px solid #E5E0D8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: '#DDE9EB',
                color: '#174A55',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 650, color: '#111A20' }}>
                Plan the next study session
              </div>
              <div style={{ fontSize: '11px', color: '#68777B', marginTop: '1px' }}>
                Growth · Focus
              </div>
            </div>
          </div>
          <span style={{ color: '#68777B', fontSize: '14px' }}>&rsaquo;</span>
        </div>

        {/* Priority 2 */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '14px',
            padding: '10px 14px',
            border: '1.5px solid #E5E0D8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: '#DDE9EB',
                color: '#174A55',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                <path d="M12 22v-9" />
                <path d="M12 13C8 13 4 9 4 4c5 0 8 4 8 9Z" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 650, color: '#111A20' }}>
                Log a habit
              </div>
              <div style={{ fontSize: '11px', color: '#68777B', marginTop: '1px' }}>
                Start with one small, repeatable step
              </div>
            </div>
          </div>
          <span style={{ color: '#68777B', fontSize: '14px' }}>&rsaquo;</span>
        </div>
      </div>

      {/* Your Daily Pulse */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '14px', fontWeight: 750, color: '#111A20' }}>Your daily pulse</span>
          <span style={{ fontSize: '9.5px', fontWeight: 700, letterSpacing: '0.08em', color: '#68777B' }}>FROM YOUR RECORDS</span>
        </div>

        {/* 2 Side-by-Side Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {/* Card 1: Habits */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '14px',
              padding: '12px',
              border: '1.5px solid #E5E0D8',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: '85px',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#111A20' }}>Habits</span>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#68777B" strokeWidth="2">
                  <path d="M21 2v6h-6" />
                  <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                  <path d="M3 22v-6h6" />
                  <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
                </svg>
              </div>
              <div style={{ fontSize: '10.5px', color: '#68777B', marginTop: '4px', lineHeight: 1.35 }}>
                Your consistency starts here.
              </div>
            </div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#174A55', marginTop: '8px' }}>
              Add a habit &rarr;
            </div>
          </div>

          {/* Card 2: Continue */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '14px',
              padding: '12px',
              border: '1.5px solid #E5E0D8',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: '85px',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#111A20' }}>Continue</span>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#68777B" strokeWidth="2">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              </div>
              <div style={{ fontSize: '10.5px', color: '#68777B', marginTop: '4px', lineHeight: 1.35 }}>
                No recent session to resume.
              </div>
            </div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#174A55', marginTop: '8px' }}>
              Start focus &rarr;
            </div>
          </div>
        </div>

        {/* Quick action chips */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
          {['+ Habit', '+ Meal', '+ Expense'].map((chip) => (
            <div
              key={chip}
              style={{
                flex: 1,
                padding: '6px 0',
                backgroundColor: '#FFFFFF',
                border: '1.5px solid #E5E0D8',
                borderRadius: '999px',
                textAlign: 'center',
                fontSize: '11px',
                fontWeight: 650,
                color: '#111A20',
                cursor: 'pointer',
              }}
            >
              {chip}
            </div>
          ))}
        </div>
      </div>

      {/* Plan with Dex link */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '11.5px',
          color: '#174A55',
          fontWeight: 650,
          marginTop: '2px',
        }}
      >
        <span>✨</span>
        <span>Need a starting point? Plan with Dex</span>
        <span>&#8599;</span>
      </div>
    </div>
  )
}
