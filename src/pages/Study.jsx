import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import BottomNav from '../components/BottomNav'

// Import Study Components
import JournalTabStudy from '../components/JournalTabStudy'

export default function Study() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)

  useEffect(() => {
    let authListener
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate('/login')
      else setUser(session.user)
    })
    
    authListener = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) navigate('/login')
      else setUser(session.user)
    })

    return () => authListener?.subscription?.unsubscribe()
  }, [])

  if (!user) return null

  return (
    <div style={{ background: '#000', minHeight: '100vh', color: '#FFF' }}>
      
      {/* HEADER */}
      <div style={{ padding: '32px 20px 0' }}>
        <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: -1, marginBottom: 4 }}>Deep Study</h1>
        <p style={{ fontSize: 13, color: '#444', fontWeight: 600, marginBottom: 24 }}>Session tracker and Blackout Mode</p>
      </div>

      {/* ACTIVE CONTENT */}
      <div>
        <JournalTabStudy user={user} />
      </div>

      {/* BOTTOM NAV */}
      <BottomNav activeTab="study" onTabChange={(t) => navigate(t === 'orbit' ? '/orbit' : `/${t}`)} />

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @keyframes skeletonPulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
      `}</style>
    </div>
  )
}
