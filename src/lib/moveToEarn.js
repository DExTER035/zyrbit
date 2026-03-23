import { supabase } from './supabase'

export const calculateMoveZyrons = (km, currentStreak) => {
  const base = Math.min(Math.round(km * 10), 100)

  let streakBonus = 0
  const newStreak = currentStreak + 1
  if (newStreak === 3)  streakBonus = 15
  if (newStreak === 7)  streakBonus = 50
  if (newStreak === 14) streakBonus = 100
  if (newStreak === 30) streakBonus = 300

  return { base, streakBonus, total: base + streakBonus }
}

export const getActivityIcon = (type) => {
  const icons = {
    walk: '🚶', run: '🏃', cycle: '🚴',
    swim: '🏊', yoga: '🧘', gym: '💪'
  }
  return icons[type] || '🏃'
}

export const getKmLabel = (km) => {
  if (km >= 10) return '10+ km — Maximum Orbit! 🏆'
  if (km >= 8)  return '8 km — Incredible! 🔥'
  if (km >= 5)  return '5 km — Strong orbit! 💪'
  if (km >= 3)  return '3 km — Great run! ⭐'
  if (km >= 1)  return '1 km — Good start! 👟'
  return 'Keep moving! 🚶'
}

export const uploadScreenshot = async (file, userId, date) => {
  const ext = file.name.split('.').pop()
  const path = `${userId}/${date}-${Date.now()}.${ext}`
  const { data, error } = await supabase.storage
    .from('move-screenshots')
    .upload(path, file, { upsert: true })
  if (error) throw error
  return data.path
}

export const getScreenshotUrl = async (path) => {
  const { data } = await supabase.storage
    .from('move-screenshots')
    .createSignedUrl(path, 3600)
  return data?.signedUrl
}
