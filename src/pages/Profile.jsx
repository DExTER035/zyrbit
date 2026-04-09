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

const SHOP_ITEMS = [
  { id: 'cosmos_themes', name: 'Cosmos Themes', icon: '🎨', cost: 400, desc: 'Custom orbit color themes' },
  { id: 'orbit_shield', name: 'Orbit Shield', icon: '🛡️', cost: 200, desc: 'Protect your streak' },
  { id: 'zone_icons', name: 'Zone Icons', icon: '🎯', cost: 300, desc: 'Custom zone icons' },
  { id: 'friend_battle', name: 'Friend Battle', icon: '👥', cost: 100, desc: 'Challenge a friend' },
  { id: 'deep_analytics', name: 'Deep Analytics', icon: '📊', cost: 500, desc: 'Advanced orbit insights' },
  { id: 'rank_boost', name: 'Rank Boost', icon: '⚡', cost: 1000, desc: 'Double Zyrons for 24h' },
  { id: 'ai_session', name: 'AI Session', icon: '🤖', cost: 150, desc: 'Extended AI coaching' },
  { id: 'rank_badge', name: 'Rank Badge', icon: '🏆', cost: 800, desc: 'Exclusive rank avatar badge' },
]

const ZONE_COLORS = { mind: '#00BCD4', body: '#4CAF50', growth: '#FF9800', soul: '#E91E63' }

export default function Profile() {
  const navigate = useNavigate()
  const { isInstallable, promptInstall } = useInstallPrompt()
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

  const [recentTxs, setRecentTxs] = useState([])
  const [avatarUrl, setAvatarUrl] = useState(null)
  const [uploading, setUploading] = useState(false)

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

  return (
    <div style={{ background: '#000', minHeight: '100vh', padding: '0 20px 100px', color: '#FFF' }}>
      {rankBanner && <RankBanner rank={rankBanner} onDone={() => setRankBanner(null)} />}
      
      {/* HEADER */}
      <div style={{ padding: '32px 0 24px' }}>
        <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: -1, marginBottom: 4 }}>Terminal</h1>
        <p style={{ fontSize: 13, color: '#444', fontWeight: 600 }}>System configuration and assets</p>
      </div>

      {/* TABS */}
      <div style={{ padding: '0 0 32px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {[
          { id: 'profile', label: 'Identity', icon: '👤' },
          { id: 'wallet', label: 'Assets', icon: '⚡' },
          { id: 'ranks', label: 'Echelon', icon: '🏆' },
          { id: 'shop', label: 'Market', icon: '🛍️' }
        ].map(t => {
          const isActive = activeSection === t.id
          return (
            <button key={t.id} onClick={() => setActiveSection(t.id)}
              style={{
                flex: '1 1 calc(50% - 8px)', padding: '10px 12px', borderRadius: 100, cursor: 'pointer',
                border: isActive ? '1px solid #FFF' : '1px solid #1A1A24',
                background: isActive ? '#FFF' : '#0A0A12',
                color: isActive ? '#000' : '#444',
                fontWeight: 900, fontSize: 12, transition: 'all 0.2s', whiteSpace: 'nowrap'
              }}>
              {t.label}
            </button>
          )
        })}
      </div>

      {/* WALLET SECTION */}
      {activeSection === 'wallet' && (
        <div>
          <div style={{ background: '#0A0A12', border: '1px solid #1A1A24', borderRadius: 24, padding: 32, textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontSize: 11, color: '#444', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12 }}>AVAILABLE ZYRONS</div>
            <div style={{ fontSize: 48, fontWeight: 900, color: '#FFF', letterSpacing: -1 }}>⚡ {wallet.balance?.toLocaleString() || 0}</div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#111', border: '1px solid #222', borderRadius: 100, padding: '6px 14px', marginTop: 16 }}>
              <span style={{ fontSize: 14 }}>{rank.icon}</span>
              <span style={{ color: rank.color, fontWeight: 900, fontSize: 11, textTransform: 'uppercase' }}>{rank.name}</span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ color: '#FFF', fontWeight: 900, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Recent Transactions</h3>
          </div>
          
          {(recentTxs || []).length === 0 ? (
            <div style={{ textAlign: 'center', color: '#444', padding: 40, fontSize: 13, background: '#0A0A12', borderRadius: 24, border: '1px solid #1A1A24' }}>System log clear.</div>
          ) : (
            (recentTxs || []).map(tx => (
              <div key={tx.id} style={{ display: 'flex', alignItems: 'center', background: '#0A0A12', padding: 20, borderRadius: 20, border: '1px solid #1A1A24', marginBottom: 12 }}>
                <div style={{ fontSize: 24, marginRight: 16 }}>{tx.amount > 0 ? '⚡' : '💸'}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 900, color: '#FFF' }}>{tx.reason || (tx.amount > 0 ? 'Earned' : 'Spent')}</div>
                  <div style={{ fontSize: 10, color: '#444', fontWeight: 600, marginTop: 2 }}>{new Date(tx.created_at).toLocaleDateString()} at {new Date(tx.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                </div>
                <div style={{ fontSize: 16, fontWeight: 900, color: tx.amount > 0 ? '#00FFFF' : '#444' }}>{tx.amount > 0 ? '+' : ''}{tx.amount}</div>
              </div>
            ))
          )}
        </div>
      )}

      {/* PROFILE SECTION */}
      {activeSection === 'profile' && (
        <div>
          <div style={{ background: '#0A0A12', border: '1px solid #1A1A24', borderRadius: 24, padding: 32, textAlign: 'center', marginBottom: 20 }}>
            <label htmlFor="avatar-upload" style={{ cursor: 'pointer', display: 'block', width: 100, margin: '0 auto 20px', position: 'relative' }}>
              <div style={{ width: 100, height: 100, borderRadius: '50%', background: '#000', border: `2px solid ${rank.color}`, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {(avatarUrl || user?.user_metadata?.avatar_url)
                  ? <img src={avatarUrl || user?.user_metadata?.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                  : <span style={{ fontSize: 40 }}>👤</span>}
              </div>
              <div style={{ position: 'absolute', bottom: 0, right: 0, width: 32, height: 32, borderRadius: '50%', background: '#FFF', border: '2px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: '#000' }}>
                {uploading ? '⏳' : '📷'}
              </div>
            </label>
            <input id="avatar-upload" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} />

            <div style={{ fontWeight: 900, color: '#FFF', fontSize: 24, letterSpacing: -0.5 }}>{user?.user_metadata?.full_name || 'Orbiter'}</div>
            <div style={{ fontSize: 13, color: '#444', marginTop: 4, fontWeight: 700 }}>{user?.email}</div>
            <div style={{ marginTop: 20, display: 'inline-flex', alignItems: 'center', gap: 8, background: '#111', border: '1px solid #222', borderRadius: 100, padding: '8px 20px' }}>
              <span style={{ fontSize: 18 }}>{rank.icon}</span>
              <span style={{ color: rank.color, fontWeight: 900, fontSize: 12, textTransform: 'uppercase' }}>{rank.name}</span>
            </div>
          </div>

          <div style={{ background: '#0A0A12', border: '1px solid #1A1A24', borderRadius: 24, marginBottom: 20, padding: 24, display: 'flex', alignItems: 'center', gap: 24 }}>
            <div style={{ flexShrink: 0 }}>
              <GravityRing score={gravityScore} size={90} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: '#444', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 16 }}>CORE STATUS</div>
              {[
                { label: 'Gravity', value: `${gravityScore}/100` },
                { label: 'Max Streak', value: `${bestStreak}d` },
                { label: 'Active Habits', value: totalHabits },
              ].map((s, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: '#666', fontWeight: 600 }}>{s.label}</span>
                  <span style={{ fontSize: 13, color: '#FFF', fontWeight: 800 }}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: '#0A0A12', border: '1px solid #1A1A24', borderRadius: 24, padding: 24, marginBottom: 24 }}>
            <div style={{ fontSize: 11, color: '#444', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 24 }}>Zone Equilibrium</div>
            {Object.entries(ZONE_COLORS).map(([zone, color]) => {
              const count = zoneBreakdown[zone] || 0
              const pct = totalHabits > 0 ? Math.round((count / totalHabits) * 100) : 0
              const icons = { mind: '🧠', body: '💪', growth: '🌱', soul: '🔮' }
              return (
                <div key={zone} style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 13, color: '#FFF', fontWeight: 700 }}>{icons[zone]} {zone}</span>
                    <span style={{ fontSize: 13, color, fontWeight: 900 }}>{count}</span>
                  </div>
                  <div style={{ background: '#111', height: 6, borderRadius: 100 }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 100 }} />
                  </div>
                </div>
              )
            })}
          </div>

          <div style={{ background: '#0A0A12', border: '1px solid #1A1A24', borderRadius: 24, padding: 24, marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 14, color: '#FFF', fontWeight: 900, marginBottom: 4 }}>Ayanokoji Mode</div>
              <div style={{ fontSize: 11, color: '#666', fontWeight: 600 }}>Cold discipline UI. No distractions.</div>
            </div>
            <button
              onClick={() => {
                const current = localStorage.getItem('ayanokoji_mode') === 'true'
                localStorage.setItem('ayanokoji_mode', (!current).toString())
                window.location.reload()
              }}
              style={{
                width: 50, height: 28, borderRadius: 100, border: 'none', cursor: 'pointer',
                background: localStorage.getItem('ayanokoji_mode') === 'true' ? '#FFF' : '#2A2A38',
                position: 'relative', transition: 'background 0.3s'
              }}
            >
              <div style={{
                position: 'absolute', top: 3, left: localStorage.getItem('ayanokoji_mode') === 'true' ? 25 : 3,
                width: 22, height: 22, borderRadius: '50%', background: localStorage.getItem('ayanokoji_mode') === 'true' ? '#000' : '#888',
                transition: 'all 0.3s'
              }} />
            </button>
          </div>

          {isInstallable && (
            <button onClick={promptInstall} style={{ width: '100%', padding: '16px', borderRadius: 16, background: '#FFF', border: 'none', color: '#000', fontWeight: 900, fontSize: 13, cursor: 'pointer', marginBottom: 12 }}>
              ⬇️ INSTALL APP
            </button>
          )}

          <button onClick={handleSignOut} style={{ width: '100%', padding: '16px', borderRadius: 16, background: '#111', border: '1px solid #222', color: '#EF4444', fontWeight: 900, fontSize: 13, cursor: 'pointer' }}>SIGNOUT</button>
        </div>
      )}

      {/* RANKS SECTION */}
      {activeSection === 'ranks' && (
        <div>
          <div style={{ background: '#0A0A12', border: '1px solid #1A1A24', borderRadius: 24, padding: 32, textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: 80, marginBottom: 20 }}>{rank.icon}</div>
            <div style={{ fontSize: 32, fontWeight: 900, color: '#FFF', letterSpacing: -1 }}>{rank.name}</div>
            <div style={{ fontSize: 12, fontWeight: 900, color: rank.color, marginBottom: 24, letterSpacing: 1, textTransform: 'uppercase' }}>{rank.label}</div>
            <p style={{ fontSize: 14, color: '#666', lineHeight: 1.6, fontWeight: 500 }}>{rank.description}</p>

            {nextRank && (
              <div style={{ marginTop: 32 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 12, color: '#FFF', fontWeight: 800 }}>Next: {nextRank.name}</span>
                  <span style={{ fontSize: 12, color: rank.color, fontWeight: 900 }}>{progress}%</span>
                </div>
                <div style={{ background: '#111', height: 8, borderRadius: 100 }}>
                  <div style={{ height: '100%', width: `${progress}%`, background: `linear-gradient(90deg, ${rank.color}, ${nextRank.color})`, borderRadius: 100 }} />
                </div>
              </div>
            )}
          </div>

          <div style={{ fontSize: 11, color: '#444', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 20 }}>Echelon Journey</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', paddingBottom: 12 }}>
            {visibleRanks.map((r) => {
              const isUnlocked = wallet.total_earned >= r.req
              const isCurrent = r.id === rank.id
              return (
                <div key={r.id} style={{ flex: '1 1 calc(25% - 12px)', textAlign: 'center' }}>
                  <div style={{
                    width: 72, height: 72, borderRadius: 20, margin: '0 auto 10px',
                    background: isUnlocked ? '#0A0A12' : '#05050A',
                    border: isCurrent ? `2px solid #FFF` : isUnlocked ? `1px solid #1A1A24` : '1px solid #111',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32,
                    opacity: isUnlocked ? 1 : 0.3
                  }}>
                    {isUnlocked ? r.icon : '🔒'}
                  </div>
                  <div style={{ fontSize: 10, color: isUnlocked ? '#FFF' : '#333', fontWeight: 900 }}>
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
          <div style={{ background: '#0A0A12', border: '1px solid #1A1A24', borderRadius: 24, padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <span style={{ color: '#444', fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>Balance</span>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#FFF' }}>⚡ {wallet.balance?.toLocaleString() || 0}</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {SHOP_ITEMS.map(item => {
              const owned = purchases.has(item.id)
              const canAfford = (wallet.balance || 0) >= item.cost
              return (
                <div key={item.id} style={{ background: '#0A0A12', border: '1px solid #1A1A24', borderRadius: 24, padding: 20, textAlign: 'center', position: 'relative' }}>
                  {owned && (
                    <div style={{ position: 'absolute', top: 12, right: 12, background: '#FFF', borderRadius: 100, padding: '2px 8px', fontSize: 9, color: '#000', fontWeight: 900 }}>OWNED</div>
                  )}
                  <div style={{ fontSize: 40, marginBottom: 12 }}>{item.icon}</div>
                  <div style={{ fontWeight: 900, color: '#FFF', fontSize: 15, marginBottom: 6 }}>{item.name}</div>
                  <div style={{ fontSize: 11, color: '#444', marginBottom: 20, lineHeight: 1.5, fontWeight: 600 }}>{item.desc}</div>
                  
                  <button onClick={() => !owned && setConfirmPurchase(item)}
                    style={{
                      width: '100%', padding: '12px', borderRadius: 14,
                      background: owned ? '#1A1A24' : canAfford ? '#FFF' : '#111',
                      color: owned ? '#444' : canAfford ? '#000' : '#333',
                      border: 'none', cursor: owned ? 'default' : canAfford ? 'pointer' : 'not-allowed', 
                      fontWeight: 900, fontSize: 12, transition: 'all 0.2s'
                    }}>
                    {owned ? 'EQUIPPED' : `⚡ ${item.cost}`}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Purchase modal */}
      {confirmPurchase && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 100, display: 'flex', alignItems: 'flex-end' }} onClick={() => setConfirmPurchase(null)}>
          <div style={{ background: '#0A0A12', borderTop: '1px solid #1A1A24', borderRadius: '32px 32px 0 0', padding: 32, width: '100%' }} onClick={e => e.stopPropagation()}>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <div style={{ fontSize: 64, marginBottom: 16 }}>{confirmPurchase.icon}</div>
              <h3 style={{ color: '#FFF', fontWeight: 900, fontSize: 24 }}>Unlock Data?</h3>
              <p style={{ color: '#666', fontSize: 14, marginTop: 12, fontWeight: 600 }}>{confirmPurchase.name} — ⚡ {confirmPurchase.cost}</p>
            </div>
            {(wallet.balance || 0) < confirmPurchase.cost && (
              <div style={{ textAlign: 'center', color: '#EF4444', fontWeight: 900, marginBottom: 20, fontSize: 13 }}>INSUFFICIENT ZYRONS</div>
            )}
            <div style={{ display: 'flex', gap: 12 }}>
              <button style={{ flex: 1, padding: '16px', borderRadius: 16, background: '#111', border: '1px solid #222', color: '#666', fontWeight: 900, cursor: 'pointer' }} onClick={() => setConfirmPurchase(null)}>CANCEL</button>
              <button style={{ flex: 1, padding: '16px', borderRadius: 16, background: '#FFF', color: '#000', border: 'none', fontWeight: 900, cursor: 'pointer' }} onClick={() => handlePurchase(confirmPurchase)} disabled={(wallet.balance || 0) < confirmPurchase.cost}>CONFIRM</button>
            </div>
          </div>
        </div>
      )}

      <BottomNav activeTab="profile" onTabChange={(t) => window.location.href = `/${t}`} />
    </div>
  )
}
