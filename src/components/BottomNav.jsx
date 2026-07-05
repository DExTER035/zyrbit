import React from 'react'

export default function BottomNav({ activeTab, onTabChange }) {
  const tabs = [
    { id: 'zenith', icon: '🌌', label: 'ZENITH' },
    { id: 'growth', icon: '🌱', label: 'GROWTH' },
    { id: 'health', icon: '💪', label: 'HEALTH' },
    { id: 'food',   icon: '🍱', label: 'FOOD'   },
    { id: 'wealth', icon: '💰', label: 'WEALTH' }
  ]

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: 'var(--bg-nav)',
      borderTop: '1px solid var(--border-primary)',
      padding: '10px 0 24px',
      display: 'flex',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      zIndex: 50
    }}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id
        return (
          <React.Fragment key={tab.id}>
            <div
              onClick={() => onTabChange(tab.id)}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative'
              }}
            >
              {/* Active Indicator Line */}
              {isActive && (
                <div style={{
                  position: 'absolute',
                  top: '-10px',
                  width: '32px',
                  height: '3px',
                  background: 'var(--color-cyan)',
                  borderRadius: '0 0 4px 4px',
                  boxShadow: '0 4px 12px rgba(0, 229, 255, 0.6)',
                  animation: 'fadeSlideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards'
                }} />
              )}

              <span style={{
                fontSize: '20px',
                transition: 'all 0.2s',
                filter: isActive ? 'drop-shadow(0 0 8px rgba(0, 255, 255, 0.8))' : 'none',
                opacity: isActive ? 1 : 0.6
              }}>
                {tab.icon}
              </span>
              <span style={{
                fontSize: '10px',
                fontWeight: 700,
                color: isActive ? 'var(--color-cyan)' : 'var(--text-hint)',
                transition: 'color 0.2s',
                letterSpacing: '0.05em'
              }}>
                {tab.label}
              </span>
            </div>
          </React.Fragment>
        )
      })}
    </div>
  )
}
