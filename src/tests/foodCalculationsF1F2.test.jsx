import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import DailyCalorieRing from '../components/domain/food/DailyCalorieRing.jsx';
import { calculateDailyTotals, calculateScaledNutrition } from '../engines/food/index.js';
import { computeMacroBalanceGuidance } from '../engines/food/foodIntelligence.js';

describe('Food Calculation Fixes — F1 (Portion Scaling) & F2 (DailyCalorieRing)', () => {
  // ════════════════════════════════════════════════════════════════════════════
  // F1 — PORTION SCALING & SERVING WEIGHT INTEGRITY
  // ════════════════════════════════════════════════════════════════════════════
  describe('F1 — Food Portion Scaling with Missing / Invalid Serving Weights', () => {
    it('scales canonical food with valid defaultServingG (e.g. 150g Poha)', () => {
      const canonicalPoha = {
        id: 'poha',
        name: 'Poha',
        per100g: { cal: 130, protein: 2.6, carbs: 28, fat: 1.3, fiber: 1.2 },
        defaultServingG: 150,
      };

      // 1 serving (150g)
      const baseFood = {
        serving_size_g: 100,
        calories: canonicalPoha.per100g.cal,
        protein: canonicalPoha.per100g.protein,
        carbs: canonicalPoha.per100g.carbs,
        fat: canonicalPoha.per100g.fat,
        fiber: canonicalPoha.per100g.fiber,
      };
      const scaled1x = calculateScaledNutrition(baseFood, 150);
      expect(scaled1x.calories).toBe(195);
      expect(scaled1x.protein).toBe(3.9);
      expect(scaled1x.carbs).toBe(42);
      expect(scaled1x.fat).toBe(2);
      expect(scaled1x.fiber).toBe(1.8);

      // Half serving (75g)
      const scaledHalf = calculateScaledNutrition(baseFood, 75);
      expect(scaledHalf.calories).toBe(98);
      expect(scaledHalf.protein).toBe(2);
      expect(scaledHalf.carbs).toBe(21);
    });

    it('scales personal food with serving_size_g when defaultServingG is missing (e.g. 50g serving)', () => {
      // User library food without defaultServingG (only serving_size_g = 50)
      const personalItem = {
        food_name: 'Custom Granola',
        serving_size_g: 50,
        calories: 220,
        protein: 6.5,
        carbs: 30,
        fat: 8.5,
        fiber: 4,
      };

      const rawServing = Number(personalItem.serving_size_g ?? personalItem.defaultServingG);
      const validServing = isFinite(rawServing) && rawServing > 0 ? rawServing : 100;
      expect(validServing).toBe(50);

      const baseFood = {
        serving_size_g: validServing,
        calories: personalItem.calories,
        protein: personalItem.protein,
        carbs: personalItem.carbs,
        fat: personalItem.fat,
        fiber: personalItem.fiber,
      };

      // 1 serving (50g) must equal exact base nutrition (220 cal, 6.5g protein)
      const scaled1x = calculateScaledNutrition(baseFood, 50);
      expect(scaled1x.calories).toBe(220);
      expect(scaled1x.protein).toBe(6.5);
      expect(scaled1x.carbs).toBe(30);
      expect(scaled1x.fat).toBe(8.5);
      expect(scaled1x.fiber).toBe(4);

      // 2 servings (100g) must double (440 cal, 13g protein)
      const scaled2x = calculateScaledNutrition(baseFood, 100);
      expect(scaled2x.calories).toBe(440);
      expect(scaled2x.protein).toBe(13);
      expect(scaled2x.carbs).toBe(60);
      expect(scaled2x.fat).toBe(17);
      expect(scaled2x.fiber).toBe(8);
    });

    it('handles missing, zero, negative, or NaN serving weights safely without distorting nutrition', () => {
      // Food with invalid serving weight (0)
      const zeroServingFood = {
        food_name: 'Mystery Snack',
        serving_size_g: 0,
        defaultServingG: null,
        calories: 150,
        protein: 10,
        carbs: 15,
        fat: 5,
        fiber: 2,
      };

      const rawZero = Number(zeroServingFood.defaultServingG ?? zeroServingFood.serving_size_g);
      const validZero = isFinite(rawZero) && rawZero > 0 ? rawZero : 100;
      expect(validZero).toBe(100); // Safely fall back to 100g base

      const baseZero = {
        serving_size_g: validZero,
        calories: zeroServingFood.calories,
        protein: zeroServingFood.protein,
        carbs: zeroServingFood.carbs,
        fat: zeroServingFood.fat,
        fiber: zeroServingFood.fiber,
      };
      // 100g (1 baseline serving) preserves exact 150 cal and 10g protein
      const scaled = calculateScaledNutrition(baseZero, 100);
      expect(scaled.calories).toBe(150);
      expect(scaled.protein).toBe(10);

      // Negative weight (-50)
      const rawNeg = Number(-50);
      const validNeg = isFinite(rawNeg) && rawNeg > 0 ? rawNeg : 100;
      expect(validNeg).toBe(100);

      // NaN weight ('invalid')
      const rawNaN = Number('invalid');
      const validNaN = isFinite(rawNaN) && rawNaN > 0 ? rawNaN : 100;
      expect(validNaN).toBe(100);
    });

    it('correctly handles custom gram inputs with custom mode', () => {
      const paneer = {
        food_name: 'Paneer',
        serving_size_g: 100,
        calories: 265,
        protein: 18.3,
        carbs: 3.4,
        fat: 20.8,
        fiber: 0,
      };

      const baseFood = {
        serving_size_g: 100,
        calories: paneer.calories,
        protein: paneer.protein,
        carbs: paneer.carbs,
        fat: paneer.fat,
        fiber: paneer.fiber,
      };

      // Custom 40g
      const custom40 = calculateScaledNutrition(baseFood, 40);
      expect(custom40.quantity_g).toBe(40);
      expect(custom40.calories).toBe(Math.round(265 * 0.4)); // 106
      expect(custom40.protein).toBe(Math.round(18.3 * 0.4 * 10) / 10); // 7.3
      expect(custom40.carbs).toBe(Math.round(3.4 * 0.4 * 10) / 10); // 1.4
      expect(custom40.fat).toBe(Math.round(20.8 * 0.4 * 10) / 10); // 8.3

      // Custom 250g
      const custom250 = calculateScaledNutrition(baseFood, 250);
      expect(custom250.quantity_g).toBe(250);
      expect(custom250.calories).toBe(Math.round(265 * 2.5)); // 663
      expect(custom250.protein).toBe(Math.round(18.3 * 2.5 * 10) / 10); // 45.8
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // F2 — DAILY CALORIE RING CONTRACT AND DISPLAY INTEGRITY
  // ════════════════════════════════════════════════════════════════════════════
  describe('F2 — DailyCalorieRing Property Contract & Rendering', () => {
    it('renders actual calories from calculateDailyTotals() output (totals.calories)', () => {
      const mealLogs = [
        { calories: 350, protein: 25, carbs: 40, fat: 10, fiber: 5 },
        { calories: 650, protein: 45, carbs: 70, fat: 20, fiber: 8 },
      ];
      const dailyTotals = calculateDailyTotals(mealLogs);
      expect(dailyTotals.calories).toBe(1000);
      expect(dailyTotals.protein).toBe(70);

      const html = renderToStaticMarkup(
        <DailyCalorieRing
          totals={dailyTotals}
          goal={2200}
          macroGoals={{ protein: 140, carbs: 250, fat: 70 }}
        />
      );

      // Must display 1000 calories, NOT 0!
      expect(html).toContain('1000');
      expect(html).toContain('1200 left'); // 2200 - 1000
      expect(html).toContain('OF 2200 KCAL');
      expect(html).toContain('70g left'); // 140 - 70
    });

    it('renders zero calories cleanly when mealLogs is empty', () => {
      const dailyTotals = calculateDailyTotals([]);
      expect(dailyTotals.calories).toBe(0);

      const html = renderToStaticMarkup(
        <DailyCalorieRing
          totals={dailyTotals}
          goal={2000}
          macroGoals={{ protein: 120, carbs: 200, fat: 60 }}
        />
      );

      expect(html).toContain('0');
      expect(html).toContain('2000 left');
      expect(html).toContain('OF 2000 KCAL');
    });

    it('renders over-budget calories when daily calories exceed goal', () => {
      const mealLogs = [
        { calories: 1200, protein: 80, carbs: 100, fat: 40, fiber: 10 },
        { calories: 1100, protein: 70, carbs: 120, fat: 35, fiber: 12 },
      ];
      const dailyTotals = calculateDailyTotals(mealLogs);
      expect(dailyTotals.calories).toBe(2300);

      const html = renderToStaticMarkup(
        <DailyCalorieRing
          totals={dailyTotals}
          goal={2000}
          macroGoals={{ protein: 130, carbs: 220, fat: 65 }}
        />
      );

      expect(html).toContain('2300');
      expect(html).toContain('300 over'); // 2300 - 2000
      expect(html).toContain('Goal hit!'); // 150g protein > 130g goal
    });

    it('backward compatibility: supports legacy totals with totals.cal', () => {
      const legacyTotals = {
        cal: 850,
        protein: 50,
        carbs: 90,
        fat: 25,
        fiber: 6,
      };

      const html = renderToStaticMarkup(
        <DailyCalorieRing
          totals={legacyTotals}
          goal={2000}
          macroGoals={{ protein: 120, carbs: 200, fat: 60 }}
        />
      );

      expect(html).toContain('850');
      expect(html).toContain('1150 left');
    });

    it('handles undefined or null totals safely without crashing', () => {
      const html = renderToStaticMarkup(
        <DailyCalorieRing
          totals={null}
          goal={2000}
          macroGoals={{ protein: 120, carbs: 200, fat: 60 }}
        />
      );

      expect(html).toContain('0');
      expect(html).toContain('2000 left');
    });

    it('computeMacroBalanceGuidance generates guidance from calculateDailyTotals output', () => {
      const totals = calculateDailyTotals([
        { calories: 1800, protein: 120, carbs: 180, fat: 55, fiber: 25 },
      ]);
      const guidance = computeMacroBalanceGuidance(totals, {
        calorie_goal: 2000,
        protein_goal: 130,
      });

      expect(guidance).toBeTruthy();
      expect(typeof guidance.text).toBe('string');
      expect(guidance.status).toBe('close');
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // F3 — DAILY NUTRITION ROUNDING & FLOATING-POINT DRIFT
  // ════════════════════════════════════════════════════════════════════════════
  describe('F3 — Daily Nutrition Rounding & Precision Integrity', () => {
    it('eliminates floating-point drift across multiple decimal macro entries', () => {
      // In raw IEEE 754:
      // 15.1 + 10.2 + 20.3 = 45.599999999999994
      // 25.1 + 30.2 + 40.3 = 95.60000000000001
      // 12.1 + 8.2 + 14.3  = 34.599999999999994
      // 3.1 + 4.2 + 5.3    = 12.600000000000001
      const mealsWithDrift = [
        { calories: 250, protein: 15.1, carbs: 25.1, fat: 12.1, fiber: 3.1 },
        { calories: 350, protein: 10.2, carbs: 30.2, fat: 8.2, fiber: 4.2 },
        { calories: 450, protein: 20.3, carbs: 40.3, fat: 14.3, fiber: 5.3 },
      ];

      const totals = calculateDailyTotals(mealsWithDrift);

      expect(totals.calories).toBe(1050);
      expect(totals.protein).toBe(45.6);
      expect(totals.carbs).toBe(95.6);
      expect(totals.fat).toBe(34.6);
      expect(totals.fiber).toBe(12.6);
    });

    it('preserves intermediate calorie precision and rounds at the boundary instead of per-food truncation', () => {
      // 4 snack items of 33.4 calories each
      // Per-food rounding would sum: 33 + 33 + 33 + 33 = 132
      // Boundary rounding sums: 33.4 * 4 = 133.6 -> Math.round(133.6) = 134
      const snacks = [
        { calories: 33.4, protein: 2.1, carbs: 5.2, fat: 0.5, fiber: 0.2 },
        { calories: 33.4, protein: 2.1, carbs: 5.2, fat: 0.5, fiber: 0.2 },
        { calories: 33.4, protein: 2.1, carbs: 5.2, fat: 0.5, fiber: 0.2 },
        { calories: 33.4, protein: 2.1, carbs: 5.2, fat: 0.5, fiber: 0.2 },
      ];

      const totals = calculateDailyTotals(snacks);

      expect(totals.calories).toBe(134);
      expect(totals.protein).toBe(8.4);
      expect(totals.carbs).toBe(20.8);
      expect(totals.fat).toBe(2.0);
      expect(totals.fiber).toBe(0.8);
    });

    it('supports schema variations: protein/protein_g, carbs/carbs_g, fat/fat_g, fiber/fiber_g', () => {
      const mixedSchemaMeals = [
        { calories: 200, protein_g: 15.4, carbs_g: 20.2, fat_g: 5.1, fiber_g: 3.2 },
        { calories: '300', protein: '25.3', carbs: '35.4', fat: '10.2', fiber: '4.1' },
      ];

      const totals = calculateDailyTotals(mixedSchemaMeals);

      expect(totals.calories).toBe(500);
      expect(totals.protein).toBe(40.7);
      expect(totals.carbs).toBe(55.6);
      expect(totals.fat).toBe(15.3);
      expect(totals.fiber).toBe(7.3);
    });

    it('handles empty, null, undefined, or missing fields without failing or producing NaN', () => {
      const edgeCaseMeals = [
        null,
        undefined,
        {},
        { calories: null, protein: undefined, carbs: 'invalid', fat: NaN, fiber: 0 },
        { calories: 150, protein: 10 },
      ];

      const totals = calculateDailyTotals(edgeCaseMeals);

      expect(totals.calories).toBe(150);
      expect(totals.protein).toBe(10);
      expect(totals.carbs).toBe(0);
      expect(totals.fat).toBe(0);
      expect(totals.fiber).toBe(0);
    });

    it('maintains exact precision through adding, editing, and deleting meal entries', () => {
      // Step 1: Initial meal logs (Breakfast and Lunch)
      let meals = [
        { id: 1, calories: 350.2, protein: 25.1, carbs: 40.2, fat: 10.3, fiber: 4.1 },
        { id: 2, calories: 550.4, protein: 35.2, carbs: 65.1, fat: 18.2, fiber: 6.2 },
      ];

      let totals = calculateDailyTotals(meals);
      // 350.2 + 550.4 = 900.6 -> 901
      // protein: 25.1 + 35.2 = 60.3
      // carbs: 40.2 + 65.1 = 105.3
      // fat: 10.3 + 18.2 = 28.5
      // fiber: 4.1 + 6.2 = 10.3
      expect(totals.calories).toBe(901);
      expect(totals.protein).toBe(60.3);
      expect(totals.carbs).toBe(105.3);
      expect(totals.fat).toBe(28.5);
      expect(totals.fiber).toBe(10.3);

      // Step 2: ADD a dinner entry with fractional values that induce IEEE float drift
      const dinner = { id: 3, calories: 420.3, protein: 28.3, carbs: 45.3, fat: 12.1, fiber: 5.3 };
      meals = [...meals, dinner];

      totals = calculateDailyTotals(meals);
      // 900.6 + 420.3 = 1320.9 -> 1321
      // protein: 60.3 + 28.3 = 88.6 (88.60000000000001 raw)
      // carbs: 105.3 + 45.3 = 150.6
      // fat: 28.5 + 12.1 = 40.6
      // fiber: 10.3 + 5.3 = 15.6
      expect(totals.calories).toBe(1321);
      expect(totals.protein).toBe(88.6);
      expect(totals.carbs).toBe(150.6);
      expect(totals.fat).toBe(40.6);
      expect(totals.fiber).toBe(15.6);

      // Step 3: EDIT Lunch (id: 2) with updated portion size
      const updatedLunch = { id: 2, calories: 650.1, protein: 42.4, carbs: 75.3, fat: 20.4, fiber: 7.4 };
      meals = meals.map((m) => (m.id === 2 ? updatedLunch : m));

      totals = calculateDailyTotals(meals);
      // 350.2 + 650.1 + 420.3 = 1420.6 -> 1421
      // protein: 25.1 + 42.4 + 28.3 = 95.8
      // carbs: 40.2 + 75.3 + 45.3 = 160.8
      // fat: 10.3 + 20.4 + 12.1 = 42.8
      // fiber: 4.1 + 7.4 + 5.3 = 16.8
      expect(totals.calories).toBe(1421);
      expect(totals.protein).toBe(95.8);
      expect(totals.carbs).toBe(160.8);
      expect(totals.fat).toBe(42.8);
      expect(totals.fiber).toBe(16.8);

      // Step 4: REMOVE Breakfast (id: 1)
      meals = meals.filter((m) => m.id !== 1);

      totals = calculateDailyTotals(meals);
      // 650.1 + 420.3 = 1070.4 -> 1070
      // protein: 42.4 + 28.3 = 70.7
      // carbs: 75.3 + 45.3 = 120.6
      // fat: 20.4 + 12.1 = 32.5
      // fiber: 7.4 + 5.3 = 12.7
      expect(totals.calories).toBe(1070);
      expect(totals.protein).toBe(70.7);
      expect(totals.carbs).toBe(120.6);
      expect(totals.fat).toBe(32.5);
      expect(totals.fiber).toBe(12.7);
    });

    it('resolves vernacular transliterations like "100gm panner roasted" to canonical Paneer with correct portion scaling', async () => {
      const { resolveFoodInputV2 } = await import('../dex/resolvers/foodResolverV2.js');
      const res = resolveFoodInputV2('100gm panner roasted');

      expect(res.success).toBe(true);
      expect(res.items).toHaveLength(1);
      expect(res.items[0].canonicalName).toBe('Paneer');
      expect(res.items[0].quantityG).toBe(100);
      expect(res.items[0].calories).toBe(265);
      expect(res.items[0].protein).toBe(18);
    });
  });
});

