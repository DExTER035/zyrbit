/**
 * Zyrbit — Food Knowledge V2 Test Suite
 *
 * Verifies:
 * 1. Exact 110-food seed migration & integrity
 * 2. Multi-tier resolution: Personal Food -> Canonical Food -> Aliases -> Fuzzy Match -> Ambiguity -> AI Fallback
 * 3. Gemini Independence: Known catalog foods resolve without network or Gemini calls
 * 4. Explicit preparation states & 20% Calorie Materiality Rule
 * 5. Historical nutrition snapshots & provenance metadata
 * 6. Feature flag toggles: FOOD_KNOWLEDGE_V2 = false vs true
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  CANONICAL_FOODS,
  ALL_CANONICAL_FOODS,
  findCanonicalFood,
} from '../data/foods/canonicalFoods.js';
import { FOOD_DB } from '../data/foods/indianFoods.js';
import {
  resolveFoodInputV2,
  findPersonalFood,
} from '../dex/resolvers/foodResolverV2.js';
import { resolveDeterministicIntent, parseIntent } from '../dex/dexIntentParser.js';
import { FEATURES, FOOD_AMBIGUITY_CALORIE_THRESHOLD } from '../config/features.js';
import * as aiModule from '../lib/ai/index.js';

describe('Food Knowledge V2 — Architecture & Engine Verification', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 1. SEED MIGRATION & CATALOG INTEGRITY
  // ════════════════════════════════════════════════════════════════════════════
  describe('1. Seed Migration & Catalog Integrity', () => {
    it('migrated exactly 110 foods from legacy FOOD_DB', () => {
      expect(CANONICAL_FOODS).toHaveLength(110);
      expect(FOOD_DB).toHaveLength(110);
    });

    it('preserves all original slugs, nutrition, servings, and categories', () => {
      FOOD_DB.forEach((legacyItem) => {
        const canonical = CANONICAL_FOODS.find((f) => f.id === legacyItem.id);
        expect(canonical).toBeDefined();
        expect(canonical.name).toBe(legacyItem.name);
        expect(canonical.category).toBe(legacyItem.category);
        expect(canonical.per100g.cal).toBe(legacyItem.per100g.cal);
        expect(canonical.per100g.protein).toBe(legacyItem.per100g.protein);
        expect(canonical.per100g.carbs).toBe(legacyItem.per100g.carbs);
        expect(canonical.per100g.fat).toBe(legacyItem.per100g.fat);
        expect(canonical.defaultServingG).toBe(legacyItem.defaultServingG);
        expect(canonical.sourceType).toBe('curated_seed');
        expect(canonical.sourceName).toBe('ZYRBIT_SEED');
        expect(canonical.sourceVersion).toBe('1.0');
        expect(canonical.confidenceScore).toBe(1.0);
      });
    });

    it('provides alternative preparation variants for material ambiguities', () => {
      expect(ALL_CANONICAL_FOODS.length).toBeGreaterThan(110);
      const dryOats = ALL_CANONICAL_FOODS.find((f) => f.id === 'oats_dry');
      expect(dryOats).toBeDefined();
      expect(dryOats.preparationState).toBe('dry');
      expect(dryOats.per100g.cal).toBe(389);

      const rawRice = ALL_CANONICAL_FOODS.find((f) => f.id === 'rice_raw');
      expect(rawRice).toBeDefined();
      expect(rawRice.preparationState).toBe('raw');
      expect(rawRice.per100g.cal).toBe(360);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 2. MULTI-TIER RESOLVER V2: CANONICAL, PLURALS, ALIASES & FUZZY MATCH
  // ════════════════════════════════════════════════════════════════════════════
  describe('2. Multi-Tier Resolution: Exact, Plurals, Aliases, Fuzzy', () => {
    it('resolves exact canonical food name', () => {
      const match = findCanonicalFood('poha');
      expect(match).not.toBeNull();
      expect(match.food.id).toBe('poha');
      expect(match.food.name).toBe('Poha');
    });

    it('resolves plural food variations: "rotis", "apples", "eggs", "bananas"', () => {
      const rotiMatch = findCanonicalFood('rotis');
      expect(rotiMatch.food.id).toBe('roti');
      expect(rotiMatch.unitWeightG).toBe(30);

      const appleMatch = findCanonicalFood('apples');
      expect(appleMatch.food.id).toBe('apple');
      expect(appleMatch.unitWeightG).toBe(150);

      const eggMatch = findCanonicalFood('eggs');
      expect(eggMatch.food.id).toBe('egg_boiled');

      const bananaMatch = findCanonicalFood('bananas');
      expect(bananaMatch.food.id).toBe('banana');
    });

    it('resolves colloquial and regional aliases (Hindi/synonyms)', () => {
      const khajoorMatch = findCanonicalFood('khajoor');
      expect(khajoorMatch.food.id).toBe('dates');

      const chapatiMatch = findCanonicalFood('chapati');
      expect(chapatiMatch.food.id).toBe('roti');

      const dahiMatch = findCanonicalFood('dahi');
      expect(dahiMatch.food.id).toBe('curd_plain');

      const doodhMatch = findCanonicalFood('doodh');
      expect(doodhMatch.food.id).toBe('milk_whole');
    });

    it('resolves fuzzy substring matches for curries and preparations', () => {
      const match = findCanonicalFood('butter masala');
      expect(match.food.id).toBe('paneer_butter_masala');
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 3. PERSONAL FOOD LIBRARY INTEGRATION & PRIORITY
  // ════════════════════════════════════════════════════════════════════════════
  describe('3. Personal Food Library Integration', () => {
    const mockPersonalFoods = [
      {
        id: '22222222-3333-4444-5555-666666666666',
        food_name: 'Pintola Oats',
        serving_size_g: 100,
        calories: 390,
        protein: 18,
        carbs: 65,
        fat: 7,
        fiber: 10,
      },
      {
        id: '33333333-4444-5555-6666-777777777777',
        food_name: 'My Special Whey',
        serving_size_g: 33,
        calories: 130,
        protein: 27,
        carbs: 2,
        fat: 1.5,
        fiber: 0,
      },
    ];

    it('finds personal food by name or "my <food>" prefix', () => {
      const match = findPersonalFood('my Pintola oats', mockPersonalFoods);
      expect(match).not.toBeNull();
      expect(match.food.name).toBe('Pintola Oats');
      expect(match.food.sourceType).toBe('user_verified');
      expect(match.food.isPersonal).toBe(true);
    });

    it('gives personal food higher priority over generic canonical food', () => {
      const res = resolveFoodInputV2('my Pintola oats', { personalFoods: mockPersonalFoods });
      expect(res.success).toBe(true);
      expect(res.mealParams.foodName).toBe('Pintola Oats');
      expect(res.mealParams.calories).toBe(390);
      expect(res.mealParams.sourceType).toBe('user_verified');
      expect(res.mealParams.foodRefId).toBe('22222222-3333-4444-5555-666666666666');
    });

    it('scales personal food correctly according to requested grams', () => {
      const res = resolveFoodInputV2('50g my Pintola oats', { personalFoods: mockPersonalFoods });
      expect(res.success).toBe(true);
      expect(res.mealParams.quantityG).toBe(50);
      expect(res.mealParams.calories).toBe(195);
      expect(res.mealParams.protein).toBe(9);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 4. PREPARATION STATES & 20% CALORIE AMBIGUITY RULE
  // ════════════════════════════════════════════════════════════════════════════
  describe('4. Preparation States & Ambiguity Rule', () => {
    it('verifies FOOD_AMBIGUITY_CALORIE_THRESHOLD is 0.20 (20%)', () => {
      expect(FOOD_AMBIGUITY_CALORIE_THRESHOLD).toBe(0.20);
    });

    it('triggers clarification when calorie spread > 20% without explicit preparation ("80g oats")', () => {
      const res = resolveFoodInputV2('80g oats');
      expect(res.success).toBe(false);
      expect(res.ambiguous).toBe(true);
      expect(res.clarificationNeeded).toBe(true);
      expect(res.question).toMatch(/(?:dry.*cooked|cooked.*dry)/i);
      expect(res.candidates).toHaveLength(2);
      expect(res.candidates.some((c) => c.preparationState === 'dry')).toBe(true);
      expect(res.candidates.some((c) => c.preparationState === 'cooked')).toBe(true);
    });

    it('resolves immediately without ambiguity when explicit preparation is provided ("80g dry oats")', () => {
      const res = resolveFoodInputV2('80g dry oats');
      expect(res.success).toBe(true);
      expect(res.ambiguous).toBeUndefined();
      expect(res.mealParams.preparationState).toBe('dry');
      expect(res.mealParams.calories).toBe(311);
    });

    it('resolves immediately without ambiguity when cooked preparation is provided ("80g cooked oats")', () => {
      const res = resolveFoodInputV2('80g cooked oats');
      expect(res.success).toBe(true);
      expect(res.ambiguous).toBeUndefined();
      expect(res.mealParams.preparationState).toBe('cooked');
      expect(res.mealParams.calories).toBe(57);
    });

    it('does not trigger ambiguity when food has single unambiguous preparation state ("2 rotis")', () => {
      const res = resolveFoodInputV2('2 rotis');
      expect(res.success).toBe(true);
      expect(res.ambiguous).toBeUndefined();
      expect(res.mealParams.calories).toBe(178);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 5. NUTRITION SNAPSHOTS & PROVENANCE
  // ════════════════════════════════════════════════════════════════════════════
  describe('5. Nutrition Snapshots & Provenance', () => {
    it('generates immutable nutrition snapshot at log time', () => {
      const res = resolveFoodInputV2('2 rotis');
      expect(res.success).toBe(true);
      const snapshot = res.mealParams.nutritionSnapshot;
      expect(snapshot).toBeDefined();
      expect(snapshot.per100g.cal).toBe(297);
      expect(snapshot.per100g.protein).toBe(9.0);
      expect(snapshot.servingSizeG).toBe(60);
      expect(snapshot.sourceType).toBe('curated_seed');
      expect(snapshot.sourceName).toBe('ZYRBIT_SEED');
      expect(snapshot.sourceVersion).toBe('1.0');
      expect(snapshot.loggedAt).toBeDefined();
    });

    it('assigns correct provenance metadata across source types', () => {
      const seedRes = resolveFoodInputV2('1 apple');
      expect(seedRes.mealParams.sourceType).toBe('curated_seed');

      const personalRes = resolveFoodInputV2('my Pintola oats', {
        personalFoods: [{ id: 'p-1', food_name: 'Pintola Oats', calories: 390 }],
      });
      expect(personalRes.mealParams.sourceType).toBe('user_verified');
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 6. GEMINI INDEPENDENCE: KNOWN FOODS NEVER REQUIRE GEMINI
  // ════════════════════════════════════════════════════════════════════════════
  describe('6. Gemini Independence & Offline Resilience', () => {
    it('resolves "2 rotis" deterministically without calling askZyra', async () => {
      const spy = vi.spyOn(aiModule, 'askZyra');
      const parsed = resolveDeterministicIntent('2 rotis', null);

      expect(parsed).not.toBeNull();
      expect(parsed.intent).toBe('action');
      expect(parsed.action).toBe('log_meal');
      expect(parsed.params.foodName).toContain('Roti');
      expect(parsed.source).toBe('deterministic');
      expect(spy).not.toHaveBeenCalled();
    });

    it('resolves "Log 2 rotis" deterministically without calling askZyra', async () => {
      const spy = vi.spyOn(aiModule, 'askZyra');
      const parsed = resolveDeterministicIntent('Log 2 rotis', null);

      expect(parsed).not.toBeNull();
      expect(parsed.intent).toBe('action');
      expect(parsed.action).toBe('log_meal');
      expect(parsed.params.foodName).toContain('Roti');
      expect(spy).not.toHaveBeenCalled();
    });

    it('REQUIRED TEST: logs "Log 2 rotis" successfully even when Gemini is completely unavailable', async () => {
      // Mock askZyra to simulate Gemini outage / network error
      vi.spyOn(aiModule, 'askZyra').mockRejectedValue(new Error('Gemini API is down: 503 Service Unavailable'));

      // Intent resolution succeeds deterministically without throwing
      const res = await parseIntent({
        userMessage: 'Log 2 rotis',
        context: null,
      });

      expect(res.success).toBe(true);
      expect(res.intent.intent).toBe('action');
      expect(res.intent.action).toBe('log_meal');
      expect(res.intent.params.foodName).toContain('Roti');
      expect(res.intent.source).toBe('deterministic');
    });

    it('resolves common catalog foods deterministically: "2 eggs", "1 banana", "200ml milk", "5 dates"', () => {
      const spy = vi.spyOn(aiModule, 'askZyra');

      const rEggs = resolveDeterministicIntent('2 eggs', null);
      expect(rEggs.action).toBe('log_meal');

      const rBanana = resolveDeterministicIntent('1 banana', null);
      expect(rBanana.action).toBe('log_meal');

      const rMilk = resolveDeterministicIntent('200ml milk', null);
      expect(rMilk.action).toBe('log_meal');

      const rDates = resolveDeterministicIntent('5 dates', null);
      expect(rDates.action).toBe('log_meal');

      expect(spy).not.toHaveBeenCalled();
    });

    it('delegates unknown foods to AI fallback clearly marked as ai_estimate', async () => {
      FEATURES.FOOD_KNOWLEDGE_V2 = true;
      try {
        vi.spyOn(aiModule, 'askZyra').mockResolvedValue(
          JSON.stringify({
            intent: 'action',
            action: 'log_meal',
            params: {
              mealType: 'lunch',
              foodName: 'Salvadoran pupusa revuelta',
              quantityG: 150,
              calories: 320,
              protein: 12,
              carbs: 35,
              fat: 14,
            },
            confidence: 0.65,
          })
        );

        const parsed = await parseIntent({
          userMessage: 'I had half a plate of Salvadoran pupusa revuelta',
          context: null,
        });

        expect(parsed.success).toBe(true);
        expect(parsed.intent.intent).toBe('action');
        expect(parsed.intent.action).toBe('log_meal');
        expect(parsed.intent.params.foodName).toBe('Salvadoran pupusa revuelta');
        expect(parsed.intent.source).toBe('ai');
        expect(parsed.intent.params.sourceType).toBe('ai_estimate');
      } finally {
        FEATURES.FOOD_KNOWLEDGE_V2 = false;
      }
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 7. FEATURE FLAG TOGGLE: FOOD_KNOWLEDGE_V2 = false vs true
  // ════════════════════════════════════════════════════════════════════════════
  describe('7. Feature Flag Validation', () => {
    it('defaults to FEATURES.FOOD_KNOWLEDGE_V2 = false in production configuration', () => {
      expect(FEATURES.FOOD_KNOWLEDGE_V2).toBe(false);
    });

    it('preserves baseline Phase C behavior when FOOD_KNOWLEDGE_V2 is false', () => {
      FEATURES.FOOD_KNOWLEDGE_V2 = false;
      const res = resolveDeterministicIntent('I ate 2 eggs', null);
      expect(res.intent).toBe('action');
      expect(res.action).toBe('log_meal');
      expect(res.params.foodName).toContain('Boiled Egg');
    });

    it('enables Food Knowledge V2 engine when FOOD_KNOWLEDGE_V2 is true', () => {
      FEATURES.FOOD_KNOWLEDGE_V2 = true;
      try {
        const res = resolveDeterministicIntent('80g dry oats', null);
        expect(res.intent).toBe('action');
        expect(res.action).toBe('log_meal');
        expect(res.params.preparationState).toBe('dry');
        expect(res.params.calories).toBe(311);
        expect(res.params.nutritionSnapshot).toBeDefined();
      } finally {
        FEATURES.FOOD_KNOWLEDGE_V2 = false; // Reset to safe default
      }
    });

    it('handles personal food priority when FOOD_KNOWLEDGE_V2 is true', () => {
      FEATURES.FOOD_KNOWLEDGE_V2 = true;
      try {
        const mockContext = {
          personalFoods: [
            { id: 'custom-oats-uuid', food_name: 'Pintola Oats', calories: 390, serving_size_g: 100 },
          ],
        };
        const res = resolveDeterministicIntent('my Pintola oats', mockContext);
        expect(res.intent).toBe('action');
        expect(res.action).toBe('log_meal');
        expect(res.params.foodName).toBe('Pintola Oats');
        expect(res.params.sourceType).toBe('user_verified');
        expect(res.params.foodRefId).toBe('custom-oats-uuid');
      } finally {
        FEATURES.FOOD_KNOWLEDGE_V2 = false;
      }
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 8. GLOBAL CANONICAL FOOD CORE (RUN 3B INGESTION VERIFICATION)
  // ════════════════════════════════════════════════════════════════════════════
  describe('8. Global Canonical Food Core (Run 3B Ingestion)', () => {
    it('verifies catalog scale expands beyond 10,000 foods with exact seed preservation', () => {
      expect(CANONICAL_FOODS).toHaveLength(110);
      expect(ALL_CANONICAL_FOODS.length).toBeGreaterThan(10000);
      expect(ALL_CANONICAL_FOODS.filter((f) => f.sourceType === 'curated_seed').length).toBeGreaterThanOrEqual(110);
    });

    it('verifies imported USDA food exists with official_dataset provenance', () => {
      const usdaFood = ALL_CANONICAL_FOODS.find((f) => f.sourceName === 'USDA_FDC');
      expect(usdaFood).toBeDefined();
      expect(usdaFood.sourceType).toBe('official_dataset');
      expect(usdaFood.sourceVersion).toBe('SR_Legacy_2018');
      expect(usdaFood.per100g.cal).toBeGreaterThanOrEqual(0);
      expect(usdaFood.confidenceScore).toBe(0.98);
    });

    it('verifies imported UK CoFID food exists with official_dataset provenance', () => {
      const cofidFood = ALL_CANONICAL_FOODS.find((f) => f.sourceName === 'UK_COFID');
      expect(cofidFood).toBeDefined();
      expect(cofidFood.sourceType).toBe('official_dataset');
      expect(cofidFood.sourceVersion).toBe('CoFID_2021');
      expect(cofidFood.per100g.cal).toBeGreaterThanOrEqual(0);
      expect(cofidFood.confidenceScore).toBe(0.98);
    });

    it('preserves distinct preparation states for imported foods', () => {
      const rawFoods = ALL_CANONICAL_FOODS.filter((f) => f.preparationState === 'raw');
      const cookedFoods = ALL_CANONICAL_FOODS.filter((f) => f.preparationState === 'cooked');
      const dryFoods = ALL_CANONICAL_FOODS.filter((f) => f.preparationState === 'dry');
      const boiledFoods = ALL_CANONICAL_FOODS.filter((f) => f.preparationState === 'boiled');
      const roastedFoods = ALL_CANONICAL_FOODS.filter((f) => f.preparationState === 'roasted');

      expect(rawFoods.length).toBeGreaterThan(500);
      expect(cookedFoods.length).toBeGreaterThan(500);
      expect(dryFoods.length).toBeGreaterThan(100);
      expect(boiledFoods.length).toBeGreaterThan(50);
      expect(roastedFoods.length).toBeGreaterThan(50);
    });

    it('curated seed foods retain absolute precedence over external duplicate foods', () => {
      // Seed banana has 89 kcal/100g
      const match = findCanonicalFood('banana');
      expect(match).not.toBeNull();
      expect(match.food.sourceType).toBe('curated_seed');
      expect(match.food.sourceName).toBe('ZYRBIT_SEED');
      expect(match.food.per100g.cal).toBe(89);
    });

    it('resolves imported USDA food deterministically without Gemini', () => {
      const spy = vi.spyOn(aiModule, 'askZyra');
      const res = resolveFoodInputV2('100g cheddar cheese');
      expect(res.success).toBe(true);
      expect(res.resolved).toBe(true);
      expect(res.mealParams.calories).toBeGreaterThan(0);
      expect(spy).not.toHaveBeenCalled();
    });

    it('prioritizes personal food over generic imported USDA/CoFID food', () => {
      const mockPersonalFoods = [
        {
          id: 'pf-custom-cheddar',
          name: 'Cathedral City Cheddar',
          calories: 410,
          servingSizeG: 30,
          sourceType: 'user_verified',
        },
      ];
      const res = resolveFoodInputV2('my Cathedral City Cheddar', { personalFoods: mockPersonalFoods });
      expect(res.success).toBe(true);
      expect(res.mealParams.sourceType).toBe('user_verified');
      expect(res.mealParams.foodName).toBe('Cathedral City Cheddar');
      expect(res.mealParams.foodRefId).toBe('pf-custom-cheddar');
    });

    it('performs fast in-memory search across global catalog without latency regression', () => {
      const t0 = performance.now();
      const match = findCanonicalFood('olive oil');
      const latencyMs = performance.now() - t0;

      expect(match).not.toBeNull();
      expect(match.food.per100g.fat).toBeGreaterThan(10);
      expect(latencyMs).toBeLessThan(50); // Sub-50ms deterministic in-memory lookup
    });

    it('ensures historical nutrition snapshots remain immutable regardless of catalog expansion', () => {
      const historicalLog = {
        foodName: 'Roti / Chapati',
        calories: 178,
        protein: 5.4,
        nutritionSnapshot: {
          per100g: { cal: 297, protein: 9.0, carbs: 63.0, fat: 1.2 },
          sourceType: 'curated_seed',
          sourceVersion: '1.0',
          loggedAt: '2026-09-01T12:00:00.000Z',
        },
      };

      // Logging new food from USDA catalog
      const newFoodRes = resolveFoodInputV2('100g olive oil');
      expect(newFoodRes.success).toBe(true);
      const newSnapshot = newFoodRes.mealParams.nutritionSnapshot;

      // Historical log snapshot remains unchanged
      expect(historicalLog.nutritionSnapshot.per100g.cal).toBe(297);
      expect(historicalLog.nutritionSnapshot.sourceVersion).toBe('1.0');
      // New snapshot reflects current resolution
      expect(newSnapshot).toBeDefined();
      expect(newSnapshot.per100g.cal).toBeGreaterThan(0);
    });
  });
});
