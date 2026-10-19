import React, { useState } from 'react'
import { supabase } from '../lib/supabase/index.js'
import {
  BrandBadge,
  BrandButton,
  BrandInput,
} from '../components/ui/BrandPrimitives.jsx'

/**
 * Zyrbit Authentication Screens (Screens 2 & 3 in Visual Reference)
 * - Screen 2: Sign Up ("Make room for what matters.")
 * - Screen 3: Sign In ("Welcome back.")
 * - Password Recovery Flow
 * 
 * Features:
 * - Approved Warm Ivory layout (#F4F0E8) with organic wave accent.
 * - Genuine Supabase Auth (Email/Pass, Google OAuth, Password Reset).
 * - Real Guest Access via Supabase anonymous authentication (replacing GitHub).
 * - Full accessibility, keyboard focus states, error handling, and loading prevention.
 */
export default function LoginScreen({ onSuccess, onBack, initialMode = 'login' }) {
  // 'login' | 'signup' | 'forgot' | 'forgot-sent'
  const [mode, setMode] = useState(initialMode)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const isSignUp = mode === 'signup'
  const isForgot = mode === 'forgot' || mode === 'forgot-sent'

  // ── Email Auth Submit ──────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    if (e) e.preventDefault()
    if (!email.trim()) {
      setError('Please enter your email address.')
      return
    }
    if (!isForgot && !password) {
      setError('Please enter your password.')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      if (mode === 'signup') {
        const { data, error: authErr } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: name.trim() || undefined,
            },
          },
        })
        if (authErr) {
          setError(authErr.message)
          setLoading(false)
        } else if (data?.user) {
          if (data.session) {
            const userName = name.trim() || data.user.email?.split('@')[0] || 'Builder'
            onSuccess(data.user.id, userName, true /* isNewUser */)
          } else {
            setSuccess('Confirmation link sent! Please check your email to activate your account.')
            setLoading(false)
          }
        }
      } else if (mode === 'login') {
        const { data, error: authErr } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })
        if (authErr) {
          setError(authErr.message)
          setLoading(false)
        } else if (data?.user) {
          const userName = data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || 'Builder'
          onSuccess(data.user.id, userName, false)
        }
      } else if (mode === 'forgot') {
        const { error: authErr } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/zenith`,
        })
        if (authErr) {
          setError(authErr.message)
          setLoading(false)
        } else {
          setMode('forgot-sent')
          setLoading(false)
        }
      }
    } catch (err) {
      setError(err?.message || 'Authentication failed. Please try again.')
      setLoading(false)
    }
  }

  // ── Google OAuth Handler ───────────────────────────────────────────────────
  const handleGoogleAuth = async () => {
    setLoading(true)
    setError('')
    try {
      const { error: authErr } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/zenith`,
        },
      })
      if (authErr) {
        setError(authErr.message)
        setLoading(false)
      }
    } catch (err) {
      setError(err?.message || 'Failed to authenticate with Google.')
      setLoading(false)
    }
  }

  // ── Real Guest Access Handler (Supabase Anonymous Auth) ────────────────────
  const handleGuestAccess = async () => {
    setLoading(true)
    setError('')
    try {
      const { data, error: authErr } = await supabase.auth.signInAnonymously({
        options: {
          data: {
            full_name: 'Guest',
          },
        },
      })
      if (authErr) {
        setError(authErr.message)
        setLoading(false)
      } else if (data?.user) {
        // Successful genuine anonymous session created
        onSuccess(data.user.id, 'Guest', true /* isNewUser */)
      }
    } catch (err) {
      setError(err?.message || 'Guest session unavailable. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        width: '100vw',
        backgroundColor: '#F4F0E8',
        display: 'flex',
        justifyContent: 'center',
        boxSizing: 'border-box',
        fontFamily: "'Inter', sans-serif",
        overflowY: 'auto',
        position: 'relative',
      }}
    >
      {/* Decorative Organic Ribbon/Wave in Top-Right Corner matching reference */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '200px',
          height: '200px',
          pointerEvents: 'none',
          overflow: 'hidden',
          zIndex: 0,
        }}
      >
        <svg
          viewBox="0 0 200 200"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ width: '100%', height: '100%', opacity: 0.85 }}
        >
          <path
            d="M50 0C90 40 120 70 200 80V0H50Z"
            fill="url(#ivory-ribbon-1)"
          />
          <path
            d="M100 0C130 50 160 90 200 130V30C180 20 150 10 100 0Z"
            fill="url(#ivory-ribbon-2)"
          />
          <defs>
            <linearGradient id="ivory-ribbon-1" x1="120" y1="0" x2="200" y2="80" gradientUnits="userSpaceOnUse">
              <stop stopColor="#E2DDD5" stopOpacity="0.7" />
              <stop offset="1" stopColor="#D5E3E5" stopOpacity="0.4" />
            </linearGradient>
            <linearGradient id="ivory-ribbon-2" x1="100" y1="0" x2="200" y2="130" gradientUnits="userSpaceOnUse">
              <stop stopColor="#8BAFB6" stopOpacity="0.45" />
              <stop offset="1" stopColor="#174A55" stopOpacity="0.15" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: '430px',
          minHeight: '100%',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
          padding: 'max(env(safe-area-inset-top), 24px) 24px max(env(safe-area-inset-bottom), 24px) 24px',
        }}
      >
        {/* Top Header: Brand Badge & Wordmark + Back Button if navigating back */}
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '28px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BrandBadge size={32} shape="square" />
            <span
              style={{
                fontFamily: "'Space Grotesk', 'Inter', sans-serif",
                fontWeight: 750,
                fontSize: '14px',
                letterSpacing: '0.14em',
                color: '#111A20',
                textTransform: 'uppercase',
              }}
            >
              ZYRBIT
            </span>
          </div>

          {(mode === 'signup' || isForgot) && (
            <button
              type="button"
              onClick={() => {
                setMode('login')
                setError('')
                setSuccess('')
              }}
              style={{
                background: 'none',
                border: 'none',
                outline: 'none',
                cursor: 'pointer',
                color: '#68777B',
                fontSize: '13px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
              aria-label="Back to Sign In"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              <span>Back</span>
            </button>
          )}

          {mode === 'login' && onBack && (
            <button
              type="button"
              onClick={onBack}
              style={{
                background: 'none',
                border: 'none',
                outline: 'none',
                cursor: 'pointer',
                color: '#68777B',
                fontSize: '13px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
              aria-label="Back to Welcome"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              <span>Welcome</span>
            </button>
          )}
        </header>

        {/* Editorial Headline & Supporting Copy */}
        <section style={{ marginBottom: '28px' }}>
          <h1
            style={{
              margin: 0,
              fontSize: '34px',
              lineHeight: 1.15,
              fontWeight: 600,
              fontFamily: "'Newsreader', Georgia, serif",
              letterSpacing: '-0.025em',
              color: '#111A20',
            }}
          >
            {isSignUp
              ? 'Make room for what matters.'
              : isForgot
              ? 'Reset password.'
              : 'Welcome back.'}
          </h1>
          <p
            style={{
              margin: '10px 0 0 0',
              fontSize: '13.5px',
              lineHeight: 1.5,
              color: '#68777B',
              fontWeight: 450,
              fontFamily: "'Inter', sans-serif",
              maxWidth: '320px',
            }}
          >
            {isSignUp
              ? 'Create your account and start building a system around your goals.'
              : isForgot
              ? 'Enter your email to receive recovery instructions.'
              : 'Pick up where you left off.'}
          </p>
        </section>

        {/* Error Feedback Message */}
        {error && (
          <div
            role="alert"
            style={{
              backgroundColor: '#FEE2E2',
              border: '1px solid #FCA5A5',
              color: '#B91C1C',
              borderRadius: '12px',
              padding: '12px 14px',
              fontSize: '13px',
              lineHeight: 1.4,
              marginBottom: '18px',
            }}
          >
            {error}
          </div>
        )}

        {/* Success Feedback Message */}
        {success && (
          <div
            role="status"
            style={{
              backgroundColor: '#DCFCE7',
              border: '1px solid #86EFAC',
              color: '#15803D',
              borderRadius: '12px',
              padding: '12px 14px',
              fontSize: '13px',
              lineHeight: 1.4,
              marginBottom: '18px',
            }}
          >
            {success}
          </div>
        )}

        {/* Mode: Forgot Sent Confirmation */}
        {mode === 'forgot-sent' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '12px' }}>
            <div
              style={{
                backgroundColor: '#FFFEFB',
                borderRadius: '16px',
                border: '1.5px solid #E5E0D8',
                padding: '24px 20px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>✉️</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#111A20' }}>
                Check your inbox
              </div>
              <p style={{ fontSize: '13px', color: '#68777B', marginTop: '8px', lineHeight: 1.5 }}>
                We sent a password reset link to <strong>{email}</strong>. Open that link to choose a new password.
              </p>
            </div>
            <BrandButton
              variant="primary"
              onClick={() => {
                setMode('login')
                setError('')
                setSuccess('')
              }}
            >
              Back to Sign In
            </BrandButton>
          </div>
        ) : (
          /* Authentication Form */
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Name Field (Sign Up Only) */}
            {isSignUp && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label
                  htmlFor="signup-name"
                  style={{
                    fontSize: '13.5px',
                    fontWeight: 600,
                    color: '#111A20',
                  }}
                >
                  Name
                </label>
                <BrandInput
                  id="signup-name"
                  name="name"
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  icon={
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  }
                />
              </div>
            )}

            {/* Email Field */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label
                htmlFor="auth-email"
                style={{
                  fontSize: '13.5px',
                  fontWeight: 600,
                  color: '#111A20',
                }}
              >
                Email
              </label>
              <BrandInput
                id="auth-email"
                name="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                icon={
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                }
              />
            </div>

            {/* Password Field (Sign In & Sign Up) */}
            {!isForgot && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label
                    htmlFor="auth-password"
                    style={{
                      fontSize: '13.5px',
                      fontWeight: 600,
                      color: '#111A20',
                    }}
                  >
                    Password
                  </label>
                </div>
                <BrandInput
                  id="auth-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={isSignUp ? 'Create a password' : 'Your password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  icon={
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  }
                  rightElement={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'inherit' }}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  }
                />

                {/* Helper text on Sign Up matching reference */}
                {isSignUp && (
                  <div style={{ fontSize: '12px', color: '#68777B', marginTop: '2px' }}>
                    Show password toggle lets you review this field.
                  </div>
                )}

                {/* Forgot password link on Sign In matching reference */}
                {!isSignUp && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot')
                        setError('')
                        setSuccess('')
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '13px',
                        color: '#174A55',
                        cursor: 'pointer',
                        padding: 0,
                        fontWeight: 600,
                      }}
                    >
                      Forgot password?
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Primary Action Button (Create account or Sign In) */}
            <div style={{ marginTop: '6px' }}>
              <BrandButton type="submit" variant="primary" loading={loading}>
                {isSignUp
                  ? 'Create account →'
                  : isForgot
                  ? 'Send Reset Link'
                  : 'Sign In →'}
              </BrandButton>
            </div>

            {/* "or continue with" Divider */}
            {!isForgot && (
              <>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    margin: '12px 0 4px 0',
                    gap: '14px',
                  }}
                >
                  <div style={{ flex: 1, height: '1px', backgroundColor: '#E5E0D8' }} />
                  <span style={{ fontSize: '12px', color: '#68777B', fontWeight: 500 }}>
                    or continue with
                  </span>
                  <div style={{ flex: 1, height: '1px', backgroundColor: '#E5E0D8' }} />
                </div>

                {/* Social Actions: Google & Continue as Guest (Replacing GitHub) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {/* Google */}
                  <BrandButton
                    variant="social"
                    onClick={handleGoogleAuth}
                    disabled={loading}
                    icon={
                      <svg width="18" height="18" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                    }
                  >
                    Google
                  </BrandButton>

                  {/* Continue as Guest (Replacing GitHub) */}
                  <BrandButton
                    variant="social"
                    onClick={handleGuestAccess}
                    disabled={loading}
                    icon={
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#174A55" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    }
                    title="Continue as Guest"
                  >
                    Guest
                  </BrandButton>
                </div>
              </>
            )}
          </form>
        )}

        {/* Footer Navigation Switcher */}
        <footer
          style={{
            marginTop: 'auto',
            paddingTop: '32px',
            textAlign: 'center',
            fontSize: '13.5px',
            color: '#68777B',
          }}
        >
          {isSignUp ? (
            <div>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('login')
                  setError('')
                  setSuccess('')
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#174A55',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: 0,
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                Sign In
              </button>
            </div>
          ) : (
            <div>
              New here?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('signup')
                  setError('')
                  setSuccess('')
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#174A55',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: 0,
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                Get Started
              </button>
            </div>
          )}
        </footer>
      </div>
    </div>
  )
}
