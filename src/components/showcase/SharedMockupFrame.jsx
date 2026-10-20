import React from 'react'

/**
 * SharedMockupFrame
 * Renders an iPhone device frame with 9:41 status bar and bottom 5-tab navigation.
 * Conforms to Zyrbit's Petrol Teal & Warm Ivory design system.
 */
export const SharedMockupFrame = ({
  label = 'Home — Zyrbit',
  activeTab = 'home', // 'home' | 'track' | 'add' | 'insights' | 'space'
  children,
  overlay = null,
  onTabClick,
  customMaxWidth = '390px',
  customHeight = '844px',
  isCompact = false,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%',
        maxWidth: customMaxWidth,
        flexShrink: 0,
        boxSizing: 'border-box',
      }}
    >
      {/* Screen Title Label above device */}
      <div
        style={{
          fontSize: '14px',
          fontWeight: 650,
          color: '#68777B',
          marginBottom: '12px',
          fontFamily: "'Inter', sans-serif",
          letterSpacing: '-0.01em',
          textAlign: 'center',
          width: '100%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </div>

      {/* Device Body / Chassis */}
      <div
        style={{
          width: '100%',
          maxWidth: customMaxWidth,
          height: customHeight,
          minHeight: '740px',
          backgroundColor: '#111A20',
          borderRadius: isCompact ? '28px' : '44px',
          padding: isCompact ? '6px' : '10px',
          boxShadow: '0 24px 60px rgba(17, 26, 32, 0.25), 0 4px 20px rgba(0, 0, 0, 0.15)',
          border: '1.5px solid #2B3842',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
          overflow: 'hidden',
        }}
      >
        {/* Screen Content Canvas */}
        <div
          style={{
            width: '100%',
            height: '100%',
            backgroundColor: '#F4F0E8',
            borderRadius: '36px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            boxSizing: 'border-box',
          }}
        >
          {/* iOS Status Bar */}
          <div
            style={{
              height: '44px',
              padding: '10px 22px 0 22px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontFamily: "'Inter', sans-serif",
              fontSize: '14px',
              fontWeight: 600,
              color: '#111A20',
              zIndex: 10,
              backgroundColor: '#F4F0E8',
              flexShrink: 0,
            }}
          >
            <span>9:41</span>
            {/* Dynamic Island Notch Pill */}
            <div
              style={{
                width: '105px',
                height: '24px',
                backgroundColor: '#111A20',
                borderRadius: '999px',
                margin: '0 auto',
              }}
            />
            {/* Battery, Wifi, Cellular SVGs */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <svg width="15" height="11" viewBox="0 0 17 11" fill="none">
                <rect x="0.5" y="0.5" width="13" height="10" rx="2.5" stroke="#111A20" />
                <rect x="2" y="2" width="8" height="7" rx="1.5" fill="#111A20" />
                <path d="M15 4V7" stroke="#111A20" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          {/* Scrollable Screen Body */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              overflowX: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              padding: '4px 18px 74px 18px',
              boxSizing: 'border-box',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {children}
          </div>

          {/* Bottom Navigation Bar */}
          <nav
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '66px',
              backgroundColor: '#111A20',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-around',
              padding: '0 8px 10px 8px',
              boxSizing: 'border-box',
              zIndex: 20,
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            {/* Tab 1: Home */}
            <button
              type="button"
              onClick={() => onTabClick?.('home')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '3px',
                flex: 1,
                padding: '6px 0',
                color: activeTab === 'home' ? '#FFFFFF' : '#68777B',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill={activeTab === 'home' ? '#FFFFFF' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              <span style={{ fontSize: '10px', fontWeight: activeTab === 'home' ? 700 : 500 }}>Home</span>
            </button>

            {/* Tab 2: Track */}
            <button
              type="button"
              onClick={() => onTabClick?.('track')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '3px',
                flex: 1,
                padding: '6px 0',
                color: activeTab === 'track' ? '#FFFFFF' : '#68777B',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="7" height="7" x="3" y="3" rx="1" fill={activeTab === 'track' ? '#FFFFFF' : 'none'} />
                <rect width="7" height="7" x="14" y="3" rx="1" fill={activeTab === 'track' ? '#FFFFFF' : 'none'} />
                <rect width="7" height="7" x="14" y="14" rx="1" fill={activeTab === 'track' ? '#FFFFFF' : 'none'} />
                <rect width="7" height="7" x="3" y="14" rx="1" fill={activeTab === 'track' ? '#FFFFFF' : 'none'} />
              </svg>
              <span style={{ fontSize: '10px', fontWeight: activeTab === 'track' ? 700 : 500 }}>Track</span>
            </button>

            {/* Tab 3: Quick Add (+) */}
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => onTabClick?.('add')}
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '12px',
                  backgroundColor: '#174A55',
                  border: activeTab === 'add' ? '2px solid #FFFFFF' : '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(23, 74, 85, 0.4)',
                  outline: 'none',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            </div>

            {/* Tab 4: Insights */}
            <button
              type="button"
              onClick={() => onTabClick?.('insights')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '3px',
                flex: 1,
                padding: '6px 0',
                color: activeTab === 'insights' ? '#FFFFFF' : '#68777B',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
              <span style={{ fontSize: '10px', fontWeight: activeTab === 'insights' ? 700 : 500 }}>Insights</span>
            </button>

            {/* Tab 5: Your Space */}
            <button
              type="button"
              onClick={() => onTabClick?.('space')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '3px',
                flex: 1,
                padding: '6px 0',
                color: activeTab === 'space' ? '#FFFFFF' : '#68777B',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill={activeTab === 'space' ? 'rgba(255,255,255,0.2)' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span style={{ fontSize: '10px', fontWeight: activeTab === 'space' ? 700 : 500 }}>Your space</span>
            </button>
          </nav>

          {/* iOS Bottom Bar Indicator */}
          <div
            style={{
              position: 'absolute',
              bottom: '4px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '120px',
              height: '4px',
              backgroundColor: 'rgba(255, 255, 255, 0.4)',
              borderRadius: '999px',
              zIndex: 30,
              pointerEvents: 'none',
            }}
          />

          {/* Canvas-level overlay (e.g. Quick Add Sheet) */}
          {overlay}
        </div>
      </div>
    </div>
  )
}
