import React from 'react'
import { getRankByZyrons } from '../lib/ranks.js'

export default function LifetimeStats({ wallet }) {
  if (!wallet) return null

  const currentRank = getRankByZyrons(wallet.total_earned || 0)
  
  // Calculate days active roughly
  const createdDate = new Date(wallet.created_at || new Date())
  const today = new Date()
  const daysActive = Math.max(1, Math.ceil((today - createdDate) / (1000 * 60 * 60 * 24)))

  return (
    <div style={{ background: '#0A0818', border: '1px solid #2A1A3A', borderRadius: 18, padding: 14, marginBottom: 20 }}>
      {/* Header */}
      <h3 style={{ fontSize: 14, fontWeight: 900, color: '#E8E8F0', letterSpacing: 0.5, marginBottom: 16 }}>🌌 Lifetime Orbit</h3>
      
      {/* 2x3 Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div style={{ background: '#110D20', padding: 12, borderRadius: 12, border: '1px solid #2A1A3A', textAlign: 'center' }}>
          <div style={{ fontSize: 16, color: '#4CAF50', fontWeight: 900, marginBottom: 4 }}>{wallet.lifetime_earned?.toLocaleString() || 0}</div>
          <div style={{ fontSize: 9, color: 'var(--color-muted)', fontWeight: 800, textTransform: 'uppercase' }}>Total Earned</div>
        </div>
        <div style={{ background: '#110D20', padding: 12, borderRadius: 12, border: '1px solid #2A1A3A', textAlign: 'center' }}>
          <div style={{ fontSize: 16, color: '#EF4444', fontWeight: 900, marginBottom: 4 }}>{wallet.total_spent?.toLocaleString() || 0}</div>
          <div style={{ fontSize: 9, color: 'var(--color-muted)', fontWeight: 800, textTransform: 'uppercase' }}>Total Spent</div>
        </div>
        
        <div style={{ background: '#110D20', padding: 12, borderRadius: 12, border: '1px solid #2A1A3A', textAlign: 'center' }}>
          <div style={{ fontSize: 16, color: currentRank.color, fontWeight: 900, marginBottom: 4 }}>{currentRank.id}/10</div>
          <div style={{ fontSize: 9, color: 'var(--color-muted)', fontWeight: 800, textTransform: 'uppercase' }}>Rank Progress</div>
        </div>
        <div style={{ background: '#110D20', padding: 12, borderRadius: 12, border: '1px solid #2A1A3A', textAlign: 'center' }}>
          <div style={{ fontSize: 16, color: '#00FFFF', fontWeight: 900, marginBottom: 4 }}>{daysActive}</div>
          <div style={{ fontSize: 9, color: 'var(--color-muted)', fontWeight: 800, textTransform: 'uppercase' }}>Days Active</div>
        </div>
      </div>
    </div>
  )
}
