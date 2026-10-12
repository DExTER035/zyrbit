import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { resolveFoodInputV2 } from '../dex/resolvers/foodResolverV2.js';
import { calculateScaledNutrition, calculateDailyTotals } from '../engines/food/index.js';
import Food from '../pages/Food/index.jsx';

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: '/food', search: '' }),
  };
});

// Mock Supabase
vi.mock('../lib/supabase/index.js', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { id: 'test-user-uuid-1' } } },
      }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
    from: vi.fn(() => {
      const queryBuilder = {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        then: vi.fn((resolve) => resolve({ data: [], error: null })),
      };
      return queryBuilder;
    }),
  },
}));

describe('Zyrbit — Simple Food Logging Experience Regression Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── 1. NATURAL-LANGUAGE MEAL RESOLUTION ─────────────────────────────────
  describe('1. Natural-language resolution', () => {
    it('resolves "80g dry oats + 200ml milk + 5 dates" into 3 items with exact scaled macros', () => {
      const res = resolveFoodInputV2('80g dry oats + 200ml milk + 5 dates');
      expect(res.success).toBe(true);
      expect(res.resolved).toBe(true);
      expect(res.items).toHaveLength(3);

      const [oats, milk, dates] = res.items;
      expect(oats.canonicalName).toMatch(/oats/i);
      expect(oats.quantityG).toBe(80);
      expect(oats.calories).toBe(311);

      expect(milk.canonicalName).toMatch(/milk/i);
      expect(milk.quantityG).toBe(200);

      expect(dates.canonicalName).toMatch(/dates/i);
      expect(dates.quantityG).toBe(50); // 5 dates * 10g
    });

    it('resolves "2 eggs and 2 rotis" accurately without ambiguity', () => {
      const res = resolveFoodInputV2('2 eggs and 2 rotis');
      expect(res.success).toBe(true);
      expect(res.items).toHaveLength(2);
      expect(res.items[0].canonicalName).toMatch(/egg/i);
      expect(res.items[1].canonicalName).toMatch(/roti/i);
    });

    it('resolves "100g paneer" to ~265 kcal', () => {
      const res = resolveFoodInputV2('100g paneer');
      expect(res.success).toBe(true);
      expect(res.items).toHaveLength(1);
      expect(res.items[0].canonicalName).toMatch(/paneer/i);
      expect(res.items[0].calories).toBe(265);
    });

    it('detects meal type from context: "I had cooked rice and dal for lunch"', () => {
      const res = resolveFoodInputV2('I had cooked rice and dal for lunch');
      expect(res.success).toBe(true);
      expect(res.mealParams.mealType).toBe('lunch');
      expect(res.items).toHaveLength(2);
    });

    it('detects preparation ambiguity for unvarnished "rice and dal"', () => {
      const res = resolveFoodInputV2('I had rice and dal for lunch');
      expect(res.ambiguous).toBe(true);
      expect(res.clarificationNeeded).toBe(true);
    });
  });

  // ─── 2. AMBIGUITY & UNKNOWN FOOD CLARIFICATION ───────────────────────────
  describe('2. Ambiguity and unknown food handling', () => {
    it('triggers clarification when calorie spread > 20% without explicit preparation ("80g oats")', () => {
      const res = resolveFoodInputV2('80g oats');
      expect(res.success).toBe(false);
      expect(res.ambiguous).toBe(true);
      expect(res.clarificationNeeded).toBe(true);
      expect(res.candidates).toBeDefined();
      expect(res.candidates.length).toBeGreaterThanOrEqual(2);
    });

    it('returns honest unresolved response for unknown food without fabricating macros', () => {
      const res = resolveFoodInputV2('1 bowl of mystical wizard stew');
      expect(res.success).toBe(false);
      expect(res.clarificationNeeded).toBe(true);
      expect(res.unresolved).toContain('1 bowl of mystical wizard stew');
      expect(res.mealParams).toBeUndefined();
    });
  });

  // ─── 3. MULTI-ITEM PREVIEWS & DYNAMIC NUTRITION RECALCULATION ───────────
  describe('3. Multi-item preview and quantity scaling', () => {
    it('scales nutrition proportionally when item quantity changes in preview', () => {
      const baseFood = {
        calories: 389,
        protein: 16.9,
        carbs: 66.3,
        fat: 6.9,
        fiber: 10.6,
        serving_size_g: 100,
      };

      // 80g
      const scaled80 = calculateScaledNutrition(baseFood, 80);
      expect(scaled80.calories).toBe(311);
      expect(scaled80.protein).toBe(13.5);

      // User changes to 120g
      const scaled120 = calculateScaledNutrition(baseFood, 120);
      expect(scaled120.calories).toBe(467);
      expect(scaled120.protein).toBe(20.3);
    });

    it('calculates total daily calories and macros from multiple meal entries', () => {
      const sampleMeals = [
        { calories: 311, protein: 13.5, carbs: 53.0, fat: 5.5, fiber: 8.5 },
        { calories: 130, protein: 6.4, carbs: 9.6, fat: 7.2, fiber: 0 },
        { calories: 140, protein: 1.2, carbs: 37.5, fat: 0.2, fiber: 4.0 },
      ];

      const totals = calculateDailyTotals(sampleMeals);
      expect(totals.calories).toBe(581);
      expect(totals.protein).toBeCloseTo(21.1, 1);
      expect(totals.carbs).toBeCloseTo(100.1, 1);
      expect(totals.fat).toBeCloseTo(12.9, 1);
      expect(totals.fiber).toBeCloseTo(12.5, 1);
    });
  });

  // ─── 4. RENDERED FOOD UI STRUCTURE & TRUTHFULNESS ────────────────────────
  describe('4. Rendered Food screen structure', () => {
    it('renders heading, prompt label, placeholder, and action buttons', () => {
      const html = renderToStaticMarkup(<Food />);

      // 1. Heading and day indicator
      expect(html).toContain('Food');
      expect(html).toContain('Calm, intentional fuel tracking for the Winter Arc.');
      expect(html).toContain('Today ·');

      // 2. Prominent input label and placeholder
      expect(html).toContain('What did you eat?');
      expect(html).toContain('placeholder="80g oats + 200ml milk + 5 dates"');

      // 3. Primary action button
      expect(html).toContain('Analyze meal');

      // 4. Secondary manual action
      expect(html).toContain('+ Add manually');

      // 5. Today's nutrition summary
      expect(html).toContain('Nutrition');
      expect(html).toContain('kcal remaining');

      // 6. 4 Grouped meal cards
      expect(html).toContain('Breakfast');
      expect(html).toContain('Lunch');
      expect(html).toContain('Dinner');
      expect(html).toContain('Snack');
      expect(html).toContain('No breakfast logged yet.');

      // 7. 30-Day Activity Heatmap
      expect(html).toContain('30-Day Food Log Consistency');

      // 8. Honest zero-state truthfulness: NO fake Poha
      expect(html).not.toContain('Poha');
      expect(html).not.toContain('meal-default-1');
      expect(html).not.toContain('280 kcal');
    });
  });

  // ─── 5. PERSISTENCE & METADATA PRESERVATION ────────────────────────────
  describe('5. Persistence and metadata preservation', () => {
    it('batchLogMeals constructs valid payloads preserving snapshot, preparation state, and source type', async () => {
      const { batchLogMeals } = await import('../services/healthService.js');
      const testItems = [
        {
          canonicalName: 'Oats (dry)',
          quantityG: 80,
          calories: 311,
          protein: 13.5,
          carbs: 53.0,
          fat: 5.5,
          fiber: 8.5,
          preparation_state: 'dry',
          source_type: 'curated_seed',
          confidence: 1.0,
          nutrition_snapshot: { per100g: { cal: 389 } },
        },
      ];

      const res = await batchLogMeals({
        userId: 'user-abc',
        mealType: 'breakfast',
        items: testItems,
      });

      expect(res.success).toBe(true);
    });

    it('rejects batch logging when userId is missing', async () => {
      const { batchLogMeals } = await import('../services/healthService.js');
      const res = await batchLogMeals({
        userId: null,
        items: [{ food_name: 'Apple' }],
      });
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/user id is required/i);
    });

    it('rejects batch logging when items array is empty', async () => {
      const { batchLogMeals } = await import('../services/healthService.js');
      const res = await batchLogMeals({
        userId: 'user-abc',
        items: [],
      });
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/no meal items provided/i);
    });
  });

  // ─── 6. ERROR HANDLING & TRUTHFUL STATUS ─────────────────────────────────
  describe('6. Database failure visibility and honest error states', () => {
    it('returns honest error when database write fails without showing false success', async () => {
      const { supabase } = await import('../lib/supabase/index.js');
      const originalFrom = supabase.from;

      // Mock database insertion failure
      supabase.from = vi.fn(() => ({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({ data: null, error: { message: 'Database connection timeout' } }),
      }));

      const { batchLogMeals } = await import('../services/healthService.js');
      const res = await batchLogMeals({
        userId: 'user-123',
        items: [{ food_name: 'Paneer', calories: 265 }],
      });

      expect(res.success).toBe(false);
      expect(res.error).toBe('Database connection timeout');

      // Restore mock
      supabase.from = originalFrom;
    });

    it('gracefully falls back to base columns when remote database lacks extended schema columns', async () => {
      const { supabase } = await import('../lib/supabase/index.js');
      const originalFrom = supabase.from;

      let callCount = 0;
      supabase.from = vi.fn(() => ({
        insert: vi.fn((rows) => {
          callCount++;
          if (callCount === 1) {
            // First attempt with extended rows fails with schema error
            return {
              select: vi.fn().mockResolvedValue({
                data: null,
                error: { message: "Could not find the 'confidence' column of 'meal_logs' in the schema cache" },
              }),
            };
          }
          // Fallback attempt with base rows succeeds
          return {
            select: vi.fn().mockResolvedValue({
              data: rows.map((r, i) => ({ id: `saved-${i}`, ...r })),
              error: null,
            }),
          };
        }),
      }));

      const { batchLogMeals } = await import('../services/healthService.js');
      const res = await batchLogMeals({
        userId: 'user-schema-test',
        mealType: 'breakfast',
        items: [
          {
            canonicalName: 'Rolled Oats (dry)',
            quantityG: 80,
            calories: 311,
            protein: 13.5,
            confidence: 1.0,
            preparation_state: 'dry',
          },
        ],
      });

      expect(res.success).toBe(true);
      expect(callCount).toBe(2);
      expect(res.data[0].food_name).toBe('Rolled Oats (dry)');
      expect(res.data[0].calories).toBe(311);

      // Restore mock
      supabase.from = originalFrom;
    });

    it('returns targetName in resolveFoodInputV2 when food item has preparation ambiguity', () => {
      const res = resolveFoodInputV2('80g oats + 200ml milk + 5 dates');
      expect(res.ambiguous).toBe(true);
      expect(res.targetName).toBe('oats');
      expect(res.candidates.length).toBeGreaterThanOrEqual(2);
    });

    it('correctly replaces target token regardless of word order when resolving ambiguity', () => {
      // Non-leading ambiguous item: "200ml milk + 80g oats + 5 dates"
      const resInitial = resolveFoodInputV2('200ml milk + 80g oats + 5 dates');
      expect(resInitial.ambiguous).toBe(true);
      expect(resInitial.targetName).toBe('oats');

      // Emulate handleSelectAmbiguityCandidate in-place replacement
      const prep = 'dry';
      const target = resInitial.targetName;
      const targetRegex = new RegExp(`(?:(?:dry|cooked|raw|boiled|steamed|fried|roasted)\\s+)?\\b${target}\\b`, 'i');
      const updated = '200ml milk + 80g oats + 5 dates'.replace(targetRegex, `${prep} ${target}`);
      expect(updated).toBe('200ml milk + 80g dry oats + 5 dates');

      // Re-analysis now succeeds immediately
      const resResolved = resolveFoodInputV2(updated);
      expect(resResolved.success).toBe(true);
      expect(resResolved.items).toHaveLength(3);
      expect(resResolved.items.find((i) => /oats/i.test(i.canonicalName)).preparationState).toBe('dry');
    });
  });
});

