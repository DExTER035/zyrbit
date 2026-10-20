import React from 'react'

/**
 * Screen 5 — Your Space (Profile & Settings)
 * Matches approved visual reference:
 * - Brand header: Zyrbit | PERSONAL OS
 * - Title: Your space (Your system. Set up for you.)
 * - Profile hero card with avatar and Edit profile action
 * - MAKE IT YOURS group: Preferences, Notifications
 * - ACCOUNT & ACCESS group: Membership, Privacy & security, Install Zyrbit, Sign out
 * - Brand calm footnote: "A little more clarity. Every day."
 */
export const YourSpaceMockupView = () => {
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
          Your space
        </h2>
        <div style={{ fontSize: '12px', color: '#68777B', marginTop: '2px', fontWeight: 500 }}>
          Your system. Set up for you.
        </div>
      </div>

      {/* Profile Hero Card */}
      <div
        style={{
          backgroundColor: '#174A55',
          borderRadius: '18px',
          padding: '16px',
          color: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          boxShadow: '0 8px 20px rgba(23, 74, 85, 0.22)',
        }}
      >
        <div
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            backgroundColor: '#FFFFFF',
            color: '#174A55',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '16px', fontWeight: 700 }}>
            Your profile
          </div>
          <div style={{ fontSize: '11px', color: '#DDE9EB', marginTop: '1px' }}>
            Name and account email
          </div>
          <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#DDE9EB', marginTop: '6px' }}>
            Edit profile &rarr;
          </div>
        </div>
      </div>

      {/* Group 1: MAKE IT YOURS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <span style={{ fontSize: '9.5px', fontWeight: 750, letterSpacing: '0.1em', color: '#68777B' }}>
          MAKE IT YOURS
        </span>
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            border: '1.5px solid #E5E0D8',
            overflow: 'hidden',
          }}
        >
          {/* Row 1: Preferences */}
          <div
            style={{
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid #F0ECE4',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ color: '#68777B', display: 'flex', alignItems: 'center' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="4" y1="21" x2="4" y2="14" />
                  <line x1="4" y1="10" x2="4" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12" y2="3" />
                  <line x1="20" y1="21" x2="20" y2="16" />
                  <line x1="20" y1="12" x2="20" y2="3" />
                  <line x1="1" y1="14" x2="7" y2="14" />
                  <line x1="9" y1="8" x2="15" y2="8" />
                  <line x1="17" y1="16" x2="23" y2="16" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: '13.5px', fontWeight: 650, color: '#111A20' }}>
                  Preferences
                </div>
                <div style={{ fontSize: '11px', color: '#68777B', marginTop: '1px' }}>
                  Appearance and routines
                </div>
              </div>
            </div>
            <span style={{ color: '#68777B', fontSize: '14px' }}>&rsaquo;</span>
          </div>

          {/* Row 2: Notifications */}
          <div
            style={{
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ color: '#68777B', display: 'flex', alignItems: 'center' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: '13.5px', fontWeight: 650, color: '#111A20' }}>
                  Notifications
                </div>
                <div style={{ fontSize: '11px', color: '#68777B', marginTop: '1px' }}>
                  Choose what reaches you
                </div>
              </div>
            </div>
            <span style={{ color: '#68777B', fontSize: '14px' }}>&rsaquo;</span>
          </div>
        </div>
      </div>

      {/* Group 2: ACCOUNT & ACCESS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <span style={{ fontSize: '9.5px', fontWeight: 750, letterSpacing: '0.1em', color: '#68777B' }}>
          ACCOUNT & ACCESS
        </span>
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            border: '1.5px solid #E5E0D8',
            overflow: 'hidden',
          }}
        >
          {/* Row 1: Membership */}
          <div
            style={{
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid #F0ECE4',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ color: '#68777B', display: 'flex', alignItems: 'center' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect width="20" height="14" x="2" y="5" rx="2" />
                  <line x1="2" x2="22" y1="10" y2="10" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: '13.5px', fontWeight: 650, color: '#111A20' }}>
                  Membership
                </div>
                <div style={{ fontSize: '11px', color: '#68777B', marginTop: '1px' }}>
                  Plan and billing details
                </div>
              </div>
            </div>
            <span style={{ color: '#68777B', fontSize: '14px' }}>&rsaquo;</span>
          </div>

          {/* Row 2: Privacy & security */}
          <div
            style={{
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid #F0ECE4',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ color: '#68777B', display: 'flex', alignItems: 'center' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: '13.5px', fontWeight: 650, color: '#111A20' }}>
                  Privacy & security
                </div>
                <div style={{ fontSize: '11px', color: '#68777B', marginTop: '1px' }}>
                  Manage your account controls
                </div>
              </div>
            </div>
            <span style={{ color: '#68777B', fontSize: '14px' }}>&rsaquo;</span>
          </div>

          {/* Row 3: Install Zyrbit */}
          <div
            style={{
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid #F0ECE4',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ color: '#68777B', display: 'flex', alignItems: 'center' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: '13.5px', fontWeight: 650, color: '#111A20' }}>
                  Install Zyrbit
                </div>
                <div style={{ fontSize: '11px', color: '#68777B', marginTop: '1px' }}>
                  Add to your device
                </div>
              </div>
            </div>
            <span style={{ color: '#68777B', fontSize: '14px' }}>&rsaquo;</span>
          </div>

          {/* Row 4: Sign out */}
          <div
            style={{
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ color: '#68777B', display: 'flex', alignItems: 'center' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </div>
              <div style={{ fontSize: '13.5px', fontWeight: 650, color: '#111A20' }}>
                Sign out
              </div>
            </div>
            <span style={{ fontSize: '11px', color: '#68777B', fontWeight: 500 }}>
              End your session
            </span>
          </div>
        </div>
      </div>

      {/* Footer Tagline */}
      <div style={{ textAlign: 'center', fontSize: '11px', color: '#68777B', marginTop: '6px' }}>
        A little more clarity. Every day.
      </div>
    </div>
  )
}
