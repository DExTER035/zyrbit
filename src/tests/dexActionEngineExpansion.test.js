/**
 * Zyrbit / DexOS — Phase B: Dex Action Engine Expansion Test Suite
 *
 * Verifies the expanded action registry, schemas, validation rules,
 * confirmation gates, canonical domain service dispatch, and standard result contracts.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  executeAction,
  validateAction,
  getAction,
  hasAction,
  listActions,
  ACTION_SCHEMAS,
  normalizeActionDate,
  getLocalTodayStr,
  isValidDateStr,
} from '../actions/index.js';

import * as wealthService from '../services/wealthService.js';
import * as healthService from '../services/healthService.js';
import * as growthService from '../services/growthService.js';

describe('Phase B1 & B4: Canonical Action Registry & Service Verification', () => {
  const TEST_USER = 'test-user-uuid-12345';

  it('correctly registers all supported Wealth actions', () => {
    expect(hasAction('record_income')).toBe(true);
    expect(getAction('record_income')).toBeDefined();
    expect(getAction('record_income').domain).toBe('wealth');
    expect(hasAction('record_expense')).toBe(true);
    expect(hasAction('record_transfer')).toBe(true);
    expect(hasAction('record_lending')).toBe(true);
    expect(hasAction('record_borrowing')).toBe(true);
    expect(hasAction('record_refund')).toBe(true);
  });

  it('correctly registers supported Health & Growth actions', () => {
    expect(hasAction('log_workout')).toBe(true);
    expect(hasAction('log_activity')).toBe(true);
    expect(hasAction('log_weight')).toBe(true);
    expect(hasAction('create_goal')).toBe(true);
    expect(hasAction('update_goal')).toBe(true);
    expect(hasAction('delete_task')).toBe(true);
  });

  it('strictly blocks actions whose canonical services do not exist (B1 & B4 invariants)', () => {
    // log_steps has no healthService.logSteps or health_steps_logs table
    expect(hasAction('log_steps')).toBe(false);

    // create_subtask has no growthService.createSubtask or parent_task_id in growth_tasks
    expect(hasAction('create_subtask')).toBe(false);
  });

  it('lists action metadata with domain and risk level', () => {
    const actions = listActions();
    const income = actions.find(a => a.action === 'record_income');
    expect(income).toBeDefined();
    expect(income.domain).toBe('wealth');
    expect(income.risk).toBe('medium');
    expect(income.requiresConfirmation).toBe(true);

    const goal = actions.find(a => a.action === 'create_goal');
    expect(goal).toBeDefined();
    expect(goal.domain).toBe('growth');
    expect(goal.risk).toBe('low');
    expect(goal.requiresConfirmation).toBe(false);
  });
});

describe('Phase B5: Date/Time Normalization Strategy', () => {
  it('normalizes "today" to local ISO date string', () => {
    const today = getLocalTodayStr();
    expect(normalizeActionDate('today')).toBe(today);
    expect(normalizeActionDate(null, { defaultToToday: true })).toBe(today);
  });

  it('normalizes "yesterday" to previous calendar day', () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    const expected = new Date(now);
    expected.setDate(expected.getDate() - 1);
    const expectedStr = expected.toISOString().split('T')[0];

    expect(normalizeActionDate('yesterday')).toBe(expectedStr);
  });

  it('normalizes "tomorrow" to next calendar day', () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    const expected = new Date(now);
    expected.setDate(expected.getDate() + 1);
    const expectedStr = expected.toISOString().split('T')[0];

    expect(normalizeActionDate('tomorrow')).toBe(expectedStr);
  });

  it('accepts valid explicit YYYY-MM-DD date and rejects invalid strings', () => {
    expect(normalizeActionDate('2026-10-15')).toBe('2026-10-15');
    expect(normalizeActionDate('2026-02-31')).toBe(null);
    expect(normalizeActionDate('not-a-date')).toBe(null);
    expect(isValidDateStr('2026-10-05')).toBe(true);
    expect(isValidDateStr('invalid')).toBe(false);
  });
});

describe('Phase B2 & B6: Action Validation & Invariants', () => {
  const TEST_USER = 'test-user-uuid-12345';

  it('validates record_income parameters correctly', () => {
    const valid = validateAction({
      action: 'record_income',
      params: { amount: 20000, source: 'Salary', note: 'October Pay', date: 'yesterday' },
      userId: TEST_USER,
    });
    expect(valid.valid).toBe(true);
    expect(valid.normalizedParams.amount).toBe(20000);
    expect(valid.normalizedParams.source).toBe('Salary');

    const invalid = validateAction({
      action: 'record_income',
      params: { amount: -500 },
      userId: TEST_USER,
    });
    expect(invalid.valid).toBe(false);
    expect(invalid.error).toContain('positive number');
  });

  it('validates record_transfer parameters correctly', () => {
    const valid = validateAction({
      action: 'record_transfer',
      params: { amount: 5000, note: 'Emergency Fund' },
      userId: TEST_USER,
    });
    expect(valid.valid).toBe(true);
    expect(valid.normalizedParams.amount).toBe(5000);
    expect(valid.normalizedParams.note).toBe('Emergency Fund');

    const invalid = validateAction({
      action: 'record_transfer',
      params: { amount: 0 },
      userId: TEST_USER,
    });
    expect(invalid.valid).toBe(false);
  });

  it('validates record_lending parameters correctly', () => {
    const valid = validateAction({
      action: 'record_lending',
      params: { amount: 1500, person: 'Vasu', note: 'Lunch bill', dueDate: '2026-10-20' },
      userId: TEST_USER,
    });
    expect(valid.valid).toBe(true);
    expect(valid.normalizedParams.amount).toBe(1500);
    expect(valid.normalizedParams.person).toBe('Vasu');
    expect(valid.normalizedParams.dueDate).toBe('2026-10-20');
  });

  it('validates record_borrowing parameters correctly', () => {
    const valid = validateAction({
      action: 'record_borrowing',
      params: { amount: 3000, person: 'Ninad', note: 'Laptop repair loan' },
      userId: TEST_USER,
    });
    expect(valid.valid).toBe(true);
    expect(valid.normalizedParams.amount).toBe(3000);
    expect(valid.normalizedParams.person).toBe('Ninad');
  });

  it('validates record_refund parameters correctly', () => {
    const valid = validateAction({
      action: 'record_refund',
      params: { amount: 450, note: 'Amazon return' },
      userId: TEST_USER,
    });
    expect(valid.valid).toBe(true);
    expect(valid.normalizedParams.amount).toBe(450);
  });

  it('validates create_goal parameters correctly', () => {
    const valid = validateAction({
      action: 'create_goal',
      params: { name: 'Read 12 books', targetValue: 12, unit: 'books', deadline: '2026-12-31' },
      userId: TEST_USER,
    });
    expect(valid.valid).toBe(true);
    expect(valid.normalizedParams.name).toBe('Read 12 books');
    expect(valid.normalizedParams.targetValue).toBe(12);

    const emptyName = validateAction({
      action: 'create_goal',
      params: { name: '  ' },
      userId: TEST_USER,
    });
    expect(emptyName.valid).toBe(false);
    expect(emptyName.error).toContain('cannot be empty');
  });

  it('validates update_goal parameters correctly', () => {
    const valid = validateAction({
      action: 'update_goal',
      params: { goalId: 'goal-uuid-1', currentValue: 5, isComplete: false },
      userId: TEST_USER,
    });
    expect(valid.valid).toBe(true);
    expect(valid.normalizedParams.goalId).toBe('goal-uuid-1');
    expect(valid.normalizedParams.currentValue).toBe(5);

    const missingId = validateAction({
      action: 'update_goal',
      params: { currentValue: 10 },
      userId: TEST_USER,
    });
    expect(missingId.valid).toBe(false);
    expect(missingId.error).toContain('Goal ID is required');

    const emptyUpdate = validateAction({
      action: 'update_goal',
      params: { goalId: 'goal-uuid-1' },
      userId: TEST_USER,
    });
    expect(emptyUpdate.valid).toBe(false);
    expect(emptyUpdate.error).toContain('At least one of currentValue or isComplete');
  });

  it('validates delete_task parameters correctly', () => {
    const valid = validateAction({
      action: 'delete_task',
      params: { taskId: 'task-uuid-999' },
      userId: TEST_USER,
    });
    expect(valid.valid).toBe(true);
    expect(valid.normalizedParams.taskId).toBe('task-uuid-999');

    const missingTask = validateAction({
      action: 'delete_task',
      params: {},
      userId: TEST_USER,
    });
    expect(missingTask.valid).toBe(false);
    expect(missingTask.error).toContain('Task ID is required');
  });

  it('rejects caller userId spoofing attempts inside action parameters', () => {
    const spoofAttempt = validateAction({
      action: 'record_income',
      params: { amount: 1000, userId: 'hacker-uuid' },
      userId: TEST_USER,
    });
    expect(spoofAttempt.valid).toBe(false);
    expect(spoofAttempt.error).toContain('must not contain userId');
  });
});

describe('Phase B3, B7 & B8: Action Execution, Confirmation & Result Contract', () => {
  const TEST_USER = 'test-user-uuid-12345';

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('enforces confirmation gate for medium-risk actions when confirmed=false', async () => {
    const res = await executeAction({
      userId: TEST_USER,
      action: 'record_income',
      params: { amount: 25000, source: 'Bonus' },
      confirmed: false,
    });

    expect(res.success).toBe(false);
    expect(res.requiresConfirmation).toBe(true);
    expect(res.action).toBe('record_income');
    expect(res.domain).toBe('wealth');
    expect(res.message).toContain('Record ₹25,000 income');
  });

  it('executes record_income via wealthService.addIncome when confirmed=true', async () => {
    const spy = vi.spyOn(wealthService, 'addIncome').mockResolvedValueOnce({
      success: true,
      data: { id: 'inc-row-1', amount: 25000, source: 'Bonus' },
    });

    const res = await executeAction({
      userId: TEST_USER,
      action: 'record_income',
      params: { amount: 25000, source: 'Bonus' },
      confirmed: true,
    });

    expect(spy).toHaveBeenCalledWith(expect.objectContaining({
      userId: TEST_USER,
      amount: 25000,
      source: 'Bonus',
    }));

    expect(res.success).toBe(true);
    expect(res.action).toBe('record_income');
    expect(res.domain).toBe('wealth');
    expect(res.entity).toBe('wealth');
    expect(res.entityId).toBe('inc-row-1');
    expect(res.refreshDomain).toBe('wealth');
    expect(res.message).toContain('record_income completed successfully');
  });

  it('executes record_transfer via wealthService.recordMoneyEvent when confirmed=true', async () => {
    const spy = vi.spyOn(wealthService, 'recordMoneyEvent').mockResolvedValueOnce({
      success: true,
      data: { id: 'transfer-row-1', amount: 1500, category: 'Transfer' },
    });

    const res = await executeAction({
      userId: TEST_USER,
      action: 'record_transfer',
      params: { amount: 1500, note: 'Savings allocation' },
      confirmed: true,
    });

    expect(spy).toHaveBeenCalledWith(expect.objectContaining({
      userId: TEST_USER,
      type: 'TRANSFER',
      amount: 1500,
    }));

    expect(res.success).toBe(true);
    expect(res.entityId).toBe('transfer-row-1');
    expect(res.refreshDomain).toBe('wealth');
  });

  it('executes record_lending via wealthService.recordMoneyEvent', async () => {
    const spy = vi.spyOn(wealthService, 'recordMoneyEvent').mockResolvedValueOnce({
      success: true,
      data: { expenseId: 'exp-lend-1', billId: 'bill-lend-1', amount: 600 },
    });

    const res = await executeAction({
      userId: TEST_USER,
      action: 'record_lending',
      params: { amount: 600, person: 'Rohan', note: 'Cab share' },
      confirmed: true,
    });

    expect(spy).toHaveBeenCalledWith(expect.objectContaining({
      userId: TEST_USER,
      type: 'LEND',
      amount: 600,
      person: 'Rohan',
    }));

    expect(res.success).toBe(true);
    expect(res.entityId).toBe('bill-lend-1');
    expect(res.refreshDomain).toBe('wealth');
  });

  it('executes record_borrowing via wealthService.recordMoneyEvent', async () => {
    const spy = vi.spyOn(wealthService, 'recordMoneyEvent').mockResolvedValueOnce({
      success: true,
      data: { incomeId: 'inc-borrow-1', billId: 'bill-borrow-1', amount: 2000 },
    });

    const res = await executeAction({
      userId: TEST_USER,
      action: 'record_borrowing',
      params: { amount: 2000, person: 'Alex', note: 'Emergency cash' },
      confirmed: true,
    });

    expect(spy).toHaveBeenCalledWith(expect.objectContaining({
      userId: TEST_USER,
      type: 'BORROW',
      amount: 2000,
      person: 'Alex',
    }));

    expect(res.success).toBe(true);
    expect(res.entityId).toBe('bill-borrow-1');
  });

  it('executes record_refund via wealthService.recordMoneyEvent', async () => {
    const spy = vi.spyOn(wealthService, 'recordMoneyEvent').mockResolvedValueOnce({
      success: true,
      data: { id: 'refund-row-1', amount: 350 },
    });

    const res = await executeAction({
      userId: TEST_USER,
      action: 'record_refund',
      params: { amount: 350, note: 'Swiggy refund' },
      confirmed: true,
    });

    expect(spy).toHaveBeenCalledWith(expect.objectContaining({
      userId: TEST_USER,
      type: 'REFUND',
      amount: 350,
    }));

    expect(res.success).toBe(true);
    expect(res.entityId).toBe('refund-row-1');
  });

  it('executes create_goal automatically without confirmation gate (low risk)', async () => {
    const spy = vi.spyOn(growthService, 'createGoal').mockResolvedValueOnce({
      success: true,
      data: { id: 'goal-uuid-55', name: 'Master React 19' },
    });

    const res = await executeAction({
      userId: TEST_USER,
      action: 'create_goal',
      params: { name: 'Master React 19', targetValue: 1 },
      confirmed: false, // Low risk doesn't require confirmed=true
    });

    expect(spy).toHaveBeenCalledWith(expect.objectContaining({
      userId: TEST_USER,
      name: 'Master React 19',
    }));

    expect(res.success).toBe(true);
    expect(res.domain).toBe('growth');
    expect(res.entityId).toBe('goal-uuid-55');
    expect(res.refreshDomain).toBe('growth');
  });

  it('executes update_goal via growthService.updateGoalProgress', async () => {
    const spy = vi.spyOn(growthService, 'updateGoalProgress').mockResolvedValueOnce({
      success: true,
      data: { id: 'goal-uuid-55', current_value: 3, is_complete: false },
    });

    const res = await executeAction({
      userId: TEST_USER,
      action: 'update_goal',
      params: { goalId: 'goal-uuid-55', currentValue: 3 },
    });

    expect(spy).toHaveBeenCalledWith(expect.objectContaining({
      userId: TEST_USER,
      goalId: 'goal-uuid-55',
      currentValue: 3,
    }));

    expect(res.success).toBe(true);
    expect(res.entityId).toBe('goal-uuid-55');
  });

  it('executes delete_task via growthService.deleteTask with confirmation', async () => {
    // Unconfirmed request
    const unconfirmed = await executeAction({
      userId: TEST_USER,
      action: 'delete_task',
      params: { taskId: 'task-uuid-del' },
      confirmed: false,
    });
    expect(unconfirmed.requiresConfirmation).toBe(true);

    // Confirmed request
    const spy = vi.spyOn(growthService, 'deleteTask').mockResolvedValueOnce({
      success: true,
    });

    const confirmedRes = await executeAction({
      userId: TEST_USER,
      action: 'delete_task',
      params: { taskId: 'task-uuid-del' },
      confirmed: true,
    });

    expect(spy).toHaveBeenCalledWith({
      userId: TEST_USER,
      taskId: 'task-uuid-del',
    });

    expect(confirmedRes.success).toBe(true);
    expect(confirmedRes.entityId).toBe('task-uuid-del');
    expect(confirmedRes.refreshDomain).toBe('growth');
  });

  it('executes log_workout via healthService.logActivity', async () => {
    const spy = vi.spyOn(healthService, 'logActivity').mockResolvedValueOnce({
      success: true,
      data: { id: 'move-log-1', activity_type: 'Running', active_minutes: 45 },
    });

    const res = await executeAction({
      userId: TEST_USER,
      action: 'log_workout',
      params: { activityType: 'Running', activeMinutes: 45, rpe: 7 },
    });

    expect(spy).toHaveBeenCalledWith(expect.objectContaining({
      userId: TEST_USER,
      activityType: 'Running',
      activeMinutes: 45,
      rpe: 7,
    }));

    expect(res.success).toBe(true);
    expect(res.domain).toBe('health');
    expect(res.entityId).toBe('move-log-1');
    expect(res.refreshDomain).toBe('health');
  });

  it('converts domain service failure into structured action failure', async () => {
    vi.spyOn(wealthService, 'addIncome').mockResolvedValueOnce({
      success: false,
      error: 'Database constraint violation on amount',
      code: 'DB_CONSTRAINT_ERROR',
    });

    const res = await executeAction({
      userId: TEST_USER,
      action: 'record_income',
      params: { amount: 100 },
      confirmed: true,
    });

    expect(res.success).toBe(false);
    expect(res.errorType).toBe('execution');
    expect(res.error).toBe('Database constraint violation on amount');
    expect(res.code).toBe('DB_CONSTRAINT_ERROR');
    expect(res.retryable).toBe(false);
  });

  it('handles unexpected exceptions safely and returns structured EXECUTION_ERROR', async () => {
    vi.spyOn(growthService, 'createGoal').mockRejectedValueOnce(
      new Error('Supabase network connection timeout')
    );

    const res = await executeAction({
      userId: TEST_USER,
      action: 'create_goal',
      params: { name: 'Offline goal test' },
    });

    expect(res.success).toBe(false);
    expect(res.errorType).toBe('execution');
    expect(res.error).toBe('Supabase network connection timeout');
    expect(res.code).toBe('EXECUTION_ERROR');
  });

  it('fails safely when authenticated userId is omitted', async () => {
    const res = await executeAction({
      userId: '',
      action: 'create_goal',
      params: { name: 'No user goal' },
    });

    expect(res.success).toBe(false);
    expect(res.errorType).toBe('validation');
    expect(res.code).toBe('AUTH_REQUIRED');
  });
});
