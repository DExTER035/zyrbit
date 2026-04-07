import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function PhantomSelf({ user }) {
  const [loading, setLoading] = useState(true)
  const [history, setHistory] = useState([])
  const [recentAvg, setRecentAvg] = useState(0)
  const [hasHabits, setHasHabits] = useState(true)

  useEffect(() => {
    if (!user) return

    const fetchHistory = async () => {
      try {
        const d = new Date()
        d.setDate(d.getDate() - 30)
        const thirtyDaysAgo = d.toLocaleDateString('en-CA')

        const { data, error } = await supabase
          .from('activity_log')
          .select('completed_date, status, habit_id')
          .eq('user_id', user.id)
          .gte('completed_date', thirtyDaysAgo)

        const { data: habitsData } = await supabase.from('habits').select('id').eq('user_id', user.id)
        const totalHabits = habitsData ? habitsData.length : 0
        if (totalHabits === 0) {
          setHasHabits(false)
          setLoading(false)
          return
        }

        if (!error && data) {
          // Map last 30 days
          const dates = Array.from({ length: 30 }).map((_, i) => {
            const dateObj = new Date()
            dateObj.setDate(dateObj.getDate() - (29 - i))
            return dateObj.toLocaleDateString('en-CA')
          })

          let runningSum = 0
          const calcHistory = dates.map(dt => {
            const logsForDay = data.filter(l => l.completed_date === dt)
            const completedCount = logsForDay.filter(l => l.status === 'completed').length
            
            const pct = (completedCount / totalHabits) * 100
            
            runningSum += pct
            return { date: dt, pct }
          })
          
          setHistory(calcHistory)
          setRecentAvg(Math.round(runningSum / 30))
        }
      } catch (err) {
        console.error("Phantom Self fetch error:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchHistory()
  }, [user])

  if (loading) return <div className="skeleton" style={{ height: 180, borderRadius: 20, marginBottom: 24 }} />
  if (!hasHabits) return null

  const validDays = history.filter(h => h.pct > 0).length
  if (validDays < 7) {
    return (
      <div className="animate-fadeSlideUp" style={{ background: '#111', borderLeft: '4px solid #7F77DD', borderRadius: 20, padding: 20, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 900, color: '#7F77DD', letterSpacing: 1.5 }}>PHANTOM SELF <span style={{ background: '#7F77DD20', padding: '2px 6px', borderRadius: 6, fontSize: 8 }}>ELITE</span></div>
        </div>
        <div style={{ fontSize: 13, color: '#888', fontWeight: 600, marginBottom: 20 }}>The you that showed up every day</div>
        
        <div style={{ background: '#0a0a0a', border: '1px solid #1a1a24', borderRadius: 12, padding: '24px 16px', textAlign: 'center' }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>👻</div>
          <div style={{ fontSize: 13, color: '#FFF', fontWeight: 800, marginBottom: 4 }}>Track habits for 7 days to see your phantom</div>
          <div style={{ fontSize: 11, color: '#666', fontWeight: 600 }}>{validDays} of 7 days logged</div>
        </div>
      </div>
    )
  }

  const phantomAvg = 90
  const gap = phantomAvg - recentAvg

  return (
    <div className="animate-fadeSlideUp" style={{ background: '#111', borderLeft: '4px solid #7F77DD', borderRadius: 20, padding: 20, marginBottom: 24, position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <div style={{ fontSize: 11, fontWeight: 900, color: '#7F77DD', letterSpacing: 1.5 }}>PHANTOM SELF <span style={{ background: '#7F77DD20', padding: '2px 6px', borderRadius: 6, fontSize: 8 }}>ELITE</span></div>
      </div>
      <div style={{ fontSize: 13, color: '#888', fontWeight: 600, marginBottom: 24 }}>The you that showed up every day</div>

      {/* SVG Chart */}
      <div style={{ height: 100, position: 'relative', marginBottom: 24, borderBottom: '1px solid #1a1a24' }}>
        <svg viewBox="0 0 300 100" style={{ width: '100%', height: '100%', overflow: 'visible' }} preserveAspectRatio="none">
          {/* Phantom Background Fill */}
          <polygon 
            points={`0,100 ${history.map((h, i) => `${(i / 29) * 300},${100 - (h.pct)}`).join(' ')} 300,100`} 
            fill="#7F77DD15" 
          />
          
          {/* Phantom Line (90%) */}
          <line x1="0" y1={100 - phantomAvg} x2="300" y2={100 - phantomAvg} stroke="#7F77DD" strokeWidth="2" strokeDasharray="4 4" />
          
          {/* Real You Line */}
          <polyline 
            points={history.map((h, i) => `${(i / 29) * 300},${100 - (h.pct)}`).join(' ')} 
            fill="none" stroke="#1D9E75" strokeWidth="3" 
          />
        </svg>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: '#1D9E75' }}>YOU — {recentAvg}% avg completion this month</div>
        <div style={{ fontSize: 13, fontWeight: 800, color: '#7F77DD80' }}>PHANTOM — 90% every day</div>
      </div>

      <div style={{ fontSize: 14, fontWeight: 900, color: gap > 20 ? '#EF4444' : '#1D9E75', borderTop: '1px solid #1a1a24', paddingTop: 16 }}>
        {gap > 20 ? `You're ${gap}% behind your phantom self` : `You're almost your phantom self! 🔥`}
      </div>
    </div>
  )
}
