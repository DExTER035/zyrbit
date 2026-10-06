/**
 * DexOS — Food Entity & Nutrition Resolver V2 (Global Food Knowledge Architecture)
 *
 * Capabilities:
 * - Multi-tier resolution: Personal Food -> Canonical Food -> Aliases -> Fuzzy Match -> Ambiguity -> AI Fallback
 * - First-class preparation states: 'raw' | 'dry' | 'cooked' | 'boiled' | 'fried' | 'roasted'
 * - Material Ambiguity Check: 20% Calorie Materiality Rule (FOOD_AMBIGUITY_CALORIE_THRESHOLD)
 * - Complete Provenance & Nutrition Snapshots
 * - Offline-first & Gemini-independent for known catalog items
 */

import { calculateScaledNutrition } from '../../engines/food/index.js';
import {
  ALL_CANONICAL_FOODS,
  findCanonicalFood,
} from '../../data/foods/canonicalFoods.js';
import { FOOD_AMBIGUITY_CALORIE_THRESHOLD } from '../../config/features.js';

// Number words dictionary
const NUMBER_WORDS = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  couple: 2,
  few: 3,
  half: 0.5,
};

/**
 * Searches personal food library for user-defined or pinned items.
 * @param {string} rawName
 * @param {Array<Object>} personalFoods
 * @returns {Object|null}
 */
export function findPersonalFood(rawName, personalFoods = []) {
  if (!rawName || !Array.isArray(personalFoods) || personalFoods.length === 0) return null;
  const q = rawName.trim().toLowerCase().replace(/^(?:my\s+|the\s+)/i, '');

  // Exact or substring match on personal food name
  const match = personalFoods.find((pf) => {
    const name = (pf.food_name || pf.name || '').toLowerCase().trim();
    return name === q || name.includes(q) || q.includes(name);
  });

  if (!match) return null;

  return {
    food: {
      id: match.id,
      name: match.food_name || match.name,
      category: 'personal',
      per100g: {
        cal: match.serving_size_g && match.serving_size_g > 0
          ? Math.round((Number(match.calories) / match.serving_size_g) * 100)
          : Number(match.calories) || 0,
        protein: match.serving_size_g && match.serving_size_g > 0
          ? Math.round(((Number(match.protein) || 0) / match.serving_size_g) * 100 * 10) / 10
          : Number(match.protein) || 0,
        carbs: match.serving_size_g && match.serving_size_g > 0
          ? Math.round(((Number(match.carbs) || 0) / match.serving_size_g) * 100 * 10) / 10
          : Number(match.carbs) || 0,
        fat: match.serving_size_g && match.serving_size_g > 0
          ? Math.round(((Number(match.fat) || 0) / match.serving_size_g) * 100 * 10) / 10
          : Number(match.fat) || 0,
        fiber: match.serving_size_g && match.serving_size_g > 0
          ? Math.round(((Number(match.fiber) || 0) / match.serving_size_g) * 100 * 10) / 10
          : Number(match.fiber) || 0,
      },
      defaultServingG: Number(match.serving_size_g) || 100,
      servingLabel: `${match.serving_size_g || 100}${match.serving_unit || 'g'}`,
      preparationState: 'custom',
      sourceType: 'user_verified',
      sourceName: 'USER_LIBRARY',
      sourceVersion: '1.0',
      confidenceScore: 1.0,
      isPersonal: true,
    },
    unitWeightG: Number(match.serving_size_g) || 100,
  };
}

/**
 * Parses a single item clause (e.g. "4 boiled eggs", "a banana", "200g rice", "80g dry oats").
 * @param {string} itemStr
 * @returns {{ name: string, quantity: number, unit: string|null, preparationState: string|null }}
 */
export function parseFoodItemPhrase(itemStr) {
  if (!itemStr) return null;
  let str = itemStr.trim().toLowerCase();

  // Strip leading filler
  str = str.replace(/^(?:i ate|i had|had|ate|logged|log|eating|ate some|had some)\s+/i, '').trim();

  // Strip trailing context / ownership phrases
  str = str.replace(/\s+(?:i\s+already\s+owned|already\s+owned|i\s+already\s+had|already\s+had|at\s+home|from\s+home|that\s+i\s+owned)$/i, '').trim();

  // Detect explicit preparation states in phrase
  let prepState = null;
  if (/\b(?:dry|raw)\b/i.test(str)) {
    prepState = /\bdry\b/i.test(str) ? 'dry' : 'raw';
    str = str.replace(/\b(?:dry|raw)\b/gi, '').replace(/\s+/g, ' ').trim();
  } else if (/\b(?:cooked|boiled|steamed|fried|roasted|grilled)\b/i.test(str)) {
    const match = str.match(/\b(cooked|boiled|steamed|fried|roasted|grilled)\b/i);
    prepState = match ? match[1].toLowerCase() : null;
    str = str.replace(/\b(?:cooked|boiled|steamed|fried|roasted|grilled)\b/gi, '').replace(/\s+/g, ' ').trim();
  }

  // Check for weight with explicit grams/ml
  const gramMatch = str.match(/^(\d+(?:\.\d+)?)\s*(?:g|gm|gms|gram|grams|ml)\s+(?:of\s+)?(.+)$/);
  if (gramMatch) {
    return {
      quantity: parseFloat(gramMatch[1]),
      unit: 'g',
      name: gramMatch[2].trim(),
      preparationState: prepState,
    };
  }

  // Check for count + unit + food: e.g. "2 bowls of dal", "1 plate poha", "3 cups of milk", "4 pieces idli"
  const unitMatch = str.match(
    /^(\d+|one|two|three|four|five|six|seven|eight|nine|ten|a|an|half|couple)\s+(plate|plates|bowl|bowls|katori|katoris|cup|cups|glass|glasses|piece|pieces|slice|slices)\s+(?:of\s+)?(.+)$/i
  );
  if (unitMatch) {
    const rawQty = unitMatch[1].toLowerCase();
    const qty = NUMBER_WORDS[rawQty] !== undefined ? NUMBER_WORDS[rawQty] : parseFloat(rawQty);
    return {
      quantity: isNaN(qty) ? 1 : qty,
      unit: unitMatch[2].toLowerCase(),
      name: unitMatch[3].trim(),
      preparationState: prepState,
    };
  }

  // Check for count + food: e.g. "4 boiled eggs", "two eggs", "one banana", "1 medium banana"
  const countMatch = str.match(
    /^(\d+|one|two|three|four|five|six|seven|eight|nine|ten|a|an|half|couple)\s+(.+)$/i
  );
  if (countMatch) {
    const rawQty = countMatch[1].toLowerCase();
    const qty = NUMBER_WORDS[rawQty] !== undefined ? NUMBER_WORDS[rawQty] : parseFloat(rawQty);
    return {
      quantity: isNaN(qty) ? 1 : qty,
      unit: 'count',
      name: countMatch[2].trim(),
      preparationState: prepState,
    };
  }

  // Fallback: no explicit quantity, canonical default 1
  return {
    quantity: 1,
    unit: 'default',
    name: str.replace(/^(?:some|a bit of)\s+/i, '').trim(),
    preparationState: prepState,
  };
}

/**
 * Splits compound food phrases into individual food clauses.
 * @param {string} phrase
 * @returns {Array<string>}
 */
export function splitCompoundFoodPhrase(phrase) {
  if (!phrase || typeof phrase !== 'string') return [];

  let cleaned = phrase
    .trim()
    .replace(/^(?:i had|i ate|had|ate|logged|eating|log)\s+/i, '')
    .trim();

  // Protect multi-item canonical foods
  if (/^(dal rice|curd rice|lemon rice)$/i.test(cleaned)) {
    return [cleaned];
  }

  const rawParts = cleaned.split(/\s*(?:,\s*and\s*|,\s*|\s+and\s+|\s+&\s+|\s+\+\s+|\s+with\s+|\s+n\s+)\s*/i);
  return rawParts.map((p) => p.trim()).filter(Boolean);
}

/**
 * Resolves an individual food item through the multi-tier hierarchy:
 * 1. Personal Food -> 2. Canonical Food -> 3. Preparation Ambiguity -> 4. Scaled Nutrition
 *
 * @param {{ name: string, quantity: number, unit: string|null, preparationState: string|null }} parsed
 * @param {Object} [options]
 * @param {Array<Object>} [options.personalFoods=[]]
 * @returns {Object|null}
 */
export function resolveFoodItemV2(parsed, options = {}) {
  if (!parsed || !parsed.name) return null;

  // 1. Personal Food Library (Highest Priority)
  const personalMatch = findPersonalFood(parsed.name, options.personalFoods || []);
  let resolvedFood = null;
  let unitWeightG = null;
  let ambiguity = null;

  if (personalMatch) {
    resolvedFood = personalMatch.food;
    unitWeightG = personalMatch.unitWeightG;
  } else {
    // 2. Canonical Foods Catalog
    const canonMatch = findCanonicalFood(parsed.name, {
      preparationState: parsed.preparationState,
    });

    if (canonMatch) {
      resolvedFood = canonMatch.food;
      unitWeightG = canonMatch.unitWeightG;

      // 3. Ambiguity Check: Did we find multiple preparation variants?
      if (!parsed.preparationState && canonMatch.candidates && canonMatch.candidates.length > 1) {
        const c1 = canonMatch.candidates[0];
        const c2 = canonMatch.candidates[1];
        const cal1 = c1.per100g.cal;
        const cal2 = c2.per100g.cal;
        const maxCal = Math.max(cal1, cal2);
        const diff = Math.abs(cal1 - cal2);
        const spread = maxCal > 0 ? diff / maxCal : 0;

        // If calorie spread exceeds materiality threshold (20%), flag as ambiguous
        if (spread > FOOD_AMBIGUITY_CALORIE_THRESHOLD) {
          ambiguity = {
            isAmbiguous: true,
            question: `Do you mean ${parsed.quantity || ''}${parsed.unit || 'g'} ${c1.name.toLowerCase()} or ${c2.name.toLowerCase()}?`,
            candidates: canonMatch.candidates.map((c) => ({
              id: c.id,
              name: c.name,
              preparationState: c.preparationState,
              caloriesPer100g: c.per100g.cal,
            })),
          };
        }
      }
    }
  }

  if (!resolvedFood) return null;

  // Calculate Portion Grams
  let quantityG = resolvedFood.defaultServingG || 100;
  if (parsed.unit === 'g' || parsed.unit === 'ml') {
    quantityG = Math.max(1, Math.min(5000, Math.round(parsed.quantity)));
  } else if (['plate', 'plates', 'bowl', 'bowls', 'katori', 'katoris', 'glass', 'glasses', 'cup', 'cups'].includes(parsed.unit)) {
    quantityG = Math.max(1, Math.round(parsed.quantity * (resolvedFood.defaultServingG || 150)));
  } else if (parsed.unit === 'count' || parsed.unit === 'piece' || parsed.unit === 'pieces') {
    const perUnitG = unitWeightG || resolvedFood.defaultServingG || 100;
    quantityG = Math.max(1, Math.round(parsed.quantity * perUnitG));
  } else {
    quantityG = Math.max(1, Math.round((parsed.quantity || 1) * (resolvedFood.defaultServingG || 100)));
  }

  // Calculate authoritative scaled nutrition
  const baseNutrition = {
    calories: resolvedFood.per100g.cal,
    protein: resolvedFood.per100g.protein,
    carbs: resolvedFood.per100g.carbs,
    fat: resolvedFood.per100g.fat,
    fiber: resolvedFood.per100g.fiber || 0,
    serving_size_g: 100,
  };

  const scaled = calculateScaledNutrition(baseNutrition, quantityG);

  // Build immutable nutrition snapshot
  const nutritionSnapshot = {
    per100g: { ...resolvedFood.per100g },
    servingSizeG: quantityG,
    servingLabel: resolvedFood.servingLabel,
    preparationState: resolvedFood.preparationState || 'cooked',
    sourceType: resolvedFood.sourceType || 'curated_seed',
    sourceName: resolvedFood.sourceName || 'ZYRBIT_SEED',
    sourceVersion: resolvedFood.sourceVersion || '1.0',
    confidenceScore: resolvedFood.confidenceScore || 1.0,
    loggedAt: new Date().toISOString(),
  };

  return {
    foodId: resolvedFood.id,
    canonicalName: resolvedFood.name,
    category: resolvedFood.category,
    quantityG,
    calories: scaled.calories,
    protein: scaled.protein,
    carbs: scaled.carbs,
    fat: scaled.fat,
    fiber: scaled.fiber,
    preparationState: resolvedFood.preparationState || 'cooked',
    sourceType: resolvedFood.sourceType || 'curated_seed',
    sourceName: resolvedFood.sourceName || 'ZYRBIT_SEED',
    confidence: resolvedFood.confidenceScore || 1.0,
    nutritionSnapshot,
    ambiguity,
  };
}

/**
 * Main Food Knowledge V2 Resolver Function.
 * Resolves natural language food messages into structured meal intents.
 *
 * @param {string} userMessage - e.g. "I ate 2 eggs and 80g oats for breakfast"
 * @param {Object} [options]
 * @param {string} [options.preferredMealType='snack']
 * @param {Array<Object>} [options.personalFoods=[]] - User custom foods from user_food_library
 * @returns {{
 *   success: boolean,
 *   resolved: boolean,
 *   ambiguous?: boolean,
 *   question?: string,
 *   mealParams?: Object,
 *   items?: Array<Object>,
 *   clarificationNeeded?: boolean,
 *   error?: string
 * }}
 */
export function resolveFoodInputV2(userMessage, options = {}) {
  if (!userMessage || typeof userMessage !== 'string' || !userMessage.trim()) {
    return { success: false, resolved: false, error: 'Empty food message.' };
  }

  let cleanMsg = userMessage.trim();
  const preferredMealType = options.preferredMealType || 'snack';

  // Extract explicit meal type
  let detectedMealType = preferredMealType;
  if (/\b(?:for\s+breakfast|breakfast)\b/i.test(cleanMsg)) detectedMealType = 'breakfast';
  else if (/\b(?:for\s+lunch|lunch)\b/i.test(cleanMsg)) detectedMealType = 'lunch';
  else if (/\b(?:for\s+dinner|dinner)\b/i.test(cleanMsg)) detectedMealType = 'dinner';
  else if (/\b(?:for\s+snack|snack)\b/i.test(cleanMsg)) detectedMealType = 'snack';

  // Extract explicit time
  let explicitTime = null;
  const timeMatch = cleanMsg.match(/\bat\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\b/i);
  if (timeMatch) {
    explicitTime = timeMatch[1].trim();
    if (detectedMealType === 'snack') {
      if (/\b(?:[5-9]|10|11)(?::\d{2})?\s*am\b/i.test(explicitTime) || /\b(?:[5-9]|10|11)\s*am\b/i.test(explicitTime)) {
        detectedMealType = 'breakfast';
      } else if (/\b(?:12|1|2|3)(?::\d{2})?\s*pm\b/i.test(explicitTime)) {
        detectedMealType = 'lunch';
      } else if (/\b(?:7|8|9|10|11)(?::\d{2})?\s*pm\b/i.test(explicitTime)) {
        detectedMealType = 'dinner';
      }
    }
  }

  cleanMsg = cleanMsg
    .replace(/\s+for\s+(?:breakfast|lunch|dinner|snack)\b/gi, '')
    .replace(/\s+at\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?\b/gi, '')
    .trim();

  const clauses = splitCompoundFoodPhrase(cleanMsg);
  if (clauses.length === 0) {
    return { success: false, resolved: false, error: 'No food items detected.' };
  }

  const resolvedItems = [];
  const unresolvedItems = [];
  const ambiguities = [];

  for (const clause of clauses) {
    const parsed = parseFoodItemPhrase(clause);
    if (!parsed) {
      unresolvedItems.push(clause);
      continue;
    }

    const resolved = resolveFoodItemV2(parsed, options);
    if (resolved) {
      if (resolved.ambiguity && resolved.ambiguity.isAmbiguous) {
        ambiguities.push(resolved.ambiguity);
      }
      resolvedItems.push(resolved);
    } else {
      unresolvedItems.push(clause);
    }
  }

  // If preparation ambiguity detected, prompt user with clarification question
  if (ambiguities.length > 0) {
    return {
      success: false,
      resolved: false,
      ambiguous: true,
      clarificationNeeded: true,
      question: ambiguities[0].question,
      candidates: ambiguities[0].candidates,
    };
  }

  // Atomic rejection: If any item could not be resolved, do not create partial records
  if (unresolvedItems.length > 0) {
    return {
      success: false,
      resolved: false,
      clarificationNeeded: true,
      question: resolvedItems.length === 0
        ? 'What food did you have and roughly how much?'
        : `I couldn't identify "${unresolvedItems.join(', ')}". Which food did you mean?`,
      unresolved: unresolvedItems,
    };
  }

  // Aggregate into single meal parameters
  const totalQuantityG = resolvedItems.reduce((sum, item) => sum + item.quantityG, 0);
  const totalCalories = resolvedItems.reduce((sum, item) => sum + item.calories, 0);
  const totalProtein = Math.round(resolvedItems.reduce((sum, item) => sum + item.protein, 0) * 10) / 10;
  const totalCarbs = Math.round(resolvedItems.reduce((sum, item) => sum + item.carbs, 0) * 10) / 10;
  const totalFat = Math.round(resolvedItems.reduce((sum, item) => sum + item.fat, 0) * 10) / 10;
  const totalFiber = Math.round(resolvedItems.reduce((sum, item) => sum + item.fiber, 0) * 10) / 10;

  const mealName = resolvedItems.map((i) => i.canonicalName).join(', ');

  let mealType = detectedMealType;
  if (mealType === 'snack' && resolvedItems[0].category) {
    mealType = resolvedItems[0].category === 'protein' ? 'snack' : resolvedItems[0].category;
  }

  // Highest primary preparation state & source type
  const primaryItem = resolvedItems[0];

  return {
    success: true,
    resolved: true,
    mealParams: {
      mealType,
      foodName: mealName,
      quantityG: totalQuantityG,
      calories: totalCalories,
      protein: totalProtein,
      carbs: totalCarbs,
      fat: totalFat,
      fiber: totalFiber,
      preparationState: primaryItem.preparationState || 'cooked',
      sourceType: primaryItem.sourceType || 'curated_seed',
      sourceName: primaryItem.sourceName || 'ZYRBIT_SEED',
      confidence: primaryItem.confidence || 1.0,
      nutritionSnapshot: primaryItem.nutritionSnapshot || null,
      foodRefId: primaryItem.foodId || null,
      ...(explicitTime && { time: explicitTime }),
    },
    items: resolvedItems,
    unresolvedCount: unresolvedItems.length,
  };
}
