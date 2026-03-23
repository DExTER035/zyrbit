import { supabase } from './supabase.js'

export async function earnZyrons(userId, amount, reason, category = 'general', source = 'app') {
  try {
    const { data: wallet } = await supabase.from('zyron_wallet').select('*').eq('user_id', userId).single()
    
    const today = new Date().toISOString().split('T')[0]
    let currentDailyEarned = wallet?.daily_earned || 0
    let currentLifetimeEarned = wallet?.lifetime_earned || wallet?.total_earned || 0
    let currentBalance = wallet?.balance || 0
    let currentTotalEarned = wallet?.total_earned || 0

    if (wallet && wallet.last_reset_date !== today) {
       currentDailyEarned = 0
    }

    const added = amount > 0 ? amount : 0
    const newBalance = Math.max(0, currentBalance + amount)

    if (!wallet) {
      await supabase.from('zyron_wallet').insert({
        user_id: userId, balance: newBalance, total_earned: added,
        daily_earned: added, lifetime_earned: added, last_reset_date: today,
        rank_id: 0, gravity_score: 0
      })
    } else {
      await supabase.from('zyron_wallet')
        .update({
          balance: newBalance,
          total_earned: currentTotalEarned + added,
          daily_earned: currentDailyEarned + added,
          lifetime_earned: currentLifetimeEarned + added,
          last_reset_date: today,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
    }

    await supabase.from('zyron_transactions').insert({
      user_id: userId, amount, reason, category, source
    })

    const { data: updated } = await supabase.from('zyron_wallet').select('*').eq('user_id', userId).single()
    return updated
  } catch (err) {
    console.error('Zyrons err:', err)
    return null
  }
}

export async function spendZyrons(userId, amount, category = 'general', itemName = 'purchase', ignoreBudget = false) {
  try {
    const { data: wallet } = await supabase.from('zyron_wallet').select('*').eq('user_id', userId).single()
    const available = (wallet?.balance || 0) - (wallet?.escrowed || 0)
    
    if (!wallet || available < amount) return { success: false, reason: 'insufficient' }

    const today = new Date().toISOString().split('T')[0]
    let currentDailySpent = wallet.daily_spent || 0
    
    if (wallet.last_reset_date !== today) {
      currentDailySpent = 0
    }

    if (!ignoreBudget && (currentDailySpent + amount > (wallet.daily_budget || 0)) && (wallet.daily_budget !== null && wallet.daily_budget > 0)) {
      return { success: false, reason: 'budget_exceeded', overBudget: true }
    }

    await supabase.from('zyron_wallet')
      .update({
        balance: wallet.balance - amount,
        daily_spent: currentDailySpent + amount,
        total_spent: (wallet.total_spent || 0) + amount,
        last_reset_date: today,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)

    await supabase.from('zyron_transactions').insert({
      user_id: userId, amount: -amount, reason: itemName, category, source: 'app'
    })

    return { success: true, newBalance: wallet.balance - amount }
  } catch (err) {
    console.error(err)
    return { success: false, reason: 'error' }
  }
}

export async function getWallet(userId) {
  const { data } = await supabase.from('zyron_wallet').select('*').eq('user_id', userId).single()
  if (!data) {
    const { data: created } = await supabase.from('zyron_wallet')
      .insert({ user_id: userId, balance: 0, total_earned: 0, rank_id: 0, gravity_score: 0 })
      .select().single()
    return created
  }
  return data
}

export async function getDailyStats(userId) {
  const todayStart = new Date()
  todayStart.setHours(0,0,0,0)
  
  const { data: txs } = await supabase.from('zyron_transactions')
    .select('*').eq('user_id', userId).gte('created_at', todayStart.toISOString())
    
  let earned = 0, spent = 0
  if (txs) {
    txs.forEach(t => { if (t.amount > 0) earned += t.amount; else spent += Math.abs(t.amount) })
  }
  return { earned, spent, net: earned - spent, txs: txs || [] }
}

export async function getWeeklyStats(userId) {
  const lastWeek = new Date()
  lastWeek.setDate(lastWeek.getDate() - 7)
  lastWeek.setHours(0,0,0,0)
  
  const { data: txs } = await supabase.from('zyron_transactions')
    .select('*').eq('user_id', userId).gte('created_at', lastWeek.toISOString())
    .order('created_at', { ascending: true })
    
  const daily = {}
  for(let i=6; i>=0; i--) {
     const d = new Date()
     d.setDate(d.getDate() - i)
     const dateStr = d.toISOString().split('T')[0]
     daily[dateStr] = { earned: 0, spent: 0, label: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()] }
  }

  let totalEarned = 0, totalSpent = 0

  if (txs) {
    txs.forEach(t => {
      const dateStr = new Date(t.created_at).toISOString().split('T')[0]
      if (daily[dateStr]) {
        if (t.amount > 0) { daily[dateStr].earned += t.amount; totalEarned += t.amount }
        else { daily[dateStr].spent += Math.abs(t.amount); totalSpent += Math.abs(t.amount) }
      }
    })
  }

  const daysArr = Object.values(daily)
  const bestDayObj = [...daysArr].sort((a,b) => b.earned - a.earned)[0]

  return { 
    daily: daysArr,
    totalEarned, totalSpent, net: totalEarned - totalSpent,
    bestDay: bestDayObj?.earned > 0 ? `${bestDayObj.label} +${bestDayObj.earned} ⚡` : '-'
  }
}

export const ZYRON_REWARDS = {
  HABIT_COMPLETE: 10,
  ALL_HABITS_TODAY: 50,
  STREAK_7: 100,
  STREAK_30: 500,
  JOURNAL_SAVE: 15,
  AI_REFRESH: 5,
  HONEST_LOG: 20,
  BAD_LOG: -30,
  HIDDEN_RANK_REVEAL: 500,
  POMODORO_COMPLETE: 5,
}

// ── Zyron Cooldown Helpers ───────────────────────────────────────────────────

const getTodayDate = () => new Date().toISOString().split('T')[0]

const getDayAfterTomorrow = () => {
  const d = new Date()
  d.setDate(d.getDate() + 2)
  return d.toISOString().split('T')[0]
}

/**
 * Returns { eligible: boolean, nextEligible: string|null }
 * Checks zyron_cooldowns table — habit earnable every 48h
 */
export const checkZyronEligibility = async (userId, habitId) => {
  const today = getTodayDate()
  const { data } = await supabase
    .from('zyron_cooldowns')
    .select('last_earned_date, next_eligible_date')
    .eq('user_id', userId)
    .eq('habit_id', habitId)
    .maybeSingle()

  if (!data) return { eligible: true, nextEligible: null }
  if (today >= data.next_eligible_date) return { eligible: true, nextEligible: null }
  return { eligible: false, nextEligible: data.next_eligible_date }
}

/**
 * Sets or updates the 48h cooldown after earning Zyrons for a habit
 */
export const setZyronCooldown = async (userId, habitId) => {
  await supabase
    .from('zyron_cooldowns')
    .upsert({
      user_id: userId,
      habit_id: habitId,
      last_earned_date: getTodayDate(),
      next_eligible_date: getDayAfterTomorrow(),
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,habit_id' })
}

/**
 * Loads all active cooldowns for a user as a map: { habitId: nextEligibleDate }
 */
export const loadCooldownMap = async (userId) => {
  const today = getTodayDate()
  const { data } = await supabase
    .from('zyron_cooldowns')
    .select('habit_id, next_eligible_date')
    .eq('user_id', userId)
    .gt('next_eligible_date', today)
  const map = {}
  data?.forEach(c => { map[c.habit_id] = c.next_eligible_date })
  return map
}

export const formatNextEligible = (dateStr) => {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]
  return dateStr === tomorrowStr ? 'tomorrow' : 'in 2 days'
}
