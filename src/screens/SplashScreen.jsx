import React, { useEffect, useState, useCallback } from 'react'

/**
 * Zyrbit Mobile Splash Screen (Screen 1 in Visual Reference)
 * - Atmospheric dark mountain peak in mist
 * - Minimalist centered branding: ZYRBIT / PERSONAL OS
 * - Bottom tagline: "Build a better you, one day at a time."
 * - Smooth auto-advance or tap anywhere to proceed to Welcome
 */
export default function SplashScreen({ onGetStarted, onLogin }) {
  const [fading, setFading] = useState(false)

  const handleAdvance = useCallback(() => {
    if (fading) return
    setFading(true)
    setTimeout(() => {
      if (onGetStarted) onGetStarted()
      else if (onLogin) onLogin()
    }, 350)
  }, [fading, onGetStarted, onLogin])

  useEffect(() => {
    // Auto-advance after 2.8 seconds if user doesn't tap
    const timer = setTimeout(() => {
      handleAdvance()
    }, 2800)
    return () => clearTimeout(timer)
  }, [handleAdvance])

  return (
    <div
      onClick={handleAdvance}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleAdvance()}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100dvh',
        backgroundColor: '#0B0D0F',
        backgroundImage: `linear-gradient(180deg, rgba(11, 13, 15, 0.45) 0%, rgba(11, 13, 15, 0.15) 40%, rgba(11, 13, 15, 0.75) 85%, #0B0D0F 100%), url('/assets/splash_mountain_dark.jpg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 'max(env(safe-area-inset-top), 24px) 24px max(env(safe-area-inset-bottom), 36px) 24px',
        boxSizing: 'border-box',
        zIndex: 9999,
        cursor: 'pointer',
        userSelect: 'none',
        opacity: fading ? 0 : 1,
        transition: 'opacity 0.35s ease-out',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Top spacer (for status bar) */}
      <div style={{ height: '32px' }} />

      {/* Centered Brand Title */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          marginTop: '-40px',
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: '32px',
            fontWeight: 700,
            letterSpacing: '0.24em',
            color: '#F5F5F5',
            textTransform: 'uppercase',
            textShadow: '0 2px 16px rgba(0,0,0,0.6)',
          }}
        >
          ZYRBIT
        </h1>
        <span
          style={{
            marginTop: '8px',
            fontSize: '11px',
            fontWeight: 500,
            letterSpacing: '0.26em',
            color: '#9CA3AF',
            textTransform: 'uppercase',
          }}
        >
          PERSONAL OS
        </span>
      </div>

      {/* Bottom Tagline */}
      <div
        style={{
          textAlign: 'center',
          color: '#9CA3AF',
          fontSize: '13px',
          fontWeight: 400,
          lineHeight: 1.5,
          letterSpacing: '0.02em',
          textShadow: '0 1px 8px rgba(0,0,0,0.8)',
          marginBottom: '16px',
        }}
      >
        <div>Build a better you,</div>
        <div>one day at a time.</div>
      </div>
    </div>
  )
}
