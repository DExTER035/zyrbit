import React, { useState, useEffect } from 'react'

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('zyrbit_theme')
    return saved ? saved === 'dark' : true // default dark
  })

  useEffect(() => {
    const theme = isDark ? 'dark' : 'light'
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('zyrbit_theme', theme)
  }, [isDark])

  // Also set on mount for SSR/initial load
  useEffect(() => {
    const saved = localStorage.getItem('zyrbit_theme')
    if (saved) {
      document.documentElement.setAttribute('data-theme', saved)
    }
  }, [])

  return (
    <button
      onClick={() => setIsDark(prev => !prev)}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      style={{
        position: 'fixed',
        top: 16,
        right: 16,
        width: 40,
        height: 40,
        borderRadius: 12,
        background: isDark ? '#161622' : '#E8E8EE',
        border: `1px solid ${isDark ? '#2A2A3A' : '#D0D0D8'}`,
        color: isDark ? '#FFD93D' : '#6B6B80',
        fontSize: 18,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 60,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: isDark
          ? '0 2px 8px rgba(0,0,0,0.3)'
          : '0 2px 8px rgba(0,0,0,0.08)'
      }}
    >
      {isDark ? '☀️' : '🌙'}
    </button>
  )
}
