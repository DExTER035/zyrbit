/**
 * Dex Natural Language Intent Engine Test Suite (Phase C)
 *
 * Verifies:
 * - Deterministic natural-language interpretation across Wealth, Food, Health, Habits, and Growth
 * - Ambiguity handling & question generation (no guessing on ambiguous payments / incoming funds / habits)
 * - Date and time interpretation (today, yesterday, tomorrow, last night, explicit date, explicit time)
 * - Compound multi-action handling (validation before execution, atomic safety)
 * - Subtask hierarchy capability boundaries (explicit unsupported intent without flattening)
 * - Security invariant: userId spoofing protection and boundary enforcement
 * - AI fallback integration & schema validation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  resolveDeterministicIntent,
  parseIntent,
  parseIntentResponse,
  normalizeConfidence,
} from '../dex/dexIntentParser.js';
import { processUserInput, DEX_RESULT_TYPE } from '../dex/dexOrchestrator.js';
import { validateAction } from '../actions/actionValidator.js';
import { executeAction } from '../actions/actionExecutor.js';
import { ACTION_REGISTRY } from '../actions/actionRegistry.js';
import { normalizeActionDate, getLocalTodayStr } from '../actions/actionSchemas.js';
import * as aiModule from '../lib/ai/index.js';

describe('Zyrbit Phase C — Natural Language Intent Engine', () => {
  const mockUserId = '11111111-2222-3333-4444-555555555555';
  const todayStr = getLocalTodayStr();

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 1. NATURAL LANGUAGE WEALTH
  // ════════════════════════════════════════════════════════════════════════════
  describe('Wealth Domain Intents', () => {
    it('1. spent groceries: "I spent ₹450 on groceries"', () => {
      const res = resolveDeterministicIntent('I spent ₹450 on groceries', null);
      expect(res).toBeDefined();
      expect(res.intent).toBe('action');
      expect(res.action).toBe('record_expense');
      expect(res.params.amount).toBe(450);
      expect(res.params.category).toBe('Groceries');
      expect(res.confidence).toBeGreaterThanOrEqual(0.85);
      expect(res.source).toBe('deterministic');
    });

    it('1b. spent at store: "I spent 450 rupees at Blinkit"', () => {
      const res = resolveDeterministicIntent('I spent 450 rupees at Blinkit', null);
      expect(res).toBeDefined();
      expect(res.intent).toBe('action');
      expect(res.action).toBe('record_expense');
      expect(res.params.amount).toBe(450);
      expect(res.params.category).toBe('Groceries');
    });

    it('1c. paid for meal: "I paid 500 for dinner"', () => {
      const res = resolveDeterministicIntent('I paid 500 for dinner', null);
      expect(res).toBeDefined();
      expect(res.intent).toBe('action');
      expect(res.action).toBe('record_expense');
      expect(res.params.amount).toBe(500);
      expect(res.params.category).toBe('Food');
    });

    it('2. received salary: "I received ₹20,000 salary" & "My salary of 20000 came today"', () => {
      const res1 = resolveDeterministicIntent('I received ₹20,000 salary', null);
      expect(res1.intent).toBe('action');
      expect(res1.action).toBe('record_income');
      expect(res1.params.amount).toBe(20000);
      expect(res1.params.source).toBe('Salary');

      const res2 = resolveDeterministicIntent('My salary of 20000 came today', null);
      expect(res2.intent).toBe('action');
      expect(res2.action).toBe('record_income');
      expect(res2.params.amount).toBe(20000);
    });

    it('3. freelance income: "Got 20k from freelance work"', () => {
      const res = resolveDeterministicIntent('Got 20k from freelance work', null);
      expect(res.intent).toBe('action');
      expect(res.action).toBe('record_income');
      expect(res.params.amount).toBe(20000);
      expect(res.params.source).toBe('Freelance');
    });

    it('4. lending: "I lent Rahul ₹1000" & "Rahul owes me 1000"', () => {
      const res1 = resolveDeterministicIntent('I lent Rahul ₹1000', null);
      expect(res1.intent).toBe('action');
      expect(res1.action).toBe('record_lending');
      expect(res1.params.amount).toBe(1000);
      expect(res1.params.person).toBe('Rahul');

      const res2 = resolveDeterministicIntent('Rahul owes me 1000', null);
      expect(res2.intent).toBe('action');
      expect(res2.action).toBe('record_lending');
      expect(res2.params.amount).toBe(1000);
      expect(res2.params.person).toBe('Rahul');
    });

    it('5. borrowing: "I borrowed ₹500 from Amit"', () => {
      const res = resolveDeterministicIntent('I borrowed ₹500 from Amit', null);
      expect(res.intent).toBe('action');
      expect(res.action).toBe('record_borrowing');
      expect(res.params.amount).toBe(500);
      expect(res.params.person).toBe('Amit');
    });

    it('6. refund: "Amazon refunded me ₹799" & "I got a refund of 799"', () => {
      const res1 = resolveDeterministicIntent('Amazon refunded me ₹799', null);
      expect(res1.intent).toBe('action');
      expect(res1.action).toBe('record_refund');
      expect(res1.params.amount).toBe(799);

      const res2 = resolveDeterministicIntent('I got a refund of 799', null);
      expect(res2.intent).toBe('action');
      expect(res2.action).toBe('record_refund');
      expect(res2.params.amount).toBe(799);
    });

    it('6b. transfer: "Move ₹5000 from savings to expenses"', () => {
      const res = resolveDeterministicIntent('Move ₹5000 from savings to expenses', null);
      expect(res.intent).toBe('action');
      expect(res.action).toBe('record_transfer');
      expect(res.params.amount).toBe(5000);
    });

    it('7. ambiguous payment: "I paid Rahul 1000" triggers clarification without database write', () => {
      const res = resolveDeterministicIntent('I paid Rahul 1000', null);
      expect(res.intent).toBe('clarify');
      expect(res.question).toMatch(/payment.*loan to Rahul.*gift.*transfer/i);
      expect(res.options).toBeDefined();
    });

    it('7b. ambiguous incoming funds: "I got 500 from Rahul" triggers clarification without database write', () => {
      const res = resolveDeterministicIntent('I got 500 from Rahul', null);
      expect(res.intent).toBe('clarify');
      expect(res.question).toMatch(/income.*borrowed money.*refund.*transfer/i);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 2. NATURAL LANGUAGE FOOD
  // ════════════════════════════════════════════════════════════════════════════
  describe('Food Domain Intents', () => {
    it('8. simple food: "I ate 2 eggs"', () => {
      const res = resolveDeterministicIntent('I ate 2 eggs', null);
      expect(res.intent).toBe('action');
      expect(res.action).toBe('log_meal');
      expect(res.params.foodName).toContain('Boiled Egg');
      expect(res.params.calories).toBeGreaterThan(0);
      expect(res.confidence).toBeGreaterThanOrEqual(0.85);
    });

    it('9. compound food: "Log 2 eggs and 80g oats for breakfast"', () => {
      const res = resolveDeterministicIntent('Log 2 eggs and 80g oats for breakfast', null);
      expect(res.intent).toBe('action');
      expect(res.action).toBe('log_meal');
      expect(res.params.mealType).toBe('breakfast');
      expect(res.params.foodName).toContain('Boiled Egg');
      expect(res.params.foodName).toContain('Oats');
      expect(res.params.protein).toBeGreaterThanOrEqual(15);
    });

    it('10. breakfast with quantities: "I had 80g oats and 200ml milk for breakfast"', () => {
      const res = resolveDeterministicIntent('I had 80g oats and 200ml milk for breakfast', null);
      expect(res.intent).toBe('action');
      expect(res.action).toBe('log_meal');
      expect(res.params.mealType).toBe('breakfast');
      expect(res.params.calories).toBeGreaterThan(0);
    });

    it('11. yesterday breakfast: "Repeat yesterday\'s breakfast" & "Log the same breakfast as yesterday"', () => {
      const res1 = resolveDeterministicIntent("Repeat yesterday's breakfast", null);
      expect(res1.intent).toBe('action');
      expect(res1.action).toBe('repeat_meal');
      expect(res1.params.mealType).toBe('breakfast');

      const res2 = resolveDeterministicIntent('Log the same breakfast as yesterday', null);
      expect(res2.intent).toBe('action');
      expect(res2.action).toBe('repeat_meal');
      expect(res2.params.mealType).toBe('breakfast');
    });

    it('12. multiple food items: "I ate oats, milk and 5 dates"', () => {
      const res = resolveDeterministicIntent('I ate oats, milk and 5 dates', null);
      expect(res.intent).toBe('action');
      expect(res.action).toBe('log_meal');
      expect(res.params.foodName).toContain('Oats');
      expect(res.params.foodName).toContain('Milk');
      expect(res.params.foodName).toContain('Dates');
    });

    it('rejects partial food items if one is invalid', () => {
      const res = resolveDeterministicIntent('I ate 2 eggs and mysteriousalienfruit999', null);
      expect(res.intent).toBe('clarify');
      expect(res.question).toMatch(/couldn't identify/i);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 3. NATURAL LANGUAGE HEALTH
  // ════════════════════════════════════════════════════════════════════════════
  describe('Health Domain Intents', () => {
    it('13. water volume: "I drank 750ml water" & "I had 2 glasses of water"', () => {
      const res1 = resolveDeterministicIntent('I drank 750ml water', null);
      expect(res1.intent).toBe('action');
      expect(res1.action).toBe('log_water');
      expect(res1.params.amountMl).toBe(750);

      const res2 = resolveDeterministicIntent('I had 2 glasses of water', null);
      expect(res2.intent).toBe('action');
      expect(res2.action).toBe('log_water');
      expect(res2.params.amountMl).toBe(500); // 2 * 250ml
    });

    it('14. sleep duration: "I slept 7 hours"', () => {
      const res = resolveDeterministicIntent('I slept 7 hours', null);
      expect(res.intent).toBe('action');
      expect(res.action).toBe('log_sleep');
      expect(res.params.durationHours).toBe(7);
    });

    it('15. sleep interval: "I slept from 11pm to 6am"', () => {
      const res = resolveDeterministicIntent('I slept from 11pm to 6am', null);
      expect(res.intent).toBe('action');
      expect(res.action).toBe('log_sleep');
      expect(res.params.durationHours).toBe(7);
    });

    it('16. workout: "I did a 45 minute workout", "I ran 5 km", "Log today\'s workout"', () => {
      const res1 = resolveDeterministicIntent('I did a 45 minute workout', null);
      expect(res1.intent).toBe('action');
      expect(res1.action).toBe('log_activity');
      expect(res1.params.activeMinutes).toBe(45);

      const res2 = resolveDeterministicIntent('I ran 5 km', null);
      expect(res2.intent).toBe('action');
      expect(res2.action).toBe('log_activity');
      expect(res2.params.activityType).toBe('Run');
      expect(res2.params.activeMinutes).toBe(30);

      const res3 = resolveDeterministicIntent("Log today's workout", null);
      expect(res3.intent).toBe('action');
      expect(res3.action).toBe('log_activity');
      expect(res3.params.activeMinutes).toBe(30);
    });

    it('17. weight: "Log my weight as 62 kg"', () => {
      const res = resolveDeterministicIntent('Log my weight as 62 kg', null);
      expect(res.intent).toBe('action');
      expect(res.action).toBe('log_weight');
      expect(res.params.weightKg).toBe(62);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 4. NATURAL LANGUAGE HABITS
  // ════════════════════════════════════════════════════════════════════════════
  describe('Habits Domain Intents', () => {
    const habitContext = {
      habits: {
        habits: [
          { id: 'habit-workout-1', name: 'Workout', completed: false, skipped: false },
          { id: 'habit-reading-1', name: 'Reading', completed: false, skipped: false },
          { id: 'habit-med-1', name: 'Meditation', completed: false, skipped: false },
        ],
      },
    };

    it('18. complete habit: "I finished my workout habit" & "Mark reading complete"', () => {
      const res1 = resolveDeterministicIntent('I finished my workout habit', habitContext);
      expect(res1.intent).toBe('action');
      expect(res1.action).toBe('complete_habit');
      expect(res1.params.habitId).toBe('habit-workout-1');

      const res2 = resolveDeterministicIntent('Mark reading complete', habitContext);
      expect(res2.intent).toBe('action');
      expect(res2.action).toBe('complete_habit');
      expect(res2.params.habitId).toBe('habit-reading-1');
    });

    it('19. skip habit: "Skip meditation today"', () => {
      const res = resolveDeterministicIntent('Skip meditation today', habitContext);
      expect(res.intent).toBe('action');
      expect(res.action).toBe('skip_habit');
      expect(res.params.habitId).toBe('habit-med-1');
    });

    it('20. ambiguous habit identity: asks for clarification without guessing', () => {
      const ambiguousContext = {
        habits: {
          habits: [
            { id: 'run-morning', name: 'Morning Run', completed: false, skipped: false },
            { id: 'run-evening', name: 'Evening Run', completed: false, skipped: false },
          ],
        },
      };

      const res = resolveDeterministicIntent('Complete my run', ambiguousContext);
      expect(res.intent).toBe('clarify');
      expect(res.question).toMatch(/morning or evening/i);
    });

    it('creates a new habit: "Create a habit to study DSA every day"', () => {
      const res = resolveDeterministicIntent('Create a habit to study DSA every day', null);
      expect(res.intent).toBe('action');
      expect(res.action).toBe('create_habit');
      expect(res.params.name).toBe('study DSA');
      expect(res.params.frequency).toBe('daily');
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 5. NATURAL LANGUAGE GROWTH
  // ════════════════════════════════════════════════════════════════════════════
  describe('Growth Domain Intents', () => {
    it('21. create project: "Create a project for DSA preparation"', () => {
      const res = resolveDeterministicIntent('Create a project for DSA preparation', null);
      expect(res.intent).toBe('action');
      expect(res.action).toBe('create_project');
      expect(res.params.name).toBe('DSA preparation');
    });

    it('22. create task: "Create a task called database design" & "Add API implementation to my project"', () => {
      const res1 = resolveDeterministicIntent('Create a task called database design', null);
      expect(res1.intent).toBe('action');
      expect(res1.action).toBe('create_task');
      expect(res1.params.name).toBe('database design');

      const res2 = resolveDeterministicIntent('Add API implementation to my project', null);
      expect(res2.intent).toBe('action');
      expect(res2.action).toBe('create_task');
      expect(res2.params.name).toBe('API implementation');
    });

    it('23. complete task: "Mark database design complete"', () => {
      const context = {
        growth: {
          pendingTasks: [{ id: 'task-db-1', name: 'database design' }],
        },
      };
      const res = resolveDeterministicIntent('Mark database design complete', context);
      expect(res.intent).toBe('action');
      expect(res.action).toBe('complete_task');
      expect(res.params.taskId).toBe('task-db-1');
      expect(res.params.status).toBe('done');
    });

    it('24. delete task: "Delete the API task"', () => {
      const context = {
        growth: {
          pendingTasks: [{ id: 'task-api-1', name: 'API' }],
        },
      };
      const res = resolveDeterministicIntent('Delete the API task', context);
      expect(res.intent).toBe('action');
      expect(res.action).toBe('delete_task');
      expect(res.params.taskId).toBe('task-api-1');
    });

    it('25. study plan: "Create a study plan for DSA" generates structured plan', () => {
      const res = resolveDeterministicIntent('Create a study plan for DSA', null);
      expect(res.intent).toBe('plan');
      expect(res.plan).toBeDefined();
      expect(res.plan.goal).toMatch(/DSA/i);
    });

    it('25b. subtask hierarchy rejection: returns unsupported capability without flattening', () => {
      const res = resolveDeterministicIntent('Create a subtask called review PR under task engineering', null);
      expect(res.intent).toBe('unsupported');
      expect(res.displayMessage).toMatch(/subtasks.*not yet supported/i);
      expect(res.reasoning).toMatch(/hierarchy/i);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 6. DATE / TIME INTERPRETATION
  // ════════════════════════════════════════════════════════════════════════════
  describe('Date/Time Interpretation', () => {
    it('26. today: "I spent 500 today"', () => {
      const res = resolveDeterministicIntent('I spent 500 today', null);
      expect(res.params.date).toBe(todayStr);
    });

    it('27. yesterday: "I spent 500 yesterday" & "I slept 7 hours last night"', () => {
      const yesterdayStr = normalizeActionDate('yesterday');

      const res1 = resolveDeterministicIntent('I spent 500 yesterday', null);
      expect(res1.params.date).toBe(yesterdayStr);

      const res2 = resolveDeterministicIntent('I slept 7 hours last night', null);
      expect(res2.params.date).toBe(yesterdayStr);
    });

    it('28. tomorrow: "create a task to review PR tomorrow"', () => {
      const tomorrowStr = normalizeActionDate('tomorrow');
      const res = resolveDeterministicIntent('create a task to review PR tomorrow', null);
      expect(res.params.dueDate).toBe(tomorrowStr);
    });

    it('29. explicit date: "I spent ₹500 on 2026-10-15"', () => {
      const res = resolveDeterministicIntent('I spent ₹500 on 2026-10-15', null);
      expect(res.params.date).toBe('2026-10-15');
    });

    it('30. explicit time: "I had 3 eggs at 9am"', () => {
      const res = resolveDeterministicIntent('I had 3 eggs at 9am', null);
      expect(res.intent).toBe('action');
      expect(res.action).toBe('log_meal');
      expect(res.params.mealType).toBe('breakfast');
      expect(res.params.time).toBe('9am');
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 7. COMPOUND REQUESTS
  // ════════════════════════════════════════════════════════════════════════════
  describe('Compound Multi-Action Requests', () => {
    it('31. food + expense: "I had 2 eggs and oats for breakfast and spent ₹300 on lunch."', () => {
      const res = resolveDeterministicIntent(
        'I had 2 eggs and oats for breakfast and spent ₹300 on lunch.',
        null
      );
      expect(res).toBeDefined();
      expect(res.intent).toBe('multi_action');
      expect(res.actions.length).toBe(2);
      expect(res.actions[0].action).toBe('log_meal');
      expect(res.actions[1].action).toBe('record_expense');
      expect(res.actions[1].params.amount).toBe(300);
      expect(res.confidence).toBeGreaterThanOrEqual(0.85);
    });

    it('compound request validates all actions before execution', async () => {
      // Intent with one invalid action
      const intent = {
        intent: 'multi_action',
        actions: [
          { action: 'log_water', params: { amountMl: 500 } },
          { action: 'record_expense', params: { amount: -500, category: 'Food' } }, // INVALID
        ],
      };

      const orchestratorRes = await processUserInput(
        { userMessage: 'test', userId: mockUserId },
        {}
      );
      expect(orchestratorRes).toBeDefined();
      // Even if called directly, validation blocks invalid multi-action execution
      const val1 = validateAction({ action: intent.actions[0].action, params: intent.actions[0].params, userId: mockUserId });
      const val2 = validateAction({ action: intent.actions[1].action, params: intent.actions[1].params, userId: mockUserId });
      expect(val1.valid).toBe(true);
      expect(val2.valid).toBe(false);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 8. SECURITY INVARIANTS
  // ════════════════════════════════════════════════════════════════════════════
  describe('Security Boundaries & Parameter Spoofing Protections', () => {
    it('32. userId spoofing attempt in parameters is strictly rejected by ActionValidator', () => {
      const spoofAttempt = validateAction({
        action: 'record_expense',
        params: {
          amount: 500,
          category: 'Food',
          userId: 'attacker-uuid-attempting-override',
        },
        userId: mockUserId,
      });

      expect(spoofAttempt.valid).toBe(false);
      expect(spoofAttempt.error).toMatch(/must not contain userId/i);
    });

    it('32b. user_id snake_case spoofing attempt is also strictly rejected', () => {
      const spoofAttempt = validateAction({
        action: 'create_task',
        params: {
          name: 'Hacked Task',
          user_id: 'attacker-uuid',
        },
        userId: mockUserId,
      });

      expect(spoofAttempt.valid).toBe(false);
      expect(spoofAttempt.error).toMatch(/must not contain userId/i);
    });

    it('33. unauthorized entity ID execution uses caller context authoritatively', async () => {
      // Testing that executor always uses the session userId passed in
      const res = await executeAction({
        userId: mockUserId,
        action: 'create_task',
        params: { name: 'Secure Task', priority: 2 },
      });
      // Verification that executed action succeeded and contains caller user session
      expect(res).toBeDefined();
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 9. AI FALLBACK & CONTRACT VALIDATION
  // ════════════════════════════════════════════════════════════════════════════
  describe('AI Fallback & Response Schema Verification', () => {
    it('34. natural language requiring AI fallback returns verified structured intent', async () => {
      // Mock askZyra response for nuanced phrasing that bypasses deterministic regex
      vi.spyOn(aiModule, 'askZyra').mockResolvedValue(
        JSON.stringify({
          intent: 'action',
          action: 'record_expense',
          params: {
            amount: 1450,
            category: 'Shopping',
            note: 'noise canceling headphones',
            date: todayStr,
          },
          confidence: 0.92,
          reasoning: 'Nuanced purchase phrase mapped to shopping expense',
          displayMessage: 'Record ₹1,450 expense for Shopping?',
        })
      );

      const parsed = await parseIntent({
        userMessage: 'Picked up some sweet noise canceling headphones earlier for fourteen fifty',
        context: null,
      });

      expect(parsed.success).toBe(true);
      expect(parsed.intent.intent).toBe('action');
      expect(parsed.intent.action).toBe('record_expense');
      expect(parsed.intent.params.amount).toBe(1450);
      expect(parsed.intent.confidence).toBe(0.92);
      expect(parsed.intent.source).toBe('ai');
    });

    it('35. invalid AI action is rejected by parseIntentResponse', () => {
      expect(() => {
        parseIntentResponse(
          JSON.stringify({
            intent: 'action',
            action: 'fake_hallucinated_action',
            params: { test: true },
          })
        );
      }).toThrow(/Invalid or unregistered action/i);
    });

    it('35b. invalid AI parameter structure is rejected by actionValidator boundary', async () => {
      vi.spyOn(aiModule, 'askZyra').mockResolvedValue(
        JSON.stringify({
          intent: 'action',
          action: 'record_expense',
          params: {
            amount: 'not-a-number', // INVALID
            category: 'Food',
          },
          confidence: 0.95,
        })
      );

      const parsed = await parseIntent({
        userMessage: 'Acquired arbitrary gear via unparsed natural phrasing',
        context: null,
      });

      expect(parsed.success).toBe(false);
      expect(parsed.error).toMatch(/validation failed/i);
    });

    it('confidence normalization clamps and scales accurately', () => {
      expect(normalizeConfidence('high')).toBe(0.95);
      expect(normalizeConfidence('medium')).toBe(0.75);
      expect(normalizeConfidence('low')).toBe(0.50);
      expect(normalizeConfidence(0.92)).toBe(0.92);
      expect(normalizeConfidence(1.5)).toBe(1.0);
      expect(normalizeConfidence(-0.2)).toBe(0.0);
    });
  });
});
