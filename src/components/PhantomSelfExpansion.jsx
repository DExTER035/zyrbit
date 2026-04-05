import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

export default function PhantomSelfExpansion({ user, habits }) {
  const [data, setData] = useState([])

  useEffect(() => {
    if (!user || !habits || habits.length === 0) return
    loadData()
  }, [user, habits])

  const loadData = async () => {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toLocaleDateString('en-CA')
    const { data: logs } = await supabase.from('activity_log')
      .select('completed_date, status')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .gte('completed_date', ninetyDaysAgo)

    if (!logs) return

    const days = 90
    const chartData = []
    let cumulativeActual = 0
    let cumulativePhantom = 0

    const idealDailyCount = habits.length * 0.9 // Phantom hits 90% of habits every day

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000)
      const dateStr = d.toLocaleDateString('en-CA')
      
      const doneToday = logs.filter(l => l.completed_date === dateStr).length
      
      cumulativeActual += doneToday
      cumulativePhantom += idealDailyCount

      chartData.push({
        date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        Actual: cumulativeActual,
        Phantom: Math.round(cumulativePhantom)
      })
    }

    setData(chartData)
  }

  if (data.length === 0) return null

  // Calculate the gap at day 90
  const finalActual = data[data.length - 1]?.Actual || 0
  const finalPhantom = data[data.length - 1]?.Phantom || 0
  const gap = finalPhantom - finalActual
  const isWinning = finalActual >= finalPhantom

  return (
    <div className="card-elite animate-eliteGlow" style={{ padding: 20, marginBottom: 20, borderTop: `1px solid ${isWinning ? '#4CAF50' : '#7F77DD'}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
         <div style={{ fontSize: 11, fontWeight: 900, color: '#7F77DD', letterSpacing: 2, textTransform: 'uppercase' }}>
            PHANTOM SELF (90 DAY) <span style={{ background: '#7F77DD20', border: '1px solid #7F77DD40', color: '#7F77DD', fontSize: 8, padding: '2px 7px', borderRadius: 6, marginLeft: 6 }}>ELITE</span>
         </div>
      </div>
      
      <div style={{ fontSize: 13, color: '#888', marginBottom: 4, lineHeight: 1.5 }}>
        Cumulative actions over 90 days vs your ideal self (90% consistency).
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 24 }}>
        <div style={{ fontSize: 28, fontWeight: 900, color: isWinning ? '#4CAF50' : '#EF4444', letterSpacing: -1 }}>
           {isWinning ? `+${Math.abs(gap)}` : `-${Math.abs(gap)}`}
        </div>
        <div style={{ fontSize: 12, color: '#666', fontWeight: 800 }}>actions {isWinning ? 'ahead' : 'behind'} ghost</div>
      </div>

      <div style={{ height: 180, marginLeft: -20, marginRight: -10 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorPhantom" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#7F77DD" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#7F77DD" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00FFFF" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#00FFFF" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="date" hide />
            <YAxis hide domain={['dataMin', 'dataMax']} />
            <Tooltip 
               contentStyle={{ background: '#111118', border: '1px solid #1E1E28', borderRadius: 8, fontSize: 11, color: '#E8E8F0' }}
               itemStyle={{ fontWeight: 800 }}
               labelStyle={{ display: 'none' }}
            />
            <Area type="monotone" dataKey="Phantom" stroke="#7F77DD" strokeWidth={2} strokeDasharray="5 5" fillOpacity={1} fill="url(#colorPhantom)" />
            <Area type="monotone" dataKey="Actual" stroke={isWinning ? '#4CAF50' : '#00FFFF'} strokeWidth={3} fillOpacity={1} fill="url(#colorActual)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: 'flex', gap: 16, marginTop: 16, justifyContent: 'center' }}>
         <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: '#666', fontWeight: 800 }}>
            <div style={{ width: 10, height: 4, background: '#7F77DD', borderRadius: 2 }} /> 90% Ghost
         </div>
         <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: '#666', fontWeight: 800 }}>
            <div style={{ width: 10, height: 4, background: isWinning ? '#4CAF50' : '#00FFFF', borderRadius: 2 }} /> You
         </div>
      </div>
    </div>
  )
}
