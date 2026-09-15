/**
 * Zyrbit V1 — Food Intelligence Engine (v3 Micro-Fix)
 * Strict UUID food_id identity matching for user_food_library items.
 * Zero string fuzzy matching for primary identity.
 */

/**
 * Computes deterministic "Your Usuals" based on personal foods & logged meal frequency/recency.
 * Uses food_id UUID exclusively for personal food identity.
 * 
 * @param {Array} personalFoods - Array of user_food_library objects
 * @param {Array} mealLogs - Array of historical meal_logs entries
 * @param {number} limit - Maximum usuals to return (default 6)
 * @returns {Array} Ranked list of usual food items for quick-logging
 */
export function computePersonalUsuals(personalFoods = [], mealLogs = [], limit = 6) {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Frequency and recency tracking maps keyed strictly by food_id (UUID) or food_name (for manual items)
  const idFreqMap = {};
  const id7FreqMap = {};
  const id30FreqMap = {};
  const idLastIndexMap = {};

  const manualFreqMap = {};
  const manual7FreqMap = {};
  const manual30FreqMap = {};
  const manualLastIndexMap = {};

  (mealLogs || []).forEach((log, index) => {
    if (!log) return;

    if (log.food_id) {
      // 1. Logged from user_food_library or saved template -> UUID reference
      const idKey = String(log.food_id);
      idFreqMap[idKey] = (idFreqMap[idKey] || 0) + 1;
      if (log.date >= sevenDaysAgo) {
        id7FreqMap[idKey] = (id7FreqMap[idKey] || 0) + 1;
      }
      if (log.date >= thirtyDaysAgo) {
        id30FreqMap[idKey] = (id30FreqMap[idKey] || 0) + 1;
      }
      if (idLastIndexMap[idKey] === undefined) {
        idLastIndexMap[idKey] = index;
      }
    } else if (log.food_name) {
      // 2. Independent manual meal entry (food_id is null)
      const nameKey = log.food_name.trim();
      manualFreqMap[nameKey] = (manualFreqMap[nameKey] || 0) + 1;
      if (log.date >= sevenDaysAgo) {
        manual7FreqMap[nameKey] = (manual7FreqMap[nameKey] || 0) + 1;
      }
      if (log.date >= thirtyDaysAgo) {
        manual30FreqMap[nameKey] = (manual30FreqMap[nameKey] || 0) + 1;
      }
      if (manualLastIndexMap[nameKey] === undefined) {
        manualLastIndexMap[nameKey] = index;
      }
    }
  });

  const candidates = [];

  // 1. Process personal foods from user_food_library using UUID id matching exclusively
  (personalFoods || []).forEach(pf => {
    if (!pf || !pf.id) return;
    const idKey = String(pf.id);

    const fTotal = idFreqMap[idKey] || 0;
    const f7 = id7FreqMap[idKey] || 0;
    const f30 = id30FreqMap[idKey] || 0;
    const lastIdx = idLastIndexMap[idKey] !== undefined ? idLastIndexMap[idKey] : 999;

    const recencyBonus = lastIdx < 999 ? Math.max(0, 5 - lastIdx * 0.5) : 0;
    const score = (f7 * 3.0) + (f30 * 1.5) + (fTotal * 0.5) + recencyBonus;

    candidates.push({
      id: pf.id,
      food_id: pf.id,
      food_name: pf.food_name,
      serving_size_g: Number(pf.serving_size_g) || 100,
      calories: Number(pf.calories) || 0,
      protein: Number(pf.protein) || 0,
      carbs: Number(pf.carbs) || 0,
      fat: Number(pf.fat) || 0,
      fiber: Number(pf.fiber) || 0,
      total_frequency: fTotal,
      score: score,
      recency_index: lastIdx,
      isPersonal: true,
    });
  });

  // 2. Process independent manual entries (food_id is null)
  Object.keys(manualFreqMap).forEach(nameKey => {
    const fTotal = manualFreqMap[nameKey] || 1;
    const f7 = manual7FreqMap[nameKey] || 0;
    const f30 = manual30FreqMap[nameKey] || 0;
    const lastIdx = manualLastIndexMap[nameKey] !== undefined ? manualLastIndexMap[nameKey] : 999;

    const recencyBonus = lastIdx < 999 ? Math.max(0, 5 - lastIdx * 0.5) : 0;
    const score = (f7 * 3.0) + (f30 * 1.5) + (fTotal * 0.5) + recencyBonus;

    // Grab representative sample for macro snapshot values
    const sample = (mealLogs || []).find(m => !m.food_id && m.food_name && m.food_name.trim() === nameKey);

    candidates.push({
      id: null,
      food_id: null,
      food_name: nameKey,
      serving_size_g: Number(sample?.quantity_g) || 100,
      calories: Number(sample?.calories) || 0,
      protein: Number(sample?.protein) || 0,
      carbs: Number(sample?.carbs) || 0,
      fat: Number(sample?.fat) || 0,
      fiber: Number(sample?.fiber) || 0,
      total_frequency: fTotal,
      score: score,
      recency_index: lastIdx,
      isPersonal: false,
    });
  });

  // 3. Sort by weighted score DESC, then recency ASC, then alphabetical
  candidates.sort((a, b) => {
    if (Math.abs(b.score - a.score) > 0.01) {
      return b.score - a.score;
    }
    if (a.recency_index !== b.recency_index) {
      return a.recency_index - b.recency_index;
    }
    return a.food_name.localeCompare(b.food_name);
  });

  return candidates.slice(0, limit);
}

/**
 * Computes deterministic macro balance guidance string.
 */
export function computeMacroBalanceGuidance(totals = {}, settings = {}) {
  const rawGoalCal = Number(settings?.calorie_goal);
  if (!isFinite(rawGoalCal) || rawGoalCal <= 0) return null;

  const goalCal = Math.round(rawGoalCal);
  const rawConsumedCal = Number(totals?.cal);
  const consumedCal = isFinite(rawConsumedCal) && rawConsumedCal > 0 ? Math.round(rawConsumedCal) : 0;

  const rawConsumedProt = Number(totals?.protein);
  const consumedProtein = isFinite(rawConsumedProt) && rawConsumedProt > 0 ? Math.round(rawConsumedProt) : 0;

  const rawGoalProt = Number(settings?.protein_goal);
  const goalProtein = isFinite(rawGoalProt) && rawGoalProt > 0 ? Math.round(rawGoalProt) : 0;

  const remCal = goalCal - consumedCal;
  const remProt = goalProtein - consumedProtein;

  if (consumedCal === 0) {
    return {
      status: 'neutral',
      text: `Daily target: ${goalCal} kcal${goalProtein > 0 ? ` · ${goalProtein}g protein` : ''}.`,
    };
  }

  if (remCal <= 0) {
    return {
      status: 'complete',
      text: `Calorie target reached for today (${consumedCal} / ${goalCal} kcal).`,
    };
  }

  if (goalProtein > 0) {
    if (remProt > 10) {
      return {
        status: 'active',
        text: `You have ${remCal} kcal and ${remProt}g protein remaining today.`,
      };
    }
    if (remProt > 0 && remProt <= 10) {
      return {
        status: 'close',
        text: `You are close to your protein target with ${remCal} kcal remaining.`,
      };
    }
    if (remProt <= 0) {
      return {
        status: 'success',
        text: `Protein target met! ${remCal} kcal remaining for today.`,
      };
    }
  }

  return {
    status: 'active',
    text: `You have ${remCal} kcal remaining today.`,
  };
}
