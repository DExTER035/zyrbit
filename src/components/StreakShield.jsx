import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { showToast } from './Toast'

/**
 * StreakShield — Pro overlay that appears when a habit was missed yesterday
 * and the user still has a shield available (shop_purchases.item_id = 'orbit_shield').
 *
 * Supabase tables used:
 *  - habits            — habit name, id
 *  - activity_log      — completed_date, status, habit_id
 *  - user_streaks      — current_streak per habit_id
 *  - shop_purchases    — item_id = 'orbit_shield' marks shield ownership
 *  - profiles          — shield_used_month, shield_used_year columns (upserted here)
 */
export default function StreakShield({ user, habits, activity, streaks }) {
  const [target, setTarget] = useState(null)      // { habit, savedStreak }
  const [shieldAvailable, setShieldAvailable] = useState(false)
  const [shieldUsed, setShieldUsed] = useState(false)
  const [saving, setSaving] = useState(false)
  const checked = useRef(false)

  useEffect(() => {
    if (!user || !habits.length || !activity.length || checked.current) return
    checked.current = true
    runCheck()
  }, [user, habits, activity])

  const runCheck = async () => {
    const now = new Date()
    const currentMonth = now.getMonth() + 1
    const currentYear = now.getFullYear()

    // 1. Check if user owns a shield
    const { data: purchases } = await supabase
      .from('shop_purchases')
      .select('item_id')
      .eq('user_id', user.id)
      .eq('item_id', 'orbit_shield')
    if (!purchases || purchases.length === 0) return

    // 2. Check if already used this month
    const { data: profile } = await supabase
      .from('profiles')
      .select('shield_used_month, shield_used_year')
      .eq('id', user.id)
      .single()
    
    if (profile?.shield_used_month === currentMonth && profile?.shield_used_year === currentYear) {
      setShieldUsed(true)
      return
    }

    setShieldAvailable(true)

    // 3. Find any habit missed yesterday with streak >= 3
    const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('en-CA')
    const missedHabits = habits.filter(h => {
      const wasLoggedYesterday = activity.some(a => a.habit_id === h.id && a.completed_date === yesterday && a.status === 'completed')
      const currentStreak = streaks[h.id] || 0
      return !wasLoggedYesterday && currentStreak >= 3
    })

    if (missedHabits.length > 0) {
      const habit = missedHabits[0]
      setTarget({ habit, savedStreak: streaks[habit.id] || 3 })
    }
  }

  const handleUseShield = async () => {
    if (!target || saving) return
    setSaving(true)
    const now = new Date()

    // Insert a back-dated log for yesterday to preserve the streak
    const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('en-CA')
    await supabase.from('activity_log').insert({
      user_id: user.id,
      habit_id: target.habit.id,
      completed_date: yesterday,
      status: 'shield_protected'
    })

    // Mark shield used this month
    await supabase.from('profiles').upsert({
      id: user.id,
      shield_used_month: now.getMonth() + 1,
      shield_used_year: now.getFullYear()
    }, { onConflict: 'id' })

    setSaving(false)
    setShieldUsed(true)
    setTarget(null)
    showToast('🛡️ Streak saved by your Orbit Shield!', 'success')
  }

  const handleLetReset = () => {
    setTarget(null)
    showToast('Streak reset. Start fresh today! 🔥', 'warning')
  }

  // Nothing to show
  if (!target) return null

  return (
    <div
      className="animate-fadeSlideUp"
      style={{
        position: 'fixed', inset: 0, zIndex: 250,
        background: 'rgba(0,0,0,0.92)',
        backdropFilter: 'blur(16px)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '0 24px'
      }}
    >
      {/* Shield SVG Icon */}
      <div style={{ marginBottom: 24 }}>
        <svg width="80" height="90" viewBox="0 0 80 90" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M40 4L8 18V44C8 62 22 78 40 86C58 78 72 62 72 44V18L40 4Z"
            fill="#EF9F2715"
            stroke="#EF9F27"
            strokeWidth="2.5"
          />
          <text x="40" y="56" textAnchor="middle" fontSize="28" fill="#EF9F27">🛡️</text>
        </svg>
      </div>

      <div style={{ fontSize: 11, color: '#EF9F27', fontWeight: 900, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>Orbit Shield</div>
      <div style={{ fontSize: 20, fontWeight: 900, color: '#FFF', textAlign: 'center', marginBottom: 10 }}>
        You missed <span style={{ color: '#EF9F27' }}>{target.habit.name}</span> yesterday
      </div>
      <div style={{ fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 1.6, marginBottom: 32 }}>
        Your <span style={{ color: '#EF9F27', fontWeight: 800 }}>{target.savedStreak}-day streak</span> is at risk.<br />
        Use your shield to protect it?
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 320 }}>
        <button
          onClick={handleUseShield}
          disabled={saving}
          style={{
            background: 'linear-gradient(135deg, #EF9F27, #FF6B00)',
            color: '#000', border: 'none',
            borderRadius: 16, padding: '16px 24px',
            fontSize: 15, fontWeight: 900, cursor: 'pointer',
            opacity: saving ? 0.7 : 1, transition: 'all 0.2s',
            boxShadow: '0 4px 20px #EF9F2740'
          }}
        >
          {saving ? 'Activating...' : '🛡️ Use Shield'}
        </button>
        <button
          onClick={handleLetReset}
          disabled={saving}
          style={{
            background: 'transparent', color: '#555566',
            border: '1px solid #1e1e2e', borderRadius: 16,
            padding: '14px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer'
          }}
        >
          Let it reset
        </button>
      </div>

      {shieldAvailable && (
        <div style={{ marginTop: 20, fontSize: 11, color: '#333344', fontWeight: 700 }}>
          1 shield remaining · Resets 1st of each month
        </div>
      )}
    </div>
  )
}
