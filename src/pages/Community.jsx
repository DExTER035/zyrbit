import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../components/BottomNav.jsx'
import { supabase } from '../lib/supabase.js'
import FriendsTab from '../components/community/FriendsTab.jsx'
import ChallengesTab from '../components/community/ChallengesTab.jsx'
import LeaderboardTab from '../components/community/LeaderboardTab.jsx'
import OrbitsTab from '../components/community/OrbitsTab.jsx'

const INNER_TABS = [
  { id: 'leaderboard', label: '🏆 Leaderboard' },
  { id: 'friends',     label: '👥 Friends' },
  { id: 'orbits',      label: '🌌 Orbits' },
  { id: 'challenges',  label: '⚔️ Challenges' },
]

export default function Community() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [activeTab, setActiveTab] = useState('friends')
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        loadProfile(session.user.id)
      }
    })
    // Realtime cleanup on unmount
    return () => { supabase.removeAllChannels() }
  }, [])

  const loadProfile = async (uid) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).single()
    setProfile(data)
  }

  if (!user) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#000' }}>
      <div style={{ width: 32, height: 32, border: '3px solid #00FFFF', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin-slow 0.7s linear infinite' }} />
    </div>
  )

  return (
    <div style={{ background: '#000000', minHeight: '100vh', fontFamily: '"Inter", sans-serif', overflowX: 'hidden' }}>
      <style>{`@keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.4 } }`}</style>

      {/* HEADER */}
      <div style={{ padding: '24px 16px 0', background: '#000' }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: '#FFF', letterSpacing: -0.8, marginBottom: 4 }}>Community</h1>
        <p style={{ fontSize: 11, color: '#444', marginBottom: 0 }}>Connect · Compete · Rise together 🌌</p>
      </div>

      {/* INNER TAB BAR */}
      <div style={{ padding: '0 20px 12px', overflowX: 'auto', display: 'flex', gap: '10px', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch', position: 'sticky', top: 0, background: '#000', zIndex: 40, borderBottom: '1px solid #0A0A12', paddingBottom: 16 }}>
        {INNER_TABS.map(tab => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flexShrink: 0,
                padding: '10px 20px',
                borderRadius: 100,
                border: isActive ? '1px solid #FFF' : '1px solid #1A1A24',
                background: isActive ? '#FFF' : '#0A0A12',
                color: isActive ? '#000' : '#444',
                fontWeight: 800,
                fontSize: 12,
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
                whiteSpace: 'nowrap',
                letterSpacing: '-0.3px',
                boxShadow: isActive ? '0 4px 12px rgba(255,255,255,0.1)' : 'none'
              }}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* TAB CONTENT */}
      <div style={{ paddingTop: 16 }}>
        {activeTab === 'friends' && <FriendsTab user={user} profile={profile} />}
        {activeTab === 'challenges' && <ChallengesTab user={user} profile={profile} />}
        {activeTab === 'leaderboard' && <LeaderboardTab user={user} profile={profile} />}
        {activeTab === 'orbits' && <OrbitsTab user={user} profile={profile} />}
      </div>

      <BottomNav activeTab="community" onTabChange={(t) => navigate(`/${t}`)} />
    </div>
  )
}
