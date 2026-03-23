import React, { useState } from 'react'

const EARN_MAP = {
  habit: { color: '#4CAF50', icon: '✅', label: 'Habit Logged' },
  journal: { color: '#9C27B0', icon: '📓', label: 'Journal Entry' },
  study: { color: '#00BCD4', icon: '📚', label: 'Study Hub' },
  move: { color: '#4CAF50', icon: '🏃', label: 'Move to Earn' },
  ai_chat: { color: '#9C27B0', icon: '🤖', label: 'Zyra Chat' },
  pomodoro: { color: '#FF9800', icon: '⏱️', label: 'Pomodoro' },
  rank_bonus: { color: '#FDE047', icon: '🏆', label: 'Rank Bonus' },
  streak: { color: '#FF9800', icon: '🔥', label: 'Streak Bonus' },
  general: { color: '#38BDF8', icon: '⚡', label: 'Zyron Reward' }
}

const SPEND_MAP = {
  theme: { color: '#FF9800', icon: '🎨', label: 'Theme Purchase' },
  shield: { color: '#00FFFF', icon: '🛡️', label: 'Orbit Shield' },
  ai_session: { color: '#9C27B0', icon: '🤖', label: 'AI Session' },
  zone_icons: { color: '#4CAF50', icon: '🎯', label: 'Zone Icons' },
  analytics: { color: '#9C27B0', icon: '📊', label: 'Deep Analytics' },
  rank_boost: { color: '#FDE047', icon: '⚡', label: 'Rank Boost' },
  friend_battle: { color: '#E91E63', icon: '👥', label: 'Friend Battle' },
  rank_badge: { color: '#E91E63', icon: '🏆', label: 'Rank Badge' },
  general: { color: '#EF4444', icon: '💸', label: 'Zyrons Spent' }
}

export default function TransactionFeed({ transactions, type }) {
  const [filter, setFilter] = useState('Today')
  const isEarn = type === 'earn'
  
  // Filter the txs by the type 
  const filteredByType = transactions.filter(t => isEarn ? t.amount > 0 : t.amount < 0)

  // Filter by time
  const today = new Date().toISOString().split('T')[0]
  const lastWeek = new Date()
  lastWeek.setDate(lastWeek.getDate() - 7)
  
  const displayedTxs = filteredByType.filter(t => {
    const tDate = new Date(t.created_at).toISOString().split('T')[0]
    if (filter === 'Today') return tDate === today
    if (filter === 'This Week') return new Date(t.created_at) >= lastWeek
    return true
  }).sort((a,b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 20)

  return (
    <div style={{ marginBottom: 24, animation: 'fadeSlideUp 0.8s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-text)', letterSpacing: 1 }}>{isEarn ? 'RECENT EARNINGS' : 'RECENT SPENDING'}</h3>
        <div style={{ display: 'flex', gap: 6, background: '#111116', padding: 4, borderRadius: 8, border: '1px solid #1E1E28' }}>
          {['Today', 'This Week', 'All Time'].map(f => (
            <button
              key={f} onClick={() => setFilter(f)}
              style={{
                fontSize: 9, fontWeight: 800, textTransform: 'uppercase', borderRadius: 4, cursor: 'pointer',
                padding: '4px 8px', border: 'none', transition: 'all 0.2s',
                background: filter === f ? (isEarn ? '#4CAF5020' : '#EF444420') : 'transparent',
                color: filter === f ? (isEarn ? '#4CAF50' : '#EF4444') : 'var(--color-muted)'
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {displayedTxs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 24, fontSize: 12, color: 'var(--color-muted)', fontWeight: 600, background: '#0A0A12', borderRadius: 12, border: '1px solid #1E1E28' }}>
          No {isEarn ? 'earnings' : 'spending'} found
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {displayedTxs.map((t, i) => {
            const uiMap = isEarn ? (EARN_MAP[t.category] || EARN_MAP.general) : (SPEND_MAP[t.category] || SPEND_MAP.general)
            
            return (
              <div key={t.id} style={{
                background: '#0A0A12', padding: '10px 12px', border: '1px solid #1E1E28',
                borderLeft: `3px solid ${uiMap.color}`, borderRadius: '0 12px 12px 0',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                animation: `fadeSlideUp 0.4s ease forwards`, animationDelay: `${i * 40}ms`, opacity: 0
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ fontSize: 20 }}>{uiMap.icon}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#E8E8F0' }}>{t.reason || uiMap.label}</div>
                    <div style={{ fontSize: 10, color: 'var(--color-muted)', fontWeight: 600 }}>
                      {new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 900, color: isEarn ? '#4CAF50' : '#EF4444' }}>
                  {isEarn ? '+' : '-'}{Math.abs(t.amount)} ⚡
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
