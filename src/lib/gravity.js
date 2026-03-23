/**
 * Gravity Score Formula:
 * completion_rate_7days × 60 +
 * current_streak × 0.5 (max 20) +
 * active_days_30 × 0.67 (max 20)
 * Cap at 100
 */
export function calculateGravityScore({ completionRate7Days = 0, currentStreak = 0, activeDays30 = 0 }) {
  const part1 = completionRate7Days * 60
  const part2 = Math.min(currentStreak * 0.5, 20)
  const part3 = Math.min(activeDays30 * 0.67, 20)
  return Math.min(100, Math.round(part1 + part2 + part3))
}

export function getGravityStatus(score) {
  if (score >= 86) return { label: 'Perfect Orbit 🌟', color: '#00FFFF' }
  if (score >= 70) return { label: 'Strong Orbit 🪐', color: '#9C27B0' }
  if (score >= 50) return { label: 'Stable Orbit ⭐', color: '#FFC107' }
  if (score >= 30) return { label: 'Weak Orbit 🌙', color: '#FF9800' }
  return { label: 'Drifting 💨', color: '#F44336' }
}

export function getGravityColor(score) {
  if (score >= 86) return '#00FFFF'
  if (score >= 70) return '#9C27B0'
  if (score >= 50) return '#FFC107'
  if (score >= 30) return '#FF9800'
  return '#F44336'
}

export async function computeGravityScore(supabase, userId) {
  try {
    const today = new Date()
    const sevenDaysAgo = new Date(today)
    sevenDaysAgo.setDate(today.getDate() - 7)
    const thirtyDaysAgo = new Date(today)
    thirtyDaysAgo.setDate(today.getDate() - 30)

    const fmt = (d) => d.toISOString().split('T')[0]

    // Get habit count
    const { data: habits } = await supabase
      .from('habits')
      .select('id')
      .eq('user_id', userId)

    if (!habits || habits.length === 0) return 0

    const habitCount = habits.length

    // 7-day completions
    const { data: logs7 } = await supabase
      .from('activity_log')
      .select('completed_date, status')
      .eq('user_id', userId)
      .gte('completed_date', fmt(sevenDaysAgo))
      .eq('status', 'completed')

    const completed7 = logs7?.length || 0
    const maxPossible7 = habitCount * 7
    const completionRate7Days = maxPossible7 > 0 ? completed7 / maxPossible7 : 0

    // Best current streak
    const { data: streaks } = await supabase
      .from('user_streaks')
      .select('current_streak')
      .eq('user_id', userId)

    const currentStreak = streaks?.reduce((max, s) => Math.max(max, s.current_streak || 0), 0) || 0

    // Active days in last 30
    const { data: logs30 } = await supabase
      .from('activity_log')
      .select('completed_date')
      .eq('user_id', userId)
      .gte('completed_date', fmt(thirtyDaysAgo))
      .eq('status', 'completed')

    const uniqueDays30 = new Set(logs30?.map(l => l.completed_date) || [])
    const activeDays30 = uniqueDays30.size

    return calculateGravityScore({ completionRate7Days, currentStreak, activeDays30 })
  } catch (err) {
    console.error('Gravity score error:', err)
    return 0
  }
}
