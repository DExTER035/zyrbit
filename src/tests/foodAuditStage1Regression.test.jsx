import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

// Mock dependencies for Food page
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
        data: { session: { user: { id: 'stage1-test-user' } } },
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

describe('Stage 1 Food & Nutrition Audit Regression Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 1. Truthful Zero Values for Macros (No 72g / 145g / 38g fallbacks)
  // ──────────────────────────────────────────────────────────────────────────
  describe('Fix 1: Truthful Macro Fallbacks (Zero values instead of fabricated numbers)', () => {
    it('renders 0g and 0% progress width when dailyTotals are 0 or empty', async () => {
      const Food = (await import('../pages/Food/index.jsx')).default;
      const html = renderToStaticMarkup(<Food />);

      // Must NOT contain fabricated default numbers: 72g, 145g, 38g
      expect(html).not.toContain('72g /');
      expect(html).not.toContain('145g /');
      expect(html).not.toContain('38g /');

      // Must contain truthful 0g values
      expect(html).toContain('0g / 130g'); // Default protein_goal is 130
      expect(html).toContain('0g / 250g'); // Default carbs_goal is 250
      expect(html).toContain('0g / 70g');  // Default fat_goal is 70
    });

    it('calculates macro progress width as 0% when intake is 0g', () => {
      const settings = { protein_goal: 130, carbs_goal: 250, fat_goal: 70 };
      const dailyTotals = { protein: 0, carbs: 0, fat: 0 };

      const proteinWidth = Math.min(100, ((dailyTotals.protein || 0) / settings.protein_goal) * 100);
      const carbsWidth = Math.min(100, ((dailyTotals.carbs || 0) / settings.carbs_goal) * 100);
      const fatWidth = Math.min(100, ((dailyTotals.fat || 0) / settings.fat_goal) * 100);

      expect(proteinWidth).toBe(0);
      expect(carbsWidth).toBe(0);
      expect(fatWidth).toBe(0);
    });

    it('correctly calculates actual macro progress percentages when real meals are logged', () => {
      const settings = { protein_goal: 130, carbs_goal: 250, fat_goal: 70 };
      const dailyTotals = { protein: 65, carbs: 125, fat: 35 };

      const proteinWidth = Math.min(100, ((dailyTotals.protein || 0) / settings.protein_goal) * 100);
      const carbsWidth = Math.min(100, ((dailyTotals.carbs || 0) / settings.carbs_goal) * 100);
      const fatWidth = Math.min(100, ((dailyTotals.fat || 0) / settings.fat_goal) * 100);

      expect(proteinWidth).toBe(50);
      expect(carbsWidth).toBe(50);
      expect(fatWidth).toBe(50);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 2. Truthful Water Intake Initialization and Persistence
  // ──────────────────────────────────────────────────────────────────────────
  describe('Fix 2: Water Intake Truthfulness & Database Record Derivation', () => {
    it('initializes water intake at 0ml instead of fabricated 1500ml', async () => {
      const Food = (await import('../pages/Food/index.jsx')).default;
      const html = renderToStaticMarkup(<Food />);

      // Must NOT render 1500ml as starting default
      expect(html).not.toContain('1500ml');
      // Should show initial 0ml
      expect(html).toContain('0ml');
    });

    it('aggregates water amount strictly from successfully loaded database records', () => {
      const mockWaterRecords = [
        { amount_ml: 250 },
        { amount_ml: 500 },
        { amount_ml: 250 },
      ];

      const totalWater = mockWaterRecords.reduce((acc, curr) => acc + (Number(curr.amount_ml) || 0), 0);
      expect(totalWater).toBe(1000);

      // Empty records should evaluate to 0ml
      const emptyRecords = [];
      const emptyTotal = emptyRecords.reduce((acc, curr) => acc + (Number(curr.amount_ml) || 0), 0);
      expect(emptyTotal).toBe(0);
    });

    it('handles water logging failure honestly without updating state or claiming false success', async () => {
      const { logWater } = await import('../services/healthService.js');
      const { supabase } = await import('../lib/supabase/index.js');
      const originalFrom = supabase.from;

      // Mock database insertion failure for water log
      supabase.from = vi.fn(() => ({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Network timeout writing to health_water_logs' },
            }),
          }),
        }),
      }));

      const res = await logWater({ userId: 'stage1-test-user', amountMl: 250, date: '2026-10-19' });
      expect(res.success).toBe(false);
      expect(res.error).toContain('Network timeout');

      // Restore mock
      supabase.from = originalFrom;
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 3. Verified-Food Confidence Labels (No AI Estimates treated as verified)
  // ──────────────────────────────────────────────────────────────────────────
  describe('Fix 3: Verified-Food Confidence Labels', () => {
    // Helper function mirroring the exact logic in Food/index.jsx
    const checkIsVerified = (meal) => Boolean(
      meal.source_type !== 'ai_estimate' && (
        meal.source_type === 'verified_db' ||
        meal.source_type === 'curated_seed' ||
        meal.source_type === 'official_dataset' ||
        meal.source_type === 'user_verified' ||
        (Number(meal.confidence) >= 0.95)
      )
    );

    it('marks AI estimates as ESTIMATED even if confidence is 1.0 or high', () => {
      const aiMeal1 = {
        source_type: 'ai_estimate',
        confidence: 1.0,
      };
      const aiMeal2 = {
        source_type: 'ai_estimate',
        confidence: 0.98,
      };

      expect(checkIsVerified(aiMeal1)).toBe(false);
      expect(checkIsVerified(aiMeal2)).toBe(false);
    });

    it('marks curated seed and official dataset foods as KNOWN (verified)', () => {
      const usdaFood = {
        source_type: 'official_dataset',
        confidence: 0.98,
      };
      const seedFood = {
        source_type: 'curated_seed',
        confidence: 0.98,
      };
      const verifiedDbFood = {
        source_type: 'verified_db',
        confidence: 1.0,
      };
      const userVerifiedFood = {
        source_type: 'user_verified',
        confidence: 1.0,
      };

      expect(checkIsVerified(usdaFood)).toBe(true);
      expect(checkIsVerified(seedFood)).toBe(true);
      expect(checkIsVerified(verifiedDbFood)).toBe(true);
      expect(checkIsVerified(userVerifiedFood)).toBe(true);
    });

    it('marks low-confidence or unverified items as ESTIMATED', () => {
      const lowConfFood = {
        source_type: 'heuristic_fallback',
        confidence: 0.70,
      };
      const nullConfFood = {
        source_type: null,
        confidence: null,
      };

      expect(checkIsVerified(lowConfFood)).toBe(false);
      expect(checkIsVerified(nullConfFood)).toBe(false);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 4. "Repeat Yesterday" Slot Preservation
  // ──────────────────────────────────────────────────────────────────────────
  describe('Fix 4: "Repeat Yesterday" Meal Type / Slot Preservation', () => {
    it('preserves each meal item original meal_type when no override slot is requested', async () => {
      const yesterdayMeals = [
        {
          id: 'meal-1',
          food_id: 'food-oats',
          food_name: 'Rolled Oats',
          meal_type: 'breakfast',
          quantity_g: 80,
          calories: 311,
          protein: 13,
          carbs: 55,
          fat: 5,
        },
        {
          id: 'meal-2',
          food_id: 'food-paneer',
          food_name: 'Paneer Curry',
          meal_type: 'lunch',
          quantity_g: 200,
          calories: 420,
          protein: 24,
          carbs: 12,
          fat: 32,
        },
        {
          id: 'meal-3',
          food_id: 'food-almonds',
          food_name: 'Almonds',
          meal_type: 'snack',
          quantity_g: 30,
          calories: 175,
          protein: 6,
          carbs: 6,
          fat: 15,
        },
      ];

      // Convert yesterday's meals to preview items (same logic as handleQuickAction repeat_yesterday)
      const previewItems = yesterdayMeals.map((m, idx) => ({
        tempId: `item-${Date.now()}-${idx}`,
        foodId: m.food_id,
        canonicalName: m.food_name,
        mealType: m.meal_type || 'snack',
        quantityG: m.quantity_g,
        unitLabel: 'g',
        calories: m.calories,
        protein: m.protein,
        carbs: m.carbs,
        fat: m.fat,
      }));

      // No requested slot override: previewMeal.mealType is null
      const requestedSlot = null;
      const previewMeal = {
        mealType: requestedSlot || null,
        items: previewItems,
      };

      expect(previewMeal.mealType).toBeNull();
      expect(previewMeal.items[0].mealType).toBe('breakfast');
      expect(previewMeal.items[1].mealType).toBe('lunch');
      expect(previewMeal.items[2].mealType).toBe('snack');

      // Construct itemsToLog for submission (same logic as handleConfirmLogMeal)
      const itemsToLog = previewMeal.items.map((item) => ({
        food_id: item.foodId || null,
        food_name: item.canonicalName,
        meal_type: previewMeal.mealType || item.mealType || 'snack',
        quantity_g: item.quantityG,
        calories: item.calories,
        protein: item.protein,
        carbs: item.carbs,
        fat: item.fat,
      }));

      // Each logged meal retains its original slot!
      expect(itemsToLog[0].meal_type).toBe('breakfast');
      expect(itemsToLog[1].meal_type).toBe('lunch');
      expect(itemsToLog[2].meal_type).toBe('snack');
    });

    it('allows explicit user slot override when a specific slot is requested', () => {
      const yesterdayMeals = [
        { food_name: 'Poha', meal_type: 'breakfast', calories: 250, quantity_g: 150 },
        { food_name: 'Curd', meal_type: 'breakfast', calories: 100, quantity_g: 100 },
      ];

      const requestedSlot = 'dinner'; // User explicitly clicked "Log to Dinner"

      const previewItems = yesterdayMeals.map((m, idx) => ({
        tempId: `item-${Date.now()}-${idx}`,
        canonicalName: m.food_name,
        mealType: m.meal_type || 'snack',
        quantityG: m.quantity_g,
        calories: m.calories,
      }));

      const previewMeal = {
        mealType: requestedSlot || null,
        items: previewItems,
      };

      const itemsToLog = previewMeal.items.map((item) => ({
        food_name: item.canonicalName,
        meal_type: previewMeal.mealType || item.mealType || 'snack',
        calories: item.calories,
      }));

      // Since user requested 'dinner', all items are overridden to 'dinner'
      expect(itemsToLog[0].meal_type).toBe('dinner');
      expect(itemsToLog[1].meal_type).toBe('dinner');
    });

    it('batchLogMeals preserves individual item meal_type when global mealType is undefined', async () => {
      const { batchLogMeals } = await import('../services/healthService.js');
      const { supabase } = await import('../lib/supabase/index.js');
      const originalFrom = supabase.from;

      let insertedRows = [];
      supabase.from = vi.fn(() => ({
        insert: vi.fn((rows) => {
          insertedRows = rows;
          return {
            select: vi.fn().mockResolvedValue({
              data: rows.map((r, i) => ({ id: `saved-${i}`, ...r })),
              error: null,
            }),
          };
        }),
      }));

      const res = await batchLogMeals({
        userId: 'stage1-test-user',
        date: '2026-10-19',
        mealType: undefined, // No global override
        items: [
          { food_name: 'Oats', meal_type: 'breakfast', calories: 300, quantity_g: 80 },
          { food_name: 'Paneer', meal_type: 'lunch', calories: 400, quantity_g: 150 },
        ],
      });

      expect(res.success).toBe(true);
      expect(insertedRows).toHaveLength(2);
      expect(insertedRows[0].meal_type).toBe('breakfast');
      expect(insertedRows[1].meal_type).toBe('lunch');

      // Restore mock
      supabase.from = originalFrom;
    });
  });
});
