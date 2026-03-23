import React, { useEffect, useState, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import SplashScreen from './screens/SplashScreen.jsx'
import OnboardingScreen from './screens/OnboardingScreen.jsx'
import LoginScreen from './screens/LoginScreen.jsx'
import supabase from './lib/supabase.js'
import { getWallet } from './lib/zyrons.js'
import { ensureProfile } from './lib/friendTag.js'
import AppLayout from './components/AppLayout.jsx'
import Logo from './components/Logo.jsx'
import InstallBanner from './components/InstallBanner.jsx'

const Orbit = lazy(() => import('./pages/Orbit.jsx'))
const Journal = lazy(() => import('./pages/Journal.jsx'))
const Stats = lazy(() => import('./pages/Stats.jsx'))
const AICoach = lazy(() => import('./pages/AICoach.jsx'))
const Community = lazy(() => import('./pages/Community.jsx'))
const Profile = lazy(() => import('./pages/Profile.jsx'))

const requestNotificationPermission = async () => {
  if (!('Notification' in window)) return
  if (Notification.permission === 'default') {
    await Notification.requestPermission()
  }
}

const LoadingScreen = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#000', flexDirection: 'column', gap: '16px' }}>
    <Logo size={80} />
    <div style={{ width: '40px', height: '2px', background: '#00FFFF', borderRadius: '2px', animation: 'spin-slow 1s infinite' }}/>
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
  }, [])

  useEffect(() => {
    const checkDailyReset = async () => {
      if (!session?.user) return
      try {
        const wallet = await getWallet(session.user.id)
        if (!wallet) return
        const today = new Date().toDateString()
        const lastReset = new Date(wallet.last_reset_date || new Date()).toDateString()
        
        if (lastReset !== today) {
          await supabase
            .from('zyron_wallet')
            .update({
              daily_spent: 0,
              daily_earned: 0,
              last_reset_date: new Date().toISOString().split('T')[0]
            })
            .eq('user_id', session.user.id)
        }
      } catch (err) {
        console.error('Reset error:', err)
      }
    }
    checkDailyReset()
  }, [session])

  if (session === undefined) return <LoadingScreen />
  // If no session, the App logic handles routing them to LoginScreen, but just in case:
  if (!session) return null 

  return (
    <AppLayout>
      <Suspense fallback={<LoadingScreen />}>
        {children}
      </Suspense>
    </AppLayout>
  )
}

function MainApp({ handleSignOut }) {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/orbit" element={<ProtectedRoute onSignOut={handleSignOut}><Orbit /></ProtectedRoute>} />
        <Route path="/journal" element={<ProtectedRoute onSignOut={handleSignOut}><Journal /></ProtectedRoute>} />
        <Route path="/stats" element={<ProtectedRoute onSignOut={handleSignOut}><Stats /></ProtectedRoute>} />
        <Route path="/coach" element={<ProtectedRoute onSignOut={handleSignOut}><AICoach /></ProtectedRoute>} />
        <Route path="/community" element={<ProtectedRoute onSignOut={handleSignOut}><Community /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute onSignOut={handleSignOut}><Profile /></ProtectedRoute>} />
        <Route path="/" element={<Navigate to="/orbit" replace />} />
        <Route path="*" element={<Navigate to="/orbit" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default function App() {
  const [screen, setScreen] = useState('splash') // 'splash' | 'onboarding' | 'login' | 'app'
  const [isInitializing, setIsInitializing] = useState(true)

  useEffect(() => {
    const checkAuthStatus = async () => {
      const launched = localStorage.getItem('zyrbit_launched')
      const { data: { session } } = await supabase.auth.getSession()

      if (session) {
        // Already logged in
        localStorage.setItem('zyrbit_launched', 'true')
        setScreen('app')
      } else if (launched) {
        // Returning user, not logged in
        setScreen('login')
      } else {
        // First time launch
        setScreen('splash')
      }
      setIsInitializing(false)
    }
    checkAuthStatus()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        localStorage.setItem('zyrbit_launched', 'true')
        setScreen('app')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSplashComplete = () => setScreen('onboarding')
  const handleOnboardingComplete = () => {
    localStorage.setItem('zyrbit_launched', 'true') // Mark as launched here if they skip/finish onboarding
    setScreen('login')
  }
  const handleLoginSuccess = () => {
    localStorage.setItem('zyrbit_launched', 'true')
    setScreen('app')
  }
  const handleSignOut = () => {
    setScreen('login')
  }

  if (isInitializing) return <LoadingScreen />

  return (
    <div className="app-container">
      {screen !== 'splash' && <InstallBanner />}
      {screen === 'splash' && <SplashScreen onComplete={handleSplashComplete} />}
      {screen === 'onboarding' && <OnboardingScreen onComplete={handleOnboardingComplete} />}
      {screen === 'login' && <LoginScreen onSuccess={handleLoginSuccess} />}
      {screen === 'app' && <MainApp handleSignOut={handleSignOut} />}
    </div>
  )
}
