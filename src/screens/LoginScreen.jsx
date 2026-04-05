import React, { useState, useEffect } from 'react'
import { ZyrbitIcon } from '../components/Logo.jsx'
import { supabase } from '../lib/supabase.js'

export default function LoginScreen({ onSuccess }) {
  const [loading, setLoading] = useState(false)
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
          const name = data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || 'Astronaut'
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
        const name = data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || 'Astronaut'
        onSuccess(data.user.id, name)
      }
    }
  }

  const handleGoogleLogin = async () => {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/orbit` }
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    }
  }

  const handleGuestLogin = async () => {
    setLoading(true)
    setError('')
    const { data, error } = await supabase.auth.signInAnonymously()
    if (error) {
      setError(error.message.includes('provider is not enabled') 
        ? 'Please enable "Anonymous" sign-ins in Supabase Auth.'
        : error.message)
      setLoading(false)
    } else if (data?.user) {
      const name = data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || 'Astronaut'
      onSuccess(data.user.id, name)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '40px 24px', fontFamily: "'DM Sans', sans-serif" }}>
      
      {/* Ambient orbs */}
      <div style={{ position: 'absolute', top: -120, right: -120, width: 300, height: 300, borderRadius: '50%', background: '#00e5cc', filter: 'blur(80px)', opacity: 0.06, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -80, left: -80, width: 220, height: 220, borderRadius: '50%', background: '#9c27b0', filter: 'blur(80px)', opacity: 0.05, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: 110, right: -50, width: 150, height: 150, borderRadius: '50%', background: '#ff9800', filter: 'blur(80px)', opacity: 0.04, pointerEvents: 'none' }} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', zIndex: 10, maxWidth: 400, margin: '0 auto', width: '100%' }}>
        
        {/* Header */}
        <div style={{ animation: visible ? 'zoomIn 0.5s 0.05s cubic-bezier(0.34,1.56,0.64,1) forwards' : 'none', opacity: 0, textAlign: 'center', marginBottom: 48 }}>
          <ZyrbitIcon size={46} />
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 27, fontWeight: 900, color: '#fff', letterSpacing: -1, marginTop: 16, marginBottom: 8 }}>
            Zyr<span style={{ color: '#00e5cc' }}>bit</span>
          </h1>
          <p style={{ fontSize: 12, color: '#2a2a2a', fontWeight: 500, letterSpacing: 0.5 }}>Enter your orbit. Build something real.</p>
        </div>

        {/* Fields */}
        <div style={{ animation: visible ? 'fadeSlideUp 0.5s 0.15s cubic-bezier(0.4,0,0.2,1) forwards' : 'none', opacity: 0 }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 9, color: '#222', letterSpacing: 2, textTransform: 'uppercase', fontWeight: 700, marginBottom: 8, paddingLeft: 4 }}>Email</label>
            <input type="email" placeholder="astronaut@example.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: '100%', height: 52, background: '#060606', border: '1px solid #0d0d0d', borderRadius: 14, padding: '0 16px', fontSize: 13, color: '#e8e8f0', outline: 'none', transition: 'all 0.2s' }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#00e5cc30'; e.currentTarget.style.boxShadow = '0 0 0 3px #00e5cc08' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#0d0d0d'; e.currentTarget.style.boxShadow = 'none' }}
            />
          </div>
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, paddingLeft: 4, paddingRight: 4 }}>
              <label style={{ fontSize: 9, color: '#222', letterSpacing: 2, textTransform: 'uppercase', fontWeight: 700 }}>Password</label>
              {!isSignUp && <a href="#" style={{ fontSize: 10, color: '#191919', textDecoration: 'none', fontWeight: 600 }}>Forgot?</a>}
            </div>
            <input type="password" placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%', height: 52, background: '#060606', border: '1px solid #0d0d0d', borderRadius: 14, padding: '0 16px', fontSize: 13, color: '#e8e8f0', outline: 'none', transition: 'all 0.2s' }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#00e5cc30'; e.currentTarget.style.boxShadow = '0 0 0 3px #00e5cc08' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#0d0d0d'; e.currentTarget.style.boxShadow = 'none' }}
            />
          </div>
        </div>

        {/* CTA */}
        <div style={{ animation: visible ? 'fadeSlideUp 0.5s 0.25s cubic-bezier(0.4,0,0.2,1) forwards' : 'none', opacity: 0 }}>
          <button onClick={handleEmailAuth} disabled={loading} style={{
            width: '100%', height: 54, borderRadius: 27,
            background: 'linear-gradient(135deg, #00e5cc, #00bcd4)',
            color: '#000', fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 800, letterSpacing: 0.5,
            border: 'none', cursor: 'pointer', boxShadow: '0 0 28px #00e5cc20',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            {loading ? <div style={{ width: 18, height: 18, border: '2px solid #000', borderTopColor: 'transparent', borderRadius: '50%', animation: 'local-spin 0.6s linear infinite' }} /> : (isSignUp ? 'Create Account 🚀' : 'Launch into Orbit 🚀')}
          </button>
        </div>

        {error && (
          <div style={{ marginTop: 16, textAlign: 'center', color: '#ef4444', fontSize: 12, animation: 'fadeSlideUp 0.3s ease' }}>
            {error}
          </div>
        )}

        {/* Divider */}
        <div style={{ animation: visible ? 'fadeSlideUp 0.5s 0.32s cubic-bezier(0.4,0,0.2,1) forwards' : 'none', opacity: 0, display: 'flex', alignItems: 'center', gap: 16, margin: '32px 0' }}>
          <div style={{ flex: 1, height: 1, background: '#0a0a0a' }} />
          <span style={{ fontSize: 10, color: '#191919', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>or continue with</span>
          <div style={{ flex: 1, height: 1, background: '#0a0a0a' }} />
        </div>

        {/* Social */}
        <div style={{ animation: visible ? 'fadeSlideUp 0.5s 0.38s cubic-bezier(0.4,0,0.2,1) forwards' : 'none', opacity: 0, display: 'flex', gap: 12 }}>
          <button onClick={handleGoogleLogin} disabled={loading} style={{
            flex: 1, height: 50, borderRadius: 14, background: '#060606', border: '1px solid #0d0d0d',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'border-color 0.2s'
          }} onMouseOver={e=>e.currentTarget.style.borderColor='#1e1e1e'} onMouseOut={e=>e.currentTarget.style.borderColor='#0d0d0d'}>
            <svg width="20" height="20" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.17 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
          </button>
          <button onClick={handleGuestLogin} disabled={loading} style={{
            flex: 1, height: 50, borderRadius: 14, background: '#060606', border: '1px solid #0d0d0d',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer', transition: 'border-color 0.2s', color: '#e8e8f0', fontSize: 13, fontWeight: 600
          }} onMouseOver={e=>e.currentTarget.style.borderColor='#1e1e1e'} onMouseOut={e=>e.currentTarget.style.borderColor='#0d0d0d'} title="Explore as Guest">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm3.1 14.5c-.6.3-1.4.5-2.2.5-2.8 0-4.6-1.9-4.6-4.8 0-2.8 1.8-4.8 4.6-4.8.8 0 1.5.2 2.1.5l-.6 1.4c-.4-.2-1-.4-1.5-.4-1.8 0-2.9 1.3-2.9 3.2 0 1.9 1.1 3.2 3 3.2.6 0 1.2-.2 1.6-.4l.5 1.6z"/>
            </svg>
            Guest
          </button>
        </div>

        {/* Footer Text */}
        <div style={{ animation: visible ? 'fadeSlideUp 0.5s 0.44s cubic-bezier(0.4,0,0.2,1) forwards' : 'none', opacity: 0, textAlign: 'center', marginTop: 40, fontSize: 13, color: '#444' }}>
          {isSignUp ? "Already have an account? " : "New to Zyrbit? "}
          <button onClick={() => setIsSignUp(!isSignUp)} style={{ color: '#00e5cc', textDecoration: 'none', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 13 }}>
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
