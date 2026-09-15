/**
 * DexOS — Food Entity & Nutrition Resolver
 * Deterministically resolves natural language food descriptions against FOOD_DB.
 *
 * Rules:
 * - Authoritative nutrition comes from FOOD_DB and calculateScaledNutrition.
 * - Zero hallucinated calories/macros.
 * - Resolves compound items (e.g., "4 boiled eggs and a banana").
 * - Resolves number words, counts, and common Indian units.
 * - Uses canonical default servings where safe to minimize unnecessary clarifications.
 * - Pure JavaScript. Zero direct database queries.
 */

import { FOOD_DB } from '../../data/foods/index.js';
import { calculateScaledNutrition } from '../../engines/food/index.js';

// Number word dictionary
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

// Aliases mapping common phrases / colloquial terms to FOOD_DB entry IDs or exact matches
const FOOD_ALIASES = [
  // Eggs
  { patterns: [/^boiled egg(s)?$/, /^egg(s)?$/, /^egg boiled$/], id: 'egg_boiled', unitWeightG: 50 },
  { patterns: [/^egg white(s)?$/], id: 'egg_white', unitWeightG: 30 },
  { patterns: [/^scrambled egg(s)?$/], id: 'egg_scrambled', unitWeightG: 75 },
  { patterns: [/^egg bhurji$/], id: 'egg_bhurji', unitWeightG: 150 },
  { patterns: [/^egg curry$/], id: 'egg_curry', unitWeightG: 200 },

  // Fruits
  { patterns: [/^medium banana$/, /^banana(s)?$/], id: 'banana', unitWeightG: 120 },
  { patterns: [/^apple(s)?$/, /^medium apple$/], id: 'apple', unitWeightG: 150 },

  // Breakfast items
  { patterns: [/^poha$/], id: 'poha', unitWeightG: 150 },
  { patterns: [/^upma$/], id: 'upma', unitWeightG: 150 },
  { patterns: [/^idli(s)?$/], id: 'idli', unitWeightG: 50 },
  { patterns: [/^plain dosa$/, /^dosa(s)?$/], id: 'dosa', unitWeightG: 100 },
  { patterns: [/^masala dosa(s)?$/], id: 'masala_dosa', unitWeightG: 150 },
  { patterns: [/^oat(s)?$/, /^cooked oats$/, /^plain oats$/], id: 'oats_plain', unitWeightG: 250 },

  // Staples
  { patterns: [/^roti(s)?$/, /^chapati(s)?$/, /^phulka(s)?$/], id: 'roti', unitWeightG: 30 },
  { patterns: [/^paratha(s)?$/], id: 'paratha', unitWeightG: 100 },
  { patterns: [/^aloo paratha(s)?$/], id: 'aloo_paratha', unitWeightG: 120 },
  { patterns: [/^rice$/, /^white rice$/, /^cooked rice$/, /^steamed rice$/], id: 'rice_cooked', unitWeightG: 200 },
  { patterns: [/^dal$/, /^yellow dal$/, /^dal tadka$/], id: 'dal_tadka', unitWeightG: 200 },
  { patterns: [/^dal makhani$/], id: 'dal_makhani', unitWeightG: 200 },
  { patterns: [/^moong dal$/], id: 'moong_dal_cooked', unitWeightG: 150 },
  { patterns: [/^dal rice$/, /^rice and dal$/, /^dal and rice$/], id: 'dal_rice_dinner', unitWeightG: 300 },

  // Protein & Curries
  { patterns: [/^paneer$/, /^raw paneer$/], id: 'paneer_raw', unitWeightG: 100 },
  { patterns: [/^paneer butter masala$/], id: 'paneer_butter_masala', unitWeightG: 200 },
  { patterns: [/^palak paneer$/], id: 'palak_paneer', unitWeightG: 200 },
  { patterns: [/^chicken breast$/, /^grilled chicken breast$/], id: 'chicken_breast', unitWeightG: 150 },
  { patterns: [/^chicken curry$/], id: 'chicken_curry', unitWeightG: 200 },
  { patterns: [/^chicken biryani$/], id: 'chicken_biryani', unitWeightG: 300 },
  { patterns: [/^curd$/, /^dahi$/, /^plain curd$/], id: 'curd_plain', unitWeightG: 150 },
  { patterns: [/^milk$/, /^whole milk$/], id: 'milk_whole', unitWeightG: 250 },
  { patterns: [/^chai$/, /^tea$/], id: 'chai', unitWeightG: 150 },
];

/**
 * Searches FOOD_DB for a food matching a cleaned query or alias.
 * @param {string} rawName
 * @returns {{ food: Object, unitWeightG: number|null } | null}
 */
export function findFoodItem(rawName) {
  if (!rawName || typeof rawName !== 'string') return null;
  const q = rawName.trim().toLowerCase().replace(/^(some|plate of|bowl of|katori of|cup of|glass of)\s+/, '');

  // 1. Check alias table
  for (const alias of FOOD_ALIASES) {
    if (alias.patterns.some((p) => p.test(q))) {
      const match = FOOD_DB.find((f) => f.id === alias.id);
      if (match) return { food: match, unitWeightG: alias.unitWeightG };
    }
  }

  // 2. Direct name or ID match
  const exact = FOOD_DB.find((f) => f.id.toLowerCase() === q || f.name.toLowerCase() === q);
  if (exact) {
    return { food: exact, unitWeightG: exact.defaultServingG };
  }

  // 3. Substring match
  const sub = FOOD_DB.find(
    (f) =>
      f.name.toLowerCase().includes(q) ||
      q.includes(f.name.toLowerCase()) ||
      f.id.toLowerCase().includes(q.replace(/\s+/g, '_'))
  );
  if (sub) {
    return { food: sub, unitWeightG: sub.defaultServingG };
  }

  return null;
}

/**
 * Parses a single item clause (e.g. "4 boiled eggs", "a banana", "200g rice", "2 bowls dal").
 * @param {string} itemStr
 * @returns {{ name: string, quantity: number, unit: string|null }}
 */
export function parseFoodItemPhrase(itemStr) {
  if (!itemStr) return null;
  let str = itemStr.trim().toLowerCase();

  // Strip leading filler
  str = str.replace(/^(i ate|i had|had|ate|logged|log|eating|ate some|had some)\s+/i, '').trim();

  // Check for weight with explicit grams/ml: e.g. "200g rice", "200 gms of chicken", "300ml milk"
  const gramMatch = str.match(/^(\d+(?:\.\d+)?)\s*(?:g|gm|gms|gram|grams|ml)\s+(?:of\s+)?(.+)$/);
  if (gramMatch) {
    return {
      quantity: parseFloat(gramMatch[1]),
      unit: 'g',
      name: gramMatch[2].trim(),
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
    };
  }

  // Fallback: no explicit quantity, canonical default 1
  return {
    quantity: 1,
    unit: 'default',
    name: str.replace(/^(some|a bit of)\s+/, '').trim(),
  };
}

/**
 * Splits compound food phrases into individual food clauses.
 * E.g. "4 boiled eggs and a banana" -> ["4 boiled eggs", "a banana"]
 * E.g. "2 eggs, poha and a banana" -> ["2 eggs", "poha", "a banana"]
 * E.g. "Had rice and dal" -> ["rice", "dal"]
 * @param {string} phrase
 * @returns {Array<string>}
 */
export function splitCompoundFoodPhrase(phrase) {
  if (!phrase || typeof phrase !== 'string') return [];

  let cleaned = phrase
    .trim()
    .replace(/^(i had|i ate|had|ate|logged|eating)\s+/i, '')
    .trim();

  // Protect multi-item canonical foods like "dal rice" or "roti + dal"
  if (/^(dal rice|curd rice|lemon rice)$/i.test(cleaned)) {
    return [cleaned];
  }

  // Split on commas, ' and ', ' & ', ' + ', ' with ', ' n '
  const rawParts = cleaned.split(/\s*(?:,\s*and\s*|,\s*|\s+and\s+|\s+&\s+|\s+\+\s+|\s+with\s+|\s+n\s+)\s*/i);

  return rawParts.map((p) => p.trim()).filter(Boolean);
}

/**
 * Resolves an individual parsed food item into canonical grams and exact nutrition.
 * @param {{ name: string, quantity: number, unit: string|null }} parsed
 * @returns {Object|null}
 */
export function resolveFoodItem(parsed) {
  if (!parsed || !parsed.name) return null;

  const matchResult = findFoodItem(parsed.name);
  if (!matchResult) return null;

  const { food, unitWeightG } = matchResult;

  let quantityG = food.defaultServingG || 100;

  if (parsed.unit === 'g') {
    quantityG = Math.max(1, Math.min(5000, Math.round(parsed.quantity)));
  } else if (['plate', 'plates', 'bowl', 'bowls', 'katori', 'katoris', 'glass', 'glasses', 'cup', 'cups'].includes(parsed.unit)) {
    quantityG = Math.max(1, Math.round(parsed.quantity * (food.defaultServingG || 150)));
  } else if (parsed.unit === 'count' || parsed.unit === 'piece' || parsed.unit === 'pieces') {
    const perUnitG = unitWeightG || food.defaultServingG || 100;
    quantityG = Math.max(1, Math.round(parsed.quantity * perUnitG));
  } else {
    // Default unit
    quantityG = Math.max(1, Math.round((parsed.quantity || 1) * (food.defaultServingG || 100)));
  }

  // Calculate authoritative nutrition via calculateScaledNutrition
  const baseNutrition = {
    calories: food.per100g.cal,
    protein: food.per100g.protein,
    carbs: food.per100g.carbs,
    fat: food.per100g.fat,
    fiber: food.per100g.fiber,
    serving_size_g: 100,
  };

  const scaled = calculateScaledNutrition(baseNutrition, quantityG);

  return {
    foodId: food.id,
    canonicalName: food.name,
    category: food.category,
    quantityG,
    calories: scaled.calories,
    protein: scaled.protein,
    carbs: scaled.carbs,
    fat: scaled.fat,
    fiber: scaled.fiber,
    confidence: 'high',
  };
}

/**
 * Resolves natural language food input into a structured meal for log_meal.
 *
 * @param {string} userMessage - e.g. "I ate 4 boiled eggs and a banana"
 * @param {string} [preferredMealType='snack']
 * @returns {{
 *   success: boolean,
 *   resolved: boolean,
 *   mealParams?: Object,
 *   items?: Array<Object>,
 *   clarificationNeeded?: boolean,
 *   question?: string,
 *   error?: string
 * }}
 */
export function resolveFoodInput(userMessage, preferredMealType = 'snack') {
  if (!userMessage || typeof userMessage !== 'string' || !userMessage.trim()) {
    return { success: false, resolved: false, error: 'Empty food message.' };
  }

  const clauses = splitCompoundFoodPhrase(userMessage);
  if (clauses.length === 0) {
    return { success: false, resolved: false, error: 'No food items detected.' };
  }

  const resolvedItems = [];
  const unresolvedItems = [];

  for (const clause of clauses) {
    const parsed = parseFoodItemPhrase(clause);
    if (!parsed) {
      unresolvedItems.push(clause);
      continue;
    }

    const resolved = resolveFoodItem(parsed);
    if (resolved) {
      resolvedItems.push(resolved);
    } else {
      unresolvedItems.push(clause);
    }
  }

  // If nothing could be resolved against FOOD_DB
  if (resolvedItems.length === 0) {
    // Check if user was asking about eating or food generically
    return {
      success: false,
      resolved: false,
      clarificationNeeded: true,
      question: 'What food did you have and roughly how much?',
      unresolved: unresolvedItems,
    };
  }

  // Aggregate into single meal parameters for log_meal
  const totalQuantityG = resolvedItems.reduce((sum, item) => sum + item.quantityG, 0);
  const totalCalories = resolvedItems.reduce((sum, item) => sum + item.calories, 0);
  const totalProtein = Math.round(resolvedItems.reduce((sum, item) => sum + item.protein, 0) * 10) / 10;
  const totalCarbs = Math.round(resolvedItems.reduce((sum, item) => sum + item.carbs, 0) * 10) / 10;
  const totalFat = Math.round(resolvedItems.reduce((sum, item) => sum + item.fat, 0) * 10) / 10;
  const totalFiber = Math.round(resolvedItems.reduce((sum, item) => sum + item.fiber, 0) * 10) / 10;

  // Build clean display meal name: e.g. "Boiled Egg (200g), Banana (120g)"
  const mealName = resolvedItems.map((i) => i.canonicalName).join(', ');

  // Determine mealType from category of first item if preferred is default
  let mealType = preferredMealType;
  if (mealType === 'snack' && resolvedItems[0].category) {
    mealType = resolvedItems[0].category === 'protein' ? 'snack' : resolvedItems[0].category;
  }

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
    },
    items: resolvedItems,
    unresolvedCount: unresolvedItems.length,
  };
}
