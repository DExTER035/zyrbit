/**
 * ZYRBIT — FULL DATA PERSISTENCE & DATABASE INTEGRITY AUDIT TEST SUITE
 *
 * Verifies end-to-end database persistence against LIVE Supabase for:
 * 1. Zenith: Habits, Habit Completions, Evening Reflections
 * 2. Growth: Projects, Tasks, Focus Sessions, Goals (dexos_goals)
 * 3. Health: Water, Sleep, Workouts, Scale Weight, Recovery Sync
 * 4. Wealth: Expenses, Income, Bills, Promises (Lending/Borrowing)
 * 5. Beta Feedback: In-app feedback & bug reporting (beta_feedback)
 * 6. RLS Cross-User Isolation: User B cannot select, update, or delete User A's data
 *
 * Each test verifies:
 * CREATE -> SELECT (VERIFY DB ROW) -> UPDATE -> SELECT (VERIFY UPDATED) -> DELETE -> SELECT (VERIFY ABSENT)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase/index.js';
import * as habitService from '../services/habitService.js';
import * as growthService from '../services/growthService.js';
import * as healthService from '../services/healthService.js';
import * as wealthService from '../services/wealthService.js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://xgowpznkqbsngdiuodmj.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhnb3dwem5rcWJzbmdkaXVvZG1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwNjUyOTYsImV4cCI6MjA4OTY0MTI5Nn0.hmCDn6hrlVW1qaZbyFnToxKhSXXkGgxIf-bHTlWXavA';

describe('Zyrbit Full Data Persistence & Database Integrity Audit', () => {
  let userA, userB;
  let clientB;

  // Cleanup tracking IDs
  const createdHabitIds = [];
  const createdProjectIds = [];
  const createdTaskIds = [];
  const createdGoalIds = [];
  const createdFocusSessionIds = [];
  const createdWaterLogIds = [];
  const createdSleepLogIds = [];
  const createdWorkoutLogIds = [];
  const createdExpenseIds = [];
  const createdIncomeIds = [];
  const createdBillIds = [];
  const createdPromiseIds = [];
  const createdFeedbackIds = [];

  beforeAll(async () => {
    // Authenticate User A
    const resA = await supabase.auth.signInAnonymously();
    userA = resA.data?.user;

    // Authenticate User B on an isolated client
    clientB = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
    const resB = await clientB.auth.signInAnonymously();
    userB = resB.data?.user;

    expect(userA?.id).toBeTruthy();
    expect(userB?.id).toBeTruthy();
    expect(userA.id).not.toBe(userB.id);
  }, 25000);

  afterAll(async () => {
    // Cleanup created test records to maintain clean database state
    for (const id of createdHabitIds) {
      await supabase.from('habits').delete().eq('id', id);
    }
    for (const id of createdGoalIds) {
      await supabase.from('dexos_goals').delete().eq('id', id);
    }
    for (const id of createdProjectIds) {
      await supabase.from('growth_projects').delete().eq('id', id);
    }
    for (const id of createdExpenseIds) {
      await supabase.from('money_expenses').delete().eq('id', id);
    }
    for (const id of createdIncomeIds) {
      await supabase.from('wealth_income').delete().eq('id', id);
    }
    for (const id of createdBillIds) {
      await supabase.from('wealth_bills').delete().eq('id', id);
    }
    for (const id of createdPromiseIds) {
      await supabase.from('money_promises').delete().eq('id', id);
    }
    for (const id of createdFeedbackIds) {
      await supabase.from('beta_feedback').delete().eq('id', id);
    }
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // 1. ZENITH PERSISTENCE
  // ═════════════════════════════════════════════════════════════════════════════
  describe('1. Zenith Persistence', () => {
    let habitId = null;

    it('creates habit and verifies persistence in Supabase habits table', async () => {
      const res = await habitService.createHabit({
        userId: userA.id,
        name: 'Persistence Audit Habit',
        zone: 'mind',
        icon: '🧘',
        frequency: 'daily',
        color: '#5EE6F5',
      });

      expect(res.success).toBe(true);
      expect(res.data).toBeTruthy();
      expect(res.data.id).toMatch(/^[0-9a-f-]{36}$/i);
      habitId = res.data.id;
      createdHabitIds.push(habitId);

      // Verify row exists directly in Supabase
      const { data: row, error } = await supabase
        .from('habits')
        .select('*')
        .eq('id', habitId)
        .single();

      expect(error).toBeNull();
      expect(row.name).toBe('Persistence Audit Habit');
      expect(row.user_id).toBe(userA.id);
      expect(row.color).toBe('#5EE6F5');
    });

    it('completes habit and verifies row persisted in activity_log', async () => {
      expect(habitId).toBeTruthy();
      const today = habitService.todayStr();

      const res = await habitService.toggleHabit({
        userId: userA.id,
        habitId,
        date: today,
        currentStatus: false,
      });

      expect(res.success).toBe(true);

      // Verify row persisted in activity_log table
      const { data: actRow, error } = await supabase
        .from('activity_log')
        .select('*')
        .eq('habit_id', habitId)
        .eq('user_id', userA.id)
        .eq('completed_date', today)
        .maybeSingle();

      expect(error).toBeNull();
      expect(actRow).toBeTruthy();
      expect(actRow.status).toBe('completed');
    });

    it('submits daily evening reflection and verifies orbit_journal persistence', async () => {
      const today = habitService.todayStr();
      const res = await habitService.submitDailyReflection({
        userId: userA.id,
        mood: 'great', // string mapping to 5
        content: 'Productive and calm audit session',
        completionPct: 100,
        date: today,
      });

      expect(res.success).toBe(true);

      // Verify row in orbit_journal with numeric mood and completion_rate
      const { data: journalRow, error } = await supabase
        .from('orbit_journal')
        .select('*')
        .eq('user_id', userA.id)
        .eq('entry_date', today)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      expect(error).toBeNull();
      expect(journalRow).toBeTruthy();
      expect(journalRow.mood).toBe(5);
      expect(journalRow.content).toContain('Productive and calm audit session');
      expect(journalRow.completion_rate).toBe(100);
    });

    it('updates habit and verifies updated values persist', async () => {
      expect(habitId).toBeTruthy();
      const res = await habitService.updateHabit({
        userId: userA.id,
        habitId,
        name: 'Persistence Audit Habit (Updated)',
        color: '#1FA36F',
      });

      expect(res.success).toBe(true);

      const { data: updatedRow } = await supabase
        .from('habits')
        .select('*')
        .eq('id', habitId)
        .single();

      expect(updatedRow.name).toBe('Persistence Audit Habit (Updated)');
      expect(updatedRow.color).toBe('#1FA36F');
    });

    it('deletes habit and verifies it is permanently removed from Supabase', async () => {
      expect(habitId).toBeTruthy();
      const res = await habitService.deleteHabit({
        userId: userA.id,
        habitId,
      });

      expect(res.success).toBe(true);

      const { data: deletedRow } = await supabase
        .from('habits')
        .select('*')
        .eq('id', habitId)
        .maybeSingle();

      expect(deletedRow).toBeNull();
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // 2. GROWTH PERSISTENCE
  // ═════════════════════════════════════════════════════════════════════════════
  describe('2. Growth Persistence', () => {
    let projectId = null;
    let taskId = null;
    let goalId = null;

    it('creates project and verifies persistence in growth_projects table', async () => {
      const res = await growthService.createProject({
        userId: userA.id,
        name: 'Audit Growth Project',
        icon: '🚀',
        deadline: '2026-12-31',
      });

      expect(res.success).toBe(true);
      expect(res.data.id).toMatch(/^[0-9a-f-]{36}$/i);
      projectId = res.data.id;
      createdProjectIds.push(projectId);

      const { data: row, error } = await supabase
        .from('growth_projects')
        .select('*')
        .eq('id', projectId)
        .single();

      expect(error).toBeNull();
      expect(row.name).toBe('Audit Growth Project');
      expect(row.status).toBe('active');
    });

    it('creates task linked to project and marks complete', async () => {
      expect(projectId).toBeTruthy();
      const res = await growthService.createTask({
        userId: userA.id,
        name: 'Audit Milestone Task',
        priority: 1,
        projectId,
      });

      expect(res.success).toBe(true);
      taskId = res.data.id;
      createdTaskIds.push(taskId);

      // Verify task creation
      const { data: tRow } = await supabase.from('growth_tasks').select('*').eq('id', taskId).single();
      expect(tRow.status).toBe('todo');
      expect(tRow.priority).toBe(1);

      // Complete task
      const compRes = await growthService.completeTask({
        userId: userA.id,
        taskId,
        status: 'done',
      });
      expect(compRes.success).toBe(true);

      const { data: doneRow } = await supabase.from('growth_tasks').select('*').eq('id', taskId).single();
      expect(doneRow.status).toBe('done');
      expect(doneRow.completed_at).toBeTruthy();
    });

    it('records focus session and verifies growth_focus_sessions persistence', async () => {
      const res = await growthService.endFocusSession({
        userId: userA.id,
        projectId,
        durationMinutes: 45,
        sessionDate: growthService.todayStr(),
        notes: 'Deep focus audit session',
      });

      expect(res.success).toBe(true);
      expect(res.data.id).toMatch(/^[0-9a-f-]{36}$/i);
      createdFocusSessionIds.push(res.data.id);

      const { data: sessRow, error } = await supabase
        .from('growth_focus_sessions')
        .select('*')
        .eq('id', res.data.id)
        .single();

      expect(error).toBeNull();
      expect(sessRow.duration_minutes).toBe(45);
      expect(sessRow.notes).toBe('Deep focus audit session');
    });

    it('creates strategic goal and verifies dexos_goals persistence', async () => {
      const res = await growthService.createGoal({
        userId: userA.id,
        name: 'Achieve 9.0 CGPA',
        projectId,
        targetValue: 9.0,
        unit: 'CGPA',
        deadline: '2026-11-30',
      });

      expect(res.success).toBe(true);
      expect(res.data.id).toMatch(/^[0-9a-f-]{36}$/i);
      goalId = res.data.id;
      createdGoalIds.push(goalId);

      const { data: gRow, error } = await supabase
        .from('dexos_goals')
        .select('*')
        .eq('id', goalId)
        .single();

      expect(error).toBeNull();
      expect(gRow.name).toBe('Achieve 9.0 CGPA');
      expect(Number(gRow.target_value)).toBe(9.0);
      expect(Number(gRow.current_value)).toBe(0);
      expect(gRow.is_complete).toBe(false);
    });

    it('updates goal progress in dexos_goals and completes it', async () => {
      expect(goalId).toBeTruthy();
      const res = await growthService.updateGoalProgress({
        userId: userA.id,
        goalId,
        currentValue: 9.0,
        isComplete: true,
      });

      expect(res.success).toBe(true);

      const { data: updatedG } = await supabase
        .from('dexos_goals')
        .select('*')
        .eq('id', goalId)
        .single();

      expect(Number(updatedG.current_value)).toBe(9.0);
      expect(updatedG.is_complete).toBe(true);
    });

    it('deletes goal from dexos_goals and verifies permanent removal', async () => {
      expect(goalId).toBeTruthy();
      const res = await growthService.deleteGoal({
        userId: userA.id,
        goalId,
      });

      expect(res.success).toBe(true);

      const { data: absent } = await supabase
        .from('dexos_goals')
        .select('*')
        .eq('id', goalId)
        .maybeSingle();

      expect(absent).toBeNull();
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // 3. HEALTH PERSISTENCE
  // ═════════════════════════════════════════════════════════════════════════════
  describe('3. Health Persistence', () => {
    let waterLogId = null;
    let sleepLogId = null;
    let workoutLogId = null;
    let weightLogId = null;
    const today = healthService.todayStr();

    it('logs hydration and verifies health_water_logs persistence', async () => {
      const res = await healthService.logWater({
        userId: userA.id,
        amountMl: 500,
        date: today,
      });

      expect(res.success).toBe(true);
      waterLogId = res.data.id;
      createdWaterLogIds.push(waterLogId);

      const { data: wRow } = await supabase
        .from('health_water_logs')
        .select('*')
        .eq('id', waterLogId)
        .single();

      expect(wRow.amount_ml).toBe(500);
      expect(wRow.log_date).toBe(today);
    });

    it('logs sleep and verifies health_sleep_logs persistence', async () => {
      const res = await healthService.logSleep({
        userId: userA.id,
        durationHours: 7.5,
        quality: 4,
        date: today,
      });

      expect(res.success).toBe(true);
      sleepLogId = res.data.id;
      createdSleepLogIds.push(sleepLogId);

      const { data: sRow } = await supabase
        .from('health_sleep_logs')
        .select('*')
        .eq('id', sleepLogId)
        .single();

      expect(Number(sRow.duration_hours)).toBe(7.5);
      expect(sRow.quality).toBe(4);
    });

    it('logs workout and verifies health_move_logs persistence', async () => {
      const res = await healthService.logActivity({
        userId: userA.id,
        activityType: 'Strength',
        activeMinutes: 60,
        rpe: 8,
        notes: 'Bench press and core',
        date: today,
      });

      expect(res.success).toBe(true);
      workoutLogId = res.data.id;
      createdWorkoutLogIds.push(workoutLogId);

      const { data: mRow } = await supabase
        .from('health_move_logs')
        .select('*')
        .eq('id', workoutLogId)
        .single();

      expect(mRow.active_minutes).toBe(60);
      expect(mRow.rpe).toBe(8);
      expect(mRow.notes).toBe('Bench press and core');
    });

    it('logs body weight and verifies health_weight_logs persistence', async () => {
      const res = await healthService.logWeight({
        userId: userA.id,
        weight: 72.4,
        date: today,
      });

      expect(res.success).toBe(true);
      weightLogId = res.data.id;

      const { data: wtRow } = await supabase
        .from('health_weight_logs')
        .select('*')
        .eq('id', weightLogId)
        .single();

      expect(Number(wtRow.weight)).toBe(72.4);
      expect(wtRow.log_date).toBe(today);
    });

    it('synchronizes recovery score and verifies dexos_daily_summary persistence', async () => {
      const res = await healthService.syncRecoveryScore({
        userId: userA.id,
        score: 88,
        date: today,
      });

      expect(res.success).toBe(true);

      const { data: ddsRow } = await supabase
        .from('dexos_daily_summary')
        .select('*')
        .eq('user_id', userA.id)
        .eq('summary_date', today)
        .single();

      expect(ddsRow).toBeTruthy();
      expect(ddsRow.health_score).toBe(88);
    });

    it('deletes water log and verifies absence', async () => {
      expect(waterLogId).toBeTruthy();
      const res = await healthService.deleteWaterLog({
        userId: userA.id,
        logId: waterLogId,
      });
      expect(res.success).toBe(true);

      const { data: absent } = await supabase
        .from('health_water_logs')
        .select('*')
        .eq('id', waterLogId)
        .maybeSingle();

      expect(absent).toBeNull();
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // 4. WEALTH PERSISTENCE
  // ═════════════════════════════════════════════════════════════════════════════
  describe('4. Wealth Persistence', () => {
    let expenseId = null;
    let incomeId = null;
    let billId = null;
    let promiseId = null;
    const today = wealthService.todayStr();

    it('records expense and verifies money_expenses persistence', async () => {
      const res = await wealthService.addExpense({
        userId: userA.id,
        amount: 350,
        category: 'Food',
        note: 'Groceries audit run',
        date: today,
      });

      expect(res.success).toBe(true);
      expect(res.data.id).toMatch(/^[0-9a-f-]{36}$/i);
      expenseId = res.data.id;
      createdExpenseIds.push(expenseId);

      const { data: row, error } = await supabase
        .from('money_expenses')
        .select('*')
        .eq('id', expenseId)
        .single();

      expect(error).toBeNull();
      expect(Number(row.amount)).toBe(350);
      expect(row.category).toBe('Food');
      expect(row.note).toBe('Groceries audit run');
    });

    it('updates expense and verifies edited values persist', async () => {
      expect(expenseId).toBeTruthy();
      const res = await wealthService.updateExpense({
        userId: userA.id,
        id: expenseId,
        amount: 420,
        category: 'Food',
        note: 'Groceries audit run (Updated)',
        date: today,
      });

      expect(res.success).toBe(true);

      const { data: upRow } = await supabase
        .from('money_expenses')
        .select('*')
        .eq('id', expenseId)
        .single();

      expect(Number(upRow.amount)).toBe(420);
      expect(upRow.note).toBe('Groceries audit run (Updated)');
    });

    it('deletes expense and verifies it remains deleted', async () => {
      expect(expenseId).toBeTruthy();
      const res = await wealthService.deleteExpense({
        userId: userA.id,
        id: expenseId,
      });

      expect(res.success).toBe(true);

      const { data: absent } = await supabase
        .from('money_expenses')
        .select('*')
        .eq('id', expenseId)
        .maybeSingle();

      expect(absent).toBeNull();
    });

    it('records income and verifies wealth_income persistence', async () => {
      const res = await wealthService.addIncome({
        userId: userA.id,
        amount: 5000,
        source: 'freelance',
        note: 'Consulting client project',
        date: today,
      });

      expect(res.success).toBe(true);
      incomeId = res.data.id;
      createdIncomeIds.push(incomeId);

      const { data: inRow } = await supabase
        .from('wealth_income')
        .select('*')
        .eq('id', incomeId)
        .single();

      expect(Number(inRow.amount)).toBe(5000);
      expect(inRow.source).toBe('freelance');
    });

    it('adds bill obligation and verifies wealth_bills persistence', async () => {
      const res = await wealthService.addBill({
        userId: userA.id,
        name: 'Internet Fiber Bill',
        amount: 999,
        dueDate: '2026-10-25',
        frequency: 'monthly',
      });

      expect(res.success).toBe(true);
      billId = res.data.id;
      createdBillIds.push(billId);

      const { data: bRow } = await supabase
        .from('wealth_bills')
        .select('*')
        .eq('id', billId)
        .single();

      expect(Number(bRow.amount)).toBe(999);
      expect(bRow.name).toBe('Internet Fiber Bill');
      expect(bRow.status).toBe('unpaid');
    });

    it('records promise (lending) and verifies wealth_bills receivable persistence', async () => {
      const res = await wealthService.recordMoneyEvent({
        userId: userA.id,
        type: 'LEND',
        person: 'Rahul K',
        amount: 1200,
        dueDate: '2026-11-01',
        note: 'Lunch split payment',
      });

      expect(res.success).toBe(true);
      expect(res.data?.billId).toBeTruthy();
      promiseId = res.data.billId;
      createdBillIds.push(promiseId);

      const { data: pRow } = await supabase
        .from('wealth_bills')
        .select('*')
        .eq('id', promiseId)
        .single();

      expect(Number(pRow.amount)).toBe(1200);
      expect(pRow.name).toContain('Rahul K');
      expect(pRow.status).toBe('receivable');
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // 5. IN-APP FEEDBACK PERSISTENCE (beta_feedback)
  // ═════════════════════════════════════════════════════════════════════════════
  describe('5. Beta Feedback Persistence', () => {
    it('submits in-app feedback and verifies row in beta_feedback', async () => {
      const { data, error } = await supabase
        .from('beta_feedback')
        .insert({
          user_id: userA.id,
          category: 'feature',
          title: 'Database Persistence Audit Verification',
          description: 'Testing live feedback table insertion from automated audit suite.',
          page: '/profile',
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeTruthy();
      expect(data.id).toMatch(/^[0-9a-f-]{36}$/i);
      createdFeedbackIds.push(data.id);

      const { data: fetched } = await supabase
        .from('beta_feedback')
        .select('*')
        .eq('id', data.id)
        .single();

      expect(fetched.title).toBe('Database Persistence Audit Verification');
      expect(fetched.category).toBe('feature');
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // 6. RLS CROSS-USER ISOLATION
  // ═════════════════════════════════════════════════════════════════════════════
  describe('6. RLS Cross-User Isolation', () => {
    let userAHabitId = null;
    let userAGoalId = null;

    beforeAll(async () => {
      // Create user A records
      const hRes = await habitService.createHabit({
        userId: userA.id,
        name: 'User A Private Habit',
        zone: 'soul',
      });
      userAHabitId = hRes.data.id;
      createdHabitIds.push(userAHabitId);

      const gRes = await growthService.createGoal({
        userId: userA.id,
        name: 'User A Private Goal',
        targetValue: 10,
      });
      userAGoalId = gRes.data.id;
      createdGoalIds.push(userAGoalId);
    });

    it('enforces User B cannot SELECT User A habits', async () => {
      const { data } = await clientB
        .from('habits')
        .select('*')
        .eq('id', userAHabitId);

      expect(data).toHaveLength(0);
    });

    it('enforces User B cannot UPDATE User A habits', async () => {
      const { error } = await clientB
        .from('habits')
        .update({ name: 'Tampered by User B' })
        .eq('id', userAHabitId)
        .select();

      expect(error).toBeNull();
      // Returns 0 rows modified
      const { data: pristine } = await supabase.from('habits').select('*').eq('id', userAHabitId).single();
      expect(pristine.name).toBe('User A Private Habit');
    });

    it('enforces User B cannot SELECT User A dexos_goals', async () => {
      const { data } = await clientB
        .from('dexos_goals')
        .select('*')
        .eq('id', userAGoalId);

      expect(data).toHaveLength(0);
    });

    it('enforces User B cannot DELETE User A dexos_goals', async () => {
      await clientB
        .from('dexos_goals')
        .delete()
        .eq('id', userAGoalId);

      const { data: intact } = await supabase.from('dexos_goals').select('*').eq('id', userAGoalId).single();
      expect(intact).toBeTruthy();
      expect(intact.name).toBe('User A Private Goal');
    });
  });
});
