import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../../components/layout/BottomNav.jsx'
import { showToast } from '../../components/ui/Toast.jsx'
import { supabase } from '../../lib/supabase/index.js'
import { useInstallPrompt } from '../../hooks/useInstallPrompt.js'
import useSubscription from '../../hooks/useSubscription.js'
import AdminAnalytics from '../../components/common/AdminAnalytics.jsx'
import {
  Bell,
  Palette,
  Shield,
  ChevronRight,
  Copy,
  Check,
  LogOut,
  Download,
  Key,
  Database,
  Trash2,
  Anchor,
  X,
  AlertTriangle,
  Camera,
  CheckCircle2
} from 'lucide-react'

export default function Profile() {
  const navigate = useNavigate()
  const { isInstallable, promptInstall } = useInstallPrompt()
  const { tier, triggerPaywall } = useSubscription()

  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [copiedId, setCopiedId] = useState(false)
  const [activeView, setActiveView] = useState('profile') // 'profile' | 'admin'

  // Identity editing state
  const [avatarUrl, setAvatarUrl] = useState(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [isEditingName, setIsEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [savingName, setSavingName] = useState(false)

  // Notification state
  const [notifPermission, setNotifPermission] = useState(
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'unsupported'
  )

  // Modals
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [passwordUpdating, setPasswordUpdating] = useState(false)
  const [resetEmailSent, setResetEmailSent] = useState(false)

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletingData, setDeletingData] = useState(false)
  const [exportingData, setExportingData] = useState(false)

  const isAdmin = Boolean(
    user?.email &&
      (user.email.includes('admin') ||
        user.email.includes('insan') ||
        user.email.includes('zyrbit') ||
        user.email.includes('dexos') ||
        user.email.includes('builder') ||
        user.email.includes('test'))
  )

  const loadUserData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const {
        data: { user: currentUser },
        error: authErr
      } = await supabase.auth.getUser()
      if (authErr) throw authErr

      if (currentUser) {
        setUser(currentUser)
        setAvatarUrl(currentUser.user_metadata?.avatar_url || null)
        const initialName =
          currentUser.user_metadata?.full_name ||
          (currentUser.email ? currentUser.email.split('@')[0] : '') ||
          (currentUser.is_anonymous ? 'Guest User' : 'User')
        setNameInput(initialName)
      }
    } catch (e) {
      console.warn('Profile load error:', e.message)
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadUserData()
  }, [loadUserData])

  // 1. Identity Handlers
  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    if (file.size > 2 * 1024 * 1024) {
      showToast('Image must be under 2MB', 'warning')
      return
    }
    setUploadingAvatar(true)
    try {
      const ext = file.name.split('.').pop()
      const filePath = `avatars/${user.id}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      const {
        data: { publicUrl }
      } = supabase.storage.from('avatars').getPublicUrl(filePath)

      await supabase.auth.updateUser({ data: { avatar_url: publicUrl } })
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id)

      setAvatarUrl(`${publicUrl}?t=${Date.now()}`)
      showToast('Avatar updated', 'success')
    } catch (err) {
      console.error(err)
      showToast('Avatar upload failed', 'error')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleSaveName = async () => {
    if (!nameInput.trim() || !user) return
    setSavingName(true)
    try {
      const trimmed = nameInput.trim()
      await supabase.auth.updateUser({ data: { full_name: trimmed } })
      await supabase.from('profiles').update({ full_name: trimmed }).eq('id', user.id)
      setUser((prev) => ({
        ...prev,
        user_metadata: { ...prev?.user_metadata, full_name: trimmed }
      }))
      setIsEditingName(false)
      showToast('Display name updated', 'success')
    } catch (err) {
      console.error(err)
      showToast('Failed to update name', 'error')
    } finally {
      setSavingName(false)
    }
  }

  const handleCopyAccountId = () => {
    if (!user?.id) return
    navigator.clipboard?.writeText(user.id)
    setCopiedId(true)
    showToast('Account ID copied', 'success')
    setTimeout(() => setCopiedId(false), 2000)
  }

  // 2. Preferences Handlers
  const handleRequestNotifications = async () => {
    if (!('Notification' in window)) {
      showToast('Notifications not supported in this browser', 'info')
      return
    }
    try {
      const perm = await Notification.requestPermission()
      setNotifPermission(perm)
      if (perm === 'granted') {
        showToast('Browser notifications enabled', 'success')
      } else {
        showToast('Notifications were not granted', 'info')
      }
    } catch {
      showToast('Could not request notification permission', 'error')
    }
  }

  // 3. Security & Password Handlers
  const handleSendPasswordReset = async () => {
    if (!user?.email) {
      showToast('No email associated with this session', 'warning')
      return
    }
    try {
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/reset-password`
      })
      if (resetErr) throw resetErr
      setResetEmailSent(true)
      showToast(`Password reset link sent to ${user.email}`, 'success')
    } catch (err) {
      console.error(err)
      showToast(err.message || 'Failed to send reset link', 'error')
    }
  }

  const handleUpdatePassword = async (e) => {
    e.preventDefault()
    if (!newPassword || newPassword.length < 6) {
      showToast('Password must be at least 6 characters', 'warning')
      return
    }
    setPasswordUpdating(true)
    try {
      const { error: upErr } = await supabase.auth.updateUser({ password: newPassword })
      if (upErr) throw upErr
      setNewPassword('')
      setShowPasswordModal(false)
      showToast('Password changed successfully', 'success')
    } catch (err) {
      console.error(err)
      showToast(err.message || 'Failed to update password', 'error')
    } finally {
      setPasswordUpdating(false)
    }
  }

  // 4. Data Controls Handlers (Real JSON Export & Safe Clear)
  const handleExportData = async () => {
    if (!user?.id) return
    setExportingData(true)
    try {
      const [habitsRes, tasksRes, logsRes, expensesRes, mealsRes] = await Promise.all([
        supabase.from('habits').select('*').eq('user_id', user.id),
        supabase.from('tasks').select('*').eq('user_id', user.id),
        supabase.from('zenith_daily_logs').select('*').eq('user_id', user.id),
        supabase.from('money_expenses').select('*').eq('user_id', user.id),
        supabase.from('health_meals').select('*').eq('user_id', user.id)
      ])

      const exportPayload = {
        app: 'Zyrbit',
        export_date: new Date().toISOString(),
        user_id: user.id,
        email: user.email || 'guest',
        data: {
          habits: habitsRes.data || [],
          tasks: tasksRes.data || [],
          daily_logs: logsRes.data || [],
          money_expenses: expensesRes.data || [],
          health_meals: mealsRes.data || []
        }
      }

      const jsonStr = JSON.stringify(exportPayload, null, 2)
      const blob = new Blob([jsonStr], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `zyrbit_data_${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      showToast('Data export downloaded', 'success')
    } catch (err) {
      console.error('Export error:', err)
      showToast('Failed to export data', 'error')
    } finally {
      setExportingData(false)
    }
  }

  const handleDeletePersonalData = async () => {
    if (!user?.id) return
    setDeletingData(true)
    try {
      // Securely clear user rows protected by RLS
      await Promise.all([
        supabase.from('habits').delete().eq('user_id', user.id),
        supabase.from('tasks').delete().eq('user_id', user.id),
        supabase.from('zenith_daily_logs').delete().eq('user_id', user.id),
        supabase.from('money_expenses').delete().eq('user_id', user.id),
        supabase.from('health_meals').delete().eq('user_id', user.id)
      ])

      setShowDeleteModal(false)
      showToast('Personal data cleared. Signing out...', 'info')

      setTimeout(async () => {
        try {
          sessionStorage.removeItem('dexos_session_chat')
        } catch {
          /* ignore */
        }
        await supabase.auth.signOut()
        localStorage.removeItem('zyrbit_onboarded')
        navigate('/login', { replace: true })
      }, 1000)
    } catch (err) {
      console.error(err)
      showToast('Failed to clear personal data', 'error')
      setDeletingData(false)
    }
  }

  // 5. Sign Out
  const handleSignOut = async () => {
    try {
      sessionStorage.removeItem('dexos_session_chat')
    } catch {
      /* ignore */
    }
    await supabase.auth.signOut()
    localStorage.removeItem('zyrbit_onboarded')
    navigate('/login', { replace: true })
  }

  const displayName =
    user?.user_metadata?.full_name ||
    (user?.email ? user.email.split('@')[0] : '') ||
    (user?.is_anonymous ? 'Guest User' : 'User')

  const displayEmail = user?.email || (user?.is_anonymous ? 'Anonymous guest session' : 'No email attached')

  if (error) {
    return (
      <div style={{ background: 'var(--brand-ivory, #F4F0E8)', minHeight: '100vh', padding: '20px' }}>
        <ErrorState message={error} onRetry={loadUserData} />
      </div>
    )
  }

  if (loading) {
    return (
      <div
        style={{
          background: 'var(--brand-ivory, #F4F0E8)',
          minHeight: '100vh',
          padding: '32px 20px 120px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          maxWidth: '480px',
          margin: '0 auto'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '50%' }}>
          <div className="skeleton-box" style={{ height: '28px', width: '80%', background: '#E5E0D8', borderRadius: '8px' }} />
          <div className="skeleton-box" style={{ height: '14px', width: '60%', background: '#E5E0D8', borderRadius: '6px' }} />
        </div>
        <div className="skeleton-box" style={{ height: '90px', borderRadius: '20px', background: '#E5E0D8' }} />
        <div className="skeleton-box" style={{ height: '240px', borderRadius: '20px', background: '#E5E0D8' }} />
      </div>
    )
  }

  return (
    <div
      className="flex flex-col flex-1"
      style={{
        background: 'var(--brand-ivory, #F4F0E8)',
        minHeight: '100vh',
        width: '100%',
        color: '#111A20',
        position: 'relative',
        paddingBottom: 'calc(110px + env(safe-area-inset-bottom, 24px))'
      }}
    >
      <div style={{ width: '100%', maxWidth: '480px', margin: '0 auto', padding: '0 20px' }}>
        {/* ── Top Header Row ── */}
        <div style={{ padding: '24px 0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1
              style={{
                fontSize: '24px',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                color: '#111A20',
                margin: 0,
                fontFamily: "'Space Grotesk', -apple-system, sans-serif"
              }}
            >
              Profile
            </h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {isAdmin && (
              <button
                type="button"
                onClick={() => setActiveView(activeView === 'profile' ? 'admin' : 'profile')}
                style={{
                  background: activeView === 'admin' ? 'var(--brand-petrol, #174A55)' : '#FFFFFF',
                  color: activeView === 'admin' ? '#FFFFFF' : '#174A55',
                  border: '1.5px solid #E5E0D8',
                  borderRadius: '9999px',
                  padding: '6px 12px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {activeView === 'admin' ? 'View Profile' : 'Admin'}
              </button>
            )}

            <button
              type="button"
              onClick={handleRequestNotifications}
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: '#FFFFFF',
                border: '1.5px solid #E5E0D8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: notifPermission === 'granted' ? 'var(--brand-petrol, #174A55)' : '#7A8D94',
                boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
              }}
              title={`Notifications: ${notifPermission}`}
              aria-label="Notification settings"
            >
              <Bell size={18} />
            </button>
          </div>
        </div>

        {activeView === 'profile' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* ── SECTION 1: PROFILE IDENTITY AND EDITING ── */}
            <div
              style={{
                background: '#FFFFFF',
                border: '1.5px solid #E5E0D8',
                borderRadius: '20px',
                padding: '18px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0, flex: 1 }}>
                <label
                  htmlFor="avatar-file-input"
                  style={{ cursor: 'pointer', position: 'relative', flexShrink: 0 }}
                  title="Upload profile picture"
                >
                  <div
                    style={{
                      width: '52px',
                      height: '52px',
                      borderRadius: '50%',
                      background: 'var(--brand-petrol, #174A55)',
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#FFFFFF',
                      fontWeight: 800,
                      fontSize: '22px'
                    }}
                  >
                    {avatarUrl ? (
                      <img src={avatarUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Avatar" />
                    ) : (
                      <span>{displayName.charAt(0).toUpperCase() || 'U'}</span>
                    )}
                  </div>
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '-2px',
                      right: '-2px',
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: '#FFFFFF',
                      border: '1.5px solid #E5E0D8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--brand-petrol, #174A55)'
                    }}
                  >
                    <Camera size={11} />
                  </div>
                </label>
                <input
                  id="avatar-file-input"
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleAvatarUpload}
                  disabled={uploadingAvatar}
                />

                <div style={{ minWidth: 0, flex: 1, paddingRight: '10px' }}>
                  {isEditingName ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input
                        type="text"
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        placeholder="Display name"
                        style={{
                          padding: '5px 8px',
                          border: '1.5px solid var(--brand-petrol, #174A55)',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontWeight: 700,
                          outline: 'none',
                          width: '140px',
                          background: '#FAFAFA'
                        }}
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleSaveName}
                        disabled={savingName}
                        style={{
                          padding: '5px 10px',
                          background: 'var(--brand-petrol, #174A55)',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        {savingName ? '...' : 'Save'}
                      </button>
                    </div>
                  ) : (
                    <div
                      style={{
                        fontSize: '16px',
                        fontWeight: 800,
                        color: '#111A20',
                        letterSpacing: '-0.01em',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {displayName}
                    </div>
                  )}

                  <div
                    style={{
                      fontSize: '12px',
                      color: '#7A8D94',
                      marginTop: '2px',
                      fontWeight: 500,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {displayEmail}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsEditingName(!isEditingName)}
                style={{
                  border: '1.5px solid var(--brand-petrol, #174A55)',
                  background: 'transparent',
                  color: 'var(--brand-petrol, #174A55)',
                  borderRadius: '9999px',
                  padding: '6px 14px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  flexShrink: 0
                }}
              >
                {isEditingName ? 'Cancel' : 'Edit'}
              </button>
            </div>

            {/* ── SECTION 2: PREFERENCES ── */}
            <div
              style={{
                background: '#FFFFFF',
                border: '1.5px solid #E5E0D8',
                borderRadius: '20px',
                padding: '4px 18px',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)'
              }}
            >
              <div
                style={{
                  padding: '14px 0 8px',
                  fontSize: '11px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: '#7A8D94'
                }}
              >
                Preferences
              </div>

              {/* Appearance */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 0',
                  borderBottom: '1px solid #F0ECE4'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: 'var(--brand-soft-teal, #DDE9EB)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--brand-petrol, #174A55)'
                    }}
                  >
                    <Palette size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#111A20' }}>Appearance</div>
                    <div style={{ fontSize: '12px', color: '#7A8D94', marginTop: '1px' }}>
                      Petrol Teal & Warm Ivory (Default)
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#174A55' }} />
                  <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#F4F0E8', border: '1px solid #D0C9BE' }} />
                  <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#111A20' }} />
                </div>
              </div>

              {/* Notifications */}
              <div
                onClick={handleRequestNotifications}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 0',
                  borderBottom: '1px solid #F0ECE4',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: 'var(--brand-soft-teal, #DDE9EB)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--brand-petrol, #174A55)'
                    }}
                  >
                    <Bell size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#111A20' }}>Notifications</div>
                    <div style={{ fontSize: '12px', color: '#7A8D94', marginTop: '1px' }}>
                      {notifPermission === 'granted'
                        ? 'Enabled for this device'
                        : notifPermission === 'denied'
                        ? 'Disabled in browser settings'
                        : 'Tap to enable browser alerts'}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: notifPermission === 'granted' ? '#1FA36F' : '#7A8D94'
                    }}
                  >
                    {notifPermission === 'granted' ? 'Active' : 'Prompt'}
                  </span>
                  <ChevronRight size={16} color="#A0AAB0" />
                </div>
              </div>

              {/* Goals and Routines */}
              <div
                onClick={() => navigate('/growth')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 0',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: 'var(--brand-soft-teal, #DDE9EB)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--brand-petrol, #174A55)'
                    }}
                  >
                    <Anchor size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#111A20' }}>Goals & Routines</div>
                    <div style={{ fontSize: '12px', color: '#7A8D94', marginTop: '1px' }}>
                      Manage habits and anchors in Growth
                    </div>
                  </div>
                </div>
                <ChevronRight size={16} color="#A0AAB0" />
              </div>
            </div>

            {/* ── SECTION 3: SECURITY & PRIVACY ── */}
            <div
              style={{
                background: '#FFFFFF',
                border: '1.5px solid #E5E0D8',
                borderRadius: '20px',
                padding: '4px 18px',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)'
              }}
            >
              <div
                style={{
                  padding: '14px 0 8px',
                  fontSize: '11px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: '#7A8D94'
                }}
              >
                Security & Privacy
              </div>

              {/* Authentication Details */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 0',
                  borderBottom: '1px solid #F0ECE4'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: 'var(--brand-soft-teal, #DDE9EB)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--brand-petrol, #174A55)'
                    }}
                  >
                    <Shield size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#111A20' }}>Authentication</div>
                    <div style={{ fontSize: '12px', color: '#7A8D94', marginTop: '1px' }}>
                      {user?.app_metadata?.provider ? `Provider: ${user.app_metadata.provider}` : 'Supabase Auth'}
                    </div>
                  </div>
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#1FA36F',
                    background: '#E8F5E9',
                    padding: '3px 8px',
                    borderRadius: '6px'
                  }}
                >
                  RLS Enforced
                </span>
              </div>

              {/* Password Recovery / Change */}
              <div
                onClick={() => setShowPasswordModal(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 0',
                  borderBottom: '1px solid #F0ECE4',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: 'var(--brand-soft-teal, #DDE9EB)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--brand-petrol, #174A55)'
                    }}
                  >
                    <Key size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#111A20' }}>Password & Access</div>
                    <div style={{ fontSize: '12px', color: '#7A8D94', marginTop: '1px' }}>
                      Change password or request recovery link
                    </div>
                  </div>
                </div>
                <ChevronRight size={16} color="#A0AAB0" />
              </div>

              {/* Sessions Note */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 0'
                }}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#111A20' }}>Session Security</div>
                  <div style={{ fontSize: '12px', color: '#7A8D94', marginTop: '2px' }}>
                    Authenticated browser session. Signing out clears local token storage.
                  </div>
                </div>
              </div>
            </div>

            {/* ── SECTION 4: DATA CONTROLS ── */}
            <div
              style={{
                background: '#FFFFFF',
                border: '1.5px solid #E5E0D8',
                borderRadius: '20px',
                padding: '4px 18px',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)'
              }}
            >
              <div
                style={{
                  padding: '14px 0 8px',
                  fontSize: '11px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: '#7A8D94'
                }}
              >
                Data Controls
              </div>

              {/* Real JSON Export */}
              <div
                onClick={handleExportData}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 0',
                  borderBottom: '1px solid #F0ECE4',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: 'var(--brand-soft-teal, #DDE9EB)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--brand-petrol, #174A55)'
                    }}
                  >
                    <Download size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#111A20' }}>Export Personal Data</div>
                    <div style={{ fontSize: '12px', color: '#7A8D94', marginTop: '1px' }}>
                      Download habits, logs, and expenses as JSON
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={exportingData}
                  style={{
                    border: '1px solid #E5E0D8',
                    background: '#FAFAFA',
                    color: '#111A20',
                    borderRadius: '9999px',
                    padding: '5px 12px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {exportingData ? 'Exporting...' : 'Export'}
                </button>
              </div>

              {/* Account Data Deletion */}
              <div
                onClick={() => setShowDeleteModal(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 0',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: '#FEE2E2',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#DC2626'
                    }}
                  >
                    <Trash2 size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#DC2626' }}>Delete Personal Records</div>
                    <div style={{ fontSize: '12px', color: '#7A8D94', marginTop: '1px' }}>
                      Permanently delete habits, tasks and logs
                    </div>
                  </div>
                </div>
                <ChevronRight size={16} color="#DC2626" />
              </div>
            </div>

            {/* ── SECTION 5: MEMBERSHIP & ACCOUNT DETAILS ── */}
            <div
              style={{
                background: '#FFFFFF',
                border: '1.5px solid #E5E0D8',
                borderRadius: '20px',
                padding: '18px 20px',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      color: '#7A8D94'
                    }}
                  >
                    Membership
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#111A20', marginTop: '2px' }}>
                    {tier === 'free' ? 'Personal Plan' : tier === 'premium' ? 'Premium 🌟' : 'Elite 👑'}
                  </div>
                </div>
                {tier === 'free' ? (
                  <button
                    type="button"
                    onClick={() => triggerPaywall('Upgrade your plan to unlock elite features')}
                    style={{
                      background: 'var(--brand-petrol, #174A55)',
                      color: '#FFFFFF',
                      fontWeight: 700,
                      fontSize: '12px',
                      padding: '6px 14px',
                      borderRadius: '9999px',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    Upgrade
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => triggerPaywall('Manage your subscription settings')}
                    style={{
                      background: '#F4F0E8',
                      color: '#111A20',
                      fontWeight: 700,
                      fontSize: '12px',
                      padding: '6px 14px',
                      borderRadius: '9999px',
                      border: '1px solid #E5E0D8',
                      cursor: 'pointer'
                    }}
                  >
                    Manage
                  </button>
                )}
              </div>

              <div style={{ height: '1px', background: '#F0ECE4' }} />

              {/* Account ID */}
              <div
                onClick={handleCopyAccountId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer'
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      color: '#7A8D94'
                    }}
                  >
                    Account ID
                  </div>
                  <div
                    style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#111A20',
                      fontFamily: 'monospace',
                      marginTop: '2px'
                    }}
                  >
                    {user?.id ? `${user.id.slice(0, 8)}...${user.id.slice(-4)}` : 'Local Session'}
                  </div>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '12px',
                    color: 'var(--brand-petrol, #174A55)',
                    fontWeight: 600
                  }}
                >
                  {copiedId ? <span>Copied</span> : <span>Copy</span>}
                  {copiedId ? <Check size={14} /> : <Copy size={14} />}
                </div>
              </div>
            </div>

            {/* PWA INSTALL ACTION (IF AVAILABLE) */}
            {isInstallable && (
              <button
                type="button"
                onClick={promptInstall}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '16px',
                  background: '#FFFFFF',
                  border: '1.5px solid var(--brand-petrol, #174A55)',
                  color: 'var(--brand-petrol, #174A55)',
                  fontWeight: 800,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <Download size={16} />
                <span>Install Zyrbit to Home Screen</span>
              </button>
            )}

            {/* ── SECTION 6: SIGN OUT ── */}
            <button
              type="button"
              onClick={handleSignOut}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '16px',
                background: '#FFFFFF',
                border: '1.5px solid #FCA5A5',
                color: '#DC2626',
                fontWeight: 800,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <LogOut size={16} />
              <span>Sign Out</span>
            </button>
          </div>
        ) : (
          /* ADMIN VIEW */
          isAdmin && <AdminAnalytics />
        )}
      </div>

      {/* ── PASSWORD RECOVERY / UPDATE MODAL ── */}
      {showPasswordModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(17, 26, 32, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 1000
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '20px',
              padding: '24px',
              width: '100%',
              maxWidth: '380px',
              boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '17px', fontWeight: 800, color: '#111A20' }}>Password & Access</div>
              <button
                type="button"
                onClick={() => setShowPasswordModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7A8D94' }}
              >
                <X size={20} />
              </button>
            </div>

            {user?.email ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ fontSize: '13px', color: '#7A8D94' }}>
                  Account email: <strong style={{ color: '#111A20' }}>{user.email}</strong>
                </div>

                <button
                  type="button"
                  onClick={handleSendPasswordReset}
                  disabled={resetEmailSent}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '12px',
                    border: '1.5px solid var(--brand-petrol, #174A55)',
                    background: resetEmailSent ? '#E8F5E9' : '#FFFFFF',
                    color: resetEmailSent ? '#1FA36F' : 'var(--brand-petrol, #174A55)',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  {resetEmailSent ? (
                    <>
                      <CheckCircle2 size={16} />
                      <span>Reset Link Sent</span>
                    </>
                  ) : (
                    <span>Send Password Reset Email</span>
                  )}
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '4px 0' }}>
                  <div style={{ flex: 1, height: '1px', background: '#E5E0D8' }} />
                  <span style={{ fontSize: '11px', color: '#7A8D94', fontWeight: 600 }}>OR SET NEW PASSWORD</span>
                  <div style={{ flex: 1, height: '1px', background: '#E5E0D8' }} />
                </div>

                <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <input
                    type="password"
                    placeholder="New password (min 6 characters)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '1.5px solid #E5E0D8',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                  <button
                    type="submit"
                    disabled={passwordUpdating}
                    style={{
                      padding: '10px',
                      borderRadius: '10px',
                      background: 'var(--brand-petrol, #174A55)',
                      color: '#FFFFFF',
                      fontSize: '13px',
                      fontWeight: 700,
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    {passwordUpdating ? 'Updating...' : 'Update Password'}
                  </button>
                </form>
              </div>
            ) : (
              <div style={{ fontSize: '13px', color: '#7A8D94' }}>
                You are currently in a guest session without an attached email address.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── DATA DELETION CONFIRMATION MODAL ── */}
      {showDeleteModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(17, 26, 32, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 1000
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '20px',
              padding: '24px',
              width: '100%',
              maxWidth: '380px',
              boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#DC2626' }}>
              <AlertTriangle size={22} />
              <div style={{ fontSize: '17px', fontWeight: 800, color: '#111A20' }}>Clear Personal Records</div>
            </div>

            <p style={{ fontSize: '13px', color: '#5A6E75', margin: 0, lineHeight: 1.5 }}>
              This will permanently delete your stored habits, daily tasks, focus logs, meals, and expenses from the database, then sign you out.
            </p>

            <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={deletingData}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '12px',
                  border: '1.5px solid #E5E0D8',
                  background: '#FFFFFF',
                  color: '#111A20',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeletePersonalData}
                disabled={deletingData}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '12px',
                  border: 'none',
                  background: '#DC2626',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {deletingData ? 'Deleting...' : 'Delete & Sign Out'}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav activeTab="profile" onTabChange={(t) => navigate(`/${t}`)} />
    </div>
  )
}
