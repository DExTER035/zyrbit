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
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const d = new Date(year, month, day);
  return (
    d.getFullYear() === year &&
    d.getMonth() === month &&
    d.getDate() === day
  );
}

/**
 * Normalizes relative date keywords ('today', 'yesterday', 'tomorrow') or explicit YYYY-MM-DD dates.
 * @param {string|null} val
 * @param {{ defaultToToday?: boolean }} [options]
 * @returns {string|null}
 */
export function normalizeActionDate(val, { defaultToToday = true } = {}) {
  if (!val) {
    return defaultToToday ? getLocalTodayStr() : null;
  }
  if (typeof val !== 'string') return null;
  const lower = val.trim().toLowerCase();
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());

  if (lower === 'today' || lower === 'this morning' || lower === 'tonight') {
    return now.toISOString().split('T')[0];
  }
  if (lower === 'yesterday' || lower === 'last night') {
    const d = new Date(now);
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  }
  if (lower === 'tomorrow') {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }
  if (lower === 'last week') {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  }
  if (isValidDateStr(lower)) {
    return lower;
  }

  // Parse natural month name e.g. "September 20", "20 September", "20th Sept"
  const monthMatch = lower.match(/(?:on\s+)?(?:(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?|(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?))/i);
  if (monthMatch) {
    const monthStr = monthMatch[1] || monthMatch[4];
    const dayStr = monthMatch[2] || monthMatch[3];
    try {
      const parsed = new Date(`${monthStr} ${dayStr}, ${now.getFullYear()}`);
      if (!isNaN(parsed.getTime())) {
        const y = parsed.getFullYear();
        const m = String(parsed.getMonth() + 1).padStart(2, '0');
        const d = String(parsed.getDate()).padStart(2, '0');
        const formatted = `${y}-${m}-${d}`;
        if (isValidDateStr(formatted)) {
          return formatted;
        }
      }
    } catch {
      // ignore
    }
  }

  return null;
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
          ...(params.nutritionSnapshot ? { nutritionSnapshot: params.nutritionSnapshot } : {}),
          ...(params.sourceType ? { sourceType: params.sourceType } : {}),
          ...(params.preparationState ? { preparationState: params.preparationState } : {}),
          ...(params.confidence !== undefined && params.confidence !== null ? { confidence: params.confidence } : {}),
          ...(params.foodRefId ? { foodRefId: params.foodRefId } : {}),
          ...(params.time ? { time: params.time } : {}),
        },
      };
    },
  },

  repeat_meal: {
    domain: 'health',
    risk: 'low',
    requiresConfirmation: false,
    description: "Repeats a meal or saved combo for today without modifying past records.",
    params: {
      mealType: { type: 'string', required: false, enum: ['breakfast', 'lunch', 'dinner', 'snack'], description: 'Meal slot to repeat' },
      comboName: { type: 'string', required: false, description: 'Saved combo name if repeating a template' },
      date: { type: 'date', required: false, default: null, description: 'Target date (defaults to today)' },
    },
    validate: (params) => {
      let mealType = params?.mealType ? String(params.mealType).trim().toLowerCase() : 'lunch';
      if (!['breakfast', 'lunch', 'dinner', 'snack'].includes(mealType)) {
        mealType = 'lunch';
      }
      return {
        valid: true,
        normalized: {
          mealType,
          comboName: params?.comboName ? String(params.comboName).trim() : null,
          date: params?.date && isValidDateStr(params.date) ? params.date : getLocalTodayStr(),
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

  record_money_event: {
    domain: 'wealth',
    risk: 'medium',
    requiresConfirmation: true,
    description: 'Records a canonical Money Event (Spend, Income, Lend, Borrow, Commitment, Investment, Transfer).',
    params: {
      type: { type: 'string', required: false, default: 'SPEND', description: 'Semantic event type' },
      amount: { type: 'number', required: true, min: 0.01, description: 'Event amount' },
      title: { type: 'string', required: false, default: '', description: 'Event description or title' },
      category: { type: 'string', required: false, default: 'General', description: 'Expense category' },
      source: { type: 'string', required: false, default: 'Other', description: 'Income source' },
      person: { type: 'string', required: false, default: '', description: 'Person involved in loan/borrow' },
      date: { type: 'date', required: false, default: null, description: 'Event date' },
      dueDate: { type: 'date', required: false, default: null, description: 'Due date for commitments/loans' },
      frequency: { type: 'string', required: false, default: 'one_off', description: 'Recurrence frequency' },
    },
    formatConfirmation: (params) => {
      const amtStr = Number(params.amount).toLocaleString('en-IN');
      const type = (params.type || 'SPEND').toUpperCase();
      if (type === 'LEND') return `Record ₹${amtStr} lent to ${params.person || params.title || 'someone'}?`;
      if (type === 'BORROW') return `Record ₹${amtStr} borrowed from ${params.person || params.title || 'someone'}?`;
      if (type === 'INCOME') return `Record ₹${amtStr} income from ${params.source || params.title || 'other'}?`;
      if (type === 'COMMITMENT') return `Schedule ₹${amtStr} commitment for "${params.title || 'scheduled payment'}"?`;
      if (type === 'INVESTMENT') return `Record ₹${amtStr} investment?`;
      return `Record ₹${amtStr} expense for ${params.title || params.category || 'general'}?`;
    },
    validate: (params) => {
      const amount = parseSafeNumber(params.amount);
      if (amount === null || amount <= 0) {
        return { valid: false, error: 'Amount must be a positive number greater than 0.' };
      }

      const type = typeof params.type === 'string' ? params.type.trim().toUpperCase() : 'SPEND';
      const title = typeof params.title === 'string' ? params.title.trim() : '';
      const category = typeof params.category === 'string' ? params.category.trim() : 'General';
      const source = typeof params.source === 'string' ? params.source.trim() : 'Other';
      const person = typeof params.person === 'string' ? params.person.trim() : '';

      let date = getLocalTodayStr();
      if (params.date && isValidDateStr(params.date)) {
        date = params.date;
      }

      let dueDate = null;
      if (params.dueDate && isValidDateStr(params.dueDate)) {
        dueDate = params.dueDate;
      }

      return {
        valid: true,
        normalized: {
          type,
          amount: Number(amount.toFixed(2)),
          title,
          category,
          source,
          person,
          date,
          dueDate,
          frequency: params.frequency || 'one_off',
        },
      };
    },
  },

  calibrate_cash: {
    domain: 'wealth',
    risk: 'medium',
    requiresConfirmation: true,
    description: 'Calibrates the user current liquid cash balance.',
    params: {
      targetCash: { type: 'number', required: true, min: 0, description: 'Current cash balance' },
    },
    formatConfirmation: (params) => {
      const amtStr = Number(params.targetCash).toLocaleString('en-IN');
      return `Calibrate current cash balance to ₹${amtStr}?`;
    },
    validate: (params) => {
      const targetCash = parseSafeNumber(params.targetCash);
      if (targetCash === null || targetCash < 0) {
        return { valid: false, error: 'Cash balance must be a non-negative number.' };
      }
      return {
        valid: true,
        normalized: { targetCash: Number(targetCash.toFixed(2)) },
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

  // ─── WEALTH ACTIONS ────────────────────────────────────────────────────────
  record_expense: {
    domain: 'wealth',
    risk: 'medium',
    requiresConfirmation: true,
    description: 'Records an expense transaction in Wealth.',
    params: {
      amount: { type: 'number', required: true, min: 0.01, description: 'Expense amount (positive number)' },
      category: { type: 'string', required: false, default: 'Other', description: 'Expense category (e.g. Food, Transport, Rent)' },
      note: { type: 'string', required: false, default: '', description: 'Description or note' },
      date: { type: 'date', required: false, default: null, description: 'Expense date (YYYY-MM-DD, today, yesterday)' },
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

      const category = typeof params.category === 'string' && params.category.trim() ? params.category.trim() : 'Other';
      const note = typeof params.note === 'string' ? params.note.trim() : '';

      const date = normalizeActionDate(params.date, { defaultToToday: true });
      if (!date) {
        return { valid: false, error: 'Date must be in valid YYYY-MM-DD format (or relative like today/yesterday).' };
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

  record_income: {
    domain: 'wealth',
    risk: 'medium',
    requiresConfirmation: true,
    description: 'Records an income transaction in Wealth.',
    params: {
      amount: { type: 'number', required: true, min: 0.01, description: 'Income amount (positive number)' },
      source: { type: 'string', required: false, default: 'Other', description: 'Income source (e.g. Salary, Freelance)' },
      note: { type: 'string', required: false, default: '', description: 'Description or note' },
      date: { type: 'date', required: false, default: null, description: 'Income date (YYYY-MM-DD, today, yesterday)' },
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

      const source = typeof params.source === 'string' && params.source.trim() ? params.source.trim() : 'Other';
      const note = typeof params.note === 'string' ? params.note.trim() : '';

      const date = normalizeActionDate(params.date, { defaultToToday: true });
      if (!date) {
        return { valid: false, error: 'Date must be in valid YYYY-MM-DD format (or relative like today/yesterday).' };
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

  record_transfer: {
    domain: 'wealth',
    risk: 'medium',
    requiresConfirmation: true,
    description: 'Records a transfer between accounts or envelopes in Wealth.',
    params: {
      amount: { type: 'number', required: true, min: 0.01, description: 'Transfer amount (positive number)' },
      note: { type: 'string', required: false, default: '', description: 'Description of transfer destination' },
      date: { type: 'date', required: false, default: null, description: 'Transfer date (YYYY-MM-DD)' },
    },
    formatConfirmation: (params) => {
      const amtStr = Number(params.amount).toLocaleString('en-IN');
      const noteStr = params.note ? ` (${params.note})` : '';
      return `Record ₹${amtStr} transfer${noteStr}?`;
    },
    validate: (params) => {
      const amount = parseSafeNumber(params.amount);
      if (amount === null || amount <= 0) {
        return { valid: false, error: 'Transfer amount must be a positive number greater than 0.' };
      }

      const note = typeof params.note === 'string' ? params.note.trim() : '';

      const date = normalizeActionDate(params.date, { defaultToToday: true });
      if (!date) {
        return { valid: false, error: 'Date must be in valid YYYY-MM-DD format (or relative like today/yesterday).' };
      }

      return {
        valid: true,
        normalized: {
          amount: Number(amount.toFixed(2)),
          note: note || 'Transfer',
          date,
        },
      };
    },
  },

  record_lending: {
    domain: 'wealth',
    risk: 'medium',
    requiresConfirmation: true,
    description: 'Records money lent to someone (cash outflow + receivable promise).',
    params: {
      amount: { type: 'number', required: true, min: 0.01, description: 'Lent amount (positive number)' },
      person: { type: 'string', required: false, default: '', description: 'Person who borrowed the money' },
      note: { type: 'string', required: false, default: '', description: 'Description or reason' },
      date: { type: 'date', required: false, default: null, description: 'Transaction date' },
      dueDate: { type: 'date', required: false, default: null, description: 'Expected repayment date' },
    },
    formatConfirmation: (params) => {
      const amtStr = Number(params.amount).toLocaleString('en-IN');
      const personStr = params.person ? ` to ${params.person}` : '';
      return `Record ₹${amtStr} lent${personStr}?`;
    },
    validate: (params) => {
      const amount = parseSafeNumber(params.amount);
      if (amount === null || amount <= 0) {
        return { valid: false, error: 'Lending amount must be a positive number greater than 0.' };
      }

      const person = typeof params.person === 'string' ? params.person.trim() : '';
      const note = typeof params.note === 'string' ? params.note.trim() : '';

      const date = normalizeActionDate(params.date, { defaultToToday: true });
      if (!date) {
        return { valid: false, error: 'Date must be in valid YYYY-MM-DD format (or relative like today/yesterday).' };
      }

      let dueDate = null;
      if (params.dueDate) {
        dueDate = normalizeActionDate(params.dueDate, { defaultToToday: false });
        if (!dueDate) {
          return { valid: false, error: 'Due date must be in valid YYYY-MM-DD format.' };
        }
      }

      return {
        valid: true,
        normalized: {
          amount: Number(amount.toFixed(2)),
          person,
          note,
          date,
          dueDate,
        },
      };
    },
  },

  record_borrowing: {
    domain: 'wealth',
    risk: 'medium',
    requiresConfirmation: true,
    description: 'Records money borrowed from someone (cash inflow + debt liability).',
    params: {
      amount: { type: 'number', required: true, min: 0.01, description: 'Borrowed amount (positive number)' },
      person: { type: 'string', required: false, default: '', description: 'Person or entity borrowed from' },
      note: { type: 'string', required: false, default: '', description: 'Description or reason' },
      date: { type: 'date', required: false, default: null, description: 'Transaction date' },
      dueDate: { type: 'date', required: false, default: null, description: 'Repayment deadline' },
    },
    formatConfirmation: (params) => {
      const amtStr = Number(params.amount).toLocaleString('en-IN');
      const personStr = params.person ? ` from ${params.person}` : '';
      return `Record ₹${amtStr} borrowed${personStr}?`;
    },
    validate: (params) => {
      const amount = parseSafeNumber(params.amount);
      if (amount === null || amount <= 0) {
        return { valid: false, error: 'Borrowing amount must be a positive number greater than 0.' };
      }

      const person = typeof params.person === 'string' ? params.person.trim() : '';
      const note = typeof params.note === 'string' ? params.note.trim() : '';

      const date = normalizeActionDate(params.date, { defaultToToday: true });
      if (!date) {
        return { valid: false, error: 'Date must be in valid YYYY-MM-DD format (or relative like today/yesterday).' };
      }

      let dueDate = null;
      if (params.dueDate) {
        dueDate = normalizeActionDate(params.dueDate, { defaultToToday: false });
        if (!dueDate) {
          return { valid: false, error: 'Due date must be in valid YYYY-MM-DD format.' };
        }
      }

      return {
        valid: true,
        normalized: {
          amount: Number(amount.toFixed(2)),
          person,
          note,
          date,
          dueDate,
        },
      };
    },
  },

  record_refund: {
    domain: 'wealth',
    risk: 'medium',
    requiresConfirmation: true,
    description: 'Records a refund or reimbursement transaction.',
    params: {
      amount: { type: 'number', required: true, min: 0.01, description: 'Refund amount (positive number)' },
      note: { type: 'string', required: false, default: '', description: 'Source or item refunded' },
      date: { type: 'date', required: false, default: null, description: 'Refund date' },
    },
    formatConfirmation: (params) => {
      const amtStr = Number(params.amount).toLocaleString('en-IN');
      const noteStr = params.note ? ` for ${params.note}` : '';
      return `Record ₹${amtStr} refund${noteStr}?`;
    },
    validate: (params) => {
      const amount = parseSafeNumber(params.amount);
      if (amount === null || amount <= 0) {
        return { valid: false, error: 'Refund amount must be a positive number greater than 0.' };
      }

      const note = typeof params.note === 'string' ? params.note.trim() : '';

      const date = normalizeActionDate(params.date, { defaultToToday: true });
      if (!date) {
        return { valid: false, error: 'Date must be in valid YYYY-MM-DD format (or relative like today/yesterday).' };
      }

      return {
        valid: true,
        normalized: {
          amount: Number(amount.toFixed(2)),
          note: note || 'Refund',
          date,
        },
      };
    },
  },

  // ─── HEALTH ACTIONS ────────────────────────────────────────────────────────
  log_workout: {
    domain: 'health',
    risk: 'low',
    requiresConfirmation: false,
    description: 'Logs a workout or physical activity session with RPE.',
    params: {
      activityType: { type: 'string', required: false, default: 'Workout', description: 'Type of exercise (e.g. Run, Lifting, Yoga)' },
      activeMinutes: { type: 'number', required: true, min: 1, max: 1440, description: 'Active workout duration (1-1440)' },
      rpe: { type: 'integer', required: false, min: 1, max: 10, default: 5, description: 'Rate of Perceived Exertion (1-10)' },
      notes: { type: 'string', required: false, default: null, description: 'Optional workout notes' },
      date: { type: 'date', required: false, default: null, description: 'Workout date (YYYY-MM-DD)' },
    },
    validate: (params) => {
      const activityType = typeof params.activityType === 'string' && params.activityType.trim() ? params.activityType.trim() : 'Workout';

      const mins = parseSafeNumber(params.activeMinutes);
      if (mins === null) {
        return { valid: false, error: 'Active minutes must be a valid number.' };
      }

      const rpeVal = params.rpe !== undefined && params.rpe !== null ? parseSafeNumber(params.rpe) : 5;
      if (rpeVal === null) {
        return { valid: false, error: 'RPE must be a valid number.' };
      }

      const check = validateWorkoutLog(mins, rpeVal);
      if (!check.valid) {
        return { valid: false, error: check.error };
      }

      const date = normalizeActionDate(params.date, { defaultToToday: true });
      if (!date) {
        return { valid: false, error: 'Date must be in valid YYYY-MM-DD format.' };
      }

      const notes = typeof params.notes === 'string' ? params.notes.trim() : null;

      return {
        valid: true,
        normalized: {
          activityType,
          activeMinutes: check.minutes,
          rpe: check.rpe,
          notes,
          date,
        },
      };
    },
  },

  // ─── GROWTH ACTIONS ────────────────────────────────────────────────────────
  create_goal: {
    domain: 'growth',
    risk: 'low',
    requiresConfirmation: false,
    description: 'Creates a new milestone goal associated with a project or growth.',
    params: {
      name: { type: 'string', required: true, description: 'Goal title/name' },
      projectId: { type: 'string', required: false, default: null, description: 'Optional associated project UUID' },
      targetValue: { type: 'number', required: false, default: 1, description: 'Target metric quantity' },
      unit: { type: 'string', required: false, default: 'done', description: 'Target unit' },
      deadline: { type: 'date', required: false, default: null, description: 'Goal deadline (YYYY-MM-DD)' },
    },
    validate: (params) => {
      const name = typeof params.name === 'string' ? params.name.trim() : '';
      if (!name) return { valid: false, error: 'Goal title cannot be empty.' };

      let targetValue = 1;
      if (params.targetValue !== undefined && params.targetValue !== null) {
        const tv = parseSafeNumber(params.targetValue);
        if (tv === null || tv <= 0) {
          return { valid: false, error: 'Target value must be a positive number.' };
        }
        targetValue = tv;
      }

      const unit = typeof params.unit === 'string' && params.unit.trim() ? params.unit.trim() : 'done';
      const projectId = params.projectId ? String(params.projectId).trim() : null;

      let deadline = null;
      if (params.deadline) {
        deadline = normalizeActionDate(params.deadline, { defaultToToday: false });
        if (!deadline) {
          return { valid: false, error: 'Deadline must be in valid YYYY-MM-DD format.' };
        }
      }

      return {
        valid: true,
        normalized: {
          name,
          projectId,
          targetValue,
          unit,
          deadline,
        },
      };
    },
  },

  update_goal: {
    domain: 'growth',
    risk: 'low',
    requiresConfirmation: false,
    description: 'Updates progress or completion status of an existing goal.',
    params: {
      goalId: { type: 'string', required: true, description: 'Goal UUID' },
      currentValue: { type: 'number', required: false, description: 'New progress value' },
      isComplete: { type: 'boolean', required: false, description: 'Goal completion status' },
    },
    validate: (params) => {
      const goalId = typeof params.goalId === 'string' ? params.goalId.trim() : '';
      if (!goalId) return { valid: false, error: 'Goal ID is required.' };

      if (params.currentValue === undefined && params.isComplete === undefined) {
        return { valid: false, error: 'At least one of currentValue or isComplete must be provided.' };
      }

      let currentValue = undefined;
      if (params.currentValue !== undefined && params.currentValue !== null) {
        const cv = parseSafeNumber(params.currentValue);
        if (cv === null || cv < 0) {
          return { valid: false, error: 'Current value must be a non-negative number.' };
        }
        currentValue = cv;
      }

      let isComplete = undefined;
      if (params.isComplete !== undefined && params.isComplete !== null) {
        isComplete = Boolean(params.isComplete);
      }

      return {
        valid: true,
        normalized: {
          goalId,
          ...(currentValue !== undefined && { currentValue }),
          ...(isComplete !== undefined && { isComplete }),
        },
      };
    },
  },

  delete_task: {
    domain: 'growth',
    risk: 'medium',
    requiresConfirmation: true,
    description: 'Deletes a task from the Growth backlog or project.',
    params: {
      taskId: { type: 'string', required: true, description: 'Task UUID to delete' },
    },
    formatConfirmation: (params) => `Delete task ${params.taskId}?`,
    validate: (params) => {
      const taskId = typeof params.taskId === 'string' ? params.taskId.trim() : '';
      if (!taskId) return { valid: false, error: 'Task ID is required to delete a task.' };

      return {
        valid: true,
        normalized: {
          taskId,
        },
      };
    },
  },

  create_project: {
    domain: 'growth',
    risk: 'low',
    requiresConfirmation: false,
    description: 'Creates a new project in Growth.',
    params: {
      name: { type: 'string', required: true, description: 'Project title/name' },
      icon: { type: 'string', required: false, default: '📁', description: 'Emoji icon' },
      deadline: { type: 'date', required: false, default: null, description: 'Project deadline in YYYY-MM-DD' },
    },
    validate: (params) => {
      const name = typeof params.name === 'string' ? params.name.trim() : '';
      if (!name) return { valid: false, error: 'Project name cannot be empty.' };

      let deadline = null;
      if (params.deadline) {
        deadline = normalizeActionDate(params.deadline, { defaultToToday: false });
        if (!deadline) {
          return { valid: false, error: 'Deadline must be in valid YYYY-MM-DD format.' };
        }
      }

      return {
        valid: true,
        normalized: {
          name,
          icon: params.icon || '📁',
          deadline,
        },
      };
    },
  },

  create_plan: {
    domain: 'growth',
    risk: 'low',
    requiresConfirmation: false,
    description: 'Generates or stores a multi-step execution plan.',
    params: {
      goal: { type: 'string', required: true, description: 'Plan goal' },
      steps: { type: 'array', required: false, default: [], description: 'List of plan steps' },
    },
    validate: (params) => {
      const goal = typeof params.goal === 'string' ? params.goal.trim() : '';
      if (!goal) return { valid: false, error: 'Plan goal cannot be empty.' };
      return {
        valid: true,
        normalized: {
          goal,
          steps: Array.isArray(params.steps) ? params.steps : [],
        },
      };
    },
  },

  create_habit: {
    domain: 'habits',
    risk: 'low',
    requiresConfirmation: false,
    description: 'Creates a new recurring habit definition.',
    params: {
      name: { type: 'string', required: true, description: 'Habit name' },
      frequency: { type: 'string', required: false, default: 'daily', description: 'Habit frequency (e.g. daily, weekly)' },
      zone: { type: 'string', required: false, default: 'mind', description: 'Life zone (mind, body, growth, soul)' },
      icon: { type: 'string', required: false, default: '🪐', description: 'Emoji icon' },
    },
    validate: (params) => {
      const name = typeof params.name === 'string' ? params.name.trim() : '';
      if (!name) return { valid: false, error: 'Habit name cannot be empty.' };

      return {
        valid: true,
        normalized: {
          name,
          frequency: typeof params.frequency === 'string' && params.frequency.trim() ? params.frequency.trim() : 'daily',
          zone: typeof params.zone === 'string' && params.zone.trim() ? params.zone.trim() : 'mind',
          icon: typeof params.icon === 'string' && params.icon.trim() ? params.icon.trim() : '🪐',
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

