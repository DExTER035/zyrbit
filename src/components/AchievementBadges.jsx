import React from 'react'

const BADGES = [
  { id: 'first1k', icon: '💰', title: 'First 1000 Zyrons' },
  { id: 'streak7', icon: '🔥', title: '7-day Streak' },
  { id: 'firstMove', icon: '🏃', title: 'First Move Log' },
  { id: 'firstAi', icon: '🧠', title: 'First Zyra Chat' },
  { id: 'rankS', icon: '🏆', title: 'Reached Rank S' },
  { id: 'rankOmega', icon: '🌌', title: 'Reached Rank Ω' },
]

export default function AchievementBadges({ wallet, txs = [] }) {
  if (!wallet) return null

  const hasMove = txs.some(t => t.category === 'move')
  const hasAi = txs.some(t => t.category === 'ai_chat')
  const hasStreak = txs.some(t => t.category === 'streak')

  return (
    <div style={{ background: '#0A0818', border: '1px solid #2A1A3A', borderRadius: 18, padding: 14, marginBottom: 20 }}>
      <h3 style={{ fontSize: 14, fontWeight: 900, color: '#E8E8F0', letterSpacing: 0.5, marginBottom: 16 }}>🎖️ Milestones</h3>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        {BADGES.map(b => {
          let unlocked = false
          if (b.id === 'first1k') unlocked = wallet.lifetime_earned >= 1000 || wallet.total_earned >= 1000
          if (b.id === 'rankS') unlocked = wallet.total_earned >= 9500
          if (b.id === 'rankOmega') unlocked = wallet.total_earned >= 100000
          if (b.id === 'firstMove') unlocked = hasMove
          if (b.id === 'firstAi') unlocked = hasAi
          if (b.id === 'streak7') unlocked = hasStreak

          return (
            <div key={b.id} style={{
              background: unlocked ? '#110D20' : '#050308',
              border: `1px solid ${unlocked ? '#FDE04740' : '#2A1A3A'}`,
              borderRadius: 12, padding: 8, textAlign: 'center',
              opacity: unlocked ? 1 : 0.4,
              filter: unlocked ? 'drop-shadow(0 0 10px rgba(253, 224, 71, 0.2))' : 'grayscale(1)'
            }}>
              <div style={{ fontSize: 24, marginBottom: 4 }}>{unlocked ? b.icon : '🔒'}</div>
              <div style={{ fontSize: 9, color: unlocked ? '#FDE047' : 'var(--color-muted)', fontWeight: 800, lineHeight: 1.2 }}>{b.title}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
