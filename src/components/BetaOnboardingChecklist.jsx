import React, { useEffect, useState } from 'react'
import { getOnboardingProgress } from '../lib/analytics.js'

const MILESTONES = [
  { key: 'first_login',           label: 'First Login',           icon: '🔑', desc: 'Securely logged in to Zyrbit OS' },
  { key: 'first_habit_created',   label: 'Create first habit',    icon: '🌱', desc: 'Added a routine target' },
  { key: 'first_habit_completed', label: 'Complete first habit',  icon: '⚡', desc: 'Logged activity for consistency' },
  { key: 'first_reflection',      label: 'Submit reflection',     icon: '📝', desc: 'Completed a daily journal' },
  { key: 'first_dex_chat',        label: 'Chat with Dex AI',      icon: '🤖', desc: 'Used system voice or chat interface' },
]

export default function BetaOnboardingChecklist({ userId }) {
  const [progress, setProgress] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchProgress = async () => {
    if (!userId) return
    setLoading(true)
    const data = await getOnboardingProgress(userId)
    setProgress(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchProgress()
  }, [userId])

  if (loading) {
    return (
      <div className="card-base" style={{ padding: 'var(--space-20)', marginBottom: 'var(--space-24)' }}>
        <div className="skeleton-box" style={{ height: '14px', width: '50%', marginBottom: '12px' }} />
        <div className="skeleton-box" style={{ height: '8px', width: '100%', borderRadius: '4px' }} />
      </div>
    )
  }

  if (!progress) return null

  const completedCount = MILESTONES.filter(m => progress[m.key]).length
  const pct = Math.round((completedCount / MILESTONES.length) * 100)

  return (
    <div className="card-base" style={{ padding: 'var(--space-24)', marginBottom: 'var(--space-24)', border: '1px solid var(--border-primary)', position: 'relative', overflow: 'hidden' }}>
      {/* Decorative gradient overlay */}
      <div style={{
        position: 'absolute', top: 0, right: 0, width: '150px', height: '150px',
        background: 'radial-gradient(circle, rgba(94, 230, 245, 0.08) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-12)' }}>
        <div>
          <div style={{ fontSize: '10px', color: 'var(--color-accent-cyan)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5 }}>BETA ONBOARDING</div>
          <h3 style={{ fontSize: 'var(--fs-sm)', fontWeight: 900, color: 'var(--text-primary)', marginTop: 4 }}>Milestone Checklist</h3>
        </div>
        <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-accent-cyan)', fontWeight: 900 }}>{completedCount} / {MILESTONES.length}</span>
      </div>

      {/* Progress Bar */}
      <div style={{ background: 'var(--bg-root)', height: '6px', borderRadius: '100px', overflow: 'hidden', marginBottom: 'var(--space-20)' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: 'var(--color-accent-cyan)', transition: 'width 0.3s ease' }} />
      </div>

      {/* Milestones List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-12)' }}>
        {MILESTONES.map(m => {
          const done = !!progress[m.key]
          return (
            <div key={m.key} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-12)', opacity: done ? 1 : 0.5 }}>
              <div style={{
                width: 24, height: 24, borderRadius: '50%',
                background: done ? 'var(--color-accent-cyan-dim)' : 'var(--bg-root)',
                border: `1px solid ${done ? 'var(--color-accent-cyan)' : 'var(--border-primary)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11
              }}>
                {done ? '✓' : m.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 'var(--fs-xs)', fontWeight: 800, color: done ? 'var(--text-primary)' : 'var(--text-muted)' }}>{m.label}</div>
                <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: 2 }}>{m.desc}</div>
              </div>
              {done ? (
                <span style={{ fontSize: 10, color: 'var(--color-accent-cyan)', fontWeight: 900 }}>COMPLETED</span>
              ) : (
                <span style={{ fontSize: 10, color: 'var(--text-dim)', fontWeight: 600 }}>PENDING</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
