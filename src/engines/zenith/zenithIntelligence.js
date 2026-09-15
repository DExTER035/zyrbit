/**
 * Zenith Intelligence Engine — Deterministic Habit Impact & Correlation Engine
 * Zyrbit V1 — Phase 13.3
 */

export function sanitizeNumber(val, defaultVal = 0) {
  if (val === null || val === undefined) return defaultVal;
  const n = Number(val);
  return isFinite(n) && !isNaN(n) ? n : defaultVal;
}

const FORBIDDEN_CAUSAL_WORDS = [
  'causes', 'caused', 'improves', 'boosts', 'guarantees',
  'makes you', 'will increase', 'proves', 'medically'
];

export function buildHabitImpactExplanation(focusDiff, sampleSize, status) {
  const diff = Math.round(sanitizeNumber(focusDiff, 0));

  if (status === 'insufficient_data') {
    return 'Need 7 days for an impact insight';
  }

  if (diff > 0) {
    return `Associated with +${diff}m focus`;
  }
  if (diff < 0) {
    return `Associated with −${Math.abs(diff)}m focus`;
  }
  return 'No clear focus association yet';
}

export function computeHabitImpact(habitId, activityLogs = [], dailyMetrics = []) {
  const disclaimer = 'Based on your logged data.';

  if (!habitId || !Array.isArray(activityLogs) || !Array.isArray(dailyMetrics) || dailyMetrics.length === 0) {
    return {
      status: 'insufficient_data',
      sampleSize: 0,
      completionDays: 0,
      missedDays: 0,
      completedAverageFocus: 0,
      missedAverageFocus: 0,
      focusDifference: 0,
      completedAverageOS: 0,
      missedAverageOS: 0,
      osDifference: 0,
      explanation: 'Need 7 days for an impact insight',
      disclaimer,
    };
  }

  const completedDates = new Set(
    activityLogs
      .filter(l => l && l.habit_id === habitId && l.status === 'completed' && l.completed_date)
      .map(l => l.completed_date)
  );

  // Consider last 30 daily metrics observations
  const validMetrics = dailyMetrics
    .filter(m => m && m.log_date)
    .slice(-30);

  const sampleSize = validMetrics.length;

  if (sampleSize < 7) {
    return {
      status: 'insufficient_data',
      sampleSize,
      completionDays: 0,
      missedDays: 0,
      completedAverageFocus: 0,
      missedAverageFocus: 0,
      focusDifference: 0,
      completedAverageOS: 0,
      missedAverageOS: 0,
      osDifference: 0,
      explanation: 'Need 7 days for an impact insight',
      disclaimer,
    };
  }

  let completedFocusSum = 0;
  let completedFocusCount = 0;
  let missedFocusSum = 0;
  let missedFocusCount = 0;

  let completedOSSum = 0;
  let completedOSCount = 0;
  let missedOSSum = 0;
  let missedOSCount = 0;

  validMetrics.forEach(m => {
    const isDone = completedDates.has(m.log_date);
    const focusVal = sanitizeNumber(m.focus_minutes, null);
    const osVal = sanitizeNumber(m.os_score, null);

    if (focusVal !== null) {
      if (isDone) {
        completedFocusSum += Math.max(0, focusVal);
        completedFocusCount++;
      } else {
        missedFocusSum += Math.max(0, focusVal);
        missedFocusCount++;
      }
    }

    if (osVal !== null) {
      if (isDone) {
        completedOSSum += Math.max(0, osVal);
        completedOSCount++;
      } else {
        missedOSSum += Math.max(0, osVal);
        missedOSCount++;
      }
    }
  });

  const completedAverageFocus = completedFocusCount > 0 ? Math.round(completedFocusSum / completedFocusCount) : 0;
  const missedAverageFocus = missedFocusCount > 0 ? Math.round(missedFocusSum / missedFocusCount) : 0;
  const focusDifference = completedAverageFocus - missedAverageFocus;

  const completedAverageOS = completedOSCount > 0 ? Math.round(completedOSSum / completedOSCount) : 0;
  const missedAverageOS = missedOSCount > 0 ? Math.round(missedOSSum / missedOSCount) : 0;
  const osDifference = completedAverageOS - missedAverageOS;

  const status = sampleSize >= 14 ? 'stable_trend' : 'early_trend';
  const explanation = buildHabitImpactExplanation(focusDifference, sampleSize, status);

  // Non-causal safety assertion check
  const hasForbiddenWord = FORBIDDEN_CAUSAL_WORDS.some(word => explanation.toLowerCase().includes(word));
  const safeExplanation = hasForbiddenWord ? 'Associated with daily execution patterns' : explanation;

  return {
    status,
    sampleSize,
    completionDays: completedFocusCount,
    missedDays: missedFocusCount,
    completedAverageFocus,
    missedAverageFocus,
    focusDifference,
    completedAverageOS,
    missedAverageOS,
    osDifference,
    explanation: safeExplanation,
    disclaimer,
  };
}
