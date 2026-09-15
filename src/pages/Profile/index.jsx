import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../../components/layout/BottomNav.jsx'
import { showToast } from '../../components/ui/Toast.jsx'
import { supabase } from '../../lib/supabase/index.js'
import { useInstallPrompt } from '../../hooks/useInstallPrompt.js'
import useSubscription from '../../hooks/useSubscription.js'
import ErrorState from '../../components/ui/ErrorState.jsx'
import BetaOnboardingChecklist from '../../components/common/BetaOnboardingChecklist.jsx'
import AdminAnalytics from '../../components/common/AdminAnalytics.jsx'

const ZONE_COLORS = { mind: '#1FA36F', body: '#10B981', growth: '#22C55E', soul: '#34D399' }

export default function Profile() {
  const navigate = useNavigate()
  const { isInstallable, promptInstall } = useInstallPrompt()
  const { tier, triggerPaywall } = useSubscription()
  const [user, setUser] = useState(null)
  const [habits, setHabits] = useState([])
  const [streaks, setStreaks] = useState([])
  const [activeSection, setActiveSection] = useState('profile')
  const [zoneBreakdown, setZoneBreakdown] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [avatarUrl, setAvatarUrl] = useState(null)
  const [uploading, setUploading] = useState(false)

  const isAdmin = user?.email && (
    user.email.includes('admin') ||
    user.email.includes('insan') ||
    user.email.includes('zyrbit') ||
    user.email.includes('dexos') ||
    user.email.includes('builder') ||
    user.email.includes('test')
  )

  const tabs = [
    { id: 'profile', label: 'Identity', icon: '👤' },
  ]
  if (isAdmin) {
    tabs.push({ id: 'admin', label: 'Admin', icon: '⚙️' })
  }

  const loadData = useCallback(async (uid) => {
    setLoading(true)
    setError(null)
    try {
      const { data: h } = await supabase.from('habits').select('*').eq('user_id', uid)
      setHabits(h || [])
      const zb = {}
      ;(h || []).forEach(hb => { zb[hb.zone] = (zb[hb.zone] || 0) + 1 })
      setZoneBreakdown(zb)
      const { data: st } = await supabase.from('user_streaks').select('current_streak').eq('user_id', uid)
      setStreaks(st || [])
    } catch (e) {
      console.warn('Profile load error:', e.message)
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) { 
        setUser(user)
        setAvatarUrl(user.user_metadata?.avatar_url || null)
        loadData(user.id)
      }
    })
  }, [loadData])

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    if (file.size > 2 * 1024 * 1024) { showToast('❌ Max 2MB image', 'warning'); return }
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `avatars/${user.id}.${ext}`
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
      if (upErr) throw upErr
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      await supabase.auth.updateUser({ data: { avatar_url: publicUrl } })
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id)
      setAvatarUrl(publicUrl + '?t=' + Date.now())
      showToast('📷 Profile picture updated!', 'success')
    } catch (err) {
      console.error(err)
      showToast('❌ Upload failed.', 'error')
    } finally {
      setUploading(false)
    }
  }

  const bestStreak = streaks.reduce((m, s) => Math.max(m, s.current_streak || 0), 0)
  const totalHabits = habits.length

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    localStorage.removeItem('zyrbit_onboarded')
    navigate('/login', { replace: true })
  }

  if (error) {
    return (
      <div style={{ background: 'var(--bg-root)', minHeight: '100vh', padding: '20px' }}>
        <ErrorState message={error} onRetry={() => loadData(user?.id)} />
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ background: 'var(--bg-root)', minHeight: '100vh', padding: '32px 20px 120px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '50%' }}>
          <div className="skeleton-box" style={{ height: '24px', width: '80%' }} />
          <div className="skeleton-box" style={{ height: '12px', width: '60%' }} />
        </div>
        <div className="skeleton-box" style={{ height: '180px', borderRadius: '16px' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div className="skeleton-box" style={{ height: '100px', borderRadius: '12px' }} />
          <div className="skeleton-box" style={{ height: '100px', borderRadius: '12px' }} />
          <div className="skeleton-box" style={{ height: '100px', borderRadius: '12px' }} />
          <div className="skeleton-box" style={{ height: '100px', borderRadius: '12px' }} />
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--bg-root)', minHeight: '100vh', padding: '0 20px 100px', color: 'var(--text-primary)' }}>
      {/* HEADER */}
      <div style={{ padding: 'var(--space-32) 0 var(--space-24)' }}>
        <h1 style={{ fontSize: 'var(--fs-xxl)', fontWeight: 700, letterSpacing: -1, marginBottom: 'var(--space-4)' }}>Terminal</h1>
        <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)', fontWeight: 500 }}>System configuration and identity</p>
      </div>

      {/* TABS */}
      {tabs.length > 1 && (
        <div style={{ padding: '0 0 var(--space-32)', display: 'flex', flexWrap: 'wrap', gap: 'var(--space-8)' }}>
          {tabs.map(t => {
            const isActive = activeSection === t.id
            return (
              <button key={t.id} onClick={() => setActiveSection(t.id)}
                style={{
                  flex: '1 1 calc(30% - var(--space-8))', padding: 'var(--space-8) var(--space-12)', borderRadius: 'var(--radius-badge)', cursor: 'pointer',
                  border: isActive ? '1px solid var(--text-primary)' : '1px solid var(--border-primary)',
                  background: isActive ? 'var(--text-primary)' : 'var(--bg-card)',
                  color: isActive ? 'var(--bg-root)' : 'var(--text-muted)',
                  fontWeight: 900, fontSize: 'var(--fs-sm)', transition: 'all 0.2s', whiteSpace: 'nowrap'
                }}>
                {t.label}
              </button>
            )
          })}
        </div>
      )}

      {/* PROFILE SECTION */}
      {activeSection === 'profile' && (
        <div>
          <div className="card-base" style={{ padding: 'var(--space-32)', textAlign: 'center', marginBottom: 'var(--space-24)' }}>
            <label htmlFor="avatar-upload" style={{ cursor: 'pointer', display: 'block', width: 96, margin: '0 auto var(--space-24)', position: 'relative' }}>
              <div style={{ width: 96, height: 96, borderRadius: '50%', background: 'var(--bg-root)', border: '2px solid var(--border-primary)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {(avatarUrl || user?.user_metadata?.avatar_url)
                  ? <img src={avatarUrl || user?.user_metadata?.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                  : <span style={{ fontSize: 40 }}>👤</span>}
              </div>
              <div style={{ position: 'absolute', bottom: 0, right: 0, width: 32, height: 32, borderRadius: '50%', background: 'var(--text-primary)', border: '2px solid var(--bg-root)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--fs-base)', color: 'var(--bg-root)' }}>
                {uploading ? '⏳' : '📷'}
              </div>
            </label>
            <input id="avatar-upload" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} />

            <div style={{ fontWeight: 900, color: 'var(--text-primary)', fontSize: 'var(--fs-xl)', letterSpacing: -0.5 }}>{user?.user_metadata?.full_name || 'Commander'}</div>
            <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)', marginTop: 'var(--space-4)', fontWeight: 700 }}>{user?.email}</div>
          </div>

          {/* Subscription Tier Status & Upgrade CTA */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-primary)',
            borderRadius: 'var(--radius-card)',
            padding: 'var(--space-24)',
            marginBottom: 'var(--space-24)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontSize: '10px', color: 'var(--color-accent)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 }}>MEMBERSHIP STATUS</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>{tier === 'free' ? 'Free Plan' : tier === 'premium' ? 'Premium 🌟' : 'Elite 👑'}</span>
              </div>
            </div>
            {tier === 'free' ? (
              <button
                onClick={() => triggerPaywall('Upgrade your plan to unlock elite features')}
                style={{
                  background: 'var(--color-accent)',
                  color: '#000000',
                  fontWeight: 700,
                  fontSize: 'var(--fs-xs)',
                  padding: 'var(--space-8) var(--space-16)',
                  borderRadius: 'var(--radius-button)',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                UPGRADE
              </button>
            ) : (
              <button
                onClick={() => triggerPaywall('Manage your subscription settings')}
                style={{
                  background: 'var(--bg-elevated)',
                  color: 'var(--text-secondary)',
                  fontWeight: 700,
                  fontSize: 'var(--fs-xs)',
                  padding: 'var(--space-8) var(--space-16)',
                  borderRadius: 'var(--radius-button)',
                  border: '1px solid var(--border-primary)',
                  cursor: 'pointer'
                }}
              >
                MANAGE
              </button>
            )}
          </div>

          <BetaOnboardingChecklist userId={user.id} />

          {/* Core Status Card */}
          <div className="card-base" style={{ marginBottom: 'var(--space-24)', padding: 'var(--space-24)' }}>
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 'var(--space-16)' }}>CORE STATUS</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-12)' }}>
              <div style={{ background: 'var(--bg-root)', padding: 'var(--space-16)', borderRadius: 'var(--radius-inner)', border: '1px solid var(--border-primary)', textAlign: 'center' }}>
                <div style={{ fontSize: 'var(--fs-xl)', fontWeight: 700, color: 'var(--color-warning)' }}>{bestStreak}d</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginTop: 4 }}>Max Streak</div>
              </div>
              <div style={{ background: 'var(--bg-root)', padding: 'var(--space-16)', borderRadius: 'var(--radius-inner)', border: '1px solid var(--border-primary)', textAlign: 'center' }}>
                <div style={{ fontSize: 'var(--fs-xl)', fontWeight: 700, color: 'var(--color-accent)' }}>{totalHabits}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginTop: 4 }}>Active Habits</div>
              </div>
            </div>
          </div>

          {/* Zone Breakdown Card */}
          <div className="card-base" style={{ marginBottom: 'var(--space-24)', padding: 'var(--space-24)' }}>
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 'var(--space-24)' }}>Zone Equilibrium</div>
            {Object.entries(ZONE_COLORS).map(([zone, color]) => {
              const count = zoneBreakdown[zone] || 0
              const pct = totalHabits > 0 ? Math.round((count / totalHabits) * 100) : 0
              const icons = { mind: '🧠', body: '💪', growth: '🌱', soul: '🔮' }
              return (
                <div key={zone} style={{ marginBottom: 'var(--space-20)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-8)' }}>
                    <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-primary)', fontWeight: 600 }}>{icons[zone]} {zone}</span>
                    <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-primary)', fontWeight: 700 }}>{count}</span>
                  </div>
                  <div style={{ background: 'var(--bg-root)', height: '6px', borderRadius: 'var(--radius-badge)', overflow: 'hidden', border: '1px solid var(--border-primary)' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 'var(--radius-badge)', transition: 'width 0.3s ease' }} />
                  </div>
                </div>
              )
            })}
          </div>

          {isInstallable && (
            <button onClick={promptInstall} className="btn-primary" style={{ width: '100%', marginBottom: 'var(--space-12)' }}>
              ⬇️ INSTALL APP
            </button>
          )}

          {/* Stats shortcut */}
          <button
            onClick={() => navigate('/stats')}
            className="btn-secondary"
            style={{ width: '100%', marginBottom: 'var(--space-12)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-8)' }}
          >
            📊 View Lifetime Stats
          </button>

          <button onClick={handleSignOut} className="btn-secondary" style={{ width: '100%', color: 'var(--color-error)', borderColor: 'var(--color-error-dim)' }}>SIGNOUT</button>
        </div>
      )}

      {/* ADMIN SECTION */}
      {activeSection === 'admin' && isAdmin && (
        <AdminAnalytics />
      )}

      <BottomNav activeTab="profile" onTabChange={(t) => navigate(`/${t}`)} />
    </div>
  )
}
