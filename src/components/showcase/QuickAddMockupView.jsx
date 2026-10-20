import React from 'react'

/**
 * Screen 3 — Quick Add (Fast Activity Logging)
 * Matches approved visual reference:
 * - Brand header: Zyrbit | PERSONAL OS
 * - Title: Quick Add (A small update. A clearer picture.)
 * - Subheader: What would you like to record? | Today
 * - 6 Quick action rows: Habit, Meal, Water, Expense/income, Focus session, Reflection
 * - Ask Dex AI card
 * - Contextual footnote
 */
export const QuickAddMockupView = () => {
  const actions = [
    {
      title: 'Growth',
      subtitle: 'Tasks, focus sprints, and goals',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
    },
    {
      title: 'Food',
      subtitle: 'Meals, macronutrients, and water',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 2v20M6 2v7a3 3 0 0 0 3 3v10M6 2h6" />
        </svg>
      ),
    },
    {
      title: 'Health',
      subtitle: 'Sleep, workouts, and recovery',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
      ),
    },
    {
      title: 'Wealth',
      subtitle: 'Expenses, income, and bills',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect width="20" height="14" x="2" y="5" rx="2" />
          <line x1="2" x2="22" y1="10" y2="10" />
        </svg>
      ),
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
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
          Quick Add
        </h2>
        <div style={{ fontSize: '12px', color: '#68777B', marginTop: '2px', fontWeight: 500 }}>
          A small update. A clearer picture.
        </div>
      </div>

      {/* Sub-header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
        <span style={{ fontSize: '12.5px', fontWeight: 650, color: '#111A20' }}>
          What would you like to record?
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#68777B', fontWeight: 600 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect width="18" height="18" x="3" y="4" rx="2" />
            <line x1="16" x1="2" x2="16" y2="6" />
            <line x1="8" x1="2" x2="8" y2="6" />
            <line x1="3" x1="10" x2="21" y2="10" />
          </svg>
          <span>Today</span>
        </div>
      </div>

      {/* Action Rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {actions.map((act) => (
          <div
            key={act.title}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '14px',
              padding: '10px 14px',
              border: '1.5px solid #E5E0D8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
                {act.icon}
              </div>
              <div>
                <div style={{ fontSize: '13.5px', fontWeight: 650, color: '#111A20' }}>
                  {act.title}
                </div>
                <div style={{ fontSize: '11px', color: '#68777B', marginTop: '1px' }}>
                  {act.subtitle}
                </div>
              </div>
            </div>
            <span style={{ color: '#68777B', fontSize: '14px' }}>&rsaquo;</span>
          </div>
        ))}
      </div>

      {/* Ask Dex Action Card */}
      <div
        style={{
          backgroundColor: '#174A55',
          borderRadius: '16px',
          padding: '14px 16px',
          color: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: '2px',
          boxShadow: '0 4px 14px rgba(23, 74, 85, 0.25)',
          cursor: 'pointer',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '10px',
              backgroundColor: 'rgba(255, 255, 255, 0.16)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '15px',
            }}
          >
            ✨
          </div>
          <div>
            <div style={{ fontSize: '13.5px', fontWeight: 700 }}>
              Ask Dex
            </div>
            <div style={{ fontSize: '11px', color: '#DDE9EB', marginTop: '1px' }}>
              Get help with your next step
            </div>
          </div>
        </div>
        <span style={{ fontSize: '14px', fontWeight: 700, color: '#DDE9EB' }}>&#8599;</span>
      </div>

      {/* Footer Text */}
      <div style={{ textAlign: 'center', fontSize: '11px', color: '#68777B', marginTop: '4px' }}>
        Every update belongs to your bigger picture.
      </div>
    </div>
  )
}
