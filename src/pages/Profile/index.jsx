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
import { Copy, Check, Sparkles, Shield, ArrowUpRight, LogOut, Download } from 'lucide-react'

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
  const [copiedId, setCopiedId] = useState(false)

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

  const handleCopyAccountId = () => {
    if (!user?.id) return
    navigator.clipboard?.writeText(user.id)
    setCopiedId(true)
    showToast('Account ID copied to clipboard', 'success')
    setTimeout(() => setCopiedId(false), 2000)
  }

  const bestStreak = streaks.reduce((m, s) => Math.max(m, s.current_streak || 0), 0)
  const totalHabits = habits.length

  const handleSignOut = async () => {
    try { sessionStorage.removeItem('dexos_session_chat'); } catch { /* ignore */ }
    await supabase.auth.signOut()
    localStorage.removeItem('zyrbit_onboarded')
    navigate('/login', { replace: true })
  }

  if (error) {
    return (
      <div style={{ background: '#080E0B', minHeight: '100vh', padding: '20px' }}>
        <ErrorState message={error} onRetry={() => loadData(user?.id)} />
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ background: '#080E0B', minHeight: '100vh', padding: '32px 20px 120px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '50%' }}>
          <div className="skeleton-box" style={{ height: '24px', width: '80%', background: '#111A15', borderRadius: '8px' }} />
          <div className="skeleton-box" style={{ height: '12px', width: '60%', background: '#111A15', borderRadius: '6px' }} />
        </div>
        <div className="skeleton-box" style={{ height: '140px', borderRadius: '24px', background: '#111A15' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
          <div className="skeleton-box" style={{ height: '80px', borderRadius: '18px', background: '#111A15' }} />
          <div className="skeleton-box" style={{ height: '80px', borderRadius: '18px', background: '#111A15' }} />
          <div className="skeleton-box" style={{ height: '80px', borderRadius: '18px', background: '#111A15' }} />
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: '#080E0B', minHeight: '100vh', padding: '0 20px 120px', color: '#F1F5F3' }}>
      {/* ── Top Header Row (Matching Screen 6) ── */}
      <div style={{ padding: '24px 0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '9px',
            background: '#2DE09A',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#060B08',
            fontWeight: 900,
            fontSize: '16px',
            boxShadow: '0 0 12px rgba(45, 224, 154, 0.35)',
          }}>
            Z
          </div>
          <div>
            <div style={{
              fontSize: '15px',
              fontWeight: 900,
              color: '#F1F5F3',
              letterSpacing: '0.04em',
              fontFamily: "'Space Grotesk', -apple-system, sans-serif",
              lineHeight: 1.1,
            }}>
              ZYRBIT
            </div>
            <div style={{
              fontSize: '9px',
              color: '#7E948A',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}>
              Personal OS
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isAdmin && (
            <div style={{ display: 'flex', background: '#111A15', border: '1px solid #1A2B23', borderRadius: '9999px', padding: '3px' }}>
              <button
                type="button"
                onClick={() => setActiveSection('profile')}
                style={{
                  background: activeSection === 'profile' ? '#2DE09A' : 'transparent',
                  color: activeSection === 'profile' ? '#060B08' : '#7E948A',
                  border: 'none',
                  borderRadius: '9999px',
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Profile
              </button>
              <button
                type="button"
                onClick={() => setActiveSection('admin')}
                style={{
                  background: activeSection === 'admin' ? '#2DE09A' : 'transparent',
                  color: activeSection === 'admin' ? '#060B08' : '#7E948A',
                  border: 'none',
                  borderRadius: '9999px',
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Admin
              </button>
            </div>
          )}

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 12px',
            borderRadius: '9999px',
            background: '#111A15',
            border: '1px solid #1A2B23',
            fontSize: '11px',
            fontWeight: 700,
            color: '#2DE09A',
          }}>
            <span>●</span>
            <span>ONLINE</span>
          </div>
        </div>
      </div>

      {/* ── Title Section (Screen 6) ── */}
      <div style={{ marginBottom: '22px' }}>
        <div style={{
          fontSize: '11px',
          fontWeight: 800,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: '#2DE09A',
          marginBottom: '6px',
        }}>
          YOUR SPACE
        </div>
        <h1 style={{
          fontSize: '30px',
          fontWeight: 900,
          letterSpacing: '-0.03em',
          color: '#F1F5F3',
          margin: '0 0 6px',
          fontFamily: "'Space Grotesk', -apple-system, sans-serif",
        }}>
          Built around you.
        </h1>
        <p style={{
          margin: 0,
          fontSize: '14px',
          color: '#7E948A',
        }}>
          Your system, your rules.
        </p>
      </div>

      {/* ── RESPONSIVE TWO-COLUMN CONTENT GRID ── */}
      {activeSection === 'profile' && (
        <div className="profile-content-grid">
          {/* ── COLUMN 1: IDENTITY, MOMENTUM & EQUILIBRIUM ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* USER IDENTITY HERO CARD (Screen 6 Reference) */}
            <div style={{
              background: '#111A15',
              border: '1px solid #1A2B23',
              borderRadius: '24px',
              padding: '22px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.45)',
            }}>
              {/* Mint-ring Avatar */}
              <label htmlFor="avatar-upload" style={{ cursor: 'pointer', flexShrink: 0, position: 'relative' }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: '#0B120E',
                  border: '2.5px solid #2DE09A',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 16px rgba(45, 224, 154, 0.45)',
                  transition: 'transform 0.15s ease',
                }}>
                  {(avatarUrl || user?.user_metadata?.avatar_url) ? (
                    <img src={avatarUrl || user?.user_metadata?.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Avatar" />
                  ) : (
                    <span style={{ fontSize: '24px', fontWeight: 900, color: '#2DE09A' }}>Z</span>
                  )}
                </div>
              </label>
              <input id="avatar-upload" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} />

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '17px',
                  fontWeight: 800,
                  color: '#F1F5F3',
                  letterSpacing: '-0.01em',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {user?.user_metadata?.full_name || (user?.email ? user.email.split('@')[0] : 'Your profile')}
                </div>
                <div style={{ fontSize: '12px', color: '#7E948A', marginTop: '2px' }}>
                  Personal OS member
                </div>

                <div style={{
                  marginTop: '8px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '3px 10px',
                  borderRadius: '9999px',
                  background: '#15221C',
                  border: '1px solid #1A2B23',
                  fontSize: '10px',
                  fontWeight: 800,
                  color: '#2DE09A',
                  letterSpacing: '0.06em',
                }}>
                  <span>●</span>
                  <span>SYNC CONNECTED</span>
                </div>
              </div>
            </div>

            {/* YOUR MOMENTUM METRICS */}
            <div>
              <div style={{
                fontSize: '11px',
                fontWeight: 800,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: '#7E948A',
                marginBottom: '10px',
              }}>
                YOUR MOMENTUM
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                {/* Streak */}
                <div style={{
                  background: '#111A15',
                  border: '1px solid #1A2B23',
                  borderRadius: '18px',
                  padding: '16px 10px',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '22px', fontWeight: 900, color: '#F1F5F3', fontFamily: "'Space Grotesk', -apple-system, sans-serif" }}>
                    {bestStreak || 12}
                  </div>
                  <div style={{ fontSize: '11px', color: '#7E948A', fontWeight: 600, marginTop: '4px' }}>
                    Day streak
                  </div>
                </div>

                {/* Focus time */}
                <div style={{
                  background: '#111A15',
                  border: '1px solid #1A2B23',
                  borderRadius: '18px',
                  padding: '16px 10px',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '22px', fontWeight: 900, color: '#2DE09A', fontFamily: "'Space Grotesk', -apple-system, sans-serif" }}>
                    8.4h
                  </div>
                  <div style={{ fontSize: '11px', color: '#7E948A', fontWeight: 600, marginTop: '4px' }}>
                    Focus time
                  </div>
                </div>

                {/* Quests active */}
                <div style={{
                  background: '#111A15',
                  border: '1px solid #1A2B23',
                  borderRadius: '18px',
                  padding: '16px 10px',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '22px', fontWeight: 900, color: '#A855F7', fontFamily: "'Space Grotesk', -apple-system, sans-serif" }}>
                    {totalHabits || 5}
                  </div>
                  <div style={{ fontSize: '11px', color: '#7E948A', fontWeight: 600, marginTop: '4px' }}>
                    Quests active
                  </div>
                </div>
              </div>
            </div>

            {/* HABIT & ROUTINE EQUILIBRIUM CARD */}
            <div style={{
              background: '#111A15',
              border: '1px solid #1A2B23',
              borderRadius: '24px',
              padding: '20px',
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.45)',
            }}>
              <div style={{ fontSize: '11px', color: '#7E948A', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '14px' }}>
                ROUTINE EQUILIBRIUM
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '18px' }}>
                <div style={{ background: '#15221C', padding: '14px', borderRadius: '16px', border: '1px solid #1A2B23', textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#F59E0B' }}>{bestStreak}d</div>
                  <div style={{ fontSize: '11px', color: '#7E948A', fontWeight: 700, textTransform: 'uppercase', marginTop: 4 }}>Best Streak</div>
                </div>
                <div style={{ background: '#15221C', padding: '14px', borderRadius: '16px', border: '1px solid #1A2B23', textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#2DE09A' }}>{totalHabits}</div>
                  <div style={{ fontSize: '11px', color: '#7E948A', fontWeight: 700, textTransform: 'uppercase', marginTop: 4 }}>Active Habits</div>
                </div>
              </div>

              {/* Zone Breakdown */}
              <div style={{ fontSize: '11px', color: '#7E948A', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>
                Zone Distribution
              </div>
              {Object.entries(ZONE_COLORS).map(([zone, color]) => {
                const count = zoneBreakdown[zone] || 0
                const pct = totalHabits > 0 ? Math.round((count / totalHabits) * 100) : 0
                const icons = { mind: '🧠', body: '💪', growth: '🌱', soul: '🔮' }
                return (
                  <div key={zone} style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '13px', color: '#F1F5F3', fontWeight: 600 }}>{icons[zone]} {zone}</span>
                      <span style={{ fontSize: '12px', color: '#7E948A', fontWeight: 700 }}>{count} ({pct}%)</span>
                    </div>
                    <div style={{ background: '#15221C', height: '6px', borderRadius: '9999px', overflow: 'hidden', border: '1px solid #1A2B23' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '9999px', transition: 'width 0.3s ease' }} />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* BETA ONBOARDING CHECKLIST */}
            {user?.id && <BetaOnboardingChecklist userId={user.id} />}
          </div>

          {/* ── COLUMN 2: SYSTEM PREFERENCES, DETAILS & ACTIONS ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* DOMAIN ANCHORS SHORTCUTS */}
            <div style={{
              background: '#111A15',
              border: '1px solid #1A2B23',
              borderRadius: '24px',
              padding: '16px 18px',
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.45)',
            }}>
              <div style={{
                fontSize: '11px',
                fontWeight: 800,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: '#7E948A',
                marginBottom: '10px',
              }}>
                PRIMARY DOMAINS
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {[
                  { label: 'Nutrition & Meal Fueling', route: '/food', icon: '🥗', color: '#2DE09A' },
                  { label: 'Wealth & Money Flow', route: '/wealth', icon: '💳', color: '#38BDF8' },
                  { label: 'Focus & Productivity Engine', route: '/growth', icon: '🎯', color: '#A855F7' },
                ].map((link, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => navigate(link.route)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 10px',
                      background: 'transparent',
                      border: 'none',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#15221C'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '18px' }}>{link.icon}</span>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: '#F1F5F3' }}>{link.label}</span>
                    </div>
                    <ArrowUpRight size={15} color="#7E948A" />
                  </button>
                ))}
              </div>
            </div>

            {/* MEMBERSHIP STATUS & UPGRADE */}
            <div style={{
              background: '#111A15',
              border: '1px solid #1A2B23',
              borderRadius: '24px',
              padding: '20px',
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ fontSize: '10px', color: '#2DE09A', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 4 }}>
                  MEMBERSHIP TIER
                </div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#F1F5F3', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>{tier === 'free' ? 'Personal Plan' : tier === 'premium' ? 'Premium 🌟' : 'Elite 👑'}</span>
                </div>
              </div>

              {tier === 'free' ? (
                <button
                  type="button"
                  onClick={() => triggerPaywall('Upgrade your plan to unlock elite features')}
                  style={{
                    background: '#2DE09A',
                    color: '#060B08',
                    fontWeight: 800,
                    fontSize: '12px',
                    padding: '8px 16px',
                    borderRadius: '12px',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 0 12px rgba(45, 224, 154, 0.3)',
                    letterSpacing: '0.04em',
                  }}
                >
                  UPGRADE
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => triggerPaywall('Manage your subscription settings')}
                  style={{
                    background: '#15221C',
                    color: '#F1F5F3',
                    fontWeight: 700,
                    fontSize: '12px',
                    padding: '8px 16px',
                    borderRadius: '12px',
                    border: '1px solid #1A2B23',
                    cursor: 'pointer',
                  }}
                >
                  MANAGE
                </button>
              )}
            </div>

            {/* ACCOUNT & SESSION DETAILS */}
            <div style={{
              background: '#111A15',
              border: '1px solid #1A2B23',
              borderRadius: '24px',
              padding: '20px',
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.45)',
            }}>
              <div style={{ fontSize: '11px', color: '#7E948A', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '14px' }}>
                ACCOUNT & SECURITY
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div
                  onClick={handleCopyAccountId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    background: '#15221C',
                    borderRadius: '14px',
                    border: '1px solid #1A2B23',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#7E948A' }}>Account ID</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#F1F5F3', fontFamily: 'monospace' }}>
                      {user?.id ? `${user.id.slice(0, 8)}...${user.id.slice(-4)}` : 'Local Session'}
                    </span>
                    {copiedId ? <Check size={13} color="#2DE09A" /> : <Copy size={13} color="#7E948A" />}
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  background: '#15221C',
                  borderRadius: '14px',
                  border: '1px solid #1A2B23',
                }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#7E948A' }}>Auth Provider</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#F1F5F3' }}>
                    {user?.app_metadata?.provider || 'Supabase Auth'}
                  </span>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  background: '#15221C',
                  borderRadius: '14px',
                  border: '1px solid #1A2B23',
                }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#7E948A' }}>Session State</span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#2DE09A' }}>
                    {user ? 'Active' : 'Unauthenticated'}
                  </span>
                </div>
              </div>
            </div>

            {/* INSTALL PWA BUTTON */}
            {isInstallable && (
              <button
                type="button"
                onClick={promptInstall}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '16px',
                  background: '#15221C',
                  border: '1px solid #2DE09A',
                  color: '#2DE09A',
                  fontWeight: 800,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 0 16px rgba(45, 224, 154, 0.15)',
                }}
              >
                <Download size={16} />
                <span>INSTALL PWA TO HOME SCREEN</span>
              </button>
            )}

            {/* SIGN OUT BUTTON */}
            <button
              type="button"
              onClick={handleSignOut}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '16px',
                background: '#15181B',
                border: '1px solid #1A2B23',
                color: '#EF4444',
                fontWeight: 800,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'border-color 0.15s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#EF4444'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#1A2B23'; }}
            >
              <LogOut size={16} />
              <span>SIGN OUT OF SYSTEM</span>
            </button>
          </div>
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
