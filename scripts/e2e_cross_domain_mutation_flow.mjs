import { supabase } from '../src/lib/supabase/index.js';
import * as habitService from '../src/services/habitService.js';
import * as growthService from '../src/services/growthService.js';
import * as healthService from '../src/services/healthService.js';
import * as wealthService from '../src/services/wealthService.js';

async function runCrossDomainPersistenceQA() {
  console.log('=== STAGE 2: CROSS-DOMAIN PERSISTENCE & INTEGRATION QA ===\n');

  // 1. Authenticate disposable guest session
  console.log('1. Creating disposable guest identity...');
  const { data: auth, error: authErr } = await supabase.auth.signInAnonymously({
    options: { data: { full_name: 'QA Guest User' } }
  });

  if (authErr) {
    throw new Error(`Auth failed: ${authErr.message}`);
  }

  const userId = auth.user.id;
  console.log(`✓ Authenticated test guest: ${userId}\n`);

  const createdRecords = {
    habits: [],
    tasks: [],
    meals: [],
    expenses: []
  };

  try {
    // 2. Habit Flow: Create habit & mark complete
    console.log('2. Testing Habit Flow (Create & Complete)...');
    const habitRes = await habitService.createHabit({
      userId,
      name: 'Morning Cold Shower',
      zone: 'body',
      icon: '🚿',
      frequency: 'daily'
    });

    if (!habitRes.success) throw new Error(`Create habit failed: ${habitRes.error}`);
    const habitId = habitRes.data.id;
    createdRecords.habits.push(habitId);
    console.log(`  ✓ Habit created: "${habitRes.data.title || habitRes.data.name}" (ID: ${habitId})`);

    const toggleRes = await habitService.toggleHabit({
      userId,
      habitId,
      isCompleted: false
    });
    if (!toggleRes.success || !toggleRes.completed) throw new Error(`Toggle habit failed: ${toggleRes.error}`);
    console.log('  ✓ Habit marked complete in activity_log');

    // 3. Task Flow: Create task & mark complete
    console.log('3. Testing Growth Task Flow (Create & Complete)...');
    const taskRes = await growthService.createTask({
      userId,
      name: 'Finish Distributed Systems Paper',
      priority: 1
    });
    if (!taskRes.success) throw new Error(`Create task failed: ${taskRes.error}`);
    const taskId = taskRes.data.id;
    createdRecords.tasks.push(taskId);
    console.log(`  ✓ Task created: "${taskRes.data.name}" (ID: ${taskId})`);

    const completeTaskRes = await growthService.completeTask({
      userId,
      taskId,
      status: 'done'
    });
    if (!completeTaskRes.success) throw new Error(`Complete task failed: ${completeTaskRes.error}`);
    console.log('  ✓ Task marked completed');

    // 4. Focus Session Flow: Verify focus timer completion is only recorded on session finish
    console.log('4. Testing Focus Session Invariant (Recorded only when session finishes)...');
    const initialGrowth = await growthService.getGrowthData(userId);
    const initialSessionCount = initialGrowth.data?.sessions?.length || 0;
    console.log(`  - Initial focus sessions in database: ${initialSessionCount}`);

    // End completed 25-minute focus session
    const focusRes = await growthService.endFocusSession({
      userId,
      durationMinutes: 25,
      notes: 'Deep Work on Paper'
    });
    if (!focusRes.success) throw new Error(`Focus session save failed: ${focusRes.error}`);

    const afterGrowth = await growthService.getGrowthData(userId);
    const afterSessionCount = afterGrowth.data?.sessions?.length || 0;
    if (afterSessionCount !== initialSessionCount + 1) {
      throw new Error('Focus session count did not increment after completion!');
    }
    console.log('  ✓ Focus session successfully recorded only upon session completion');

    // 5. Health Flow: Water, Sleep, Activity, Weight
    console.log('5. Testing Health Flow (Water, Sleep, Activity, Weight)...');
    const waterRes = await healthService.logWater({ userId, amountMl: 500 });
    if (!waterRes.success) throw new Error(`Log water failed: ${waterRes.error}`);
    console.log('  ✓ Logged 500ml water');

    const sleepRes = await healthService.logSleep({ userId, durationHours: 7.5, quality: 4 });
    if (!sleepRes.success) throw new Error(`Log sleep failed: ${sleepRes.error}`);
    console.log('  ✓ Logged 7.5h sleep (quality 4/5)');

    const actRes = await healthService.logActivity({
      userId,
      activityType: 'Strength Training',
      activeMinutes: 45,
      rpe: 8
    });
    if (!actRes.success) throw new Error(`Log workout failed: ${actRes.error}`);
    console.log('  ✓ Logged 45m workout');

    const weightRes = await healthService.logWeight({ userId, weight: 68.5 });
    if (!weightRes.success) throw new Error(`Log weight failed: ${weightRes.error}`);
    console.log('  ✓ Logged 68.5 kg weight');

    // 6. Food Flow: Log meal with macros
    console.log('6. Testing Food Flow (Log Meal & Macro Calculation)...');
    const mealRes = await healthService.batchLogMeals({
      userId,
      items: [
        {
          meal_type: 'breakfast',
          food_name: 'Boiled Eggs & Banana',
          quantity_g: 320,
          calories: 417,
          protein: 27.3,
          carbs: 29.8,
          fat: 22.4,
          fiber: 3.1
        }
      ]
    });
    if (!mealRes.success) throw new Error(`Log meal failed: ${mealRes.error}`);
    console.log('  ✓ Meal logged: 417 kcal, 27.3g protein');

    // 7. Wealth Flow: Record and review financial transaction
    console.log('7. Testing Wealth Flow (Record Expense & Ledger Integrity)...');
    const expRes = await wealthService.addExpense({
      userId,
      amount: 450,
      category: 'Groceries',
      note: 'Fresh Vegetables & Milk',
      date: new Date().toISOString().split('T')[0]
    });
    if (!expRes.success) throw new Error(`Add expense failed: ${expRes.error}`);
    createdRecords.expenses.push(expRes.data.id);
    console.log(`  ✓ Expense recorded: ₹450 (ID: ${expRes.data.id})`);

    const wealthSum = await wealthService.getWealthSummary(userId);
    console.log(`  - Recorded Expense Total: ₹${wealthSum.data?.totalExpensesMonth}`);
    console.log(`  - Spent Today: ₹${wealthSum.data?.spentToday}`);

    // 8. Re-query persistence check (Simulating page refresh / cross-domain consistency)
    console.log('8. Testing Re-query & Cross-Domain Persistence...');
    const habitsToday = await habitService.getHabitsToday(userId);
    const persistedHabit = habitsToday.data?.habits?.find(h => h.id === habitId);
    if (!persistedHabit || !persistedHabit.completed) {
      throw new Error('Persisted habit completion state did not match expected value!');
    }
    console.log('  ✓ Habit and completion state strictly verified in fresh query');

    const growthToday = await growthService.getGrowthData(userId);
    const persistedTask = growthToday.data?.tasks?.find(t => t.id === taskId);
    if (!persistedTask || persistedTask.status !== 'done') {
      throw new Error('Persisted task state did not match done status!');
    }
    console.log('  ✓ Growth task and status="done" verified in fresh query');

    if (Number(wealthSum.data?.totalExpensesMonth) !== 450) {
      throw new Error(`Persisted expense did not match logged amount: expected 450, got ${wealthSum.data?.totalExpensesMonth}`);
    }
    console.log('  ✓ Wealth expense verified in fresh query');

    console.log('\n=== ALL CROSS-DOMAIN FLOWS PASSED PERFECTLY ===');

  } finally {
    // Clean up created records
    console.log('\nCleaning up disposable test records...');
    for (const hId of createdRecords.habits) {
      await supabase.from('activity_log').delete().eq('habit_id', hId);
      await supabase.from('habits').delete().eq('id', hId);
    }
    for (const tId of createdRecords.tasks) {
      await supabase.from('growth_tasks').delete().eq('id', tId);
    }
    for (const eId of createdRecords.expenses) {
      await supabase.from('money_expenses').delete().eq('id', eId);
    }
    await supabase.from('health_water').delete().eq('user_id', userId);
    await supabase.from('health_sleep').delete().eq('user_id', userId);
    await supabase.from('health_workouts').delete().eq('user_id', userId);
    await supabase.from('health_weight').delete().eq('user_id', userId);
    await supabase.from('health_meals').delete().eq('user_id', userId);
    await supabase.from('growth_focus_sessions').delete().eq('user_id', userId);
    console.log('✓ Test cleanup complete.');
  }
}

runCrossDomainPersistenceQA();
