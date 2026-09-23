/**
 * Zyrbit / DexOS — Action Schemas
 * Pure declarative schema definitions and parameter constraints for Dex actions.
 * Zero database queries / Zero React dependencies.
 */

import {
  validateWaterLog,
  validateSleepLog,
  validateWorkoutLog,
  validateWeightLog,
} from '../engines/health/index.js';

/**
 * Returns local YYYY-MM-DD date string.
 */
export const getLocalTodayStr = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().split('T')[0];
};

/**
 * Validates YYYY-MM-DD date format and calendar validity.
 * @param {string} str
 * @returns {boolean}
 */
export function isValidDateStr(str) {
  if (typeof str !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
  const d = new Date(`${str}T00:00:00`);
  return !isNaN(d.getTime());
}

/**
 * Normalizes number safely; allows valid numeric strings, rejects NaN, Infinity, -Infinity.
 * @param {any} val
 * @returns {number|null}
 */
export function parseSafeNumber(val) {
  if (val === null || val === undefined || val === '') return null;
  const n = Number(val);
  if (!isFinite(n) || isNaN(n)) return null;
  return n;
}

export const ACTION_SCHEMAS = {
  // ─── GROWTH ───────────────────────────────────────────────────────────────
  create_task: {
    domain: 'growth',
    risk: 'low',
    requiresConfirmation: false,
    description: 'Creates a new task in the Growth backlog or active project.',
    params: {
      name: { type: 'string', required: true, description: 'Task title' },
      priority: { type: 'integer', required: false, enum: [1, 2, 3], default: 3, description: 'Priority: 1=Critical, 2=High, 3=Normal' },
      dueDate: { type: 'date', required: false, default: null, description: 'Due date in YYYY-MM-DD format' },
      projectId: { type: 'string', required: false, default: null, description: 'Parent project UUID' },
    },
    validate: (params) => {
      const name = typeof params.name === 'string' ? params.name.trim() : '';
      if (!name) return { valid: false, error: 'Task name cannot be empty.' };

      let priority = 3;
      if (params.priority !== undefined && params.priority !== null) {
        const p = parseSafeNumber(params.priority);
        if (p === null || ![1, 2, 3].includes(Math.round(p))) {
          return { valid: false, error: 'Task priority must be 1, 2, or 3.' };
        }
        priority = Math.round(p);
      }

      let dueDate = null;
      if (params.dueDate) {
        if (!isValidDateStr(params.dueDate)) {
          return { valid: false, error: 'Due date must be in valid YYYY-MM-DD format.' };
        }
        dueDate = params.dueDate;
      }

      const projectId = params.projectId ? String(params.projectId).trim() : null;

      return {
        valid: true,
        normalized: {
          name,
          priority,
          dueDate,
          projectId,
        },
      };
    },
  },

  complete_task: {
    domain: 'growth',
    risk: 'low',
    requiresConfirmation: false,
    description: 'Marks a growth task as completed or reverts it to todo.',
    params: {
      taskId: { type: 'string', required: true, description: 'Task UUID' },
      status: { type: 'string', required: false, enum: ['done', 'todo'], default: 'done', description: 'Target status' },
    },
    validate: (params) => {
      const taskId = params.taskId ? String(params.taskId).trim() : '';
      if (!taskId) return { valid: false, error: 'Task ID is required.' };

      const status = params.status ? String(params.status).trim().toLowerCase() : 'done';
      if (!['done', 'todo'].includes(status)) {
        return { valid: false, error: 'Task status must be "done" or "todo".' };
      }

      return {
        valid: true,
        normalized: {
          taskId,
          status,
        },
      };
    },
  },

  start_focus: {
    domain: 'growth',
    risk: 'low',
    requiresConfirmation: false,
    description: 'Logs or initiates a deep focus block in Growth.',
    params: {
      durationMinutes: { type: 'number', required: false, default: 25, min: 1, max: 720, description: 'Focus duration in minutes (1-720)' },
      projectId: { type: 'string', required: false, default: null, description: 'Associated project UUID' },
      notes: { type: 'string', required: false, default: null, description: 'Session notes' },
    },
    validate: (params) => {
      let durationMinutes = 25;
      if (params.durationMinutes !== undefined && params.durationMinutes !== null) {
        const d = parseSafeNumber(params.durationMinutes);
        if (d === null || d < 1 || d > 720) {
          return { valid: false, error: 'Focus duration must be between 1 and 720 minutes.' };
        }
        durationMinutes = Math.round(d);
      }

      const projectId = params.projectId ? String(params.projectId).trim() : null;
      const notes = params.notes ? String(params.notes).trim() : null;

      return {
        valid: true,
        normalized: {
          durationMinutes,
          projectId,
          notes,
        },
      };
    },
  },

  // ─── HEALTH ───────────────────────────────────────────────────────────────
  log_water: {
    domain: 'health',
    risk: 'low',
    requiresConfirmation: false,
    description: 'Logs daily hydration volume in milliliters.',
    params: {
      amountMl: { type: 'number', required: true, min: 50, max: 3000, description: 'Water amount in ml (50-3000)' },
      date: { type: 'date', required: false, default: null, description: 'Log date (YYYY-MM-DD)' },
    },
    validate: (params) => {
      const amt = parseSafeNumber(params.amountMl);
      if (amt === null) {
        return { valid: false, error: 'Water amount must be a valid number.' };
      }

      const check = validateWaterLog(amt);
      if (!check.valid) {
        return { valid: false, error: check.error };
      }

      let date = getLocalTodayStr();
      if (params.date) {
        if (!isValidDateStr(params.date)) {
          return { valid: false, error: 'Date must be in valid YYYY-MM-DD format.' };
        }
        date = params.date;
      }

      return {
        valid: true,
        normalized: {
          amountMl: check.value,
          date,
        },
      };
    },
  },

  log_sleep: {
    domain: 'health',
    risk: 'low',
    requiresConfirmation: false,
    description: 'Logs sleep duration and subjective sleep quality score.',
    params: {
      durationHours: { type: 'number', required: true, min: 0.5, max: 24, description: 'Sleep duration in hours (0.5-24)' },
      quality: { type: 'integer', required: true, min: 1, max: 5, description: 'Sleep quality rating (1-5)' },
      date: { type: 'date', required: false, default: null, description: 'Sleep date (YYYY-MM-DD)' },
    },
    validate: (params) => {
      const hrs = parseSafeNumber(params.durationHours);
      if (hrs === null) {
        return { valid: false, error: 'Sleep duration must be a valid number.' };
      }
      const qual = parseSafeNumber(params.quality);
      if (qual === null) {
        return { valid: false, error: 'Sleep quality must be a valid number between 1 and 5.' };
      }

      const check = validateSleepLog(hrs, qual);
      if (!check.valid) {
        return { valid: false, error: check.error };
      }

      let date = getLocalTodayStr();
      if (params.date) {
        if (!isValidDateStr(params.date)) {
          return { valid: false, error: 'Date must be in valid YYYY-MM-DD format.' };
        }
        date = params.date;
      }

      return {
        valid: true,
        normalized: {
          durationHours: check.hours,
          quality: check.quality,
          date,
        },
      };
    },
  },

  log_activity: {
    domain: 'health',
    risk: 'low',
    requiresConfirmation: false,
    description: 'Logs a workout or physical activity session with RPE.',
    params: {
      activityType: { type: 'string', required: true, description: 'Type of exercise (e.g. Run, Lifting, Yoga)' },
      activeMinutes: { type: 'number', required: true, min: 1, max: 1440, description: 'Active workout duration (1-1440)' },
      rpe: { type: 'integer', required: false, min: 1, max: 10, default: 5, description: 'Rate of Perceived Exertion (1-10)' },
      date: { type: 'date', required: false, default: null, description: 'Workout date (YYYY-MM-DD)' },
    },
    validate: (params) => {
      const activityType = typeof params.activityType === 'string' ? params.activityType.trim() : '';
      if (!activityType) return { valid: false, error: 'Activity type cannot be empty.' };

      const mins = parseSafeNumber(params.activeMinutes);
      if (mins === null) {
        return { valid: false, error: 'Active minutes must be a valid number.' };
      }

      const rpeVal = params.rpe !== undefined && params.rpe !== null ? parseSafeNumber(params.rpe) : 5;
      if (rpeVal === null) {
        return { valid: false, error: 'RPE must be a valid number between 1 and 10.' };
      }

      const check = validateWorkoutLog(mins, rpeVal);
      if (!check.valid) {
        return { valid: false, error: check.error };
      }

      let date = getLocalTodayStr();
      if (params.date) {
        if (!isValidDateStr(params.date)) {
          return { valid: false, error: 'Date must be in valid YYYY-MM-DD format.' };
        }
        date = params.date;
      }

      return {
        valid: true,
        normalized: {
          activityType,
          activeMinutes: check.minutes,
          rpe: check.rpe,
          date,
        },
      };
    },
  },

  log_weight: {
    domain: 'health',
    risk: 'low',
    requiresConfirmation: false,
    description: 'Logs body scale weight in kilograms.',
    params: {
      weight: { type: 'number', required: true, min: 20, max: 400, description: 'Body weight in kg (20-400)' },
      date: { type: 'date', required: false, default: null, description: 'Log date (YYYY-MM-DD)' },
    },
    validate: (params) => {
      const wt = parseSafeNumber(params.weight);
      if (wt === null) {
        return { valid: false, error: 'Weight must be a valid number.' };
      }

      const check = validateWeightLog(wt);
      if (!check.valid) {
        return { valid: false, error: check.error };
      }

      let date = getLocalTodayStr();
      if (params.date) {
        if (!isValidDateStr(params.date)) {
          return { valid: false, error: 'Date must be in valid YYYY-MM-DD format.' };
        }
        date = params.date;
      }

      return {
        valid: true,
        normalized: {
          weight: check.value,
          date,
        },
      };
    },
  },

  // ─── NUTRITION (HEALTH DOMAIN) ─────────────────────────────────────────────
  log_meal: {
    domain: 'health',
    risk: 'low',
    requiresConfirmation: false,
    description: 'Logs a meal entry with macronutrients.',
    params: {
      mealType: { type: 'string', required: true, enum: ['breakfast', 'lunch', 'dinner', 'snack'], description: 'Meal slot' },
      foodName: { type: 'string', required: true, description: 'Food item name' },
      quantityG: { type: 'number', required: true, min: 1, max: 5000, description: 'Serving weight in grams' },
      calories: { type: 'number', required: false, min: 0, description: 'Calories in kcal' },
      protein: { type: 'number', required: false, min: 0, description: 'Protein in grams' },
      carbs: { type: 'number', required: false, min: 0, description: 'Carbohydrates in grams' },
      fat: { type: 'number', required: false, min: 0, description: 'Fat in grams' },
      fiber: { type: 'number', required: false, min: 0, description: 'Fiber in grams' },
      date: { type: 'date', required: false, default: null, description: 'Meal date (YYYY-MM-DD)' },
    },
    validate: (params) => {
      const mealType = typeof params.mealType === 'string' ? params.mealType.trim().toLowerCase() : '';
      if (!['breakfast', 'lunch', 'dinner', 'snack'].includes(mealType)) {
        return { valid: false, error: 'Meal type must be breakfast, lunch, dinner, or snack.' };
      }

      const foodName = typeof params.foodName === 'string' ? params.foodName.trim() : '';
      if (!foodName) return { valid: false, error: 'Food name cannot be empty.' };

      const qty = parseSafeNumber(params.quantityG);
      if (qty === null || qty <= 0 || qty > 5000) {
        return { valid: false, error: 'Quantity must be between 1g and 5,000g.' };
      }

      const parseMacro = (val) => {
        if (val === undefined || val === null) return undefined;
        const n = parseSafeNumber(val);
        return n !== null && n >= 0 ? n : null;
      };

      const cals = parseMacro(params.calories);
      if (params.calories !== undefined && cals === null) {
        return { valid: false, error: 'Calories must be a non-negative number.' };
      }
      const prot = parseMacro(params.protein);
      if (params.protein !== undefined && prot === null) {
        return { valid: false, error: 'Protein must be a non-negative number.' };
      }
      const carbs = parseMacro(params.carbs);
      if (params.carbs !== undefined && carbs === null) {
        return { valid: false, error: 'Carbs must be a non-negative number.' };
      }
      const fat = parseMacro(params.fat);
      if (params.fat !== undefined && fat === null) {
        return { valid: false, error: 'Fat must be a non-negative number.' };
      }
      const fiber = parseMacro(params.fiber);
      if (params.fiber !== undefined && fiber === null) {
        return { valid: false, error: 'Fiber must be a non-negative number.' };
      }

      let date = getLocalTodayStr();
      if (params.date) {
        if (!isValidDateStr(params.date)) {
          return { valid: false, error: 'Date must be in valid YYYY-MM-DD format.' };
        }
        date = params.date;
      }

      return {
        valid: true,
        normalized: {
          mealType,
          foodName,
          quantityG: Math.round(qty),
          calories: cals !== undefined ? Math.round(cals) : undefined,
          protein: prot !== undefined ? Math.round(prot * 10) / 10 : undefined,
          carbs: carbs !== undefined ? Math.round(carbs * 10) / 10 : undefined,
          fat: fat !== undefined ? Math.round(fat * 10) / 10 : undefined,
          fiber: fiber !== undefined ? Math.round(fiber * 10) / 10 : undefined,
          date,
        },
      };
    },
  },

  // ─── WEALTH ───────────────────────────────────────────────────────────────
  add_expense: {
    domain: 'wealth',
    risk: 'medium',
    requiresConfirmation: true,
    description: 'Records an expense transaction in Wealth.',
    params: {
      amount: { type: 'number', required: true, min: 0.01, description: 'Expense amount (positive number)' },
      category: { type: 'string', required: true, description: 'Expense category (e.g. Food, Transport, Rent)' },
      note: { type: 'string', required: false, default: '', description: 'Description or note' },
      date: { type: 'date', required: false, default: null, description: 'Expense date (YYYY-MM-DD)' },
    },
    formatConfirmation: (params) => {
      const amtStr = Number(params.amount).toLocaleString('en-IN');
      const noteStr = params.note ? ` (${params.note})` : '';
      return `Add ₹${amtStr} expense for ${params.category}${noteStr}?`;
    },
    validate: (params) => {
      const amount = parseSafeNumber(params.amount);
      if (amount === null || amount <= 0) {
        return { valid: false, error: 'Expense amount must be a positive number greater than 0.' };
      }

      const category = typeof params.category === 'string' ? params.category.trim() : '';
      if (!category) return { valid: false, error: 'Expense category cannot be empty.' };

      const note = typeof params.note === 'string' ? params.note.trim() : '';

      let date = getLocalTodayStr();
      if (params.date) {
        if (!isValidDateStr(params.date)) {
          return { valid: false, error: 'Date must be in valid YYYY-MM-DD format.' };
        }
        date = params.date;
      }

      return {
        valid: true,
        normalized: {
          amount: Number(amount.toFixed(2)),
          category,
          note,
          date,
        },
      };
    },
  },

  add_income: {
    domain: 'wealth',
    risk: 'medium',
    requiresConfirmation: true,
    description: 'Records an income transaction in Wealth.',
    params: {
      amount: { type: 'number', required: true, min: 0.01, description: 'Income amount (positive number)' },
      source: { type: 'string', required: true, description: 'Income source (e.g. Salary, Freelance)' },
      note: { type: 'string', required: false, default: '', description: 'Description or note' },
      date: { type: 'date', required: false, default: null, description: 'Income date (YYYY-MM-DD)' },
    },
    formatConfirmation: (params) => {
      const amtStr = Number(params.amount).toLocaleString('en-IN');
      const noteStr = params.note ? ` (${params.note})` : '';
      return `Record ₹${amtStr} income from ${params.source}${noteStr}?`;
    },
    validate: (params) => {
      const amount = parseSafeNumber(params.amount);
      if (amount === null || amount <= 0) {
        return { valid: false, error: 'Income amount must be a positive number greater than 0.' };
      }

      const source = typeof params.source === 'string' ? params.source.trim() : '';
      if (!source) return { valid: false, error: 'Income source cannot be empty.' };

      const note = typeof params.note === 'string' ? params.note.trim() : '';

      let date = getLocalTodayStr();
      if (params.date) {
        if (!isValidDateStr(params.date)) {
          return { valid: false, error: 'Date must be in valid YYYY-MM-DD format.' };
        }
        date = params.date;
      }

      return {
        valid: true,
        normalized: {
          amount: Number(amount.toFixed(2)),
          source,
          note,
          date,
        },
      };
    },
  },

  add_bill: {
    domain: 'wealth',
    risk: 'medium',
    requiresConfirmation: true,
    description: 'Schedules an upcoming recurring or one-off bill obligation.',
    params: {
      name: { type: 'string', required: true, description: 'Bill name' },
      amount: { type: 'number', required: true, min: 0.01, description: 'Bill amount (positive number)' },
      dueDate: { type: 'date', required: true, description: 'Due date in YYYY-MM-DD format' },
      frequency: { type: 'string', required: false, enum: ['monthly', 'yearly', 'one_off'], default: 'monthly', description: 'Bill recurrence' },
      status: { type: 'string', required: false, enum: ['unpaid', 'paid'], default: 'unpaid', description: 'Payment status' },
    },
    formatConfirmation: (params) => {
      const amtStr = Number(params.amount).toLocaleString('en-IN');
      return `Add upcoming bill "${params.name}" for ₹${amtStr} due on ${params.dueDate}?`;
    },
    validate: (params) => {
      const name = typeof params.name === 'string' ? params.name.trim() : '';
      if (!name) return { valid: false, error: 'Bill name cannot be empty.' };

      const amount = parseSafeNumber(params.amount);
      if (amount === null || amount <= 0) {
        return { valid: false, error: 'Bill amount must be a positive number greater than 0.' };
      }

      if (!params.dueDate || !isValidDateStr(params.dueDate)) {
        return { valid: false, error: 'Due date is required in valid YYYY-MM-DD format.' };
      }

      const frequency = params.frequency ? String(params.frequency).trim().toLowerCase() : 'monthly';
      if (!['monthly', 'yearly', 'one_off'].includes(frequency)) {
        return { valid: false, error: 'Bill frequency must be monthly, yearly, or one_off.' };
      }

      const status = params.status ? String(params.status).trim().toLowerCase() : 'unpaid';
      if (!['unpaid', 'paid'].includes(status)) {
        return { valid: false, error: 'Bill status must be unpaid or paid.' };
      }

      return {
        valid: true,
        normalized: {
          name,
          amount: Number(amount.toFixed(2)),
          dueDate: params.dueDate,
          frequency,
          status,
        },
      };
    },
  },

  // ─── HABITS ───────────────────────────────────────────────────────────────
  complete_habit: {
    domain: 'habits',
    risk: 'low',
    requiresConfirmation: false,
    description: 'Marks a daily habit as completed for today or a specific date.',
    params: {
      habitId: { type: 'string', required: true, description: 'Habit UUID' },
      date: { type: 'date', required: false, default: null, description: 'Completion date (YYYY-MM-DD)' },
    },
    validate: (params) => {
      const habitId = params.habitId ? String(params.habitId).trim() : '';
      if (!habitId) return { valid: false, error: 'Habit ID is required.' };

      let date = getLocalTodayStr();
      if (params.date) {
        if (!isValidDateStr(params.date)) {
          return { valid: false, error: 'Date must be in valid YYYY-MM-DD format.' };
        }
        date = params.date;
      }

      return {
        valid: true,
        normalized: {
          habitId,
          date,
        },
      };
    },
  },

  skip_habit: {
    domain: 'habits',
    risk: 'low',
    requiresConfirmation: false,
    description: 'Skips a daily habit with streak resilience.',
    params: {
      habitId: { type: 'string', required: true, description: 'Habit UUID' },
      date: { type: 'date', required: false, default: null, description: 'Skip date (YYYY-MM-DD)' },
    },
    validate: (params) => {
      const habitId = params.habitId ? String(params.habitId).trim() : '';
      if (!habitId) return { valid: false, error: 'Habit ID is required.' };

      let date = getLocalTodayStr();
      if (params.date) {
        if (!isValidDateStr(params.date)) {
          return { valid: false, error: 'Date must be in valid YYYY-MM-DD format.' };
        }
        date = params.date;
      }

      return {
        valid: true,
        normalized: {
          habitId,
          date,
        },
      };
    },
  },

  // ─── SYSTEM / NAVIGATION ───────────────────────────────────────────────────
  navigate: {
    domain: 'system',
    risk: 'low',
    requiresConfirmation: false,
    description: 'Safely navigates to a whitelisted application route.',
    params: {
      route: { type: 'string', required: true, description: 'Whitelisted destination route (e.g. /health, /wealth)' },
    },
    validate: (params) => {
      if (!params || typeof params.route !== 'string') {
        return { valid: false, error: 'Target route must be specified as a string.' };
      }
      const cleanRoute = params.route.trim().toLowerCase();
      // Enforce strict security: reject any scheme, host, or directory traversal attempt
      if (/^[a-z]+:/i.test(cleanRoute) || cleanRoute.includes('//') || cleanRoute.includes('\\')) {
        return { valid: false, error: 'Invalid route protocol or destination.' };
      }
      if (!WHITELISTED_NAVIGATION_ROUTES.includes(cleanRoute)) {
        return {
          valid: false,
          error: `Route "${cleanRoute}" is not permitted. Allowed: ${WHITELISTED_NAVIGATION_ROUTES.join(', ')}`,
        };
      }
      return {
        valid: true,
        normalized: {
          route: cleanRoute,
        },
      };
    },
  },
};

export const WHITELISTED_NAVIGATION_ROUTES = [
  '/zenith',
  '/growth',
  '/health',
  '/wealth',
  '/stats',
  '/profile',
  '/challenge',
];

