import React, { useEffect, useState } from 'react'
import { callGemini } from '../lib/gemini.js'

export default function WeeklySummary({ stats }) {
  const [insight, setInsight] = useState(null)
  
  useEffect(() => {
    if (!stats) return
    const getInsight = async () => {
      const cacheKey = 'zyrbit_wallet_insight'
      const cacheDate = 'zyrbit_wallet_insight_date'
      const today = new Date().toDateString()
      
      if (localStorage.getItem(cacheDate) === today && localStorage.getItem(cacheKey)) {
        setInsight(localStorage.getItem(cacheKey))
        return
      }

      const prompt = `User spent ${stats.totalSpent} and earned ${stats.totalEarned} this week. Best day: ${stats.bestDay}. Give a 1 sentence fun financial insight about their habits. E.g. "You earn mostly on weekends 🧠". Keep it under 20 words.`
      try {
        const res = await callGemini(prompt)
        setInsight(res)
        localStorage.setItem(cacheKey, res)
        localStorage.setItem(cacheDate, today)
      } catch (e) {
        setInsight('Keep pushing your limits to unlock more Zyrons! 🧠')
      }
    }
    getInsight()
  }, [stats])

  if (!stats) return null

  const maxVal = Math.max(...stats.daily.map(d => Math.max(d.earned, d.spent)), 100)

  return (
    <div style={{ background: '#0D0D18', border: '1px solid #1E1E28', borderRadius: 18, padding: 14, marginBottom: 20 }}>
      {/* Header */}
      <h3 style={{ fontSize: 14, fontWeight: 900, color: '#E8E8F0', letterSpacing: 0.5, marginBottom: 16 }}>📊 This Week</h3>
      
      {/* Chart */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: 120, marginBottom: 16, borderBottom: '1px solid #1E1E28', paddingBottom: 8 }}>
        {stats.daily.map((d, i) => {
          const hEarn = Math.max((d.earned / maxVal) * 100, 2)
          const hSpend = Math.max((d.spent / maxVal) * 100, 2)
          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 }}>
              <div style={{ display: 'flex', gap: 2, height: 100, alignItems: 'flex-end' }}>
                <div style={{ width: 6, height: `${hEarn}%`, background: '#4CAF50', borderRadius: '4px 4px 0 0', animation: `growUp 1s ease forwards`, animationDelay: `${i * 80}ms`, transformOrigin: 'bottom', transform: 'scaleY(0)' }} />
                <div style={{ width: 6, height: `${hSpend}%`, background: '#EF4444', borderRadius: '4px 4px 0 0', animation: `growUp 1s ease forwards`, animationDelay: `${i * 80}ms`, transformOrigin: 'bottom', transform: 'scaleY(0)' }} />
              </div>
              <div style={{ fontSize: 9, color: 'var(--color-muted)', fontWeight: 800 }}>{d.label[0]}</div>
            </div>
          )
        })}
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
        <div style={{ background: '#111116', padding: 8, borderRadius: 12, border: '1px solid #1E1E28' }}>
          <div style={{ fontSize: 9, color: 'var(--color-muted)', fontWeight: 800, textTransform: 'uppercase', marginBottom: 2 }}>Total Earned</div>
          <div style={{ fontSize: 13, color: '#4CAF50', fontWeight: 900 }}>+{stats.totalEarned} ⚡</div>
        </div>
        <div style={{ background: '#111116', padding: 8, borderRadius: 12, border: '1px solid #1E1E28' }}>
          <div style={{ fontSize: 9, color: 'var(--color-muted)', fontWeight: 800, textTransform: 'uppercase', marginBottom: 2 }}>Total Spent</div>
          <div style={{ fontSize: 13, color: '#EF4444', fontWeight: 900 }}>-{stats.totalSpent} ⚡</div>
        </div>
        <div style={{ background: '#111116', padding: 8, borderRadius: 12, border: '1px solid #1E1E28' }}>
          <div style={{ fontSize: 9, color: 'var(--color-muted)', fontWeight: 800, textTransform: 'uppercase', marginBottom: 2 }}>Net Saved</div>
          <div style={{ fontSize: 13, color: stats.net >= 0 ? '#00FFFF' : '#EF4444', fontWeight: 900 }}>{stats.net > 0 ? '+' : ''}{stats.net} ⚡</div>
        </div>
        <div style={{ background: '#111116', padding: 8, borderRadius: 12, border: '1px solid #1E1E28' }}>
          <div style={{ fontSize: 9, color: 'var(--color-muted)', fontWeight: 800, textTransform: 'uppercase', marginBottom: 2 }}>Best Day</div>
          <div style={{ fontSize: 11, color: '#FDE047', fontWeight: 900, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{stats.bestDay}</div>
        </div>
      </div>

      {/* Zyra Insight */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', background: '#111116', padding: 12, borderRadius: 12, border: '1px solid currentColor', color: '#9C27B0' }}>
        <div style={{ fontSize: 24 }}>🧠</div>
        <div style={{ fontSize: 12, color: '#E8E8F0', fontWeight: 600, lineHeight: 1.5, fontStyle: 'italic' }}>
          "{insight || 'Analyzing your cosmic trends...'}"
        </div>
      </div>
    </div>
  )
}
