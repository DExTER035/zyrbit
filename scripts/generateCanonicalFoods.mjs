import fs from 'fs';
import { FOOD_DB } from '../src/data/foods/indianFoods.js';

const migrated = FOOD_DB.map((f) => {
  let prep = 'cooked';
  const lower = (f.name + ' ' + f.id).toLowerCase();
  if (lower.includes('dry') || f.id === 'oats') prep = 'dry';
  else if (lower.includes('raw') || f.id === 'paneer_raw') prep = 'raw';
  else if (lower.includes('boiled') || f.id === 'egg_boiled') prep = 'boiled';
  else if (lower.includes('fried') || lower.includes('samosa') || lower.includes('vada')) prep = 'fried';
  else if (lower.includes('roasted') || f.id === 'makhana' || f.id === 'peanuts') prep = 'roasted';
  else if (
    f.category === 'snack' &&
    (lower.includes('apple') ||
      lower.includes('banana') ||
      lower.includes('dates') ||
      lower.includes('orange') ||
      lower.includes('mango') ||
      lower.includes('papaya') ||
      lower.includes('guava') ||
      lower.includes('grapes') ||
      lower.includes('watermelon'))
  )
    prep = 'raw';
  else if (f.id.includes('milk') || f.id.includes('curd') || f.id === 'greek_yogurt') prep = 'raw';

  return {
    id: f.id,
    name: f.name,
    category: f.category,
    emoji: f.emoji || '🍽️',
    per100g: {
      cal: f.per100g.cal,
      protein: f.per100g.protein,
      carbs: f.per100g.carbs,
      fat: f.per100g.fat,
      fiber: f.per100g.fiber || 0,
    },
    defaultServingG: f.defaultServingG,
    servingLabel: f.servingLabel,
    preparationState: prep,
    sourceType: 'curated_seed',
    sourceName: 'ZYRBIT_SEED',
    sourceVersion: '1.0',
    confidenceScore: 1.0,
  };
});

const alternativePreps = [
  {
    id: 'oats_dry',
    name: 'Rolled Oats (dry)',
    category: 'breakfast',
    emoji: '🥣',
    per100g: { cal: 389, protein: 16.9, carbs: 66, fat: 6.9, fiber: 10.6 },
    defaultServingG: 40,
    servingLabel: '40g dry',
    preparationState: 'dry',
    sourceType: 'curated_seed',
    sourceName: 'ZYRBIT_SEED',
    sourceVersion: '1.0',
    confidenceScore: 1.0,
    canonicalParentId: 'oats_plain',
  },
  {
    id: 'rice_raw',
    name: 'Raw Rice (dry grain)',
    category: 'lunch',
    emoji: '🌾',
    per100g: { cal: 360, protein: 7.0, carbs: 79, fat: 0.6, fiber: 1.3 },
    defaultServingG: 50,
    servingLabel: '50g raw dry',
    preparationState: 'raw',
    sourceType: 'curated_seed',
    sourceName: 'ZYRBIT_SEED',
    sourceVersion: '1.0',
    confidenceScore: 1.0,
    canonicalParentId: 'rice',
  },
];

const content = `/**
 * DexOS / Zyrbit — Canonical Food Knowledge Catalog (Food Knowledge V2)
 *
 * Migrated from the 110-food curated seed in indianFoods.js.
 * Every record preserves original IDs, nutrition values, servings, and categories.
 * Adds explicit preparation states, provenance, and confidence metadata.
 */

export const CANONICAL_FOODS = ${JSON.stringify(migrated, null, 2)};

export const PREPARATION_VARIANTS = ${JSON.stringify(alternativePreps, null, 2)};

export const ALL_CANONICAL_FOODS = [...CANONICAL_FOODS, ...PREPARATION_VARIANTS];

/**
 * Curated aliases mapping synonyms, plurals, and regional names to canonical food IDs.
 */
export const FOOD_ALIASES_V2 = [
  // Eggs
  { patterns: [/^(?:boiled\\s+)?eggs?$/i, /^egg\\s+boiled$/i], id: 'egg_boiled', unitWeightG: 50 },
  { patterns: [/^egg\\s+whites?$/i], id: 'egg_white', unitWeightG: 30 },
  { patterns: [/^scrambled\\s+eggs?$/i], id: 'egg_scrambled', unitWeightG: 75 },
  { patterns: [/^egg\\s+bhurji$/i, /^anda\\s+bhurji$/i], id: 'egg_bhurji', unitWeightG: 150 },
  { patterns: [/^egg\\s+curry$/i], id: 'egg_curry', unitWeightG: 200 },

  // Grains & Staples
  { patterns: [/^(?:plain\\s+)?rotis?$/i, /^chapatis?$/i, /^phulkas?$/i], id: 'roti', unitWeightG: 30 },
  { patterns: [/^parathas?$/i], id: 'paratha', unitWeightG: 100 },
  { patterns: [/^aloo\\s+parathas?$/i], id: 'aloo_paratha', unitWeightG: 120 },
  { patterns: [/^paneer\\s+parathas?$/i], id: 'paneer_paratha', unitWeightG: 140 },
  { patterns: [/^(?:cooked\\s+|white\\s+|steamed\\s+)?rice$/i, /^chawal$/i], id: 'rice', unitWeightG: 200 },
  { patterns: [/^(?:dry\\s+|raw\\s+|rolled\\s+)oats?$/i], id: 'oats_dry', unitWeightG: 40 },
  { patterns: [/^cooked\\s+oats?$/i, /^oats\\s+cooked$/i], id: 'oats_plain', unitWeightG: 200 },
  { patterns: [/^oats?$/i, /^oatmeal$/i], id: 'oats_plain', unitWeightG: 40 },
  { patterns: [/^poha$/i], id: 'poha', unitWeightG: 150 },
  { patterns: [/^upma$/i], id: 'upma', unitWeightG: 150 },
  { patterns: [/^idlis?$/i], id: 'idli', unitWeightG: 50 },
  { patterns: [/^(?:plain\\s+)?dosas?$/i], id: 'dosa', unitWeightG: 100 },
  { patterns: [/^masala\\s+dosas?$/i], id: 'masala_dosa', unitWeightG: 150 },

  // Fruits
  { patterns: [/^(?:medium\\s+)?bananas?$/i, /^kela$/i], id: 'banana', unitWeightG: 120 },
  { patterns: [/^(?:medium\\s+)?apples?$/i, /^seb$/i], id: 'apple', unitWeightG: 150 },
  { patterns: [/^dates?$/i, /^khajoor$/i], id: 'dates', unitWeightG: 10 },
  { patterns: [/^oranges?$/i], id: 'orange', unitWeightG: 150 },
  { patterns: [/^mangos?$/i, /^mangoes?$/i, /^aam$/i], id: 'mango', unitWeightG: 200 },
  { patterns: [/^watermelons?$/i, /^tarbooz$/i], id: 'watermelon', unitWeightG: 300 },
  { patterns: [/^papayas?$/i], id: 'papaya', unitWeightG: 200 },
  { patterns: [/^guavas?$/i, /^amrood$/i], id: 'guava', unitWeightG: 100 },
  { patterns: [/^grapes?$/i, /^angoor$/i], id: 'grapes', unitWeightG: 100 },

  // Dairy & Protein
  { patterns: [/^(?:whole\\s+)?milk$/i, /^doodh$/i], id: 'milk_whole', unitWeightG: 250 },
  { patterns: [/^skimmed\\s+milk$/i], id: 'milk_skimmed', unitWeightG: 250 },
  { patterns: [/^(?:raw\\s+)?paneer$/i], id: 'paneer_raw', unitWeightG: 100 },
  { patterns: [/^paneer\\s+bhurji$/i], id: 'paneer_bhurji', unitWeightG: 150 },
  { patterns: [/^paneer\\s+butter\\s+masala$/i], id: 'paneer_butter_masala', unitWeightG: 200 },
  { patterns: [/^palak\\s+paneer$/i], id: 'palak_paneer', unitWeightG: 200 },
  { patterns: [/^(?:grilled\\s+)?chicken\\s+breast$/i], id: 'chicken_breast', unitWeightG: 150 },
  { patterns: [/^chicken\\s+curry$/i], id: 'chicken_curry', unitWeightG: 200 },
  { patterns: [/^chicken\\s+biryani$/i], id: 'chicken_biryani', unitWeightG: 300 },
  { patterns: [/^(?:plain\\s+)?curd$/i, /^dahi$/i], id: 'curd_plain', unitWeightG: 150 },
  { patterns: [/^greek\\s+yogurt$/i], id: 'greek_yogurt', unitWeightG: 150 },
  { patterns: [/^whey(?:\\s+protein)?(?:\\s+powder)?$/i, /^1\\s+scoop\\s+whey$/i], id: 'whey_protein', unitWeightG: 30 },
  { patterns: [/^soya\\s+chunks?$/i], id: 'soya_chunks_dry', unitWeightG: 50 },

  // Dals & Legumes
  { patterns: [/^(?:yellow\\s+)?dal$/i, /^dal\\s+tadka$/i], id: 'dal_tadka', unitWeightG: 200 },
  { patterns: [/^dal\\s+makhani$/i], id: 'dal_makhani', unitWeightG: 200 },
  { patterns: [/^moong\\s+dal$/i], id: 'moong_dal_cooked', unitWeightG: 150 },
  { patterns: [/^masoor\\s+dal$/i], id: 'masoor_dal', unitWeightG: 200 },
  { patterns: [/^rajma$/i], id: 'rajma_cooked', unitWeightG: 150 },
  { patterns: [/^chole$/i, /^chana\\s+masala$/i], id: 'chole_cooked', unitWeightG: 150 },

  // Beverages & Snacks
  { patterns: [/^chai$/i, /^tea$/i], id: 'chai', unitWeightG: 150 },
  { patterns: [/^coffee$/i, /^black\\s+coffee$/i], id: 'black_coffee', unitWeightG: 150 },
  { patterns: [/^samosas?$/i], id: 'samosa', unitWeightG: 80 },
  { patterns: [/^vada\\s+pav$/i], id: 'vada_pav', unitWeightG: 150 },
  { patterns: [/^makhana$/i, /^roasted\\s+makhana$/i], id: 'makhana', unitWeightG: 30 },
  { patterns: [/^peanuts?$/i], id: 'peanuts', unitWeightG: 30 },
  { patterns: [/^almonds?$/i, /^badam$/i], id: 'almonds', unitWeightG: 30 },
  { patterns: [/^cashews?$/i, /^kaju$/i], id: 'cashews', unitWeightG: 30 },
];

/**
 * Resolves a food item by exact ID from the canonical food catalog.
 * @param {string} id
 * @returns {Object|null}
 */
export function getCanonicalFoodById(id) {
  if (!id) return null;
  return ALL_CANONICAL_FOODS.find((f) => f.id === id) || null;
}

/**
 * Searches canonical foods by exact name, slug, alias, or substring.
 * Returns best match and candidate alternatives.
 *
 * @param {string} rawName
 * @param {Object} [options]
 * @param {'raw'|'cooked'|'dry'|'boiled'|'fried'|'roasted'} [options.preparationState]
 * @returns {{ food: Object, unitWeightG: number|null, candidates?: Array<Object> } | null}
 */
export function findCanonicalFood(rawName, options = {}) {
  if (!rawName || typeof rawName !== 'string') return null;
  const q = rawName.trim().toLowerCase().replace(/^(?:some|plate of|bowl of|katori of|cup of|glass of)\\s+/i, '');

  // 1. Alias match
  for (const alias of FOOD_ALIASES_V2) {
    if (alias.patterns.some((p) => p.test(q))) {
      let match = ALL_CANONICAL_FOODS.find((f) => f.id === alias.id);
      if (options.preparationState && match) {
        const variant = PREPARATION_VARIANTS.find(
          (v) => (v.canonicalParentId === match.id || v.id === match.id) && v.preparationState === options.preparationState
        );
        if (variant) match = variant;
      }
      if (match) {
        const variants = ALL_CANONICAL_FOODS.filter(
          (f) => f.id === match.id || f.canonicalParentId === match.id || match.canonicalParentId === f.id
        );
        return { food: match, unitWeightG: alias.unitWeightG, candidates: variants };
      }
    }
  }

  // 2. Exact Name or ID match
  const exact = ALL_CANONICAL_FOODS.find(
    (f) => f.id.toLowerCase() === q || f.name.toLowerCase() === q
  );
  if (exact) {
    const variants = ALL_CANONICAL_FOODS.filter(
      (f) => f.id === exact.id || f.canonicalParentId === exact.id || exact.canonicalParentId === f.id
    );
    return { food: exact, unitWeightG: exact.defaultServingG, candidates: variants };
  }

  // 3. Substring match
  const matches = ALL_CANONICAL_FOODS.filter(
    (f) =>
      f.name.toLowerCase().includes(q) ||
      q.includes(f.name.toLowerCase()) ||
      f.id.toLowerCase().includes(q.replace(/\\s+/g, '_'))
  );

  if (matches.length > 0) {
    if (options.preparationState) {
      const prepMatch = matches.find((m) => m.preparationState === options.preparationState);
      if (prepMatch) {
        return { food: prepMatch, unitWeightG: prepMatch.defaultServingG, candidates: matches };
      }
    }
    const top = matches[0];
    return { food: top, unitWeightG: top.defaultServingG, candidates: matches };
  }

  return null;
}
`;

fs.writeFileSync('src/data/foods/canonicalFoods.js', content, 'utf8');
console.log('Successfully wrote src/data/foods/canonicalFoods.js');
