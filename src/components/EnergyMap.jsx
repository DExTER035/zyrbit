import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

function EliteBadge() {
  return (
    <span style={{
      background: 'linear-gradient(135deg, #7F77DD30, #7F77DD15)',
      border: '1px solid #7F77DD40',
      color: '#7F77DD',
      fontSize: 8,
      fontWeight: 900,
      padding: '2px 7px',
      borderRadius: 6,
      letterSpacing: 1,
      marginLeft: 6,
    }}>ELITE</span>
  )
}

export default function EnergyMap({ user }) {
  const [loading, setLoading] = useState(true)
  const [sessions, setSessions] = useState([])
  const [visible, setVisible] = useState(false)
  const cardRef = useRef(null)

  // Intersection observer for entrance animation
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true) }, { threshold: 0.15 })
    if (cardRef.current) obs.observe(cardRef.current)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    if (!user) return
    const fetchSessions = async () => {
      try {
        const { data, error } = await supabase
          .from('study_sessions')
          .select('start_time, duration_minutes, session_date, created_at')
          .eq('user_id', user.id)
        if (!error && data) setSessions(data)
      } catch (err) {
        console.error('EnergyMap fetch error', err)
      } finally {
        setLoading(false)
      }
    }
    fetchSessions()
  }, [user])

  if (loading) {
    return <div className="skeleton" style={{ height: 180, borderRadius: 20, marginBottom: 32 }} />
  }

  const hourMap = Array(24).fill(0).map((_, i) => ({ hour: i, totalDuration: 0, count: 0, avg: 0 }))
  sessions.forEach(s => {
    const d = new Date(s.start_time || s.created_at || s.session_date || new Date().toISOString())
    const hr = isNaN(d.getHours()) ? 0 : d.getHours()
    hourMap[hr].totalDuration += (s.duration_minutes || 0)
    hourMap[hr].count += 1
  })
  hourMap.forEach(h => { h.avg = h.count > 0 ? h.totalDuration / h.count : 0 })

  const totalSessions = sessions.length
  const maxAvg = Math.max(...hourMap.map(h => h.avg)) || 1

  const sortedAvg = [...hourMap].sort((a, b) => b.avg - a.avg)
  const peakHoursList = sortedAvg.slice(0, 3).map(h => h.hour)
  const deadHoursList = sortedAvg.slice(-3).map(h => h.hour)
  const absolutePeakHour = sortedAvg[0].hour
  const absoluteDeadHour = sortedAvg[sortedAvg.length - 1].hour
  const currentHour = new Date().getHours()

  const formatHour = h => {
    const ampm = h >= 12 ? 'PM' : 'AM'
    const hr = h % 12 || 12
    return `${hr}${ampm}`
  }

  // Empty state
  if (totalSessions < 5) {
    return (
      <div
        ref={cardRef}
        className={`card-elite animate-eliteGlow${visible ? ' animate-fadeSlideUp' : ''}`}
        style={{ padding: 20, marginBottom: 32, opacity: visible ? 1 : 0 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div style={{ fontSize: 11, fontWeight: 900, color: '#7F77DD', letterSpacing: 1.5 }}>ENERGY MAP<EliteBadge /></div>
        </div>
        <div style={{ fontSize: 12, color: '#555566', marginBottom: 20 }}>Your peak hours — from your actual data</div>
        <div style={{ background: '#0a0a0a', border: '1px solid #1a1a24', borderRadius: 14, padding: '28px 16px', textAlign: 'center' }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>🔋</div>
          <div style={{ fontSize: 13, color: '#FFF', fontWeight: 800, marginBottom: 6 }}>Log 5+ study sessions to unlock your energy map</div>
          <div style={{ fontSize: 11, color: '#555566', fontWeight: 700, marginBottom: 12 }}>{totalSessions} of 5 sessions logged</div>
          <div style={{ height: 3, background: '#1a1a24', borderRadius: 100, width: '70%', margin: '0 auto' }}>
            <div style={{ width: `${Math.min((totalSessions / 5) * 100, 100)}%`, height: '100%', background: 'linear-gradient(90deg,#7F77DD,#9FA0FF)', borderRadius: 100, transition: 'width 1s ease' }} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={cardRef}
      className={`card-elite animate-eliteGlow${visible ? ' animate-fadeSlideUp' : ''}`}
      style={{ padding: 20, marginBottom: 32, opacity: visible ? 1 : 0 }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <div style={{ fontSize: 11, fontWeight: 900, color: '#7F77DD', letterSpacing: 1.5 }}>ENERGY MAP<EliteBadge /></div>
        <div style={{ fontSize: 9, color: '#555566', fontWeight: 700 }}>{totalSessions} SESSIONS</div>
      </div>
      <div style={{ fontSize: 12, color: '#555566', marginBottom: 20 }}>Your peak hours — from your actual data</div>

      {/* Bar Chart */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 64, marginBottom: 24 }}>
        {hourMap.map((data, idx) => {
          const isPeak = peakHoursList.includes(data.hour)
          const isDead = deadHoursList.includes(data.hour)
          const isCurrent = data.hour === currentHour
          let barBg = '#2a2a3a'
          if (isPeak) barBg = data.hour === absolutePeakHour ? '#7F77DD' : '#7F77DD70'
          if (isDead) barBg = '#1a1a1a'
          const heightPct = Math.max((data.avg / maxAvg) * 100, 4)
          return (
            <div
              key={data.hour}
              data-tooltip={`${formatHour(data.hour)} — ${Math.round(data.avg)}min avg`}
              className="animate-barGrow"
              style={{
                flex: 1,
                height: `${heightPct}%`,
                background: barBg,
                borderRadius: '3px 3px 0 0',
                border: isCurrent ? '1px solid #1D9E75' : 'none',
                boxSizing: 'border-box',
                animationDelay: `${idx * 20}ms`,
                transition: 'background 0.3s',
              }}
            />
          )
        })}
      </div>

      {/* Hour Labels (simplified) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
        {['12A', '6A', '12P', '6P', '11P'].map(l => (
          <div key={l} style={{ fontSize: 8, color: '#333344', fontWeight: 700 }}>{l}</div>
        ))}
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} className="stagger-children">
        <div className="animate-fadeUp" style={{ background: '#7F77DD12', border: '1px solid #7F77DD25', borderRadius: 12, padding: 12 }}>
          <div style={{ fontSize: 9, color: '#7F77DD', fontWeight: 900, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 4 }}>Peak Window</div>
          <div style={{ fontSize: 15, color: '#fff', fontWeight: 900 }}>{formatHour(absolutePeakHour)} – {formatHour((absolutePeakHour + 2) % 24)}</div>
        </div>
        <div className="animate-fadeUp" style={{ background: '#EF444412', border: '1px solid #EF444425', borderRadius: 12, padding: 12 }}>
          <div style={{ fontSize: 9, color: '#EF4444', fontWeight: 900, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 4 }}>Dead Zone</div>
          <div style={{ fontSize: 15, color: '#EF4444', fontWeight: 900 }}>{formatHour(absoluteDeadHour)} – {formatHour((absoluteDeadHour + 2) % 24)}</div>
        </div>
      </div>

      <div style={{ fontSize: 10, color: '#333344', fontWeight: 700, borderTop: '1px solid #1a1a24', paddingTop: 12, marginTop: 12 }}>
        📊 Based on {totalSessions} study sessions
      </div>
    </div>
  )
}
