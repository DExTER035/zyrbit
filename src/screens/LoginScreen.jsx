import React, { useState, useEffect } from 'react'
import { DexOSIcon } from '../components/Logo.jsx'
import { supabase } from '../lib/supabase.js'

// ── Shared input styles ────────────────────────────────────────────────────
const inputStyle = {
  width: '100%', height: 52,
  background: '#17181B', border: '1px solid #26272C', borderRadius: 12,
  padding: '0 16px', fontSize: 14, color: '#FFFFFF', outline: 'none',
  transition: 'all 0.2s', fontFamily: "'Inter', sans-serif",
  boxSizing: 'border-box',
}
const onFocusInput = (e) => {
  e.currentTarget.style.borderColor = '#5EE6F5'
  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(94,230,245,0.07)'
}
const onBlurInput = (e) => {
  e.currentTarget.style.borderColor = '#26272C'
  e.currentTarget.style.boxShadow = 'none'
}

const Spinner = ({ color = '#121214' }) => (
  <div style={{ width: 16, height: 16, border: `2px solid ${color}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'local-spin 0.6s linear infinite' }} />
)

export default function LoginScreen({ onSuccess }) {
  const [loading, setLoading]           = useState(false)
  const [guestLoading, setGuestLoading] = useState(false)
  const [error, setError]               = useState('')
  const [success, setSuccess]           = useState('')
  const [visible, setVisible]           = useState(false)
  const [email, setEmail]               = useState('')
  const [password, setPassword]         = useState('')
  const [isSignUp, setIsSignUp]         = useState(false)
  // 'login' | 'forgot' | 'forgot-sent'
  const [mode, setMode]                 = useState('login')

  useEffect(() => { setTimeout(() => setVisible(true), 100) }, [])

  // ── Email auth (login / sign-up) ──────────────────────────────────────────
  const handleEmailAuth = async () => {
    if (!email.trim() || !password) {
      setError('Please enter both email and password.')
      return
    }
    setLoading(true)
    setError('')
    setSuccess('')

    if (isSignUp) {
      const { data, error: authErr } = await supabase.auth.signUp({ email: email.trim(), password })
      if (authErr) {
        setError(authErr.message)
        setLoading(false)
      } else if (data?.user) {
        if (data.session) {
          const name = data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || 'Builder'
          onSuccess(data.user.id, name)
        } else {
          setSuccess('Account created! Check your email to confirm before signing in.')
          setIsSignUp(false)
          setLoading(false)
        }
      }
    } else {
      const { data, error: authErr } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (authErr) {
        setError(authErr.message)
        setLoading(false)
      } else if (data?.user) {
        const name = data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || 'Builder'
        onSuccess(data.user.id, name)
      }
    }
  }

  const handleKeyDown = (e) => { if (e.key === 'Enter') handleEmailAuth() }

  // ── Google OAuth ──────────────────────────────────────────────────────────
  const handleGoogleLogin = async () => {
    setLoading(true)
    setError('')
    const { error: authErr } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/zenith` }
    })
    if (authErr) { setError(authErr.message); setLoading(false) }
  }

  // ── Guest login ───────────────────────────────────────────────────────────
  const handleGuestLogin = async () => {
    setGuestLoading(true)
    setError('')
    const { data, error: authErr } = await supabase.auth.signInAnonymously()
    if (authErr) {
      setError(
        authErr.message.includes('not enabled') || authErr.message.includes('provider')
          ? '⚠️ Guest login is disabled. Enable Anonymous sign-ins in Supabase Auth settings.'
          : authErr.message
      )
      setGuestLoading(false)
    } else if (data?.user) {
      onSuccess(data.user.id, 'Builder')
    }
  }

  // ── Forgot password ───────────────────────────────────────────────────────
  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError('Enter your email address above first.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.')
      return
    }
    setLoading(true)
    setError('')
    const { error: authErr } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/zenith`,
    })
    setLoading(false)
    if (authErr) {
      setError(authErr.message)
    } else {
      setMode('forgot-sent')
    }
  }

  // ── RENDER: Forgot password sent confirmation ─────────────────────────────
  if (mode === 'forgot-sent') {
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#121214', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', fontFamily: "'Inter', sans-serif" }}>
        <div style={{ textAlign: 'center', maxWidth: 360, width: '100%' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📬</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#fff', marginBottom: 10, fontFamily: "'Space Grotesk', sans-serif" }}>Check your inbox</h1>
          <p style={{ fontSize: 13, color: '#71717A', lineHeight: 1.6, marginBottom: 32 }}>
            We sent a password reset link to <strong style={{ color: '#A1A1AA' }}>{email}</strong>.<br />
            Click the link in the email to set a new password.
          </p>
          <button
            onClick={() => { setMode('login'); setError(''); setSuccess('') }}
            style={{ background: '#FFFFFF', color: '#121214', border: 'none', borderRadius: 12, height: 48, width: '100%', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
          >
            Back to Sign In
          </button>
          <p style={{ marginTop: 16, fontSize: 11, color: '#52525B' }}>
            Didn't receive it? Check your spam folder or try again in a few minutes.
          </p>
        </div>
        <style>{`@keyframes local-spin { 100% { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  // ── RENDER: Forgot password entry ─────────────────────────────────────────
  if (mode === 'forgot') {
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#121214', display: 'flex', flexDirection: 'column', padding: '40px 24px', fontFamily: "'Inter', sans-serif" }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: 400, margin: '0 auto', width: '100%' }}>
          {/* Back */}
          <button
            onClick={() => { setMode('login'); setError('') }}
            style={{ background: 'none', border: 'none', color: '#71717A', fontSize: 13, cursor: 'pointer', textAlign: 'left', padding: 0, marginBottom: 32, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            ← Back to Sign In
          </button>

          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#fff', marginBottom: 8, fontFamily: "'Space Grotesk', sans-serif" }}>
            Reset password
          </h1>
          <p style={{ fontSize: 13, color: '#71717A', marginBottom: 32, lineHeight: 1.6 }}>
            Enter your email and we'll send you a reset link. Check your inbox after submitting.
          </p>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 9, color: '#71717A', letterSpacing: 2, textTransform: 'uppercase', fontWeight: 700, marginBottom: 8, paddingLeft: 4 }}>Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleForgotPassword() }}
              style={inputStyle}
              onFocus={onFocusInput}
              onBlur={onBlurInput}
              autoFocus
            />
          </div>

          {error && (
            <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, color: '#EF4444', fontSize: 12 }}>
              {error}
            </div>
          )}

          <button
            onClick={handleForgotPassword}
            disabled={loading}
            style={{ width: '100%', height: 52, borderRadius: 12, background: '#FFFFFF', color: '#121214', fontSize: 14, fontWeight: 700, border: 'none', cursor: loading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#E4E4E7' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#FFFFFF' }}
          >
            {loading ? <Spinner /> : 'Send Reset Link'}
          </button>
        </div>
        <style>{`@keyframes local-spin { 100% { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  // ── RENDER: Main login / sign-up ──────────────────────────────────────────
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#121214', overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '40px 24px', fontFamily: "'Inter', sans-serif" }}>

      {/* Ambient orbs */}
      <div style={{ position: 'absolute', top: -100, right: -100, width: 280, height: 280, borderRadius: '50%', background: '#5EE6F5', filter: 'blur(100px)', opacity: 0.04, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -60, left: -60, width: 200, height: 200, borderRadius: '50%', background: '#A78BFA', filter: 'blur(100px)', opacity: 0.04, pointerEvents: 'none' }} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', zIndex: 10, maxWidth: 400, margin: '0 auto', width: '100%' }}>

        {/* Header */}
        <div style={{ animation: visible ? 'zoomIn 0.5s 0.05s cubic-bezier(0.34,1.56,0.64,1) forwards' : 'none', opacity: 0, textAlign: 'center', marginBottom: 48 }}>
          <DexOSIcon size={46} />
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#fff', letterSpacing: -0.8, marginTop: 16, marginBottom: 8, fontFamily: "'Space Grotesk', sans-serif" }}>
            DexOS
          </h1>
          <p style={{ fontSize: 13, color: '#71717A', fontWeight: 500 }}>Your Personal Operating System.</p>
        </div>

        {/* Success banner */}
        {success && (
          <div style={{ marginBottom: 20, padding: '10px 14px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10, color: '#10B981', fontSize: 12, textAlign: 'center' }}>
            {success}
          </div>
        )}

        {/* Fields */}
        <div style={{ animation: visible ? 'fadeSlideUp 0.5s 0.15s cubic-bezier(0.4,0,0.2,1) forwards' : 'none', opacity: 0 }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 9, color: 'var(--text-muted)', letterSpacing: 2, textTransform: 'uppercase', fontWeight: 700, marginBottom: 8, paddingLeft: 4 }}>Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={handleKeyDown}
              style={inputStyle}
              onFocus={onFocusInput}
              onBlur={onBlurInput}
            />
          </div>
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, paddingLeft: 4, paddingRight: 4 }}>
              <label style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 2, textTransform: 'uppercase', fontWeight: 700 }}>Password</label>
              {!isSignUp && (
                <button
                  onClick={() => { setMode('forgot'); setError(''); setSuccess('') }}
                  style={{ fontSize: 10, color: '#5EE6F5', textDecoration: 'none', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  Forgot?
                </button>
              )}
            </div>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              style={inputStyle}
              onFocus={onFocusInput}
              onBlur={onBlurInput}
            />
          </div>
        </div>

        {/* CTA */}
        <div style={{ animation: visible ? 'fadeSlideUp 0.5s 0.25s cubic-bezier(0.4,0,0.2,1) forwards' : 'none', opacity: 0 }}>
          <button
            onClick={handleEmailAuth}
            disabled={loading}
            style={{ width: '100%', height: 52, borderRadius: 12, background: '#FFFFFF', color: '#121214', fontSize: 14, fontWeight: 700, letterSpacing: -0.2, border: 'none', cursor: loading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', sans-serif", transition: 'background 0.2s, transform 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#E4E4E7' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#FFFFFF' }}
            onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.97)' }}
            onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
          >
            {loading ? <Spinner /> : (isSignUp ? 'Create Account' : 'Sign In')}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div style={{ marginTop: 16, padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, color: '#EF4444', fontSize: 12, textAlign: 'center' }}>
            {error}
          </div>
        )}

        {/* Divider */}
        <div style={{ animation: visible ? 'fadeSlideUp 0.5s 0.32s cubic-bezier(0.4,0,0.2,1) forwards' : 'none', opacity: 0, display: 'flex', alignItems: 'center', gap: 16, margin: '32px 0' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border-primary)' }} />
          <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>or continue with</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border-primary)' }} />
        </div>

        {/* Social buttons */}
        <div style={{ animation: visible ? 'fadeSlideUp 0.5s 0.38s cubic-bezier(0.4,0,0.2,1) forwards' : 'none', opacity: 0, display: 'flex', gap: 12 }}>
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            style={{ flex: 1, height: 50, borderRadius: 14, background: 'var(--bg-card)', border: '1px solid var(--border-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--border-secondary)'; e.currentTarget.style.background = 'var(--bg-elevated)' }}
            onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border-primary)'; e.currentTarget.style.background = 'var(--bg-card)' }}
            aria-label="Sign in with Google"
          >
            <svg width="20" height="20" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.17 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
          </button>
          <button
            onClick={handleGuestLogin}
            disabled={guestLoading || loading}
            style={{ flex: 1, height: 50, borderRadius: 14, background: 'var(--bg-card)', border: '1px solid var(--border-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: guestLoading ? 'wait' : 'pointer', transition: 'all 0.2s', color: 'var(--text-primary)', fontSize: 13, fontWeight: 600 }}
            onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--border-secondary)'; e.currentTarget.style.background = 'var(--bg-elevated)' }}
            onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border-primary)'; e.currentTarget.style.background = 'var(--bg-card)' }}
            title="Explore as Guest"
          >
            {guestLoading
              ? <Spinner color="#5EE6F5" />
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm3.1 14.5c-.6.3-1.4.5-2.2.5-2.8 0-4.6-1.9-4.6-4.8 0-2.8 1.8-4.8 4.6-4.8.8 0 1.5.2 2.1.5l-.6 1.4c-.4-.2-1-.4-1.5-.4-1.8 0-2.9 1.3-2.9 3.2 0 1.9 1.1 3.2 3 3.2.6 0 1.2-.2 1.6-.4l.5 1.6z"/></svg>
            }
            {guestLoading ? 'Entering...' : 'Guest'}
          </button>
        </div>

        {/* Footer toggle */}
        <div style={{ animation: visible ? 'fadeSlideUp 0.5s 0.44s cubic-bezier(0.4,0,0.2,1) forwards' : 'none', opacity: 0, textAlign: 'center', marginTop: 40, fontSize: 13, color: 'var(--text-muted)' }}>
          {isSignUp ? 'Already have an account? ' : 'New to DexOS? '}
          <button
            onClick={() => { setIsSignUp(s => !s); setError(''); setSuccess('') }}
            style={{ color: '#5EE6F5', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 13 }}
          >
            {isSignUp ? 'Sign In' : 'Create account'}
          </button>
        </div>

      </div>

      <style>{`@keyframes local-spin { 100% { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
