/**
 * Zyrbit V1 — Health Calculation & Recovery Readiness Engine
 * Pure deterministic physical readiness, sleep debt, hydration, and strain calculations.
 * Zero external AI / Zero API calls / Zero React & DB dependencies.
 */

/**
 * Sanitizes numeric input safely against NaN, Infinity, null, and non-finite values.
 */
export function sanitizeNumber(val, defaultVal = 0) {
  const n = Number(val);
  return isFinite(n) && !isNaN(n) ? n : defaultVal;
}

/**
 * Computes accumulated sleep debt over rolling sleep logs.
 */
export function calculateSleepDebt(sleepLogs = [], targetSleep = 7.5) {
  return (sleepLogs || []).reduce((acc, log) => {
    const hrs = sanitizeNumber(log?.duration_hours, targetSleep);
    return acc + (targetSleep - hrs);
  }, 0);
}

/**
 * Computes dynamic water target based on active exercise minutes.
 */
export function calculateDynamicWaterTarget(todayExerciseMins = 0, baseMl = 3000) {
  const safeMins = Math.max(0, sanitizeNumber(todayExerciseMins, 0));
  return baseMl + (Math.floor(safeMins / 30) * 500);
}

/**
 * Calculates sleep score component (0-100).
 */
export function calculateSleepScore(sleepDebt = 0) {
  const debt = Math.max(0, sanitizeNumber(sleepDebt, 0));
  return Math.max(0, 100 - (debt * 12));
}

/**
 * Calculates quality score component (0-100).
 */
export function calculateQualityScore(quality = 3) {
  const q = Math.max(1, Math.min(5, Math.round(sanitizeNumber(quality, 3))));
  return q * 20;
}

/**
 * Calculates hydration ratio (0.0 to 1.0).
 */
export function calculateHydrationRatio(todayWater = 0, dynamicTarget = 3000) {
  const water = Math.max(0, sanitizeNumber(todayWater, 0));
  const target = Math.max(1000, sanitizeNumber(dynamicTarget, 3000));
  return Math.min(1.0, water / target);
}

/**
 * Calculates overexertion strain penalty.
 */
export function calculateStrainPenalty(todayExerciseMins = 0, todayMaxRpe = 5, sleepDebt = 0) {
  const mins = Math.max(0, sanitizeNumber(todayExerciseMins, 0));
  const rpe = Math.max(1, Math.min(10, sanitizeNumber(todayMaxRpe, 5)));
  const debt = sanitizeNumber(sleepDebt, 0);

  const isOverexerted = mins > 90 && debt > 3.0;
  return isOverexerted ? Math.min(15, (mins / 60) * rpe) : 0;
}

/**
 * Calculates overall Recovery Readiness Score (0-100).
 */
export function calculateRecoveryReadiness(sleepLogs = [], waterLogs = [], moveLogs = [], todayStr = '') {
  const targetSleep = 7.5;
  const debt = calculateSleepDebt(sleepLogs, targetSleep);
  const sleepScore = calculateSleepScore(debt);

  const lastSleep = (sleepLogs || [])[0];
  const lastQuality = lastSleep ? sanitizeNumber(lastSleep.quality, 3) : 3;
  const qualityScore = calculateQualityScore(lastQuality);
  const sleepContribution = (sleepScore * 0.5) + (qualityScore * 0.3);

  const todayWater = (waterLogs || []).reduce((sum, w) => sum + Math.max(0, sanitizeNumber(w?.amount_ml, 0)), 0);
  const todayExerciseMins = (moveLogs || [])
    .filter(m => m && m.log_date === todayStr)
    .reduce((sum, m) => sum + Math.max(0, sanitizeNumber(m?.active_minutes, 0)), 0);

  const dynamicWaterTarget = calculateDynamicWaterTarget(todayExerciseMins);
  const waterRatio = calculateHydrationRatio(todayWater, dynamicWaterTarget);
  const hydrationContribution = waterRatio * 100 * 0.2;

  const todayMaxRpe = (moveLogs || []).length > 0
    ? Math.max(...(moveLogs || []).map(m => sanitizeNumber(m?.rpe, 5)), 0)
    : 5;
  const strainPenalty = calculateStrainPenalty(todayExerciseMins, todayMaxRpe, debt);

  const rawScore = Math.round(sleepContribution + hydrationContribution - strainPenalty);
  return Math.max(0, Math.min(100, rawScore));
}

/**
 * Returns calm status text for a recovery score.
 */
export function getRecoveryStatus(score = 50) {
  const s = sanitizeNumber(score, 50);
  if (s >= 80) return { status: 'optimal', text: 'Good recovery', color: '#1FA36F' };
  if (s >= 60) return { status: 'moderate', text: 'Moderate recovery', color: '#14B8A6' };
  if (s >= 40) return { status: 'attention', text: 'Recovery could use attention', color: '#F59E0B' };
  return { status: 'low', text: 'Low recovery', color: '#EF4444' };
}

/**
 * Generates deterministic explanations for the recovery readiness result.
 */
export function getRecoveryExplanations(sleepLogs = [], waterLogs = [], moveLogs = [], todayStr = '', recoveryScore = 50) {
  const debt = calculateSleepDebt(sleepLogs);
  const todayWater = (waterLogs || []).reduce((sum, w) => sum + Math.max(0, sanitizeNumber(w?.amount_ml, 0)), 0);
  const todayExerciseMins = (moveLogs || [])
    .filter(m => m && m.log_date === todayStr)
    .reduce((sum, m) => sum + Math.max(0, sanitizeNumber(m?.active_minutes, 0)), 0);
  const dynamicTarget = calculateDynamicWaterTarget(todayExerciseMins);

  const explanations = [];

  if (recoveryScore < 50) {
    explanations.push('Physical stamina is depleted. Rest protocol advised.');
  }
  if (todayWater < dynamicTarget * 0.5) {
    explanations.push(`Hydration is lagging behind target (${todayWater}/${dynamicTarget} ml).`);
  }
  if (debt > 3.0) {
    explanations.push(`Sleep debt is elevated (+${debt.toFixed(1)}h over target).`);
  }
  if (explanations.length === 0) {
    explanations.push('Physical indicators optimal. Ready for deep focus blocks.');
  }

  return {
    explanations,
    disclaimer: 'Based on your logged Health data.',
  };
}

// ─── Input Validation Helpers ────────────────────────────────────────────────
export function validateWaterLog(amount_ml) {
  const amt = Number(amount_ml);
  if (!isFinite(amt) || isNaN(amt) || amt < 50 || amt > 3000) {
    return { valid: false, error: 'Water amount must be between 50ml and 3,000ml.' };
  }
  return { valid: true, value: Math.round(amt) };
}

export function validateSleepLog(duration_hours, quality) {
  const hrs = Number(duration_hours);
  const qual = Number(quality);

  if (!isFinite(hrs) || isNaN(hrs) || hrs < 0.5 || hrs > 24) {
    return { valid: false, error: 'Sleep duration must be between 0.5h and 24h.' };
  }
  if (!isFinite(qual) || isNaN(qual) || qual < 1 || qual > 5) {
    return { valid: false, error: 'Sleep quality must be between 1 and 5.' };
  }

  return { valid: true, hours: Number(hrs.toFixed(1)), quality: Math.round(qual) };
}

export function validateWorkoutLog(active_minutes, rpe) {
  const mins = Number(active_minutes);
  const intensity = Number(rpe);

  if (!isFinite(mins) || isNaN(mins) || mins < 1 || mins > 1440) {
    return { valid: false, error: 'Active workout minutes must be between 1m and 1,440m.' };
  }
  if (!isFinite(intensity) || isNaN(intensity) || intensity < 1 || intensity > 10) {
    return { valid: false, error: 'RPE intensity must be between 1 and 10.' };
  }

  return { valid: true, minutes: Math.round(mins), rpe: Math.round(intensity) };
}

/**
 * Calculates Bio-Pacing & Focus Energy Forecast.
 * Translates Recovery Readiness and Sleep Debt into calm, non-medical pacing guidelines.
 */
export function calculateBioPacingForecast(readinessScore, sleepDebt, hasLogs = true) {
  const rawScore = sanitizeNumber(readinessScore, 50);
  const score = Math.max(0, Math.min(100, Math.round(rawScore)));
  const debt = sanitizeNumber(sleepDebt, 0);

  if (!hasLogs) {
    return {
      focusCapacity: 'Limited data',
      recommendedWorkType: 'Use your current energy as the guide',
      caffeineCutoff: 'Planning guidance unavailable',
      level: 'insufficient_data',
      explanation: 'Log more Health data to improve this pacing estimate.',
      disclaimer: 'Based on your logged Health data.',
    };
  }

  if (score >= 80 && debt <= 1.0) {
    return {
      focusCapacity: 'High (Up to 4 Deep Focus Blocks)',
      caffeineCutoff: '2:00 PM',
      recommendedWorkType: 'Complex Execution & Problem Solving',
      level: 'high',
      explanation: 'Physical recovery is optimal for demanding work.',
      disclaimer: 'Based on your logged Health data.',
    };
  }

  if (score >= 60) {
    return {
      focusCapacity: 'Moderate (2-3 Focus Blocks)',
      caffeineCutoff: '1:00 PM',
      recommendedWorkType: 'Standard Tasks & Structured Work',
      level: 'moderate',
      explanation: 'Physical energy is steady for standard tasks.',
      disclaimer: 'Based on your logged Health data.',
    };
  }

  return {
    focusCapacity: 'Limited (1 Light Block + Rest)',
    caffeineCutoff: '12:00 PM',
    recommendedWorkType: 'Light Administration & Recovery',
    level: 'limited',
    explanation: 'Physical stamina is low; consider lighter tasks today.',
    disclaimer: 'Based on your logged Health data.',
  };
}

