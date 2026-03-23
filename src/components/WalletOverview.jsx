import React, { useEffect, useState } from 'react'
import { getRankByZyrons, getNextRank } from '../lib/ranks.js'

export default function WalletOverview({ wallet, dailyStats }) {
  const [displayBalance, setDisplayBalance] = useState(0)

  useEffect(() => {
    if (!wallet) return
    let start = 0
    const end = wallet.balance || 0
    if (start === end) return
    const duration = 1200
    const startTime = performance.now()

    const animate = (time) => {
      const elapsed = time - startTime
      const progress = Math.min(elapsed / duration, 1)
      const easeOut = 1 - Math.pow(1 - progress, 3) // cubic ease out
      setDisplayBalance(Math.floor(start + (end - start) * easeOut))
      if (progress < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }, [wallet?.balance])

  if (!wallet) return null

  const currentRank = getRankByZyrons(wallet.total_earned || 0)
  const nextRank = getNextRank(currentRank.id)
  
  const progressText = nextRank ? `Progress to ${nextRank.name}` : `Max Rank Reached!`
  const progressPct = nextRank ? Math.min(100, Math.round(((wallet.total_earned - currentRank.req) / (nextRank.req - currentRank.req)) * 100)) : 100

  return (
    <div style={{
      background: '#0A0A18', border: '1px solid #2A2A3A', borderRadius: 22,
      padding: 18, animation: 'fadeSlideUp 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards',
      position: 'relative', overflow: 'hidden'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 9, fontWeight: 800, color: '#333344', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>
            ⚡ Zyron Wallet
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#00FFFF', fontFamily: 'monospace', letterSpacing: -1, textShadow: '0 0 10px rgba(0,255,255,0.3)' }}>
            {displayBalance.toLocaleString()}
          </div>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#333344', textTransform: 'uppercase' }}>Zyrons</div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: currentRank.color + '20', border: `1px solid ${currentRank.border}`,
            padding: '6px 12px', borderRadius: 100
          }}>
            <span style={{ fontSize: 16 }}>{currentRank.icon}</span>
            <span style={{ fontSize: 10, fontWeight: 800, color: currentRank.color, textTransform: 'uppercase', letterSpacing: 1 }}>{currentRank.name}</span>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontWeight: 700, color: '#555566', marginBottom: 6, textTransform: 'uppercase' }}>
          <span>{progressText}</span>
          <span>{wallet.total_earned.toLocaleString()} / {nextRank ? nextRank.req.toLocaleString() : '∞'} ⚡</span>
        </div>
        <div style={{ height: 6, background: '#1E1E28', borderRadius: 100, overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${progressPct}%`,
            background: `linear-gradient(90deg, ${currentRank.color}, ${nextRank ? nextRank.color : currentRank.color})`,
            borderRadius: 100, transition: 'width 1s cubic-bezier(0.4,0,0.2,1)'
          }} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, background: '#0D0D18', borderRadius: 12, padding: 8 }}>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: '#555566', textTransform: 'uppercase', marginBottom: 2 }}>Earned Today</div>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#4CAF50' }}>+{dailyStats?.earned || 0} ⚡</div>
        </div>
        <div style={{ flex: 1, textAlign: 'center', borderLeft: '1px solid #1E1E28', borderRight: '1px solid #1E1E28' }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: '#555566', textTransform: 'uppercase', marginBottom: 2 }}>Spent Today</div>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#EF4444' }}>-{dailyStats?.spent || 0} ⚡</div>
        </div>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: '#555566', textTransform: 'uppercase', marginBottom: 2 }}>Net Today</div>
          <div style={{ fontSize: 13, fontWeight: 800, color: (dailyStats?.net >= 0) ? '#00FFFF' : '#EF4444' }}>
            {dailyStats?.net > 0 ? '+' : ''}{dailyStats?.net || 0} ⚡
          </div>
        </div>
      </div>
    </div>
  )
}
