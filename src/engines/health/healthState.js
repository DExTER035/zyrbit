/**
 * Zyrbit V1 — Health State Engine
 * Pure deterministic multi-dimensional representation of the user's physical state.
 * Composes Sleep, Hydration, Fuel (Nutrition), Movement, Weight, and Bio-Pacing.
 * Zero external AI / Zero API calls / Zero React or DB dependencies.
 */

import {
  sanitizeNumber,
  calculateSleepDebt,
  calculateDynamicWaterTarget,
  calculateBioPacingForecast,
} from './healthCalculator.js';
import { calculateDailyTotals } from '../food/nutritionCalculator.js';
import { computeMacroBalanceGuidance } from '../food/foodIntelligence.js';

/**
 * Computes a calm, multi-dimensional Health State from physical telemetry and targets.
 *
 * @param {Object} telemetry
 * @param {Array} [telemetry.sleepLogs=[]] - Rolling sleep entries (descending by sleep_date)
 * @param {Array} [telemetry.waterLogs=[]] - Today's water entries
 * @param {Array} [telemetry.moveLogs=[]] - Rolling workout entries (descending by log_date)
 * @param {Array} [telemetry.mealLogs=[]] - Today's meal logs
 * @param {Array} [telemetry.weightLogs=[]] - Historical weight entries (descending by log_date)
 * @param {string} [telemetry.todayStr=''] - YYYY-MM-DD for today
 * @param {Object} [settings={}] - User food/nutrition settings (calorie_goal, protein_goal, etc.)
 * @returns {Object} Comprehensive Health State object
 */
export function computeHealthState(telemetry = {}, settings = {}) {
  const {
    sleepLogs = [],
    waterLogs = [],
    moveLogs = [],
    mealLogs = [],
    weightLogs = [],
    todayStr = '',
  } = telemetry;

  // ─── 1. SLEEP PILLAR ───────────────────────────────────────────────────────
  const lastSleep = (sleepLogs || [])[0] || null;
  const rawSleepHours = lastSleep ? (lastSleep.duration_hours ?? lastSleep.hours) : null;
  const isSleepTracked = rawSleepHours != null;
  const sleepHours = isSleepTracked ? sanitizeNumber(rawSleepHours, null) : null;
  const sleepQuality = isSleepTracked ? (lastSleep.quality != null ? lastSleep.quality : 3) : null;
  const targetSleep = Math.max(4, Math.min(12, sanitizeNumber(settings?.sleep_target_hours ?? settings?.targetSleepHours, 7.5)));
  const sleepDebt = calculateSleepDebt(sleepLogs, targetSleep);



  let sleepStatus = 'unlogged';
  let sleepSummary = 'No sleep recorded yet';
  if (isSleepTracked) {
    if (sleepDebt > 3.0) {
      sleepStatus = 'depleted';
      sleepSummary = `Sleep debt elevated (+${sleepDebt.toFixed(1)}h)`;
    } else if (sleepDebt > 1.0) {
      sleepStatus = 'recovering';
      sleepSummary = `Moderate debt (+${sleepDebt.toFixed(1)}h)`;
    } else if (sleepDebt <= -1.0) {
      sleepStatus = 'rested';
      sleepSummary = `${Math.abs(sleepDebt).toFixed(1)}h sleep banked`;
    } else {
      sleepStatus = 'rested';
      sleepSummary = 'Sleep on track';
    }
  }

  // ─── 2. HYDRATION PILLAR ───────────────────────────────────────────────────
  const todayWater = (waterLogs || []).reduce(
    (sum, w) => sum + Math.max(0, sanitizeNumber(w?.amount_ml ?? w?.amount, 0)),
    0
  );

  const todayMoves = (moveLogs || []).filter((m) => {
    if (!m) return false;
    if (!todayStr) return true;
    return m.log_date === todayStr;
  });
  const todayExerciseMins = todayMoves.reduce(
    (sum, m) => sum + Math.max(0, sanitizeNumber(m?.active_minutes ?? m?.duration_minutes ?? m?.minutes, 0)),
    0
  );

  const baseWaterMl = Math.max(1000, sanitizeNumber(settings?.water_target_ml ?? settings?.targetWaterMl, 3000));
  const dynamicWaterTarget = calculateDynamicWaterTarget(todayExerciseMins, baseWaterMl);

  const waterRatio = dynamicWaterTarget > 0 ? Math.min(1.0, todayWater / dynamicWaterTarget) : 0;
  const waterRemaining = Math.max(0, dynamicWaterTarget - todayWater);
  const isHydrationTracked = (waterLogs || []).length > 0;

  let hydrationStatus = 'unlogged';
  let hydrationSummary = '0ml logged today';
  if (isHydrationTracked) {
    if (todayWater >= dynamicWaterTarget) {
      hydrationStatus = 'optimal';
      hydrationSummary = 'Hydration goal met';
    } else if (waterRatio >= 0.6) {
      hydrationStatus = 'on_track';
      hydrationSummary = `${waterRemaining}ml remaining`;
    } else {
      hydrationStatus = 'behind';
      hydrationSummary = `Lagging behind (${todayWater}/${dynamicWaterTarget}ml)`;
    }
  }

  // ─── 3. FUEL (NUTRITION) PILLAR ───────────────────────────────────────────
  const dailyNutrition = calculateDailyTotals(mealLogs || []);
  const targetCalories = Math.max(0, sanitizeNumber(settings?.calorie_goal, 2200));
  const targetProtein = Math.max(0, sanitizeNumber(settings?.protein_goal, 130));
  const targetCarbs = Math.max(0, sanitizeNumber(settings?.carbs_goal, 250));
  const targetFat = Math.max(0, sanitizeNumber(settings?.fat_goal, 70));
  const targetFiber = Math.max(0, sanitizeNumber(settings?.fiber_goal, 30));

  const calories = Math.round(dailyNutrition.calories);
  const protein = Math.round(dailyNutrition.protein * 10) / 10;
  const carbs = Math.round(dailyNutrition.carbs * 10) / 10;
  const fat = Math.round(dailyNutrition.fat * 10) / 10;
  const fiber = Math.round(dailyNutrition.fiber * 10) / 10;
  const mealCount = (mealLogs || []).length;
  const isFuelTracked = mealCount > 0;

  const macroGuidance = computeMacroBalanceGuidance(
    { cal: calories, protein },
    { calorie_goal: targetCalories, protein_goal: targetProtein }
  );

  let fuelStatus = 'unlogged';
  let fuelSummary = 'No meals logged today';
  if (isFuelTracked) {
    if (calories >= targetCalories) {
      fuelStatus = 'fueled';
      fuelSummary = `${calories} / ${targetCalories} kcal (Target reached)`;
    } else if (calories >= targetCalories * 0.65) {
      fuelStatus = 'on_track';
      fuelSummary = `${targetCalories - calories} kcal remaining`;
    } else {
      fuelStatus = 'light';
      fuelSummary = `${calories} kcal logged · ${protein}g protein`;
    }
  }

  // ─── 4. MOVEMENT PILLAR ───────────────────────────────────────────────────
  const todayMaxRpe = todayMoves.length > 0
    ? Math.max(...todayMoves.map((m) => sanitizeNumber(m?.rpe ?? m?.intensity_rpe, 5)))
    : null;
  const lastActivity = todayMoves[0] || (moveLogs || [])[0] || null;
  const workoutCount7d = (moveLogs || []).length;
  const isMovementTracked = todayMoves.length > 0;

  let movementStatus = 'rest';
  let movementSummary = 'Rest or active recovery';
  if (isMovementTracked) {
    if (todayMaxRpe >= 8 || todayExerciseMins >= 75) {
      movementStatus = 'high_strain';
      movementSummary = `${todayExerciseMins}m high intensity (${lastActivity?.activity_type || 'Workout'})`;
    } else {
      movementStatus = 'active';
      movementSummary = `${todayExerciseMins}m (${lastActivity?.activity_type || 'Active'})`;
    }
  } else if (workoutCount7d > 0) {
    movementSummary = `${workoutCount7d} workout${workoutCount7d === 1 ? '' : 's'} this week`;
  }

  // ─── 5. WEIGHT PILLAR ─────────────────────────────────────────────────────
  const latestWeight = (weightLogs || [])[0] || null;
  const rawWeight = latestWeight ? (latestWeight.weight ?? latestWeight.weight_kg) : null;
  const isWeightTracked = Boolean(latestWeight && rawWeight != null);
  const currentKg = isWeightTracked ? sanitizeNumber(rawWeight, null) : null;
  const lastWeightDate = latestWeight ? (latestWeight.log_date || latestWeight.logged_at || null) : null;

  let weightTrend = null;
  if ((weightLogs || []).length >= 2) {
    const oldestInSample = weightLogs[Math.min(weightLogs.length - 1, 6)];
    const oldestWeight = oldestInSample ? (oldestInSample.weight ?? oldestInSample.weight_kg) : null;
    if (oldestWeight != null && currentKg != null) {
      weightTrend = Number((currentKg - oldestWeight).toFixed(1));
    }
  }


  // ─── 6. BIO-PACING & READINESS ────────────────────────────────────────────
  const hasAnyData = isSleepTracked || isHydrationTracked || isFuelTracked || isMovementTracked;

  // Approximate physical energy level from sleep restedness and hydration ratio
  let energyScore = 50;
  if (isSleepTracked) {
    energyScore = sleepDebt <= 1.0 ? 80 : sleepDebt <= 2.5 ? 65 : 40;
  }
  if (isHydrationTracked && waterRatio < 0.4) {
    energyScore = Math.max(30, energyScore - 10);
  }

  const pacing = calculateBioPacingForecast(energyScore, sleepDebt, hasAnyData);

  // Overall human headline
  let headline = 'Physical baseline nominal.';
  if (!hasAnyData) {
    headline = 'Record your morning sleep or water to activate Health State.';
  } else if (sleepDebt > 3.0) {
    headline = 'Physical stamina low. Rest protocol & light pacing recommended.';
  } else if (energyScore >= 75) {
    headline = 'Indicators optimal. Steady energy available for deep execution.';
  } else {
    headline = 'Moderate energy. Maintain steady routine and fuel intake.';
  }

  return {
    hasData: hasAnyData,
    headline,
    sleep: {
      hours: sleepHours,
      debt: Number(sleepDebt.toFixed(1)),
      quality: sleepQuality,
      status: sleepStatus,
      summary: sleepSummary,
      isTracked: isSleepTracked,
    },
    hydration: {
      ml: todayWater,
      targetMl: dynamicWaterTarget,
      ratio: Number(waterRatio.toFixed(2)),
      remainingMl: waterRemaining,
      status: hydrationStatus,
      summary: hydrationSummary,
      isTracked: isHydrationTracked,
    },
    fuel: {
      calories,
      protein,
      carbs,
      fat,
      fiber,
      targetCalories,
      targetProtein,
      targetCarbs,
      targetFat,
      targetFiber,
      mealCount,
      balance: macroGuidance,
      status: fuelStatus,
      summary: fuelSummary,
      isTracked: isFuelTracked,
    },
    movement: {
      activeMinutes: todayExerciseMins,
      todayRpe: todayMaxRpe,
      workoutCount7d,
      lastType: lastActivity?.activity_type || null,
      status: movementStatus,
      summary: movementSummary,
      isTracked: isMovementTracked,
    },
    weight: {
      currentKg,
      lastLoggedDate: lastWeightDate,
      trend: weightTrend,
      isTracked: isWeightTracked,
    },
    pacing: {
      focusCapacity: pacing.focusCapacity,
      caffeineCutoff: pacing.caffeineCutoff,
      recommendedWorkType: pacing.recommendedWorkType,
      recommendation: pacing.recommendedWorkType || pacing.explanation || 'Normal operating rhythm',
      level: pacing.level,
      explanation: pacing.explanation,
    },

  };
}
