import React, { useEffect, useState, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import SplashScreen from './screens/SplashScreen.jsx'
import OnboardingScreen from './screens/OnboardingScreen.jsx'
import LoginScreen from './screens/LoginScreen.jsx'
import WelcomeAnimation from './screens/WelcomeAnimation.jsx'
import supabase from './lib/supabase/index.js'
import { ensureProfile } from './lib/friendTag.js'
import AppLayout from './components/layout/AppLayout.jsx'
import Logo from './components/ui/Logo.jsx'
import InstallBanner from './components/layout/InstallBanner.jsx'
import GoalSetupScreen from './screens/GoalSetupScreen.jsx'

import { SubscriptionProvider } from './context/SubscriptionContext.jsx'
import PaywallOverlay from './components/ui/PaywallOverlay.jsx'
import { useHabitReminders } from './hooks/useHabitReminders.js'
import FeedbackWidget from './components/common/FeedbackWidget.jsx'
import { trackPageView, recordMilestone } from './lib/analytics/index.js'
import { useOfflineDetector } from './hooks/useOfflineDetector.js'

const Zenith = lazy(() => import('./pages/Zenith/index.jsx'))

const Growth = lazy(() => import('./pages/Growth/index.jsx'))
const Health = lazy(() => import('./pages/Health/index.jsx'))
const Wealth = lazy(() => import('./pages/Wealth/index.jsx'))
const Food = lazy(() => import('./pages/Food/index.jsx'))
const Profile = lazy(() => import('./pages/Profile/index.jsx'))
const Challenge = lazy(() => import('./pages/Challenge/index.jsx'))
const Stats = lazy(() => import('./pages/Stats/index.jsx'))

const requestNotificationPermission = async () => {
  if (!('Notification' in window)) return
  if (Notification.permission === 'default') {
    await Notification.requestPermission()
  }
}

const LoadingScreen = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0B0D0F', flexDirection: 'column', gap: '20px' }}>
    <Logo size={56} />
    <div style={{ width: '32px', height: '2px', background: '#1FA36F', borderRadius: '2px', opacity: 0.8 }}/>
  </div>
)

function ProtectedRoute({ children, onSignOut }) {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) ensureProfile(session.user)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session?.user) ensureProfile(session.user)
      if (!session && onSignOut) onSignOut()
    })
    
    requestNotificationPermission()
    return () => subscription.unsubscribe()
  }, [onSignOut])



  if (session === undefined) return <LoadingScreen />
  // If no session, the App logic handles routing them to LoginScreen, but just in case:
  if (!session) return null 

  return (
    <AppLayout userId={session?.user?.id}>
      <Suspense fallback={<LoadingScreen />}>
        {children}
      </Suspense>
    </AppLayout>
  )
}

// Inner component placed inside BrowserRouter so it can use useLocation
function AppPageTracker({ userId }) {
  const location = useLocation()
  useEffect(() => {
    if (userId) {
      trackPageView(userId, location.pathname)
    }
  }, [location.pathname, userId])
  return null
}

function RedirectToLogin({ onSignOut }) {
  useEffect(() => {
    supabase.auth.signOut().then(() => {
      if (onSignOut) onSignOut()
    })
  }, [onSignOut])
  return null
}

function MainApp({ handleSignOut, currentUserId }) {
  return (
    <BrowserRouter>
      <AppPageTracker userId={currentUserId} />
      <Routes>
        <Route path="/zenith" element={<ProtectedRoute onSignOut={handleSignOut}><Zenith /></ProtectedRoute>} />
        <Route path="/growth" element={<ProtectedRoute onSignOut={handleSignOut}><Growth /></ProtectedRoute>} />
        <Route path="/health" element={<ProtectedRoute onSignOut={handleSignOut}><Health /></ProtectedRoute>} />
        <Route path="/wealth" element={<ProtectedRoute onSignOut={handleSignOut}><Wealth /></ProtectedRoute>} />
        <Route path="/food" element={<ProtectedRoute onSignOut={handleSignOut}><Food /></ProtectedRoute>} />
        <Route path="/challenge" element={<ProtectedRoute onSignOut={handleSignOut}><Challenge /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute onSignOut={handleSignOut}><Profile /></ProtectedRoute>} />
        <Route path="/stats" element={<ProtectedRoute onSignOut={handleSignOut}><Stats /></ProtectedRoute>} />
        <Route path="/login" element={<RedirectToLogin onSignOut={handleSignOut} />} />
        <Route path="/" element={<Navigate to="/zenith" replace />} />
        <Route path="*" element={<Navigate to="/zenith" replace />} />
      </Routes>
      {/* Floating feedback widget for authenticated users */}
      {currentUserId && (
        <FeedbackWidget userId={currentUserId} currentPage={window.location.pathname} />
      )}
    </BrowserRouter>
  )
}

const OfflineBanner = () => (
  <div style={{
    position: 'fixed',
    bottom: '90px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(239, 68, 68, 0.95)',
    color: '#FFFFFF',
    padding: '8px 16px',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '1.2px',
    textTransform: 'uppercase',
    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontFamily: "'Inter', sans-serif",
    backdropFilter: 'blur(8px)',
  }}>
    <span style={{ fontSize: '12px' }}>📡</span> Offline Mode
  </div>
)

export default function App() {
  const [screen, setScreen] = useState('splash') // 'splash' | 'onboarding' | 'login' | 'welcome' | 'goal-setup' | 'app'
  const [isInitializing, setIsInitializing] = useState(true)
  const [currentUserId, setCurrentUserId] = useState(null)
  const [currentUserName, setCurrentUserName] = useState('Builder')

  const isOffline = useOfflineDetector()

  useHabitReminders(currentUserId)

  useEffect(() => {
    const checkAuthStatus = async () => {
      const launched = localStorage.getItem('zyrbit_launched')

      // Add a 5s timeout — if Supabase hangs, fall through gracefully
      let session = null
      try {
        const result = await Promise.race([
          supabase.auth.getSession(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
        ])
        session = result?.data?.session ?? null
      } catch {
        // Supabase timed out or failed — treat as logged out
      }

      if (session) {
        localStorage.setItem('zyrbit_launched', 'true')
        setCurrentUserId(session.user.id)
        setScreen('app')
        // Record first login milestone (non-blocking)
        recordMilestone(session.user.id, 'first_login')
      } else if (launched) {
        setScreen('login')
      } else {
        setScreen('splash')
      }
      setIsInitializing(false)

      // Instantly remove HTML loader once React is ready to take over
      const htmlSplash = document.getElementById('splash')
      if (htmlSplash) {
        htmlSplash.style.opacity = '0'
        setTimeout(() => htmlSplash.remove(), 400)
      }
    }
    checkAuthStatus()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        localStorage.setItem('zyrbit_launched', 'true')
        setCurrentUserId(session.user.id)
        setScreen('app')
        recordMilestone(session.user.id, 'first_login')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleOnboardingComplete = () => {
    localStorage.setItem('zyrbit_launched', 'true')
    setScreen('login')
  }
  const handleLoginSuccess = (userId, userName) => {
    localStorage.setItem('zyrbit_launched', 'true')
    setCurrentUserId(userId)
    setCurrentUserName(userName || 'Builder')
    setScreen('app')
  }
  const handleSignOut = () => {
    try { sessionStorage.removeItem('dexos_session_chat'); } catch { /* ignore */ }
    setScreen('login')
  }

  if (isInitializing) return <LoadingScreen />

  return (
    <SubscriptionProvider>
      <div className="app-container">
        {isOffline && <OfflineBanner />}
        {screen !== 'splash' && screen !== 'welcome' && <InstallBanner />}
        {screen === 'splash' && <SplashScreen onGetStarted={() => setScreen('onboarding')} onLogin={() => setScreen('login')} />}
        {screen === 'onboarding' && <OnboardingScreen onComplete={handleOnboardingComplete} />}
        {screen === 'login' && <LoginScreen onSuccess={handleLoginSuccess} />}
        {screen === 'welcome' && <WelcomeAnimation userName={currentUserName} onComplete={() => setScreen('goal-setup')} />}
        {screen === 'goal-setup' && <GoalSetupScreen userId={currentUserId} onComplete={() => setScreen('app')} />}
        {screen === 'app' && <MainApp handleSignOut={handleSignOut} currentUserId={currentUserId} />}
        <PaywallOverlay />
      </div>
    </SubscriptionProvider>
  )
}
