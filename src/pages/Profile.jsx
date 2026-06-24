import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../components/BottomNav.jsx'
import GravityRing from '../components/GravityRing.jsx'
import RankBanner from '../components/RankBanner.jsx'
import { showToast } from '../components/Toast.jsx'
import { supabase } from '../lib/supabase.js'
import { earnZyrons, spendZyrons, getWallet, getDailyStats, getWeeklyStats } from '../lib/zyrons.js'
import { getRankByZyrons, getNextRank, getProgressToNext, getVisibleRanks, RANKS } from '../lib/ranks.js'
import { computeGravityScore } from '../lib/gravity.js'
import { useInstallPrompt } from '../hooks/useInstallPrompt.js'
import useSubscription from '../hooks/useSubscription.js'
import ErrorState from '../components/ErrorState.jsx'
import BetaOnboardingChecklist from '../components/BetaOnboardingChecklist.jsx'
import AdminAnalytics from '../components/AdminAnalytics.jsx'

const SHOP_ITEMS = [
  { id: 'cosmos_themes', name: 'Cosmos Themes', icon: '🎨', cost: 400, desc: 'Custom color themes for your zones' },
  { id: 'orbit_shield', name: 'Streak Shield', icon: '🛡️', cost: 200, desc: 'Protect your streak once' },
  { id: 'zone_icons', name: 'Zone Icons', icon: '🎯', cost: 300, desc: 'Custom zone icons' },
  { id: 'friend_battle', name: 'Friend Battle', icon: '👥', cost: 100, desc: 'Challenge a friend' },
  { id: 'deep_analytics', name: 'Deep Analytics', icon: '📊', cost: 500, desc: 'Advanced habit and focus insights' },
  { id: 'rank_boost', name: 'Rank Boost', icon: '⚡', cost: 1000, desc: 'Double Zyrons for 24h' },
  { id: 'ai_session', name: 'AI Session', icon: '🤖', cost: 150, desc: 'Extended AI coaching' },
  { id: 'rank_badge', name: 'Rank Badge', icon: '🏆', cost: 800, desc: 'Exclusive rank avatar badge' },
]

const ZONE_COLORS = { mind: '#00BCD4', body: '#4CAF50', growth: '#FF9800', soul: '#E91E63' }

export default function Profile() {
  const navigate = useNavigate()
  const { isInstallable, promptInstall } = useInstallPrompt()
  const { tier, triggerPaywall } = useSubscription()
  const [user, setUser] = useState(null)
  const [wallet, setWallet] = useState({ balance: 0, total_earned: 0 })
  const [rank, setRank] = useState(RANKS[0])
  const [nextRank, setNextRank] = useState(null)
  const [progress, setProgress] = useState(0)
  const [gravityScore, setGravityScore] = useState(0)
  const [habits, setHabits] = useState([])
  const [streaks, setStreaks] = useState([])
  const [activeSection, setActiveSection] = useState('profile')
  const [purchases, setPurchases] = useState(new Set())
  const [confirmPurchase, setConfirmPurchase] = useState(null)
  const [rankBanner, setRankBanner] = useState(null)
  const [zoneBreakdown, setZoneBreakdown] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [recentTxs, setRecentTxs] = useState([])
  const [avatarUrl, setAvatarUrl] = useState(null)
  const [uploading, setUploading] = useState(false)

  const isAdmin = user?.email && (
    user.email.includes('admin') ||
    user.email.includes('insan') ||
    user.email.includes('zyrbit') ||
    user.email.includes('builder') ||
    user.email.includes('test')
  )

  const tabs = [
    { id: 'profile', label: 'Identity', icon: '👤' },
    { id: 'wallet', label: 'Assets', icon: '⚡' },
    { id: 'ranks', label: 'Echelon', icon: '🏆' },
    { id: 'shop', label: 'Market', icon: '🛍️' }
  ]
  if (isAdmin) {
    tabs.push({ id: 'admin', label: 'Admin', icon: '⚙️' })
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) { 
        setUser(user)
        setAvatarUrl(user.user_metadata?.avatar_url || null)
        loadData(user.id)
      }
    })
  }, [])

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

  const loadData = async (uid) => {
    setLoading(true)
    setError(null)
    try {
      const w = await getWallet(uid)
      setWallet(w || { balance: 0, total_earned: 0 })
      const r = getRankByZyrons(w?.total_earned || 0)
      setRank(r)
      setNextRank(getNextRank(r.id))
      setProgress(getProgressToNext(w?.total_earned || 0, r))
      const gs = await computeGravityScore(supabase, uid)
      setGravityScore(gs)
      const { data: h } = await supabase.from('habits').select('*').eq('user_id', uid)
      setHabits(h || [])
      const zb = {}
      ;(h || []).forEach(hb => { zb[hb.zone] = (zb[hb.zone] || 0) + 1 })
      setZoneBreakdown(zb)
      const { data: st } = await supabase.from('user_streaks').select('current_streak').eq('user_id', uid)
      setStreaks(st || [])
      const { data: pur } = await supabase.from('shop_purchases').select('item_id').eq('user_id', uid)
      setPurchases(new Set((pur || []).map(p => p.item_id)))
      const { data: txs } = await supabase.from('zyron_transactions').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(10)
      setRecentTxs(txs || [])
    } catch (e) {
      console.warn('Profile load error:', e.message)
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const bestStreak = streaks.reduce((m, s) => Math.max(m, s.current_streak || 0), 0)
  const totalHabits = habits.length

  const handlePurchase = async (item) => {
    if (!user) return
    setConfirmPurchase(null)
    if (purchases.has(item.id)) { showToast('✅ Already owned!', 'info'); return }
    const result = await spendZyrons(user.id, item.cost)
    if (!result.success) {
      showToast(`⚡ Need ${item.cost - (wallet.balance || 0)} more!`, 'warning')
      return
    }
    await supabase.from('shop_purchases').insert({ user_id: user.id, item_id: item.id, cost: item.cost })
    await supabase.from('zyron_transactions').insert({ user_id: user.id, amount: -item.cost, reason: `Purchased: ${item.name}` })
    setPurchases(prev => new Set([...prev, item.id]))
    setWallet(w => ({ ...w, balance: result.newBalance }))
    showToast(`🎉 ${item.name} unlocked!`, 'success')
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    localStorage.removeItem('zyrbit_onboarded')
    navigate('/login', { replace: true })
  }

  const visibleRanks = getVisibleRanks(rank.id)

  if (error) {
    return (
      <div style={{ background: '#121214', minHeight: '100vh', padding: '20px' }}>
        <ErrorState message={error} onRetry={() => loadData(user?.id)} />
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ background: '#121214', minHeight: '100vh', padding: '32px 20px 120px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '50%' }}>
          <div className="skeleton-box" style={{ height: '24px', width: '80%' }} />
          <div className="skeleton-box" style={{ height: '12px', width: '60%' }} />
        </div>
        <div className="skeleton-box" style={{ height: '180px', borderRadius: '24px' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div className="skeleton-box" style={{ height: '100px', borderRadius: '16px' }} />
          <div className="skeleton-box" style={{ height: '100px', borderRadius: '16px' }} />
          <div className="skeleton-box" style={{ height: '100px', borderRadius: '16px' }} />
          <div className="skeleton-box" style={{ height: '100px', borderRadius: '16px' }} />
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: '#121214', minHeight: '100vh', padding: '0 20px 100px', color: '#FFF' }}>
      {rankBanner && <RankBanner rank={rankBanner} onDone={() => setRankBanner(null)} />}
      
      {/* HEADER */}
      <div style={{ padding: 'var(--space-32) 0 var(--space-24)' }}>
        <h1 style={{ fontSize: 'var(--fs-xxl)', fontWeight: 900, letterSpacing: -1, marginBottom: 'var(--space-4)' }}>Terminal</h1>
        <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)', fontWeight: 600 }}>System configuration and assets</p>
      </div>

      {/* TABS */}
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

      {/* WALLET SECTION */}
      {activeSection === 'wallet' && (
        <div>
          <div className="card-base" style={{ padding: 'var(--space-32)', textAlign: 'center', marginBottom: 'var(--space-32)' }}>
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 'var(--space-12)' }}>AVAILABLE ZYRONS</div>
            <div style={{ fontSize: 'var(--fs-xxl)', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: -1 }}>⚡ {wallet.balance?.toLocaleString() || 0}</div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-8)', background: 'var(--bg-root)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-badge)', padding: 'var(--space-8) var(--space-16)', marginTop: 'var(--space-16)' }}>
              <span style={{ fontSize: 'var(--fs-base)' }}>{rank.icon}</span>
              <span style={{ color: rank.color, fontWeight: 900, fontSize: 'var(--fs-xs)', textTransform: 'uppercase' }}>{rank.name}</span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-24)' }}>
            <h3 style={{ color: 'var(--text-primary)', fontWeight: 900, fontSize: 'var(--fs-xs)', textTransform: 'uppercase', letterSpacing: 1 }}>Recent Transactions</h3>
          </div>
          
          {(recentTxs || []).length === 0 ? (
            <div className="empty-state" style={{ padding: 'var(--space-32)' }}>System log clear.</div>
          ) : (
            (recentTxs || []).map(tx => (
              <div key={tx.id} style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-card)', padding: 'var(--space-16)', borderRadius: 'var(--radius-inner)', border: '1px solid var(--border-primary)', marginBottom: 'var(--space-12)' }}>
                <div style={{ fontSize: 'var(--fs-xl)', marginRight: 'var(--space-16)' }}>{tx.amount > 0 ? '⚡' : '💸'}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 900, color: 'var(--text-primary)' }}>{tx.reason || (tx.amount > 0 ? 'Earned' : 'Spent')}</div>
                  <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', fontWeight: 600, marginTop: 'var(--space-4)' }}>{new Date(tx.created_at).toLocaleDateString()} at {new Date(tx.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                </div>
                <div style={{ fontSize: 'var(--fs-md)', fontWeight: 900, color: tx.amount > 0 ? 'var(--color-accent-cyan)' : 'var(--text-muted)' }}>{tx.amount > 0 ? '+' : ''}{tx.amount}</div>
              </div>
            ))
          )}
        </div>
      )}

      {/* PROFILE SECTION */}
      {activeSection === 'profile' && (
        <div>
          <div className="card-base" style={{ padding: 'var(--space-32)', textAlign: 'center', marginBottom: 'var(--space-24)' }}>
            <label htmlFor="avatar-upload" style={{ cursor: 'pointer', display: 'block', width: 96, margin: '0 auto var(--space-24)', position: 'relative' }}>
              <div style={{ width: 96, height: 96, borderRadius: '50%', background: 'var(--bg-root)', border: `2px solid ${rank.color}`, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
            <div style={{ marginTop: 'var(--space-24)', display: 'inline-flex', alignItems: 'center', gap: 'var(--space-8)', background: 'var(--bg-root)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-badge)', padding: 'var(--space-8) var(--space-24)' }}>
              <span style={{ fontSize: 'var(--fs-lg)' }}>{rank.icon}</span>
              <span style={{ color: rank.color, fontWeight: 900, fontSize: 'var(--fs-sm)', textTransform: 'uppercase' }}>{rank.name}</span>
            </div>
          </div>

          {/* Subscription Tier Status & Upgrade CTA */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(94, 230, 245, 0.05) 0%, rgba(156, 39, 176, 0.05) 100%)',
            border: '1px solid rgba(94, 230, 245, 0.15)',
            borderRadius: 'var(--radius-card)',
            padding: 'var(--space-24)',
            marginBottom: 'var(--space-24)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 4px 20px var(--color-accent-cyan-glow)'
          }}>
            <div>
              <div style={{ fontSize: '10px', color: 'var(--color-accent-cyan)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 }}>MEMBERSHIP STATUS</div>
              <div style={{ fontSize: '16px', fontWeight: 900, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>{tier === 'free' ? 'Free Plan' : tier === 'premium' ? 'Premium 🌟' : 'Elite 👑'}</span>
              </div>
            </div>
            {tier === 'free' ? (
              <button
                onClick={() => triggerPaywall('Upgrade your plan to unlock elite features')}
                style={{
                  background: 'linear-gradient(to right, var(--color-accent-cyan), #9C27B0)',
                  color: 'var(--bg-root)',
                  fontWeight: 900,
                  fontSize: 'var(--fs-xs)',
                  padding: 'var(--space-8) var(--space-16)',
                  borderRadius: 'var(--radius-button)',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 0 10px rgba(94, 230, 245, 0.3)'
                }}
              >
                UPGRADE
              </button>
            ) : (
              <button
                onClick={() => triggerPaywall('Manage your subscription settings')}
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  color: 'var(--text-secondary)',
                  fontWeight: 800,
                  fontSize: 'var(--fs-xs)',
                  padding: 'var(--space-8) var(--space-16)',
                  borderRadius: 'var(--radius-button)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  cursor: 'pointer'
                }}
              >
                MANAGE
              </button>
            )}
          </div>

          <BetaOnboardingChecklist userId={user.id} />

          <div className="card-base" style={{ marginBottom: 'var(--space-24)', display: 'flex', alignItems: 'center', gap: 'var(--space-24)', padding: 'var(--space-24)' }}>
            <div style={{ flexShrink: 0 }}>
              <GravityRing score={gravityScore} size={90} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 'var(--space-16)' }}>CORE STATUS</div>
              {[
                { label: 'Gravity', value: `${gravityScore}/100` },
                { label: 'Max Streak', value: `${bestStreak}d` },
                { label: 'Active Habits', value: totalHabits },
              ].map((s, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-8)' }}>
                  <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)', fontWeight: 600 }}>{s.label}</span>
                  <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-primary)', fontWeight: 800 }}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card-base" style={{ marginBottom: 'var(--space-24)', padding: 'var(--space-24)' }}>
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 'var(--space-24)' }}>Zone Equilibrium</div>
            {Object.entries(ZONE_COLORS).map(([zone, color]) => {
              const count = zoneBreakdown[zone] || 0
              const pct = totalHabits > 0 ? Math.round((count / totalHabits) * 100) : 0
              const icons = { mind: '🧠', body: '💪', growth: '🌱', soul: '🔮' }
              return (
                <div key={zone} style={{ marginBottom: 'var(--space-20)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-8)' }}>
                    <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-primary)', fontWeight: 700 }}>{icons[zone]} {zone}</span>
                    <span style={{ fontSize: 'var(--fs-sm)', color, fontWeight: 900 }}>{count}</span>
                  </div>
                  <div style={{ background: 'var(--bg-root)', height: '6px', borderRadius: 'var(--radius-badge)' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 'var(--radius-badge)' }} />
                  </div>
                </div>
              )
            })}
          </div>

          <div className="card-base" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-24)', padding: 'var(--space-24)' }}>
            <div>
              <div style={{ fontSize: 'var(--fs-base)', color: 'var(--text-primary)', fontWeight: 900, marginBottom: 'var(--space-4)' }}>Ayanokoji Mode</div>
              <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', fontWeight: 600 }}>Cold discipline UI. No distractions.</div>
            </div>
            <button
              onClick={() => {
                const current = localStorage.getItem('ayanokoji_mode') === 'true'
                localStorage.setItem('ayanokoji_mode', (!current).toString())
                window.location.reload()
              }}
              style={{
                width: 50, height: 28, borderRadius: 100, border: 'none', cursor: 'pointer',
                background: localStorage.getItem('ayanokoji_mode') === 'true' ? 'var(--text-primary)' : 'var(--bg-elevated)',
                position: 'relative', transition: 'background 0.3s'
              }}
            >
              <div style={{
                position: 'absolute', top: 3, left: localStorage.getItem('ayanokoji_mode') === 'true' ? 25 : 3,
                width: 22, height: 22, borderRadius: '50%', background: localStorage.getItem('ayanokoji_mode') === 'true' ? 'var(--bg-root)' : 'var(--text-muted)',
                transition: 'all 0.3s'
              }} />
            </button>
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

      {/* RANKS SECTION */}
      {activeSection === 'ranks' && (
        <div>
          <div className="card-base" style={{ padding: 'var(--space-32)', textAlign: 'center', marginBottom: 'var(--space-24)' }}>
            <div style={{ fontSize: 80, marginBottom: 'var(--space-24)' }}>{rank.icon}</div>
            <div style={{ fontSize: 'var(--fs-xxl)', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: -1 }}>{rank.name}</div>
            <div style={{ fontSize: 'var(--fs-xs)', fontWeight: 900, color: rank.color, marginBottom: 'var(--space-24)', letterSpacing: 1, textTransform: 'uppercase' }}>{rank.label}</div>
            <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)', lineHeight: 1.6, fontWeight: 500 }}>{rank.description}</p>

            {nextRank && (
              <div style={{ marginTop: 'var(--space-32)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-8)' }}>
                  <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-primary)', fontWeight: 800 }}>Next: {nextRank.name}</span>
                  <span style={{ fontSize: 'var(--fs-xs)', color: rank.color, fontWeight: 900 }}>{progress}%</span>
                </div>
                <div style={{ background: 'var(--bg-root)', height: '8px', borderRadius: 'var(--radius-badge)' }}>
                  <div style={{ height: '100%', width: `${progress}%`, background: `linear-gradient(90deg, ${rank.color}, ${nextRank.color})`, borderRadius: 'var(--radius-badge)' }} />
                </div>
              </div>
            )}
          </div>

          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 'var(--space-24)' }}>Echelon Journey</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-16)', paddingBottom: 'var(--space-16)' }}>
            {visibleRanks.map((r) => {
              const isUnlocked = wallet.total_earned >= r.req
              const isCurrent = r.id === rank.id
              return (
                <div key={r.id} style={{ flex: '1 1 calc(25% - var(--space-16))', textAlign: 'center' }}>
                  <div style={{
                    width: 64, height: 64, borderRadius: 'var(--radius-inner)', margin: '0 auto var(--space-8)',
                    background: isUnlocked ? 'var(--bg-card)' : 'var(--bg-root)',
                    border: isCurrent ? `2px solid var(--text-primary)` : `1px solid var(--border-primary)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--fs-xl)',
                    opacity: isUnlocked ? 1 : 0.35,
                    transition: 'all 0.2s'
                  }}>
                    {isUnlocked ? r.icon : '🔒'}
                  </div>
                  <div style={{ fontSize: '9px', color: isUnlocked ? 'var(--text-primary)' : 'var(--text-dim)', fontWeight: 900, letterSpacing: 0.5 }}>
                    {isUnlocked ? r.name.toUpperCase() : 'LOCKED'}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* SHOP SECTION */}
      {activeSection === 'shop' && (
        <div>
          <div className="card-base" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-24)', padding: 'var(--space-24)' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-sm)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>Balance</span>
            <div style={{ fontSize: 'var(--fs-xl)', fontWeight: 900, color: 'var(--text-primary)' }}>⚡ {wallet.balance?.toLocaleString() || 0}</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-16)' }}>
            {SHOP_ITEMS.map(item => {
              const owned = purchases.has(item.id)
              const canAfford = (wallet.balance || 0) >= item.cost
              return (
                <div key={item.id} className="card-base" style={{ padding: 'var(--space-16)', textAlign: 'center', position: 'relative' }}>
                  {owned && (
                    <div style={{ position: 'absolute', top: 'var(--space-12)', right: 'var(--space-12)', background: 'var(--text-primary)', borderRadius: 'var(--radius-badge)', padding: '2px var(--space-8)', fontSize: '9px', color: 'var(--bg-root)', fontWeight: 900 }}>OWNED</div>
                  )}
                  <div style={{ fontSize: 40, marginBottom: 'var(--space-12)' }}>{item.icon}</div>
                  <div style={{ fontWeight: 900, color: 'var(--text-primary)', fontSize: 'var(--fs-base)', marginBottom: 'var(--space-4)' }}>{item.name}</div>
                  <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', marginBottom: 'var(--space-16)', lineHeight: 1.5, fontWeight: 600 }}>{item.desc}</div>
                  
                  <button onClick={() => !owned && setConfirmPurchase(item)}
                    style={{
                      width: '100%', padding: 'var(--space-12)', borderRadius: 'var(--radius-button)',
                      background: owned ? 'var(--bg-elevated)' : canAfford ? 'var(--text-primary)' : 'var(--bg-root)',
                      color: owned ? 'var(--text-muted)' : canAfford ? 'var(--bg-root)' : 'var(--text-dim)',
                      border: 'none', cursor: owned ? 'default' : canAfford ? 'pointer' : 'not-allowed', 
                      fontWeight: 900, fontSize: 'var(--fs-sm)', transition: 'all 0.2s'
                    }}>
                    {owned ? 'EQUIPPED' : `⚡ ${item.cost}`}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ADMIN SECTION */}
      {activeSection === 'admin' && isAdmin && (
        <AdminAnalytics />
      )}

      {/* Purchase modal */}
      {confirmPurchase && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 100, display: 'flex', alignItems: 'flex-end' }} onClick={() => setConfirmPurchase(null)}>
          <div style={{ background: 'var(--bg-card)', borderTop: '1px solid var(--border-primary)', borderRadius: 'var(--radius-card) var(--radius-card) 0 0', padding: 'var(--space-32)', width: '100%' }} onClick={e => e.stopPropagation()}>
            <div style={{ textAlign: 'center', marginBottom: 'var(--space-32)' }}>
              <div style={{ fontSize: 64, marginBottom: 'var(--space-16)' }}>{confirmPurchase.icon}</div>
              <h3 style={{ color: 'var(--text-primary)', fontWeight: 900, fontSize: 'var(--fs-xl)' }}>Unlock Data?</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-sm)', marginTop: 'var(--space-12)', fontWeight: 600 }}>{confirmPurchase.name} — ⚡ {confirmPurchase.cost}</p>
            </div>
            {(wallet.balance || 0) < confirmPurchase.cost && (
              <div style={{ textAlign: 'center', color: 'var(--color-error)', fontWeight: 900, marginBottom: 'var(--space-20)', fontSize: 'var(--fs-sm)' }}>INSUFFICIENT ZYRONS</div>
            )}
            <div style={{ display: 'flex', gap: 'var(--space-12)' }}>
              <button className="btn-secondary" style={{ flex: 1, padding: 'var(--space-16)' }} onClick={() => setConfirmPurchase(null)}>CANCEL</button>
              <button className="btn-primary" style={{ flex: 1, padding: 'var(--space-16)' }} onClick={() => handlePurchase(confirmPurchase)} disabled={(wallet.balance || 0) < confirmPurchase.cost}>CONFIRM</button>
            </div>
          </div>
        </div>
      )}

      <BottomNav activeTab="profile" onTabChange={(t) => navigate(t === 'zenith' ? '/' : `/${t}`)} />
    </div>
  )
}
