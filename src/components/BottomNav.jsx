import React from 'react'
import { useBlackout } from '../lib/BlackoutContext'

export default function BottomNav({ activeTab, onTabChange }) {
  const blackout = useBlackout?.()
  const isBlackout = blackout?.isActive || false
  const blackoutRemaining = blackout?.formatMMSS?.(blackout.remaining) || ''

  const tabs = [
    { id: 'orbit', icon: '🪐', label: 'ORBIT' },
    { id: 'journal', icon: '🌌', label: 'JOURNAL' },
    { id: 'study', icon: '📚', label: 'STUDY' },
    { id: 'stats', icon: '📊', label: 'STATS' }
  ]

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: 'rgba(8, 8, 12, 0.85)',
      borderTop: '1px solid var(--color-border)',
      padding: '10px 0 24px',
      display: 'flex',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      zIndex: 50
    }}>
      {tabs.map((tab, index) => {
        const isActive = activeTab === tab.id
        // In blackout, only study tab is accessible
        const isLocked = isBlackout && tab.id !== 'study'
        return (
          <React.Fragment key={tab.id}>
            <div
              onClick={() => {
                if (isLocked) {
                  import('./Toast').then(m => m.showToast(`🔒 Blackout active — ${blackoutRemaining} remaining`, 'warning'))
                  return
                }
                onTabChange(tab.id)
              }}
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
            /* Basic hover logic in inline styles usually requires state, but we can rely on active vs inactive for mobile */
          >
            {/* Active Indicator Line */}
            {isActive && (
              <div style={{
                position: 'absolute',
                top: '-10px',
                width: '20px',
                height: '2px',
                background: 'var(--color-cyan)',
                borderRadius: '2px',
                boxShadow: '0 0 8px rgba(0,255,255,0.5)',
                animation: 'fadeSlideUp 0.2s ease forwards'
              }} />
            )}

            <span style={{
              fontSize: '20px',
              transition: 'all 0.2s',
              filter: isActive ? 'drop-shadow(0 0 8px rgba(0, 255, 255, 0.8))' : 'none',
              opacity: isLocked ? 0.2 : isActive ? 1 : 0.6
            }}>
              {tab.icon}
            </span>
            <span style={{
              fontSize: '10px',
              fontWeight: 700,
              color: isLocked ? '#333344' : isActive ? 'var(--color-cyan)' : 'var(--color-hint)',
              transition: 'color 0.2s',
              letterSpacing: '0.05em'
            }}>
              {isLocked ? '🔒' : tab.label}
            </span>
          </div>
          </React.Fragment>
        )
      })}
    </div>
  )
}
