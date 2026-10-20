import React, { useState } from 'react'

/**
 * DesktopLayoutView
 * Desktop presentation of Zyrbit Personal OS.
 * Uses the same information architecture with an enterprise-grade widescreen layout:
 * - Left Navigation Sidebar: Home, Track (Growth, Health, Wealth), Quick Add, Insights, Your Space.
 * - Center Daily Command Column: Intention hero card, Priorities, Daily Pulse, Activity over time.
 * - Right Contextual Panel: Dex Personal OS Assistant with suggestions & prompts.
 */
export const DesktopLayoutView = () => {
  const [activeNav, setActiveNav] = useState('home')

  return (
    <div
      id="desktop-presentation-frame"
      style={{
        width: '100%',
        maxWidth: '1240px',
        backgroundColor: '#F4F0E8',
        borderRadius: '24px',
        border: '1.5px solid #2B3842',
        boxShadow: '0 24px 60px rgba(17, 26, 32, 0.25)',
        display: 'flex',
        minHeight: '740px',
        overflow: 'hidden',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* 1. Left Sidebar Navigation */}
      <aside
        style={{
          width: '240px',
          backgroundColor: '#111A20',
          color: '#FFFFFF',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '24px 18px',
          borderRight: '1px solid rgba(255, 255, 255, 0.08)',
          boxSizing: 'border-box',
          flexShrink: 0,
        }}
      >
        <div>
          {/* Brand Wordmark */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '9px',
                backgroundColor: '#174A55',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '16px',
              }}
            >
              Z
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 800, letterSpacing: '0.14em' }}>ZYRBIT</div>
              <div style={{ fontSize: '9px', color: '#68777B', letterSpacing: '0.2em' }}>PERSONAL OS</div>
            </div>
          </div>

          {/* Navigation Items */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {[
              { id: 'home', label: 'Home', icon: '🏠' },
              { id: 'track', label: 'Track', icon: '⊞' },
              { id: 'insights', label: 'Insights', icon: '📈' },
              { id: 'space', label: 'Your Space', icon: '👤' },
            ].map((item) => {
              const isActive = activeNav === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveNav(item.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    border: 'none',
                    backgroundColor: isActive ? '#174A55' : 'transparent',
                    color: isActive ? '#FFFFFF' : '#9CA3AF',
                    fontWeight: isActive ? 700 : 500,
                    fontSize: '13.5px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.16s ease',
                  }}
                >
                  <span style={{ fontSize: '15px' }}>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              )
            })}
          </nav>

          {/* Track Subdomains pill preview (Provisional Layout) */}
          <div style={{ marginTop: '20px', padding: '12px', backgroundColor: 'rgba(255, 255, 255, 0.04)', borderRadius: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '10px', color: '#68777B', fontWeight: 700, letterSpacing: '0.1em' }}>
                TRACK SPACES
              </span>
              <span style={{ fontSize: '8px', color: '#174A55', backgroundColor: '#DDE9EB', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
                PROVISIONAL
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: '#DDE9EB' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>🌱 Growth</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>🥗 Food</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>❤️ Health</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>💳 Wealth</div>
            </div>
          </div>
        </div>

        {/* Quick Add CTA in Sidebar */}
        <button
          type="button"
          style={{
            height: '46px',
            backgroundColor: '#174A55',
            color: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            fontSize: '13.5px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 4px 14px rgba(23, 74, 85, 0.4)',
          }}
        >
          <span>+</span>
          <span>Quick Add Record</span>
        </button>
      </aside>

      {/* 2. Main Daily Command Content Canvas */}
      <main
        style={{
          flex: 1,
          padding: '28px 32px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          boxSizing: 'border-box',
        }}
      >
        {/* Top greeting bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 800, color: '#111A20', letterSpacing: '-0.025em' }}>
              Good afternoon
            </h1>
            <div style={{ fontSize: '13px', color: '#68777B', marginTop: '4px' }}>
              Monday, 19 October · Personal OS Command Center
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ backgroundColor: '#FFFFFF', padding: '8px 14px', borderRadius: '10px', border: '1.5px solid #E5E0D8', fontSize: '12px', fontWeight: 650, color: '#111A20' }}>
              📅 Today's Focus
            </div>
            <div style={{ backgroundColor: '#DDE9EB', color: '#174A55', padding: '8px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: 700 }}>
              System Stable
            </div>
          </div>
        </div>

        {/* Hero Intention Card */}
        <div
          style={{
            backgroundColor: '#174A55',
            borderRadius: '20px',
            padding: '24px 28px',
            color: '#FFFFFF',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 12px 28px rgba(23, 74, 85, 0.25)',
          }}
        >
          <div>
            <div style={{ fontSize: '11px', fontWeight: 750, letterSpacing: '0.12em', color: '#DDE9EB' }}>
              YOUR DAY, WITH INTENTION
            </div>
            <div style={{ fontSize: '24px', fontWeight: 750, marginTop: '6px', letterSpacing: '-0.015em' }}>
              Make room for what matters.
            </div>
            <div style={{ fontSize: '13px', color: '#DDE9EB', marginTop: '6px' }}>
              3 priorities selected. 1 focus session queued.
            </div>
          </div>
          <button
            type="button"
            style={{
              padding: '12px 22px',
              backgroundColor: '#FFFFFF',
              color: '#174A55',
              borderRadius: '12px',
              border: 'none',
              fontWeight: 700,
              fontSize: '13.5px',
              cursor: 'pointer',
            }}
          >
            Start Focus Sprint &rarr;
          </button>
        </div>

        {/* 2-Column Dashboard Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
          {/* Left Column: Today's Priorities & Daily Pulse */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Priorities */}
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '18px', padding: '20px', border: '1.5px solid #E5E0D8' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span style={{ fontSize: '15px', fontWeight: 750, color: '#111A20' }}>Today's priorities</span>
                <span style={{ fontSize: '10px', fontWeight: 700, color: '#68777B' }}>SUGGESTED</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', backgroundColor: '#F8F6F1', borderRadius: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span>⏱️</span>
                    <span style={{ fontSize: '13px', fontWeight: 650, color: '#111A20' }}>Plan the next study session</span>
                  </div>
                  <span style={{ fontSize: '11px', color: '#68777B' }}>Growth · Focus</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', backgroundColor: '#F8F6F1', borderRadius: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span>🌱</span>
                    <span style={{ fontSize: '13px', fontWeight: 650, color: '#111A20' }}>Log morning habit</span>
                  </div>
                  <span style={{ fontSize: '11px', color: '#68777B' }}>Habit Tracker</span>
                </div>
              </div>
            </div>

            {/* Daily Pulse */}
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '18px', padding: '20px', border: '1.5px solid #E5E0D8' }}>
              <div style={{ fontSize: '15px', fontWeight: 750, color: '#111A20', marginBottom: '14px' }}>
                Your daily pulse
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ padding: '14px', borderRadius: '12px', border: '1.5px solid #E5E0D8' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700 }}>Habits (Consistency)</div>
                  <div style={{ fontSize: '11.5px', color: '#68777B', marginTop: '4px' }}>3 completed today</div>
                </div>
                <div style={{ padding: '14px', borderRadius: '12px', border: '1.5px solid #E5E0D8' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700 }}>Focus Session</div>
                  <div style={{ fontSize: '11.5px', color: '#68777B', marginTop: '4px' }}>45m sprint ready</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Track Domain Status */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '18px', padding: '20px', border: '1.5px solid #E5E0D8' }}>
              <div style={{ fontSize: '15px', fontWeight: 750, color: '#111A20', marginBottom: '14px' }}>
                Connected Spaces
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: '12px', border: '1.5px solid #E5E0D8' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700 }}>Growth</div>
                    <div style={{ fontSize: '10.5px', color: '#68777B' }}>Goals, Tasks, Deep Work</div>
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#174A55' }}>Open &rarr;</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: '12px', border: '1.5px solid #E5E0D8' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700 }}>Food</div>
                    <div style={{ fontSize: '10.5px', color: '#68777B' }}>Meals, Calories, Macros</div>
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#174A55' }}>Open &rarr;</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: '12px', border: '1.5px solid #E5E0D8' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700 }}>Health</div>
                    <div style={{ fontSize: '10.5px', color: '#68777B' }}>Sleep, Recovery, Movement</div>
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#174A55' }}>Open &rarr;</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: '12px', border: '1.5px solid #E5E0D8' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700 }}>Wealth</div>
                    <div style={{ fontSize: '10.5px', color: '#68777B' }}>Expenses, Income, Budgets</div>
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#174A55' }}>Open &rarr;</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* 3. Right Dex AI Context Panel (Provisional Layout) */}
      <aside
        style={{
          width: '280px',
          backgroundColor: '#FFFFFF',
          borderLeft: '1.5px solid #E5E0D8',
          padding: '24px 20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxSizing: 'border-box',
          flexShrink: 0,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: '#174A55',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '14px',
                }}
              >
                Z
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 750, color: '#111A20' }}>Dex Companion</div>
                <div style={{ fontSize: '11px', color: '#68777B' }}>Calm system assistant</div>
              </div>
            </div>
            <span style={{ fontSize: '8px', color: '#68777B', backgroundColor: '#F4F0E8', padding: '2px 5px', borderRadius: '4px', fontWeight: 700, letterSpacing: '0.04em' }}>
              PROVISIONAL
            </span>
          </div>

          <div style={{ backgroundColor: '#F4F0E8', borderRadius: '14px', padding: '14px', fontSize: '12.5px', color: '#111A20', lineHeight: 1.5 }}>
            "Good afternoon. You have a clean window for a 45-minute focus session before your scheduled evening wind-down."
          </div>

          <div style={{ marginTop: '20px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#68777B', letterSpacing: '0.08em', marginBottom: '8px' }}>
              SUGGESTED ACTIONS
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                type="button"
                style={{
                  padding: '9px 12px',
                  borderRadius: '10px',
                  border: '1.5px solid #E5E0D8',
                  backgroundColor: '#FFFFFF',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#111A20',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                Plan my study block
              </button>
              <button
                type="button"
                style={{
                  padding: '9px 12px',
                  borderRadius: '10px',
                  border: '1.5px solid #E5E0D8',
                  backgroundColor: '#FFFFFF',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#111A20',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                Log afternoon meal
              </button>
            </div>
          </div>
        </div>

        <div style={{ fontSize: '11px', color: '#68777B', textAlign: 'center' }}>
          A little more clarity. Every day.
        </div>
      </aside>
    </div>
  )
}
