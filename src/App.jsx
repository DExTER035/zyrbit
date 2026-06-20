import React, { useEffect, useState, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import SplashScreen from './screens/SplashScreen.jsx'
import OnboardingScreen from './screens/OnboardingScreen.jsx'
import LoginScreen from './screens/LoginScreen.jsx'
import WelcomeAnimation from './screens/WelcomeAnimation.jsx'
import supabase from './lib/supabase.js'
import { ensureProfile } from './lib/friendTag.js'
import AppLayout from './components/AppLayout.jsx'
import Logo from './components/Logo.jsx'
import InstallBanner from './components/InstallBanner.jsx'
import GoalSetupScreen from './screens/GoalSetupScreen.jsx'
import { BlackoutProvider } from './lib/BlackoutContext.jsx'
import { SubscriptionProvider } from './context/SubscriptionContext.jsx'
import PaywallOverlay from './components/PaywallOverlay.jsx'

const Zenith = lazy(() => import('./pages/Zenith.jsx'))
const Growth = lazy(() => import('./pages/Growth.jsx'))
const Health = lazy(() => import('./pages/Health.jsx'))
const Wealth = lazy(() => import('./pages/Wealth.jsx'))
const Jarvis = lazy(() => import('./pages/Jarvis.jsx'))
const Profile = lazy(() => import('./pages/Profile.jsx'))
const Challenge = lazy(() => import('./pages/Challenge.jsx'))

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
    <BlackoutProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/zenith" element={<ProtectedRoute onSignOut={handleSignOut}><Zenith /></ProtectedRoute>} />
        <Route path="/growth" element={<ProtectedRoute onSignOut={handleSignOut}><Growth /></ProtectedRoute>} />
        <Route path="/health" element={<ProtectedRoute onSignOut={handleSignOut}><Health /></ProtectedRoute>} />
        <Route path="/wealth" element={<ProtectedRoute onSignOut={handleSignOut}><Wealth /></ProtectedRoute>} />
        <Route path="/jarvis" element={<ProtectedRoute onSignOut={handleSignOut}><Jarvis /></ProtectedRoute>} />
        <Route path="/challenge" element={<ProtectedRoute onSignOut={handleSignOut}><Challenge /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute onSignOut={handleSignOut}><Profile /></ProtectedRoute>} />
        <Route path="/" element={<Navigate to="/zenith" replace />} />
        <Route path="*" element={<Navigate to="/zenith" replace />} />
      </Routes>
    </BrowserRouter>
    </BlackoutProvider>
  )
}

export default function App() {
  const [screen, setScreen] = useState('splash') // 'splash' | 'onboarding' | 'login' | 'welcome' | 'goal-setup' | 'app'
  const [isInitializing, setIsInitializing] = useState(true)
  const [currentUserId, setCurrentUserId] = useState(null)
  const [currentUserName, setCurrentUserName] = useState('Astronaut')

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
      } else if (launched) {
        setScreen('login')
      } else {
        setScreen('splash')
      }
      setIsInitializing(false)
    }
    checkAuthStatus()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        localStorage.setItem('zyrbit_launched', 'true')
        setCurrentUserId(session.user.id)
        setScreen('app')
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
    setCurrentUserName(userName || 'Astronaut')
    setScreen('app')
  }
  const handleSignOut = () => {
    setScreen('login')
  }

  if (isInitializing) return <LoadingScreen />

  return (
    <SubscriptionProvider>
      <div className="app-container">
        {screen !== 'splash' && screen !== 'welcome' && <InstallBanner />}
        {screen === 'splash' && <SplashScreen onGetStarted={() => setScreen('onboarding')} onLogin={() => setScreen('login')} />}
        {screen === 'onboarding' && <OnboardingScreen onComplete={handleOnboardingComplete} />}
        {screen === 'login' && <LoginScreen onSuccess={handleLoginSuccess} />}
        {screen === 'welcome' && <WelcomeAnimation userName={currentUserName} onComplete={() => setScreen('goal-setup')} />}
        {screen === 'goal-setup' && <GoalSetupScreen userId={currentUserId} onComplete={() => setScreen('app')} />}
        {screen === 'app' && <MainApp handleSignOut={handleSignOut} />}
        <PaywallOverlay />
      </div>
    </SubscriptionProvider>
  )
}
