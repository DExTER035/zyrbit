import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import BottomNav from '../components/BottomNav'

// Import Tab Components
import JournalTabDiary from '../components/JournalTabDiary'
import JournalTabStudy from '../components/JournalTabStudy'
import JournalTabMove from '../components/JournalTabMove'
import JournalTabMoney from '../components/JournalTabMoney'

export default function Journal() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [activeMainTab, setActiveMainTab] = useState('Diary')

  useEffect(() => {
    let authListener
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/login')
      } else {
        setUser(session.user)
      }
    })
    
    authListener = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) navigate('/login')
      else setUser(session.user)
    })

    return () => authListener?.subscription?.unsubscribe()
  }, [])

  if (!user) return null

  const renderActiveTab = () => {
    switch (activeMainTab) {
      case 'Diary': return <JournalTabDiary user={user} navigate={navigate} />
      case 'Study': return <JournalTabStudy user={user} />
      case 'Move': return <JournalTabMove user={user} />
      case 'Money': return <JournalTabMoney user={user} />
      default: return null
    }
  }

  const tabIcons = { Diary: '📖', Study: '📚', Move: '🏃', Money: '💰' }

  return (
    <div style={{ background: '#000', minHeight: '100vh', color: '#FFF' }}>
      
      {/* HEADER */}
      <div style={{ padding: '32px 20px 0' }}>
        <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: -1, marginBottom: 4 }}>Journal</h1>
        <p style={{ fontSize: 13, color: '#444', fontWeight: 600, marginBottom: 24 }}>System logs and records</p>
        
        {/* TABS */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', paddingBottom: 24 }}>
          {['Diary', 'Study', 'Move', 'Money'].map(t => {
            const isActive = activeMainTab === t
            return (
              <button key={t} onClick={() => setActiveMainTab(t)}
                style={{
                  flex: '1 1 calc(50% - 8px)', padding: '10px 12px', borderRadius: 100, cursor: 'pointer',
                  border: isActive ? '1px solid #FFF' : '1px solid #1A1A24',
                  background: isActive ? '#FFF' : '#0A0A12',
                  color: isActive ? '#000' : '#444',
                  fontWeight: 900, fontSize: 12, transition: 'all 0.2s', whiteSpace: 'nowrap',
                  display: 'flex', alignItems: 'center', gap: 6
                }}>
                <span>{tabIcons[t]}</span>
                {t}
              </button>
            )
          })}
        </div>
      </div>

      {/* ACTIVE CONTENT */}
      <div>
        {renderActiveTab()}
      </div>

      {/* BOTTOM NAV */}
      <BottomNav activeTab="journal" onTabChange={(t) => navigate(t === 'orbit' ? '/orbit' : `/${t}`)} />

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @keyframes skeletonPulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
      `}</style>
    </div>
  )
}
