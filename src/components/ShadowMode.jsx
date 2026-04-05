import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// Helper to get week boundaries
const getWeekRange = (date) => {
  const d = new Date(date)
  const day = d.getDay() || 7 // Mon = 1, Sun = 7
  d.setHours(-24 * (day - 1))
  const start = new Date(d)
  start.setHours(0,0,0,0)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  end.setHours(23,59,59,999)
  return { start, end }
}

export default function ShadowMode({ user }) {
  const [data, setData] = useState(null)
  
  useEffect(() => {
    if (!user) return
    loadData()
  }, [user])

  const loadData = async () => {
    const today = new Date()
    // Fetch last 12 weeks of activity log
    const cutoff = new Date(today.getTime() - 12 * 7 * 86400000).toLocaleDateString('en-CA')
    const { data: logs } = await supabase.from('activity_log').select('completed_date, status').eq('user_id', user.id).eq('status', 'completed').gte('completed_date', cutoff)
    
    if (!logs || logs.length === 0) return

    // Group by week
    const weeks = {}
    logs.forEach(l => {
      const { start } = getWeekRange(l.completed_date)
      const weekKey = start.toLocaleDateString('en-CA')
      if (!weeks[weekKey]) weeks[weekKey] = 0
      weeks[weekKey]++
    })

    const { start: currentStart } = getWeekRange(today)
    const currentWeekKey = currentStart.toLocaleDateString('en-CA')
    
    let worstCount = Infinity
    let currentCount = weeks[currentWeekKey] || 0

    // Find worst full week (exclude current week)
    Object.keys(weeks).forEach(k => {
      if (k !== currentWeekKey && weeks[k] < worstCount) {
        worstCount = weeks[k]
      }
    })

    if (worstCount === Infinity) worstCount = 0 // No past data

    setData({ currentCount, worstCount })
  }

  if (!data || (data.currentCount === 0 && data.worstCount === 0)) return null

  const isLosing = data.currentCount < data.worstCount

  return (
    <div className="card-elite" style={{ padding: 18, marginBottom: 24, borderLeft: `3px solid ${isLosing ? '#EF4444' : '#7F77DD'}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
         <div style={{ fontSize: 10, fontWeight: 900, color: '#7F77DD', letterSpacing: 2, textTransform: 'uppercase' }}>
            SHADOW MODE
         </div>
      </div>
      
      <div style={{ fontSize: 13, color: '#888', marginBottom: 12 }}>
        How you're performing this week compared to your absolute worst week over the last 90 days.
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', marginTop: 16 }}>
         <div style={{ flex: 1 }}>
           <div style={{ fontSize: 9, color: '#444', textTransform: 'uppercase', fontWeight: 800, marginBottom: 6 }}>This Week</div>
           <div style={{ fontSize: 24, fontWeight: 900, color: isLosing ? '#EF4444' : '#E8E8F0', letterSpacing: -1 }}>{data.currentCount} <span style={{fontSize: 10, color: '#444'}}>done</span></div>
         </div>
         <div style={{ fontSize: 14, color: '#333344', fontWeight: 900, paddingBottom: 6 }}>VS</div>
         <div style={{ flex: 1, textAlign: 'right' }}>
           <div style={{ fontSize: 9, color: '#444', textTransform: 'uppercase', fontWeight: 800, marginBottom: 6 }}>Your Shadow (Worst)</div>
           <div style={{ fontSize: 24, fontWeight: 900, color: '#555566', letterSpacing: -1 }}>{data.worstCount} <span style={{fontSize: 10, color: '#333344'}}>done</span></div>
         </div>
      </div>

      <div style={{ marginTop: 14, fontSize: 12, fontWeight: 800, color: isLosing ? '#EF4444' : '#7F77DD' }}>
        {isLosing 
          ? "⚠️ You are currently losing to your worst self." 
          : "✅ You are outrunning your shadow."}
      </div>
    </div>
  )
}
