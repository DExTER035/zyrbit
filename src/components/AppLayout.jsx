import React, { useEffect } from 'react';
import ThemeToggle from './ThemeToggle';

export default function AppLayout({ children }) {
  // Initialize theme from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('zyrbit_theme')
    if (saved) {
      document.documentElement.setAttribute('data-theme', saved)
    }
  }, [])

  return (
    <div className="app-layout" style={{
      background: 'var(--bg-page)',
      minHeight: '100vh',
      margin: '0 auto',
      position: 'relative',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <ThemeToggle />
      {children}
    </div>
  );
}
