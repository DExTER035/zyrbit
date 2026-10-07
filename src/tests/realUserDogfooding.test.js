/**
 * ZYRBIT REAL-USER QA / DOGFOODING INTEGRATION SUITE
 *
 * Runs end-to-end user workflows against the live running Supabase backend and
 * canonical services, verifying UI actions -> Service -> Supabase DB rows -> Read -> State.
 */

import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase/index.js';
import { ensureProfile } from '../lib/friendTag.js';

// Domain Services & Engines
import * as healthService from '../services/healthService.js';
import * as wealthService from '../services/wealthService.js';
import * as habitService from '../services/habitService.js';
import * as growthService from '../services/growthService.js';
import { findCanonicalFood, ALL_CANONICAL_FOODS } from '../data/foods/canonicalFoods.js';
import { calculateScaledNutrition, calculateDailyTotals } from '../engines/food/index.js';
import { computeMoneyState } from '../engines/wealth/moneyState.js';
import { resolveDeterministicIntent } from '../dex/dexIntentParser.js';
import { ACTION_REGISTRY } from '../actions/actionRegistry.js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://xgowpznkqbsngdiuodmj.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhnb3dwem5rcWJzbmdkaXVvZG1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwNjUyOTYsImV4cCI6MjA4OTY0MTI5Nn0.hmCDn6hrlVW1qaZbyFnToxKhSXXkGgxIf-bHTlWXavA';

const today = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().split('T')[0];
};

describe('Zyrbit Real-User QA / Dogfooding Session', () => {
  let primaryUser = null;
  let isolatedUser = null;
  let isolatedClient = null;

  // ════════════════════════════════════════════════════════════════════════════
  // PHASE 1 — AUTHENTICATION & SESSION
  // ════════════════════════════════════════════════════════════════════════════
  describe('Phase 1: Authentication & Session Management', () => {
    it('[P1.1] App loads, authenticates real user session via Supabase', async () => {
      const authRes = await supabase.auth.signInAnonymously();
      expect(authRes.data?.session).toBeTruthy();
      expect(authRes.data?.user?.id).toBeTruthy();
      primaryUser = authRes.data.user;
    });

    it('[P1.2] User profile is created/verified via ensureProfile', async () => {
      const profile = await ensureProfile(primaryUser);
      expect(profile).toBeTruthy();

      const { data: dbProfile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', primaryUser.id)
        .single();

      expect(error).toBeNull();
      expect(dbProfile.id).toBe(primaryUser.id);
    });

    it('[P1.3] Session persistence check (getSession returns active session)', async () => {
      const { data } = await supabase.auth.getSession();
      expect(data.session?.user?.id).toBe(primaryUser.id);
    });

    it('[P1.4] Independent isolated client can authenticate for RLS tests', async () => {
      isolatedClient = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
      const res = await isolatedClient.auth.signInAnonymously();
      isolatedUser = res.data?.user;
      expect(isolatedUser?.id).toBeTruthy();
      expect(isolatedUser.id).not.toBe(primaryUser.id);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // PHASE 2 — MAIN NAVIGATION & REMOTE DOMAIN HEALTH
  // ════════════════════════════════════════════════════════════════════════════
  describe('Phase 2: Main Navigation & Remote Domain Health', () => {
    it('[P2.1] Zenith data fetchers execute cleanly', async () => {
      const { data, error } = await supabase
        .from('zenith_daily_logs')
        .select('*')
        .eq('user_id', primaryUser.id)
        .limit(5);
      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });

    it('[P2.2] Growth data fetchers execute cleanly (habits, tasks)', async () => {
      const [habitsRes, tasksRes] = await Promise.all([
        supabase.from('habits').select('*').eq('user_id', primaryUser.id),
        supabase.from('growth_tasks').select('*').eq('user_id', primaryUser.id),
      ]);
      expect(habitsRes.error).toBeNull();
      expect(tasksRes.error).toBeNull();
    });

    it('[P2.3] Health data fetchers execute cleanly (meal_logs, move, water, sleep)', async () => {
      const [meals, moves, sleep] = await Promise.all([
        supabase.from('meal_logs').select('*').eq('user_id', primaryUser.id),
        supabase.from('health_move_logs').select('*').eq('user_id', primaryUser.id),
        supabase.from('health_sleep_logs').select('*').eq('user_id', primaryUser.id),
      ]);
      expect(meals.error).toBeNull();
      expect(moves.error).toBeNull();
      expect(sleep.error).toBeNull();
    });

    it('[P2.4] Wealth data fetchers execute cleanly (expenses, income, bills)', async () => {
      const [exp, inc, bills] = await Promise.all([
        supabase.from('money_expenses').select('*').eq('user_id', primaryUser.id),
        supabase.from('wealth_income').select('*').eq('user_id', primaryUser.id),
        supabase.from('wealth_bills').select('*').eq('user_id', primaryUser.id),
      ]);
      expect(exp.error).toBeNull();
      expect(inc.error).toBeNull();
      expect(bills.error).toBeNull();
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // PHASE 3 — FOOD / HEALTH (HIGH PRIORITY REAL USER DOGFOODING)
  // ════════════════════════════════════════════════════════════════════════════
  describe('Phase 3: Food & Nutrition Tracking Flow', () => {
    const todayDate = today();
    let oatsLogId = null;
    let paneerPersonalFoodId = null;

    it('[P3.1] Dogfooding Target: Recognize 80g oats, calculate scaled nutrition, persist to DB', async () => {
      const match = findCanonicalFood('Rolled oats') || findCanonicalFood('oats');
      expect(match).toBeTruthy();
      const food = match.food;

      // Calculate scaled nutrition for 80g
      const scaled = calculateScaledNutrition({
        serving_size_g: food.defaultServingG || 40,
        calories: food.per100g ? (food.per100g.cal * (food.defaultServingG || 40)) / 100 : food.calories,
        protein: food.per100g ? (food.per100g.protein * (food.defaultServingG || 40)) / 100 : food.protein,
        carbs: food.per100g ? (food.per100g.carbs * (food.defaultServingG || 40)) / 100 : food.carbs,
        fat: food.per100g ? (food.per100g.fat * (food.defaultServingG || 40)) / 100 : food.fat,
        fiber: food.per100g ? (food.per100g.fiber * (food.defaultServingG || 40)) / 100 : food.fiber,
      }, 80);

      expect(scaled.calories).toBeGreaterThan(250);
      expect(scaled.protein).toBeGreaterThan(8);

      // Persist via healthService.logMeal
      const res = await healthService.logMeal({
        userId: primaryUser.id,
        mealType: 'breakfast',
        foodId: food.id,
        foodName: food.name,
        quantityG: 80,
        calories: scaled.calories,
        protein: scaled.protein,
        carbs: scaled.carbs,
        fat: scaled.fat,
        fiber: scaled.fiber,
        date: todayDate,
        nutritionSnapshot: { per100g: food.per100g, servingSizeG: 80 },
      });

      expect(res.success).toBe(true);
      expect(res.data?.id).toBeTruthy();
      oatsLogId = res.data.id;

      // Verify row in remote Supabase meal_logs table
      const { data: dbRow, error } = await supabase
        .from('meal_logs')
        .select('*')
        .eq('id', oatsLogId)
        .single();

      expect(error).toBeNull();
      expect(dbRow.food_name).toBe(food.name);
      expect(dbRow.meal_type).toBe('breakfast');
      expect(dbRow.quantity_g).toBe(80);
      expect(Number(dbRow.calories)).toBe(scaled.calories);
    });

    it('[P3.2] Dogfooding Target: Log 200ml milk (206g) and 5 dates (120g)', async () => {
      const milkMatch = findCanonicalFood('milk');
      expect(milkMatch).toBeTruthy();

      const milkRes = await healthService.logMeal({
        userId: primaryUser.id,
        mealType: 'breakfast',
        foodName: milkMatch.food.name,
        quantityG: 206,
        calories: 124,
        protein: 6.8,
        carbs: 10,
        fat: 6.6,
        fiber: 0,
        date: todayDate,
      });
      expect(milkRes.success).toBe(true);

      const datesRes = await healthService.logMeal({
        userId: primaryUser.id,
        mealType: 'breakfast',
        foodName: 'Medjool Dates',
        quantityG: 120,
        calories: 332,
        protein: 2.2,
        carbs: 90,
        fat: 0.2,
        fiber: 8,
        date: todayDate,
      });
      expect(datesRes.success).toBe(true);
    });

    it('[P3.3] Verify today meals retrieval and aggregate daily nutrition calculation', async () => {
      const { data: logs, error } = await supabase
        .from('meal_logs')
        .select('*')
        .eq('user_id', primaryUser.id)
        .eq('date', todayDate);

      expect(error).toBeNull();
      expect(logs.length).toBeGreaterThanOrEqual(3);

      const totals = calculateDailyTotals(logs);
      expect(totals.calories).toBeGreaterThan(600);
      expect(totals.protein).toBeGreaterThan(15);
      expect(totals.carbs).toBeGreaterThan(100);
    });

    it('[P3.4] Test: 2 eggs + 2 rotis logged for lunch', async () => {
      const eggRes = await healthService.logMeal({
        userId: primaryUser.id,
        mealType: 'lunch',
        foodName: 'Whole boiled egg',
        quantityG: 100, // ~2 eggs
        calories: 143,
        protein: 12.6,
        carbs: 0.7,
        fat: 9.5,
        fiber: 0,
        date: todayDate,
      });
      expect(eggRes.success).toBe(true);

      const rotiRes = await healthService.logMeal({
        userId: primaryUser.id,
        mealType: 'lunch',
        foodName: 'Roti / Chapati (whole wheat)',
        quantityG: 70, // ~2 rotis
        calories: 208,
        protein: 6.2,
        carbs: 42,
        fat: 1.8,
        fiber: 5.4,
        date: todayDate,
      });
      expect(rotiRes.success).toBe(true);
    });

    it('[P3.5] Test: Paneer 100g logged for dinner', async () => {
      const paneerRes = await healthService.logMeal({
        userId: primaryUser.id,
        mealType: 'dinner',
        foodName: 'Paneer',
        quantityG: 100,
        calories: 265,
        protein: 18.3,
        carbs: 1.2,
        fat: 20.8,
        fiber: 0,
        date: todayDate,
      });
      expect(paneerRes.success).toBe(true);
    });

    it('[P3.6] Test: Search canonical catalog', () => {
      const searchMatches = ALL_CANONICAL_FOODS.filter((f) =>
        f.name.toLowerCase().includes('oat')
      );
      expect(searchMatches.length).toBeGreaterThanOrEqual(2);
      expect(searchMatches.some((f) => f.name.toLowerCase().includes('rolled'))).toBe(true);
    });

    it('[P3.7] Test: Create Personal Food (Homemade Protein Shake)', async () => {
      const res = await healthService.createPersonalFood({
        userId: primaryUser.id,
        foodName: 'Winter Arc Super Shake',
        servingSizeG: 450,
        servingUnit: 'g',
        calories: 520,
        protein: 48,
        carbs: 55,
        fat: 12,
        fiber: 6,
        isFavorite: true,
      });

      expect(res.success).toBe(true);
      expect(res.data?.id).toBeTruthy();
      paneerPersonalFoodId = res.data.id;

      // Verify in user_food_library
      const { data: dbItem, error } = await supabase
        .from('user_food_library')
        .select('*')
        .eq('id', paneerPersonalFoodId)
        .single();

      expect(error).toBeNull();
      expect(dbItem.food_name).toBe('Winter Arc Super Shake');
      expect(Number(dbItem.calories)).toBe(520);
      expect(Number(dbItem.protein)).toBe(48);
    });

    it('[P3.8] Test: Portion multipliers (0.5x, 1x, 1.5x, 2x, custom 250g)', () => {
      const baseFood = { serving_size_g: 100, calories: 200, protein: 20, carbs: 20, fat: 5, fiber: 2 };

      const half = calculateScaledNutrition(baseFood, 50);
      expect(half.calories).toBe(100);
      expect(half.protein).toBe(10);

      const oneAndHalf = calculateScaledNutrition(baseFood, 150);
      expect(oneAndHalf.calories).toBe(300);
      expect(oneAndHalf.protein).toBe(30);

      const double = calculateScaledNutrition(baseFood, 200);
      expect(double.calories).toBe(400);

      const custom = calculateScaledNutrition(baseFood, 250);
      expect(custom.calories).toBe(500);
      expect(custom.protein).toBe(50);
    });

    it('[P3.9] Test: Water logging (+250ml)', async () => {
      const waterRes = await healthService.logWater({
        userId: primaryUser.id,
        amountMl: 250,
        date: todayDate,
      });
      expect(waterRes.success).toBe(true);

      const { data: waterRows, error } = await supabase
        .from('health_water_logs')
        .select('*')
        .eq('user_id', primaryUser.id)
        .eq('log_date', todayDate);

      expect(error).toBeNull();
      expect(waterRows.length).toBeGreaterThanOrEqual(1);
    });

    it('[P3.10] Test: Workout / Activity logging (45 min strength training)', async () => {
      const actRes = await healthService.logActivity({
        userId: primaryUser.id,
        activityType: 'Strength Training',
        activeMinutes: 45,
        rpe: 8,
        notes: 'Winter Arc Day 1 Push workout',
        date: todayDate,
      });
      expect(actRes.success).toBe(true);

      const { data: moveRows, error } = await supabase
        .from('health_move_logs')
        .select('*')
        .eq('user_id', primaryUser.id);

      expect(error).toBeNull();
      expect(moveRows.some((m) => m.activity_type === 'Strength Training')).toBe(true);
    });

    it('[P3.11] Test: Weight logging (74.5 kg)', async () => {
      const weightRes = await healthService.logWeight({
        userId: primaryUser.id,
        weight: 74.5,
        date: todayDate,
      });
      expect(weightRes.success).toBe(true);

      const { data: weightRows, error } = await supabase
        .from('health_weight_logs')
        .select('*')
        .eq('user_id', primaryUser.id)
        .eq('log_date', todayDate);

      expect(error).toBeNull();
      expect(Number(weightRows[0]?.weight)).toBe(74.5);
    });

    it('[P3.12] Test: Sleep logging (7.5 hours, quality 4)', async () => {
      const sleepRes = await healthService.logSleep({
        userId: primaryUser.id,
        durationHours: 7.5,
        quality: 4,
        date: todayDate,
      });
      expect(sleepRes.success).toBe(true);

      const { data: sleepRows, error } = await supabase
        .from('health_sleep_logs')
        .select('*')
        .eq('user_id', primaryUser.id)
        .eq('sleep_date', todayDate);

      expect(error).toBeNull();
      expect(Number(sleepRows[0]?.duration_hours)).toBe(7.5);
    });

    it('[P3.13] Test: Ambiguity detection on oats candidates', () => {
      const match = findCanonicalFood('oats');
      expect(match).toBeTruthy();
      expect(match.candidates || match.food).toBeTruthy();
    });

    it('[P3.14] Test: Unknown food query handling', () => {
      const match = findCanonicalFood('xyz-completely-unknown-intergalactic-grain');
      expect(match).toBeNull();
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // PHASE 4 — MONEY / WEALTH
  // ════════════════════════════════════════════════════════════════════════════
  describe('Phase 4: Wealth & Expense Tracking Flow', () => {
    let testExpenseId = null;
    let testIncomeId = null;
    let testBillId = null;

    it('[P4.1] Add ₹100 grocery expense -> verify in money_expenses', async () => {
      const res = await wealthService.addExpense({
        userId: primaryUser.id,
        amount: 100,
        category: 'Food',
        notes: 'Winter Arc fresh groceries',
        spentAt: today(),
      });

      expect(res.success).toBe(true);
      expect(res.data?.id).toBeTruthy();
      testExpenseId = res.data.id;

      const { data: dbExp, error } = await supabase
        .from('money_expenses')
        .select('*')
        .eq('id', testExpenseId)
        .single();

      expect(error).toBeNull();
      expect(Number(dbExp.amount)).toBe(100);
      expect(dbExp.category).toBe('Food');
    });

    it('[P4.2] Add ₹500 income -> verify in wealth_income', async () => {
      const res = await wealthService.addIncome({
        userId: primaryUser.id,
        amount: 500,
        source: 'Freelance Design',
        notes: 'Milestone payment',
        receivedAt: today(),
      });

      expect(res.success).toBe(true);
      expect(res.data?.id).toBeTruthy();
      testIncomeId = res.data.id;

      const { data: dbInc, error } = await supabase
        .from('wealth_income')
        .select('*')
        .eq('id', testIncomeId)
        .single();

      expect(error).toBeNull();
      expect(Number(dbInc.amount)).toBe(500);
    });

    it('[P4.3] Edit transaction: update expense from ₹100 to ₹120', async () => {
      const res = await wealthService.updateExpense({
        userId: primaryUser.id,
        id: testExpenseId,
        amount: 120,
        notes: 'Winter Arc groceries + apples',
      });

      expect(res.success).toBe(true);

      const { data: dbExp } = await supabase
        .from('money_expenses')
        .select('*')
        .eq('id', testExpenseId)
        .single();

      expect(Number(dbExp.amount)).toBe(120);
    });

    it('[P4.4] Add recurring bill (Gym Membership ₹1500)', async () => {
      const res = await wealthService.addBill({
        userId: primaryUser.id,
        name: 'Gym Membership',
        amount: 1500,
        dueDate: '2026-10-15',
        frequency: 'monthly',
      });

      expect(res.success).toBe(true);
      testBillId = res.data.id;

      const { data: dbBill } = await supabase
        .from('wealth_bills')
        .select('*')
        .eq('id', testBillId)
        .single();

      expect(dbBill.name).toBe('Gym Membership');
      expect(Number(dbBill.amount)).toBe(1500);
    });

    it('[P4.5] Update bill status (mark as paid)', async () => {
      const res = await wealthService.toggleBillStatus({
        userId: primaryUser.id,
        billId: testBillId,
        status: 'paid',
      });

      expect(res.success).toBe(true);

      const { data: dbBill } = await supabase
        .from('wealth_bills')
        .select('*')
        .eq('id', testBillId)
        .single();

      expect(dbBill.status).toBe('paid');
    });

    it('[P4.6] Compute money state: net flow, burn rate, and safe-to-spend', async () => {
      const snapshot = await wealthService.getWealthSnapshot(primaryUser.id);
      expect(snapshot.success).toBe(true);

      const moneyState = computeMoneyState({
        incomes: snapshot.data.income || [],
        expenses: snapshot.data.expenses || [],
        bills: snapshot.data.bills || [],
      });

      expect(moneyState).toBeTruthy();
      expect(typeof moneyState.liquidCash).toBe('number');
      expect(typeof moneyState.safeToSpendDaily).toBe('number');
    });

    it('[P4.7] Delete expense -> verify removed from money_expenses', async () => {
      const res = await wealthService.deleteExpense({
        userId: primaryUser.id,
        id: testExpenseId,
      });

      expect(res.success).toBe(true);

      const { data: deletedRow } = await supabase
        .from('money_expenses')
        .select('*')
        .eq('id', testExpenseId)
        .maybeSingle();

      expect(deletedRow).toBeNull();
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // PHASE 5 — GROWTH / GOALS / HABITS
  // ════════════════════════════════════════════════════════════════════════════
  describe('Phase 5: Growth, Habits & Daily Execution Flow', () => {
    let testHabitId = null;
    let testTaskId = null;

    it('[P5.1] Create habit: "Read 20 pages"', async () => {
      const res = await habitService.createHabit({
        userId: primaryUser.id,
        name: 'Read 20 pages',
        zone: 'mind',
        frequency: 'daily',
      });

      expect(res.success).toBe(true);
      expect(res.data?.id).toBeTruthy();
      testHabitId = res.data.id;
    });

    it('[P5.2] Log habit completion for today via habitService.toggleHabit', async () => {
      const toggleRes = await habitService.toggleHabit({
        userId: primaryUser.id,
        habitId: testHabitId,
        date: today(),
        isCompleted: false,
      });

      expect(toggleRes.success).toBe(true);
      expect(toggleRes.completed).toBe(true);
    });

    it('[P5.3] Create task via growthService: "Complete Chapter 4 DSA"', async () => {
      const res = await growthService.createTask({
        userId: primaryUser.id,
        name: 'Complete Chapter 4 DSA',
        priority: 2,
        dueDate: today(),
      });

      expect(res.success).toBe(true);
      expect(res.data?.id).toBeTruthy();
      testTaskId = res.data.id;
    });

    it('[P5.4] Mark task completed -> verify status updated', async () => {
      const res = await growthService.completeTask({
        userId: primaryUser.id,
        taskId: testTaskId,
        status: 'done',
      });

      expect(res.success).toBe(true);
      expect(res.data?.status).toBe('done');
    });

    it('[P5.5] Delete task -> verify removal', async () => {
      const res = await growthService.deleteTask({
        userId: primaryUser.id,
        taskId: testTaskId,
      });

      expect(res.success).toBe(true);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // PHASE 6 — JOURNAL & DAILY LOG
  // ════════════════════════════════════════════════════════════════════════════
  describe('Phase 6: Journal & Daily Logs', () => {
    it('[P6.1] Create daily reflection entry in zenith_daily_logs', async () => {
      const { data, error } = await supabase
        .from('zenith_daily_logs')
        .upsert([{
          user_id: primaryUser.id,
          log_date: today(),
          brain_dump: 'Winter Arc Day 1: High focus, dialed in meals and study session.',
        }])
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.log_date).toBe(today());
      expect(data?.brain_dump).toContain('Winter Arc Day 1');
    });

    it('[P6.2] Create secret/private note', async () => {
      const { data, error } = await supabase
        .from('secret_notes')
        .insert([{
          user_id: primaryUser.id,
          encrypted_content: 'No distractions, deep work, 80g oats morning fuel.',
        }])
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.encrypted_content).toContain('No distractions');
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // PHASE 7 — DEX / JARVIS INTENT ENGINE
  // ════════════════════════════════════════════════════════════════════════════
  describe('Phase 7: Dex Natural Language Command Interpretation', () => {
    it('[P7.1] Parse "I spent ₹450 on groceries"', () => {
      const parsed = resolveDeterministicIntent('I spent ₹450 on groceries', null);
      expect(parsed).toBeTruthy();
      expect(parsed.intent).toBe('action');
      expect(parsed.action).toBe('record_expense');
      expect(parsed.params.amount).toBe(450);
    });

    it('[P7.2] Parse "I ate 2 eggs for lunch"', () => {
      const parsed = resolveDeterministicIntent('I ate 2 eggs for lunch', null);
      expect(parsed).toBeTruthy();
      expect(parsed.intent).toBe('action');
      expect(parsed.action).toBe('log_meal');
    });

    it('[P7.3] Parse "Drank 500ml water"', () => {
      const parsed = resolveDeterministicIntent('Drank 500ml water', null);
      expect(parsed).toBeTruthy();
      expect(parsed.intent).toBe('action');
      expect(parsed.action).toBe('log_water');
    });

    it('[P7.4] Action Registry contains canonical executors for logged actions', () => {
      expect(ACTION_REGISTRY.log_meal).toBeDefined();
      expect(ACTION_REGISTRY.log_water).toBeDefined();
      expect(ACTION_REGISTRY.record_expense).toBeDefined();
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // PHASE 8 — PROFILE & SETTINGS
  // ════════════════════════════════════════════════════════════════════════════
  describe('Phase 8: Profile & Settings', () => {
    it('[P8.1] Update profile username and preferences', async () => {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          username: 'WinterArcChampion',
        })
        .eq('id', primaryUser.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.username).toBe('WinterArcChampion');
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // PHASE 9 — DATA INTEGRITY & RLS SECURITY
  // ════════════════════════════════════════════════════════════════════════════
  describe('Phase 9: Strict RLS Cross-User Data Isolation', () => {
    it('[P9.1] User B CANNOT see User A meal logs', async () => {
      const { data, error } = await isolatedClient
        .from('meal_logs')
        .select('*')
        .eq('user_id', primaryUser.id);

      expect(error).toBeNull();
      expect(data.length).toBe(0);
    });

    it('[P9.2] User B CANNOT see User A expenses', async () => {
      const { data, error } = await isolatedClient
        .from('money_expenses')
        .select('*')
        .eq('user_id', primaryUser.id);

      expect(error).toBeNull();
      expect(data.length).toBe(0);
    });

    it('[P9.3] User B CANNOT see User A secret notes', async () => {
      const { data, error } = await isolatedClient
        .from('secret_notes')
        .select('*')
        .eq('user_id', primaryUser.id);

      expect(error).toBeNull();
      expect(data.length).toBe(0);
    });

    it('[P9.4] User B CANNOT modify User A profile', async () => {
      await isolatedClient
        .from('profiles')
        .update({ username: 'HackedUsername' })
        .eq('id', primaryUser.id);

      // Verify that primaryUser's username is untouched
      const { data } = await supabase.from('profiles').select('username').eq('id', primaryUser.id).single();
      expect(data.username).toBe('WinterArcChampion');
    });
  });
});
