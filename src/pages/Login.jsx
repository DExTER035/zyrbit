import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ZyrbitIcon } from '../components/Logo.jsx'
import { supabase } from '../lib/supabase.js'

export default function Login() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        const onboarded = localStorage.getItem('zyrbit_onboarded')
        navigate(onboarded === 'true' ? '/orbit' : '/onboarding', { replace: true })
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        const onboarded = localStorage.getItem('zyrbit_onboarded')
        navigate(onboarded === 'true' ? '/orbit' : '/onboarding', { replace: true })
      }
    })

    return () => subscription.unsubscribe()
  }, [navigate])

  const handleGoogleLogin = async () => {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/orbit`
      }
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    }
  }

  const handleGuestLogin = async () => {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInAnonymously()
    if (error) {
      if (error.message.includes('provider is not enabled')) {
        setError('Please enable "Anonymous" sign-ins in your Supabase Auth Providers.')
      } else {
        setError(error.message)
      }
      setLoading(false)
    }
  }

  return (
    <div className="app-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 32px' }}>
      <div className="animate-fadeSlideUp" style={{ textAlign: 'center', width: '100%', maxWidth: 340 }}>
        
        {/* Animated Premium Logo Container */}
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
          <div style={{ position: 'absolute', inset: -20, background: 'radial-gradient(circle, var(--color-cyan-glow) 0%, transparent 70%)', animation: 'glowPulse 3s ease-in-out infinite' }} />
          <ZyrbitIcon size={72} />
        </div>

        {/* Brand */}
        <h1 style={{ fontSize: 42, fontWeight: 900, color: 'var(--color-text)', marginBottom: 8, letterSpacing: '-1px', lineHeight: 1 }}>
          Zyr<span style={{ color: 'var(--color-cyan)' }}>bit</span>
        </h1>
        <p style={{ fontSize: 15, color: 'var(--color-muted)', marginBottom: 48, fontWeight: 500 }}>
          Orbit your best self daily
        </p>

        {/* Google Login */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          style={{
            width: '100%', padding: '16px 24px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
            background: loading ? 'var(--color-card)' : '#FFFFFF',
            color: loading ? 'var(--color-muted)' : '#000000', 
            fontWeight: 800, fontSize: 15,
            border: 'none', borderRadius: 16, cursor: 'pointer',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)', marginBottom: 16,
            boxShadow: '0 8px 30px rgba(0, 255, 255, 0.15)',
          }}
          onMouseDown={e => e.currentTarget.style.transform = 'scale(0.96)'}
          onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          {loading ? (
             <div style={{ width: 20, height: 20, border: '2px solid var(--color-cyan)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'local-spin 0.6s linear infinite' }} />
          ) : (
            <>
              <svg width="20" height="20" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.17 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              Continue with Google
            </>
          )}
        </button>

        {/* Guest Login */}
        <button
          onClick={handleGuestLogin}
          disabled={loading}
          className="btn-ghost"
          style={{ width: '100%', padding: '16px 24px', borderRadius: '16px', fontSize: 14 }}
        >
          Explore as Guest
        </button>

        {error && (
          <div style={{ background: 'color-mix(in srgb, #EF4444 10%, transparent)', border: '1px solid color-mix(in srgb, #EF4444 30%, transparent)', borderRadius: 12, padding: 12, marginTop: 24, animation: 'fadeSlideUp 0.3s ease' }}>
            <p style={{ color: '#EF4444', fontSize: 13, textAlign: 'center', margin: 0, fontWeight: 600 }}>
              {error}
            </p>
          </div>
        )}

        {/* Tagline */}
        <div style={{ marginTop: 40, borderTop: '1px solid var(--color-border)', paddingTop: 24 }}>
          <p style={{ fontSize: 12, color: 'var(--color-muted)', lineHeight: 1.6, textAlign: 'center', fontWeight: 500 }}>
            Zyrbit is your gamified life OS.<br />
            <strong style={{ color: 'var(--color-text2)' }}>Build habits that break gravity.</strong>
          </p>
        </div>

        <style>{`
          @keyframes local-spin {
            100% { transform: rotate(360deg); }
          }
          @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-8px); }
          }
        `}</style>
      </div>
    </div>
  )
}
