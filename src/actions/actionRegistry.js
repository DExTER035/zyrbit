/**
 * Zyrbit / DexOS — Action Registry
 * Single authoritative source of truth for supported Dex actions.
 * Maps validated action intents to their underlying domain service operations.
 * Zero direct database access.
 */

import { ACTION_SCHEMAS } from './actionSchemas.js';
import * as growthService from '../services/growthService.js';
import * as healthService from '../services/healthService.js';
import * as wealthService from '../services/wealthService.js';
import * as habitService from '../services/habitService.js';

export const ACTION_REGISTRY = {
  // ─── GROWTH ───────────────────────────────────────────────────────────────
  create_task: {
    action: 'create_task',
    domain: 'growth',
    risk: 'low',
    requiresConfirmation: false,
    description: ACTION_SCHEMAS.create_task.description,
    schema: ACTION_SCHEMAS.create_task,
    execute: async ({ userId, params }) => {
      return await growthService.createTask({
        userId,
        name: params.name,
        priority: params.priority,
        dueDate: params.dueDate,
        projectId: params.projectId,
      });
    },
  },

  complete_task: {
    action: 'complete_task',
    domain: 'growth',
    risk: 'low',
    requiresConfirmation: false,
    description: ACTION_SCHEMAS.complete_task.description,
    schema: ACTION_SCHEMAS.complete_task,
    execute: async ({ userId, params }) => {
      return await growthService.completeTask({
        userId,
        taskId: params.taskId,
        status: params.status,
      });
    },
  },

  start_focus: {
    action: 'start_focus',
    domain: 'growth',
    risk: 'low',
    requiresConfirmation: false,
    description: ACTION_SCHEMAS.start_focus.description,
    schema: ACTION_SCHEMAS.start_focus,
    execute: async ({ userId, params }) => {
      return {
        success: true,
        data: {
          userId,
          durationMinutes: params.durationMinutes,
          projectId: params.projectId || null,
          notes: params.notes || null,
          startedAt: new Date().toISOString(),
          active: true,
        },
      };
    },
  },

  // ─── HEALTH ───────────────────────────────────────────────────────────────
  log_water: {
    action: 'log_water',
    domain: 'health',
    risk: 'low',
    requiresConfirmation: false,
    description: ACTION_SCHEMAS.log_water.description,
    schema: ACTION_SCHEMAS.log_water,
    execute: async ({ userId, params }) => {
      return await healthService.logWater({
        userId,
        amountMl: params.amountMl,
        date: params.date,
      });
    },
  },

  log_sleep: {
    action: 'log_sleep',
    domain: 'health',
    risk: 'low',
    requiresConfirmation: false,
    description: ACTION_SCHEMAS.log_sleep.description,
    schema: ACTION_SCHEMAS.log_sleep,
    execute: async ({ userId, params }) => {
      return await healthService.logSleep({
        userId,
        durationHours: params.durationHours,
        quality: params.quality,
        date: params.date,
      });
    },
  },

  log_activity: {
    action: 'log_activity',
    domain: 'health',
    risk: 'low',
    requiresConfirmation: false,
    description: ACTION_SCHEMAS.log_activity.description,
    schema: ACTION_SCHEMAS.log_activity,
    execute: async ({ userId, params }) => {
      return await healthService.logActivity({
        userId,
        activityType: params.activityType,
        activeMinutes: params.activeMinutes,
        rpe: params.rpe,
        date: params.date,
      });
    },
  },

  log_weight: {
    action: 'log_weight',
    domain: 'health',
    risk: 'low',
    requiresConfirmation: false,
    description: ACTION_SCHEMAS.log_weight.description,
    schema: ACTION_SCHEMAS.log_weight,
    execute: async ({ userId, params }) => {
      return await healthService.logWeight({
        userId,
        weight: params.weight,
        date: params.date,
      });
    },
  },

  // ─── NUTRITION (HEALTH DOMAIN) ─────────────────────────────────────────────
  log_meal: {
    action: 'log_meal',
    domain: 'health',
    risk: 'low',
    requiresConfirmation: false,
    description: ACTION_SCHEMAS.log_meal.description,
    schema: ACTION_SCHEMAS.log_meal,
    execute: async ({ userId, params }) => {
      return await healthService.logMeal({
        userId,
        mealType: params.mealType,
        foodName: params.foodName,
        quantityG: params.quantityG,
        calories: params.calories,
        protein: params.protein,
        carbs: params.carbs,
        fat: params.fat,
        fiber: params.fiber,
        date: params.date,
      });
    },
  },

  repeat_meal: {
    action: 'repeat_meal',
    domain: 'health',
    risk: 'low',
    requiresConfirmation: false,
    description: ACTION_SCHEMAS.repeat_meal.description,
    schema: ACTION_SCHEMAS.repeat_meal,
    execute: async ({ userId, params }) => {
      // If comboName provided, look up saved combos
      if (params.comboName) {
        const savedRes = await healthService.getSavedMeals(userId);
        if (savedRes.success && savedRes.data) {
          const match = savedRes.data.find(m => m.name.toLowerCase().includes(params.comboName.toLowerCase()));
          if (match && match.items?.length) {
            return await healthService.batchLogMeals({
              userId,
              date: params.date || healthService.todayStr(),
              mealType: match.meal_type || params.mealType || 'lunch',
              items: match.items,
            });
          }
        }
      }

      // Otherwise look up yesterday's meal logs
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yStr = yesterday.toISOString().split('T')[0];
      const snapshot = await healthService.getHealthTelemetry(userId);
      const allMeals = snapshot.data?.mealLogs || [];
      const yestMeals = allMeals.filter(m => m.date === yStr);

      const slotMeals = yestMeals.filter(m => m.meal_type === params.mealType);
      const itemsToRepeat = slotMeals.length > 0 ? slotMeals : yestMeals;

      if (!itemsToRepeat.length) {
        return { success: false, error: `No previous ${params.mealType || 'meals'} found to repeat.` };
      }

      return await healthService.batchLogMeals({
        userId,
        date: params.date || healthService.todayStr(),
        mealType: params.mealType || 'breakfast',
        items: itemsToRepeat,
      });
    },
  },

  // ─── WEALTH ───────────────────────────────────────────────────────────────
  add_expense: {
    action: 'add_expense',
    domain: 'wealth',
    risk: 'medium',
    requiresConfirmation: true,
    description: ACTION_SCHEMAS.add_expense.description,
    schema: ACTION_SCHEMAS.add_expense,
    formatConfirmation: (params) => ACTION_SCHEMAS.add_expense.formatConfirmation(params),
    execute: async ({ userId, params }) => {
      return await wealthService.addExpense({
        userId,
        amount: params.amount,
        category: params.category,
        note: params.note,
        date: params.date,
      });
    },
  },

  add_income: {
    action: 'add_income',
    domain: 'wealth',
    risk: 'medium',
    requiresConfirmation: true,
    description: ACTION_SCHEMAS.add_income.description,
    schema: ACTION_SCHEMAS.add_income,
    formatConfirmation: (params) => ACTION_SCHEMAS.add_income.formatConfirmation(params),
    execute: async ({ userId, params }) => {
      return await wealthService.addIncome({
        userId,
        amount: params.amount,
        source: params.source,
        note: params.note,
        date: params.date,
      });
    },
  },

  add_bill: {
    action: 'add_bill',
    domain: 'wealth',
    risk: 'medium',
    requiresConfirmation: true,
    description: ACTION_SCHEMAS.add_bill.description,
    schema: ACTION_SCHEMAS.add_bill,
    formatConfirmation: (params) => ACTION_SCHEMAS.add_bill.formatConfirmation(params),
    execute: async ({ userId, params }) => {
      return await wealthService.addBill({
        userId,
        name: params.name,
        amount: params.amount,
        dueDate: params.dueDate,
        frequency: params.frequency,
        status: params.status,
      });
    },
  },

  record_money_event: {
    action: 'record_money_event',
    domain: 'wealth',
    risk: 'medium',
    requiresConfirmation: true,
    description: ACTION_SCHEMAS.record_money_event.description,
    schema: ACTION_SCHEMAS.record_money_event,
    formatConfirmation: (params) => ACTION_SCHEMAS.record_money_event.formatConfirmation(params),
    execute: async ({ userId, params }) => {
      return await wealthService.recordMoneyEvent({
        userId,
        type: params.type,
        amount: params.amount,
        title: params.title,
        category: params.category,
        source: params.source,
        person: params.person,
        date: params.date,
        dueDate: params.dueDate,
        frequency: params.frequency,
      });
    },
  },

  calibrate_cash: {
    action: 'calibrate_cash',
    domain: 'wealth',
    risk: 'medium',
    requiresConfirmation: true,
    description: ACTION_SCHEMAS.calibrate_cash.description,
    schema: ACTION_SCHEMAS.calibrate_cash,
    formatConfirmation: (params) => ACTION_SCHEMAS.calibrate_cash.formatConfirmation(params),
    execute: async ({ userId, params }) => {
      return await wealthService.calibrateCashBalance({
        userId,
        targetCash: params.targetCash,
      });
    },
  },

  // ─── HABITS ───────────────────────────────────────────────────────────────
  complete_habit: {
    action: 'complete_habit',
    domain: 'habits',
    risk: 'low',
    requiresConfirmation: false,
    description: ACTION_SCHEMAS.complete_habit.description,
    schema: ACTION_SCHEMAS.complete_habit,
    execute: async ({ userId, params }) => {
      return await habitService.toggleHabit({
        userId,
        habitId: params.habitId,
        date: params.date,
        isCompleted: false, // Mark habit as completed
      });
    },
  },

  skip_habit: {
    action: 'skip_habit',
    domain: 'habits',
    risk: 'low',
    requiresConfirmation: false,
    description: ACTION_SCHEMAS.skip_habit.description,
    schema: ACTION_SCHEMAS.skip_habit,
    execute: async ({ userId, params }) => {
      return await habitService.skipHabit({
        userId,
        habitId: params.habitId,
        date: params.date,
      });
    },
  },

  navigate: {
    action: 'navigate',
    domain: 'system',
    risk: 'low',
    requiresConfirmation: false,
    description: ACTION_SCHEMAS.navigate.description,
    schema: ACTION_SCHEMAS.navigate,
    execute: async ({ params }) => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('dexos:navigate', {
            detail: { route: params.route },
          })
        );
      }
      return {
        success: true,
        data: {
          route: params.route,
        },
      };
    },
  },
};

/**
 * Retrieves an action registry entry by name.
 * @param {string} actionName
 * @returns {Object|null}
 */
export function getAction(actionName) {
  if (!actionName || typeof actionName !== 'string') return null;
  return ACTION_REGISTRY[actionName.trim().toLowerCase()] || null;
}

/**
 * Checks whether an action is supported by the registry.
 * @param {string} actionName
 * @returns {boolean}
 */
export function hasAction(actionName) {
  return Boolean(getAction(actionName));
}

/**
 * Returns metadata summary of all supported actions.
 * @returns {Array<Object>}
 */
export function listActions() {
  return Object.values(ACTION_REGISTRY).map(entry => ({
    action: entry.action,
    domain: entry.domain,
    risk: entry.risk,
    requiresConfirmation: entry.requiresConfirmation,
    description: entry.description,
  }));
}
