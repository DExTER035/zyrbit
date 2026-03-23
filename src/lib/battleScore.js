/**
 * Fair battle scoring:
 * Score = (habits_done / habits_total) * 60 + (days_active / 7) * 40
 * Max: 100 points
 */
export const calcBattleScore = (habitsDone, habitsTotal, daysActive, totalDays = 7) => {
  if (!habitsTotal || habitsTotal === 0) return 0
  const habitPct = Math.min(1, habitsDone / habitsTotal)
  const dayPct = Math.min(1, daysActive / totalDays)
  return Math.round(habitPct * 60 + dayPct * 40)
}

export const getBattleResult = (myScore, oppScore) => {
  if (myScore > oppScore) return 'winning'
  if (myScore < oppScore) return 'losing'
  return 'tied'
}
