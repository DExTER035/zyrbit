import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { showToast } from './Toast.jsx'

export default function AdminAnalytics() {
  const [loading, setLoading] = useState(true)
  const [feedbackList, setFeedbackList] = useState([])
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers24h: 0,
    activeUsers7d: 0,
    eventFrequency: {},
    avgHabits: 0,
    feedbackCount: { bug: 0, feature: 0, general: 0 }
  })

  const loadAdminData = async () => {
    setLoading(true)
    try {
      // 1. Fetch Feedback
      const { data: feedbackData, error: fbError } = await supabase
        .from('beta_feedback')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (fbError) throw fbError
      setFeedbackList(feedbackData || [])

      // 2. Fetch Profiles for user count
      const { data: profiles, error: pError } = await supabase
        .from('profiles')
        .select('id')
      if (pError) throw pError
      const totalUsersCount = profiles?.length || 0

      // 3. Fetch analytics events (limit to last 2000 for client calculation)
      const { data: events, error: eError } = await supabase
        .from('analytics_events')
        .select('user_id, event_name, created_at')
        .order('created_at', { ascending: false })
        .limit(2000)
      if (eError) throw eError

      // Calculate distinct users and event frequencies
      const now = new Date()
      const oneDayMs = 24 * 60 * 60 * 1000
      const sevenDaysMs = 7 * oneDayMs

      const active24hSet = new Set()
      const active7dSet = new Set()
      const freq = {}

      if (events) {
        events.forEach(e => {
          const t = new Date(e.created_at)
          const diff = now - t
          if (diff <= oneDayMs) active24hSet.add(e.user_id)
          if (diff <= sevenDaysMs) active7dSet.add(e.user_id)
          freq[e.event_name] = (freq[e.event_name] || 0) + 1
        })
      }

      // 4. Fetch activity log to compute average habits logged
      const { data: activityLogs, error: aError } = await supabase
        .from('activity_log')
        .select('user_id')
        .eq('status', 'completed')
      if (aError) throw aError

      let avgHabitsCompleted = 0
      if (activityLogs && totalUsersCount > 0) {
        avgHabitsCompleted = Number((activityLogs.length / totalUsersCount).toFixed(1))
      }

      // Group feedback by category
      const fbCount = { bug: 0, feature: 0, general: 0 }
      if (feedbackData) {
        feedbackData.forEach(f => {
          if (fbCount[f.category] !== undefined) {
            fbCount[f.category]++
          }
        })
      }

      setStats({
        totalUsers: totalUsersCount,
        activeUsers24h: active24hSet.size,
        activeUsers7d: active7dSet.size,
        eventFrequency: freq,
        avgHabits: avgHabitsCompleted,
        feedbackCount: fbCount
      })

    } catch (err) {
      console.error('[Admin] Error fetching analytics data:', err)
      showToast('❌ Failed to load admin metrics', 'error')
    } finally {
      setLoading(false)
    }
  }

  const updateFeedbackStatus = async (id, currentStatus) => {
    const nextStatus = currentStatus === 'open' ? 'triaged' : currentStatus === 'triaged' ? 'resolved' : 'open'
    try {
      const { error } = await supabase
        .from('beta_feedback')
        .update({ status: nextStatus })
        .eq('id', id)
      if (error) throw error
      showToast(`📝 Status updated to ${nextStatus}`, 'success')
      setFeedbackList(prev => prev.map(f => f.id === id ? { ...f, status: nextStatus } : f))
    } catch (err) {
      showToast('❌ Failed to update status', 'error')
    }
  }

  useEffect(() => {
    loadAdminData()
  }, [])

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="skeleton-box" style={{ height: 180, borderRadius: 'var(--radius-card)' }} />
        <div className="skeleton-box" style={{ height: 300, borderRadius: 'var(--radius-card)' }} />
      </div>
    )
  }

  // Sort events by usage frequency
  const sortedEvents = Object.entries(stats.eventFrequency).sort((a, b) => b[1] - a[1])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-24)' }}>
      {/* 1. METRICS OVERVIEW CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-12)' }}>
        <div className="card-base" style={{ padding: 'var(--space-16)' }}>
          <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>Total Accounts</div>
          <div style={{ fontSize: 'var(--fs-lg)', fontWeight: 900, color: 'var(--text-primary)', marginTop: 4 }}>{stats.totalUsers}</div>
        </div>
        <div className="card-base" style={{ padding: 'var(--space-16)' }}>
          <div style={{ fontSize: '9px', color: 'var(--color-accent-cyan)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>Active (24h / 7d)</div>
          <div style={{ fontSize: 'var(--fs-lg)', fontWeight: 900, color: 'var(--color-accent-cyan)', marginTop: 4 }}>{stats.activeUsers24h} <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>/ {stats.activeUsers7d}</span></div>
        </div>
        <div className="card-base" style={{ padding: 'var(--space-16)' }}>
          <div style={{ fontSize: '9px', color: 'var(--color-accent)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>Avg Habits Completed</div>
          <div style={{ fontSize: 'var(--fs-lg)', fontWeight: 900, color: 'var(--text-primary)', marginTop: 4 }}>{stats.avgHabits} <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>/ user</span></div>
        </div>
        <div className="card-base" style={{ padding: 'var(--space-16)' }}>
          <div style={{ fontSize: '9px', color: 'var(--color-warning)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>Total Feedback</div>
          <div style={{ fontSize: 'var(--fs-lg)', fontWeight: 900, color: 'var(--text-primary)', marginTop: 4 }}>
            {feedbackList.length}
            <span style={{ fontSize: '9px', color: 'var(--text-muted)', marginLeft: 6 }}>
              (🐛{stats.feedbackCount.bug} ✨{stats.feedbackCount.feature})
            </span>
          </div>
        </div>
      </div>

      {/* 2. FEATURE USAGE CHART */}
      <div className="card-base" style={{ padding: 'var(--space-20)' }}>
        <h3 style={{ fontSize: 'var(--fs-xs)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-primary)', marginBottom: 'var(--space-16)' }}>Most Used Events</h3>
        {sortedEvents.length === 0 ? (
          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>No activities logged yet.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-12)' }}>
            {sortedEvents.map(([evt, count]) => {
              const max = sortedEvents[0][1]
              const pct = max > 0 ? Math.round((count / max) * 100) : 0
              return (
                <div key={evt}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--fs-xs)', marginBottom: 4, fontWeight: 700 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{evt}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{count} calls</span>
                  </div>
                  <div style={{ height: 4, background: 'var(--bg-root)', borderRadius: 100, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: 'var(--color-accent-cyan)' }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 3. USER FEEDBACK LIST */}
      <div className="card-base" style={{ padding: 'var(--space-20)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-16)' }}>
          <h3 style={{ fontSize: 'var(--fs-xs)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-primary)' }}>Beta Feedback Submissions</h3>
          <button onClick={loadAdminData} style={{ background: 'none', border: 'none', color: 'var(--color-accent-cyan)', fontSize: 'var(--fs-xs)', cursor: 'pointer', fontWeight: 800 }}>Refresh</button>
        </div>

        {feedbackList.length === 0 ? (
          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', textAlign: 'center', padding: '24px 0' }}>No feedback submitted yet.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-12)' }}>
            {feedbackList.map(f => {
              const dateStr = new Date(f.created_at).toLocaleDateString()
              const tagColor = f.category === 'bug' ? 'var(--color-error)' : f.category === 'feature' ? 'var(--color-accent-cyan)' : 'var(--color-accent)'
              const statusColor = f.status === 'resolved' ? 'var(--color-success)' : f.status === 'triaged' ? 'var(--color-warning)' : 'var(--text-muted)'
              return (
                <div key={f.id} style={{ background: 'var(--bg-root)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-inner)', padding: 'var(--space-14)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '9px', background: tagColor + '20', color: tagColor, padding: '2px 8px', borderRadius: '4px', fontWeight: 900, textTransform: 'uppercase' }}>
                      {f.category}
                    </span>
                    <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>{dateStr}</span>
                  </div>

                  <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 800, color: 'var(--text-primary)' }}>{f.title}</div>
                  <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)', lineHeight: 1.4, margin: 0, whiteSpace: 'pre-wrap' }}>{f.description}</p>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, pt: 8, borderTop: '1px solid var(--border-primary)' }}>
                    <span style={{ fontSize: '9px', color: 'var(--text-dim)' }}>Page: <code style={{ color: 'var(--text-muted)' }}>{f.page}</code></span>
                    
                    <button 
                      onClick={() => updateFeedbackStatus(f.id, f.status)}
                      style={{
                        background: 'none', border: `1px solid ${statusColor}`, color: statusColor, 
                        fontSize: '9px', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer',
                        fontWeight: 900, textTransform: 'uppercase'
                      }}
                    >
                      {f.status}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
