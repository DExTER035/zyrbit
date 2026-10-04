/**
 * Health Food Persistence & Favorites Comprehensive Test Suite
 *
 * Tests A through J:
 * - Test A: Favorite a food -> persists to user_food_library
 * - Test B: Unfavorite a food -> removes/updates from user_food_library
 * - Test C: Save meal combo -> persists to saved_meals with items column and calculated totals
 * - Test D: Edit personal food -> whitelisted fields update, id and user_id untouched
 * - Test E: Delete personal food -> deleted from user_food_library
 * - Test F: Failed write -> never creates fake local records or fake IDs
 * - Test G: Repeat combo -> creates new today's meal records
 * - Test H: Yesterday's records remain unchanged
 * - Test I: Two-user RLS isolation on saved_meals and user_food_library
 * - Test J: Dex repeat/save action uses canonical healthService
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase/index.js';
import * as healthService from '../services/healthService.js';
import { ACTION_REGISTRY } from '../actions/actionRegistry.js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://xgowpznkqbsngdiuodmj.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhnb3dwem5rcWJzbmdkaXVvZG1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwNjUyOTYsImV4cCI6MjA4OTY0MTI5Nn0.hmCDn6hrlVW1qaZbyFnToxKhSXXkGgxIf-bHTlWXavA';

describe('Health Food Persistence & Favorites Verification Suite', () => {
  let userA, userB;
  let clientB;
  let testFoodId = null;
  let testSavedMealId = null;

  beforeAll(async () => {
    // Authenticate the singleton client used by healthService and foodService
    const resA = await supabase.auth.signInAnonymously();
    userA = resA.data?.user;

    // Create an independent client for User B to verify RLS cross-user isolation
    clientB = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
    const resB = await clientB.auth.signInAnonymously();
    userB = resB.data?.user;

    expect(userA?.id).toBeTruthy();
    expect(userB?.id).toBeTruthy();
    expect(userA.id).not.toBe(userB.id);
  }, 20000);

  // ─── Test A: Favorite Food Persistence ───────────────────────────────────────
  it('Test A: Favorite food persists to user_food_library with real UUID and valid macros', async () => {
    const res = await healthService.createPersonalFood({
      userId: userA.id,
      foodName: 'Test Paneer Tikka High Protein',
      servingSizeG: 150,
      servingUnit: 'g',
      calories: 320,
      protein: 26,
      carbs: 8,
      fat: 20,
      fiber: 2,
      isFavorite: true,
    });

    expect(res.success).toBe(true);
    expect(res.data).toBeDefined();
    expect(res.data.id).toBeTruthy();
    expect(res.data.id).not.toContain('fake');
    expect(res.data.food_name).toBe('Test Paneer Tikka High Protein');
    expect(Number(res.data.calories)).toBe(320);
    expect(Number(res.data.protein)).toBe(26);

    testFoodId = res.data.id;

    // Direct remote lookup to confirm real Postgres persistence
    const { data: remoteRows, error: lookupErr } = await supabase
      .from('user_food_library')
      .select('*')
      .eq('id', testFoodId);

    expect(lookupErr).toBeNull();
    expect(remoteRows).toHaveLength(1);
    expect(remoteRows[0].food_name).toBe('Test Paneer Tikka High Protein');
  });

  // ─── Test B: Unfavorite Food / Deletion ──────────────────────────────────────
  it('Test B: Unfavorite removes or toggles food record in library', async () => {
    // Create a temporary food to unfavorite
    const tempFood = await healthService.createPersonalFood({
      userId: userA.id,
      foodName: 'Temporary Unfavorite Snack',
      calories: 100,
      protein: 2,
      carbs: 15,
      fat: 4,
      fiber: 1,
      isFavorite: true,
    });
    expect(tempFood.success).toBe(true);
    const tempId = tempFood.data.id;

    // Unfavorite via deletePersonalFood
    const delRes = await healthService.deletePersonalFood({
      userId: userA.id,
      foodId: tempId,
    });
    expect(delRes.success).toBe(true);

    // Verify record is gone from user_food_library
    const { data: checkRows } = await supabase
      .from('user_food_library')
      .select('*')
      .eq('id', tempId);

    expect(checkRows).toHaveLength(0);
  });

  // ─── Test C: Save Meal Combo Persistence ────────────────────────────────────
  it('Test C: Save meal combo persists to saved_meals with canonical items column and calculated totals', async () => {
    const items = [
      {
        food_name: 'Rolled Oats',
        quantity_g: 60,
        calories: 220,
        protein: 8,
        carbs: 40,
        fat: 4,
        fiber: 6,
      },
      {
        food_name: 'Whey Isolate',
        quantity_g: 30,
        calories: 120,
        protein: 27,
        carbs: 1,
        fat: 1,
        fiber: 0,
      },
    ];

    const res = await healthService.saveMeal({
      userId: userA.id,
      name: 'Power Breakfast Combo',
      mealType: 'breakfast',
      items,
    });

    expect(res.success).toBe(true);
    expect(res.data).toBeDefined();
    expect(res.data.id).toBeTruthy();
    expect(res.data.name).toBe('Power Breakfast Combo');
    expect(res.data.meal_type).toBe('breakfast');

    // Check canonical items JSON column
    expect(Array.isArray(res.data.items)).toBe(true);
    expect(res.data.items).toHaveLength(2);
    expect(res.data.items[0].food_name).toBe('Rolled Oats');
    expect(res.data.items[1].food_name).toBe('Whey Isolate');

    // Check calculated totals (220 + 120 = 340 cal, 8 + 27 = 35 protein)
    expect(Number(res.data.total_cal)).toBe(340);
    expect(Number(res.data.total_protein)).toBe(35);
    expect(Number(res.data.total_carbs)).toBe(41);
    expect(Number(res.data.total_fat)).toBe(5);
    expect(Number(res.data.total_fiber)).toBe(6);

    testSavedMealId = res.data.id;

    // Direct query to verify in PostgreSQL
    const { data: dbMeal, error } = await supabase
      .from('saved_meals')
      .select('*')
      .eq('id', testSavedMealId)
      .single();

    expect(error).toBeNull();
    expect(dbMeal.name).toBe('Power Breakfast Combo');
    expect(Array.isArray(dbMeal.items)).toBe(true);
  });

  // ─── Test D: Edit Personal Food Security & Whitelist ─────────────────────────
  it('Test D: Edit personal food updates whitelisted fields while preserving id and user_id immutability', async () => {
    expect(testFoodId).toBeTruthy();

    const originalUserId = userA.id;
    const maliciousNewId = '00000000-0000-0000-0000-000000000000';
    const maliciousNewUserId = userB.id;

    const updateRes = await healthService.updatePersonalFood({
      userId: originalUserId,
      foodId: testFoodId,
      updates: {
        food_name: 'Updated Paneer Tikka (Extra Spices)',
        calories: 360,
        protein: 30,
        id: maliciousNewId,
        user_id: maliciousNewUserId,
      },
    });

    expect(updateRes.success).toBe(true);
    expect(updateRes.data.food_name).toBe('Updated Paneer Tikka (Extra Spices)');
    expect(Number(updateRes.data.calories)).toBe(360);
    expect(Number(updateRes.data.protein)).toBe(30);

    // Assert id and user_id were NOT hijacked
    expect(updateRes.data.id).toBe(testFoodId);
    expect(updateRes.data.user_id).toBe(originalUserId);
  });

  // ─── Test E: Delete Personal Food ───────────────────────────────────────────
  it('Test E: Delete personal food permanently deletes record from user_food_library', async () => {
    expect(testFoodId).toBeTruthy();

    const delRes = await healthService.deletePersonalFood({
      userId: userA.id,
      foodId: testFoodId,
    });
    expect(delRes.success).toBe(true);

    const { data: checkRows } = await supabase
      .from('user_food_library')
      .select('*')
      .eq('id', testFoodId);

    expect(checkRows).toHaveLength(0);
  });

  // ─── Test F: Failed Writes Never Produce Fake Local Records ───────────────────
  it('Test F: Failed writes return explicit error and never create fake local IDs or state', async () => {
    // Missing userId
    const resNoUser = await healthService.createPersonalFood({
      userId: null,
      foodName: 'Ghost Food',
    });
    expect(resNoUser.success).toBe(false);
    expect(resNoUser.error).toBeTruthy();
    expect(resNoUser.data).toBeUndefined();

    // Empty foodName
    const resEmptyName = await healthService.createPersonalFood({
      userId: userA.id,
      foodName: '   ',
    });
    expect(resEmptyName.success).toBe(false);
    expect(resEmptyName.error).toBeTruthy();
    expect(resEmptyName.data).toBeUndefined();

    // Invalid combo save (missing userId)
    const resNoComboUser = await healthService.saveMeal({
      userId: null,
      name: 'Ghost Combo',
      items: [],
    });
    expect(resNoComboUser.success).toBe(false);
    expect(resNoComboUser.error).toBeTruthy();
    expect(resNoComboUser.data).toBeUndefined();

    // Empty combo name
    const resEmptyComboName = await healthService.saveMeal({
      userId: userA.id,
      name: '',
      items: [{ food_name: 'Apple' }],
    });
    expect(resEmptyComboName.success).toBe(false);
    expect(resEmptyComboName.error).toBeTruthy();
    expect(resEmptyComboName.data).toBeUndefined();
  });

  // ─── Test G: Repeat Combo Creates New Today's Meal Records ────────────────────
  it("Test G: Repeat combo creates distinct today's meal records without altering template", async () => {
    const today = healthService.todayStr();
    const comboItems = [
      { food_name: 'Greek Yogurt', quantity_g: 150, calories: 130, protein: 15, carbs: 6, fat: 4, fiber: 0 },
      { food_name: 'Blueberries', quantity_g: 50, calories: 40, protein: 1, carbs: 9, fat: 0, fiber: 2 },
    ];

    const batchRes = await healthService.batchLogMeals({
      userId: userA.id,
      date: today,
      mealType: 'snack',
      items: comboItems,
    });

    expect(batchRes.success).toBe(true);
    expect(batchRes.data).toBeDefined();
    expect(batchRes.data).toHaveLength(2);
    expect(batchRes.data[0].date).toBe(today);
    expect(batchRes.data[0].meal_type).toBe('snack');
    expect(batchRes.data[0].food_name).toBe('Greek Yogurt');

    // Confirm saved_meals template was not modified
    const { data: comboCheck } = await supabase
      .from('saved_meals')
      .select('*')
      .eq('id', testSavedMealId)
      .single();

    expect(comboCheck.id).toBe(testSavedMealId);
    expect(comboCheck.items).toHaveLength(2);
  });

  // ─── Test H: Yesterday's Records Remain Unchanged ────────────────────────────
  it("Test H: Repeating meals creates new today's records while leaving yesterday's records unmodified", async () => {
    const yestDate = '2026-10-03';
    const todayDate = '2026-10-04';

    // 1. Log a meal specifically on yesterday's date
    const yestMeal = await healthService.logMeal({
      userId: userA.id,
      date: yestDate,
      mealType: 'lunch',
      foodName: 'Dal Tadka with Brown Rice',
      quantityG: 250,
      calories: 380,
      protein: 14,
      carbs: 60,
      fat: 8,
      fiber: 6,
    });
    expect(yestMeal.success).toBe(true);
    const yestMealId = yestMeal.data.id;

    // 2. Repeat for today
    const todayMeal = await healthService.logMeal({
      userId: userA.id,
      date: todayDate,
      mealType: 'lunch',
      foodName: yestMeal.data.food_name,
      quantityG: yestMeal.data.quantity_g,
      calories: yestMeal.data.calories,
      protein: yestMeal.data.protein,
      carbs: yestMeal.data.carbs,
      fat: yestMeal.data.fat,
      fiber: yestMeal.data.fiber,
    });
    expect(todayMeal.success).toBe(true);
    expect(todayMeal.data.id).not.toBe(yestMealId);

    // 3. Verify yesterday's row remains untouched
    const { data: yestCheck } = await supabase
      .from('meal_logs')
      .select('*')
      .eq('id', yestMealId)
      .single();

    expect(yestCheck.date).toBe(yestDate);
    expect(yestCheck.food_name).toBe('Dal Tadka with Brown Rice');
  });

  // ─── Test I: Two-User RLS Isolation ──────────────────────────────────────────
  it('Test I: Strict RLS cross-user isolation prevents User B from accessing User A food records', async () => {
    // 1. User A creates private food and private saved meal combo
    const userAFood = await supabase
      .from('user_food_library')
      .insert([{
        user_id: userA.id,
        food_name: "User A Secret Recipe",
        serving_size_g: 100,
        calories: 200,
        protein: 10,
        carbs: 20,
        fat: 5,
        fiber: 1,
      }])
      .select()
      .single();

    expect(userAFood.data?.id).toBeTruthy();
    const secretFoodId = userAFood.data.id;

    const userACombo = await supabase
      .from('saved_meals')
      .insert([{
        user_id: userA.id,
        name: "User A Secret Combo",
        meal_type: 'dinner',
        items: [{ food_name: 'Secret Stew', calories: 400 }],
        total_cal: 400,
        total_protein: 20,
        total_carbs: 30,
        total_fat: 10,
        total_fiber: 5,
      }])
      .select()
      .single();

    expect(userACombo.data?.id).toBeTruthy();
    const secretComboId = userACombo.data.id;

    // 2. User B tries to SELECT User A's private food
    const { data: bFoodRead } = await clientB
      .from('user_food_library')
      .select('*')
      .eq('id', secretFoodId);

    expect(bFoodRead).toHaveLength(0);

    // 3. User B tries to SELECT User A's saved meal combo
    const { data: bComboRead } = await clientB
      .from('saved_meals')
      .select('*')
      .eq('id', secretComboId);

    expect(bComboRead).toHaveLength(0);

    // 4. User B tries to UPDATE User A's private food
    const { data: bFoodUpdate } = await clientB
      .from('user_food_library')
      .update({ food_name: 'HACKED BY USER B' })
      .eq('id', secretFoodId)
      .select();

    expect(bFoodUpdate || []).toHaveLength(0);

    // 5. User B tries to DELETE User A's saved combo
    const { data: bComboDelete } = await clientB
      .from('saved_meals')
      .delete()
      .eq('id', secretComboId)
      .select();

    expect(bComboDelete || []).toHaveLength(0);

    // 6. Verify User A's records remain untouched
    const { data: aFoodVerify } = await supabase
      .from('user_food_library')
      .select('*')
      .eq('id', secretFoodId)
      .single();

    expect(aFoodVerify.food_name).toBe("User A Secret Recipe");
  });

  // ─── Test J: Dex Repeat/Save Action uses Canonical healthService ──────────────
  it('Test J: Dex repeat_meal action executes via canonical healthService without mock bypass', async () => {
    // Create a named saved meal template for User A
    const saveRes = await healthService.saveMeal({
      userId: userA.id,
      name: 'Dex Target Lunch Combo',
      mealType: 'lunch',
      items: [
        { food_name: 'Grilled Tofu Bowl', quantity_g: 200, calories: 280, protein: 22, carbs: 14, fat: 12, fiber: 4 },
      ],
    });
    expect(saveRes.success).toBe(true);

    // Execute Dex action registry repeat_meal
    const dexActionRes = await ACTION_REGISTRY.repeat_meal.execute({
      userId: userA.id,
      params: {
        comboName: 'Dex Target Lunch Combo',
        mealType: 'lunch',
        date: healthService.todayStr(),
      },
    });

    expect(dexActionRes.success).toBe(true);
    expect(dexActionRes.data).toBeDefined();
    expect(dexActionRes.data).toHaveLength(1);
    expect(dexActionRes.data[0].food_name).toBe('Grilled Tofu Bowl');
    expect(dexActionRes.data[0].date).toBe(healthService.todayStr());
  });
});
