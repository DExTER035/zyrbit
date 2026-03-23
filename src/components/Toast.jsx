import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'

const ToastContainer = () => {
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    const handleToast = (e) => {
      const { message, type } = e.detail
      const id = Date.now()
      setToasts(prev => [...prev, { id, message, type }])
      
      // Auto dismiss 2.5s
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id))
      }, 2500)
    }

    window.addEventListener('zyrbit-toast', handleToast)
    return () => window.removeEventListener('zyrbit-toast', handleToast)
  }, [])

  if (toasts.length === 0) return null

  return (
    <div style={{
      position: 'fixed',
      bottom: '90px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      alignItems: 'center',
      pointerEvents: 'none',
      width: '90%',
      maxWidth: '280px'
    }}>
      {toasts.map(toast => {
        const isZyronReward = toast.message.includes('⚡') || toast.message.includes('+')
        
        return (
          <div
            key={toast.id}
            className="animate-toastIn"
            style={{
              background: isZyronReward ? 'var(--color-cyan-glow)' : 'var(--color-elevated)',
              border: `1px solid ${isZyronReward ? 'var(--color-cyan-dim)' : 'var(--color-border2)'}`,
              borderRadius: '100px',
              padding: '10px 20px',
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--color-text)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              textAlign: 'center'
            }}
          >
            {isZyronReward && (
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-cyan)', flexShrink: 0, boxShadow: '0 0 8px var(--color-cyan)' }} />
            )}
            {toast.message}
          </div>
        )
      })}
    </div>
  )
}

// Singleton injection
let container = null
export const showToast = (message, type = 'info') => {
  if (typeof window === 'undefined') return
  if (!container) {
    container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)
    root.render(<ToastContainer />)
  }
  const event = new CustomEvent('zyrbit-toast', { detail: { message, type } })
  window.dispatchEvent(event)
}
