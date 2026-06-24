import React, { useState, useEffect } from 'react'
import { ZyrbitIcon } from '../components/Logo.jsx'
import { supabase } from '../lib/supabase.js'

export default function LoginScreen({ onSuccess }) {
  const [loading, setLoading] = useState(false)
  const [guestLoading, setGuestLoading] = useState(false)
  const [error, setError] = useState('')
  const [visible, setVisible] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)

  useEffect(() => {
    // Trigger animations after mount
    setTimeout(() => setVisible(true), 100)
  }, [])

  const handleEmailAuth = async () => {
    if (!email || !password) {
      setError('Please enter both email and password.')
      return
    }
    setLoading(true)
    setError('')
    
    if (isSignUp) {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setError(error.message)
        setLoading(false)
      } else if (data?.user) {
        if (data.session) {
          const name = data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || 'Builder'
          onSuccess(data.user.id, name)
        } else {
          setError('Account created! Please check your email to confirm.')
          setLoading(false)
        }
      }
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message)
        setLoading(false)
      } else if (data?.user) {
        const name = data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || 'Builder'
        onSuccess(data.user.id, name)
      }
    }
  }

  const handleGoogleLogin = async () => {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/zenith` }
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    }
  }

  const handleGuestLogin = async () => {
    setGuestLoading(true)
    setError('')
    const { data, error } = await supabase.auth.signInAnonymously()
    if (error) {
      setError(
        error.message.includes('not enabled') || error.message.includes('provider')
          ? '⚠️ Guest login is disabled. Enable Anonymous sign-ins in your Supabase Auth settings.'
          : error.message
      )
      setGuestLoading(false)
    } else if (data?.user) {
      const name = 'Builder'
      onSuccess(data.user.id, name)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#121214', overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '40px 24px', fontFamily: "'Inter', sans-serif" }}>
      
      {/* Subtle ambient orbs — not neon explosions */}
      <div style={{ position: 'absolute', top: -100, right: -100, width: 280, height: 280, borderRadius: '50%', background: '#5EE6F5', filter: 'blur(100px)', opacity: 0.04, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -60, left: -60, width: 200, height: 200, borderRadius: '50%', background: '#A78BFA', filter: 'blur(100px)', opacity: 0.04, pointerEvents: 'none' }} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', zIndex: 10, maxWidth: 400, margin: '0 auto', width: '100%' }}>
        
        {/* Header */}
        <div style={{ animation: visible ? 'zoomIn 0.5s 0.05s cubic-bezier(0.34,1.56,0.64,1) forwards' : 'none', opacity: 0, textAlign: 'center', marginBottom: 48 }}>
          <ZyrbitIcon size={46} />
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#fff', letterSpacing: -0.8, marginTop: 16, marginBottom: 8, fontFamily: "'Space Grotesk', sans-serif" }}>
            Zyrbit
          </h1>
          <p style={{ fontSize: 13, color: '#71717A', fontWeight: 500 }}>Your Life Operating System.</p>
        </div>

        {/* Fields */}
        <div style={{ animation: visible ? 'fadeSlideUp 0.5s 0.15s cubic-bezier(0.4,0,0.2,1) forwards' : 'none', opacity: 0 }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 9, color: 'var(--text-muted)', letterSpacing: 2, textTransform: 'uppercase', fontWeight: 700, marginBottom: 8, paddingLeft: 4 }}>Email</label>
            <input type="email" placeholder="you@example.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: '100%', height: 52, background: '#17181B', border: '1px solid #26272C', borderRadius: 12, padding: '0 16px', fontSize: 14, color: '#FFFFFF', outline: 'none', transition: 'all 0.2s', fontFamily: "'Inter', sans-serif" }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#5EE6F5'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(94,230,245,0.07)' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#26272C'; e.currentTarget.style.boxShadow = 'none' }}
            />
          </div>
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, paddingLeft: 4, paddingRight: 4 }}>
              <label style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 2, textTransform: 'uppercase', fontWeight: 700 }}>Password</label>
              {!isSignUp && <a href="#" style={{ fontSize: 10, color: '#5EE6F5', textDecoration: 'none', fontWeight: 600 }}>Forgot?</a>}
            </div>
            <input type="password" placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%', height: 52, background: '#17181B', border: '1px solid #26272C', borderRadius: 12, padding: '0 16px', fontSize: 14, color: '#FFFFFF', outline: 'none', transition: 'all 0.2s', fontFamily: "'Inter', sans-serif" }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#5EE6F5'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(94,230,245,0.07)' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#26272C'; e.currentTarget.style.boxShadow = 'none' }}
            />
          </div>
        </div>

        {/* CTA */}
        <div style={{ animation: visible ? 'fadeSlideUp 0.5s 0.25s cubic-bezier(0.4,0,0.2,1) forwards' : 'none', opacity: 0 }}>
          <button onClick={handleEmailAuth} disabled={loading} style={{
            width: '100%', height: 52, borderRadius: 12,
            background: '#FFFFFF',
            color: '#121214', fontSize: 14, fontWeight: 700, letterSpacing: -0.2,
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: "'Inter', sans-serif",
            transition: 'background 0.2s, transform 0.15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = '#E4E4E7'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#FFFFFF'; }}
            onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.97)'; }}
            onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            {loading ? <div style={{ width: 16, height: 16, border: '2px solid #121214', borderTopColor: 'transparent', borderRadius: '50%', animation: 'local-spin 0.6s linear infinite' }} /> : (isSignUp ? 'Create Account' : 'Sign In')}
          </button>
        </div>

        {error && (
          <div style={{ marginTop: 16, textAlign: 'center', color: '#ef4444', fontSize: 12, animation: 'fadeSlideUp 0.3s ease' }}>
            {error}
          </div>
        )}

        {/* Divider */}
        <div style={{ animation: visible ? 'fadeSlideUp 0.5s 0.32s cubic-bezier(0.4,0,0.2,1) forwards' : 'none', opacity: 0, display: 'flex', alignItems: 'center', gap: 16, margin: '32px 0' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border-primary)' }} />
          <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>or continue with</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border-primary)' }} />
        </div>

        {/* Social */}
        <div style={{ animation: visible ? 'fadeSlideUp 0.5s 0.38s cubic-bezier(0.4,0,0.2,1) forwards' : 'none', opacity: 0, display: 'flex', gap: 12 }}>
          <button onClick={handleGoogleLogin} disabled={loading} style={{
            flex: 1, height: 50, borderRadius: 14, background: 'var(--bg-card)', border: '1px solid var(--border-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s'
          }} onMouseOver={e=>{e.currentTarget.style.borderColor='var(--border-secondary)';e.currentTarget.style.background='var(--bg-elevated)'}} onMouseOut={e=>{e.currentTarget.style.borderColor='var(--border-primary)';e.currentTarget.style.background='var(--bg-card)'}}>
            <svg width="20" height="20" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.17 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
          </button>
          <button onClick={handleGuestLogin} disabled={guestLoading || loading} style={{
            flex: 1, height: 50, borderRadius: 14, background: 'var(--bg-card)', border: '1px solid var(--border-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: guestLoading ? 'wait' : 'pointer', transition: 'all 0.2s', color: 'var(--text-primary)', fontSize: 13, fontWeight: 600
          }} onMouseOver={e=>{e.currentTarget.style.borderColor='var(--border-secondary)';e.currentTarget.style.background='var(--bg-elevated)'}} onMouseOut={e=>{e.currentTarget.style.borderColor='var(--border-primary)';e.currentTarget.style.background='var(--bg-card)'}} title="Explore as Guest">
            {guestLoading
              ? <div style={{ width: 16, height: 16, border: '2px solid #555', borderTopColor: '#5EE6F5', borderRadius: '50%', animation: 'local-spin 0.6s linear infinite' }} />
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm3.1 14.5c-.6.3-1.4.5-2.2.5-2.8 0-4.6-1.9-4.6-4.8 0-2.8 1.8-4.8 4.6-4.8.8 0 1.5.2 2.1.5l-.6 1.4c-.4-.2-1-.4-1.5-.4-1.8 0-2.9 1.3-2.9 3.2 0 1.9 1.1 3.2 3 3.2.6 0 1.2-.2 1.6-.4l.5 1.6z"/>
                </svg>
            }
            {guestLoading ? 'Entering...' : 'Guest'}
          </button>
        </div>

        {/* Footer Text */}
        <div style={{ animation: visible ? 'fadeSlideUp 0.5s 0.44s cubic-bezier(0.4,0,0.2,1) forwards' : 'none', opacity: 0, textAlign: 'center', marginTop: 40, fontSize: 13, color: 'var(--text-muted)' }}>
          {isSignUp ? "Already have an account? " : "New to Zyrbit? "}
          <button onClick={() => setIsSignUp(!isSignUp)} style={{ color: '#5EE6F5', textDecoration: 'none', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 13 }}>
            {isSignUp ? "Sign In" : "Create account"}
          </button>
        </div>

      </div>

      <style>{`
        @keyframes local-spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
