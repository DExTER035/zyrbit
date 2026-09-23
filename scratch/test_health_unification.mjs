import assert from 'node:assert';
import { computeHealthState, validateWeightLog } from '../src/engines/health/index.js';
import { ACTION_REGISTRY } from '../src/actions/actionRegistry.js';
import { ACTION_SCHEMAS } from '../src/actions/actionSchemas.js';
import * as healthService from '../src/services/healthService.js';

console.log('--- Starting Health + Food Unification Verification ---');

// 1. Engine Test: computeHealthState with complete telemetry
{
  const fullTelemetry = {
    sleepLogs: [{ hours: 7.5, quality: 4 }],
    waterLogs: [{ amount_ml: 500 }, { amount_ml: 1500 }],
    mealLogs: [
      { calories: 600, protein_g: 40, carbs_g: 50, fat_g: 20 },
      { calories: 700, protein_g: 50, carbs_g: 70, fat_g: 25 },
    ],
    moveLogs: [{ duration_minutes: 45, intensity_rpe: 7 }],
    weightLogs: [{ weight_kg: 74.5, logged_at: '2026-09-24T00:00:00Z' }],
  };

  const settings = {
    targetWaterMl: 2500,
    targetCalories: 2200,
    targetProtein: 140,
    targetSleepHours: 8,
  };

  const state = computeHealthState(fullTelemetry, settings);

  assert.strictEqual(state.sleep.hours, 7.5, 'Sleep hours should be 7.5');
  assert.strictEqual(state.sleep.debt, 0.5, 'Sleep debt should be 0.5');
  assert.strictEqual(state.sleep.quality, 4, 'Sleep quality should be 4');
  assert.strictEqual(state.hydration.ml, 2000, 'Hydration ml should be 2000');
  assert.strictEqual(state.hydration.targetMl, 3000, 'Dynamic hydration target should be 3000 (2500 base + 500 from 45m movement)');

  assert.strictEqual(state.fuel.calories, 1300, 'Fuel calories should be 1300');
  assert.strictEqual(state.fuel.protein, 90, 'Fuel protein should be 90');
  assert.strictEqual(state.movement.activeMinutes, 45, 'Active minutes should be 45');
  assert.strictEqual(state.weight.currentKg, 74.5, 'Weight currentKg should be 74.5');
  assert.ok(state.pacing.recommendation, 'Pacing recommendation should exist');
  assert.ok(state.pacing.caffeineCutoff, 'Caffeine cutoff should exist');
  console.log('✓ Full telemetry state computation passed.');
}

// 2. Engine Test: computeHealthState with empty / missing data (honest reporting)
{
  const emptyTelemetry = {
    sleepLogs: [],
    waterLogs: [],
    mealLogs: [],
    moveLogs: [],
    weightLogs: [],
  };

  const state = computeHealthState(emptyTelemetry);

  assert.strictEqual(state.sleep.hours, null, 'Sleep hours should be null when unlogged');
  assert.strictEqual(state.sleep.status, 'unlogged', 'Sleep status should honestly state unlogged');
  assert.strictEqual(state.hydration.ml, 0, 'Hydration ml should be 0');
  assert.strictEqual(state.hydration.status, 'unlogged', 'Hydration status should be unlogged');

  assert.strictEqual(state.fuel.calories, 0, 'Fuel calories should be 0');
  assert.strictEqual(state.fuel.protein, 0, 'Fuel protein should be 0');
  assert.strictEqual(state.movement.activeMinutes, 0, 'Movement activeMinutes should be 0');
  assert.strictEqual(state.weight.currentKg, null, 'Weight should be null when unlogged');
  assert.strictEqual(state.weight.lastLoggedDate, null, 'Weight lastLoggedDate should be null');
  console.log('✓ Missing data honest reporting passed.');
}

// 3. Weight Validation Test
{
  assert.strictEqual(validateWeightLog(72.5).valid, true);
  assert.strictEqual(validateWeightLog(72.5).value, 72.5);
  assert.strictEqual(validateWeightLog('68.2').valid, true);
  assert.strictEqual(validateWeightLog('68.2').value, 68.2);
  assert.strictEqual(validateWeightLog(15).valid, false);
  assert.strictEqual(validateWeightLog(500).valid, false);
  assert.strictEqual(validateWeightLog('not-a-number').valid, false);
  console.log('✓ Weight validation passed.');
}


// 4. Action Registry Test
{
  // log_weight
  assert.ok(ACTION_REGISTRY.log_weight, 'log_weight action must be registered');
  assert.strictEqual(ACTION_REGISTRY.log_weight.domain, 'health', 'log_weight domain must be health');
  assert.strictEqual(ACTION_REGISTRY.log_weight.risk, 'low');
  assert.strictEqual(typeof ACTION_REGISTRY.log_weight.execute, 'function');
  assert.ok(ACTION_SCHEMAS.log_weight, 'log_weight schema must exist');

  // log_meal
  assert.ok(ACTION_REGISTRY.log_meal, 'log_meal action must be registered');
  assert.strictEqual(ACTION_REGISTRY.log_meal.domain, 'health', 'log_meal domain must be health');
  assert.strictEqual(typeof ACTION_REGISTRY.log_meal.execute, 'function');

  // log_water, log_sleep, log_activity
  assert.strictEqual(ACTION_REGISTRY.log_water.domain, 'health');
  assert.strictEqual(ACTION_REGISTRY.log_sleep.domain, 'health');
  assert.strictEqual(ACTION_REGISTRY.log_activity.domain, 'health');
  console.log('✓ Action Registry alignment and log_weight passed.');
}

// 5. Health Service Façade Verification
{
  const expectedMethods = [
    // Sleep
    'logSleep', 'deleteSleep', 'deleteSleepLog', 'getSleepHistory',
    // Water
    'logWater', 'deleteWater', 'deleteWaterLog', 'getWaterHistory',
    // Activity / Movement
    'logActivity', 'deleteActivity', 'deleteActivityLog', 'getActivityHistory',
    // Weight
    'logWeight', 'deleteWeight', 'deleteWeightLog', 'getWeightHistory', 'getLatestWeightLog',
    // Nutrition
    'logMeal', 'updateMeal', 'deleteMeal', 'batchLogMeals', 'updateMealLog', 'deleteMealLog', 'saveMeal',
    'getFoodSummary', 'updateFoodSettings', 'getFoodSettings',
    // Personal Food & Saved Meals CRUD
    'createPersonalFood', 'updatePersonalFood', 'deletePersonalFood', 'getPersonalFoods',
    'deleteSavedMeal', 'getSavedMeals',
    // Snapshots
    'getHealthSnapshot', 'getHealthTelemetry',
  ];


  for (const method of expectedMethods) {
    assert.strictEqual(
      typeof healthService[method],
      'function',
      `healthService must export ${method}`
    );
  }
  console.log(`✓ Health Service façade exports all ${expectedMethods.length} required domain methods.`);
}

console.log('--- ALL VERIFICATION CHECKS PASSED SUCCESSFULLY ---');
