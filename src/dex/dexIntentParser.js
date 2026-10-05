/**
 * DexOS — Dex Intent Parser
 * Interprets user natural language input into structured intent (action, clarify, conversational, unsupported).
 *
 * Rules:
 * - All AI calls go through askZyra (src/lib/gemini.js). No direct API calls.
 * - Supported intent classes: action | clarify | conversational | unsupported.
 * - Deterministic resolution is preferred first for reliability, performance, and offline consistency.
 * - AI proposes; deterministic resolvers validate & calculate authoritative values.
 * - No Supabase access. No React dependencies.
 */

import { askZyra } from '../lib/ai/index.js';
import { buildDexSystemPrompt } from './dexPrompt.js';
import {
  resolveConversationalQuery,
  isConversationalQuery,
  resolveFoodInput,
  resolveHabitMention,
  parseDurationMinutes,
  parseWaterAmount,
  parseSleepDetails,
  parseActivityDetails,
  resolveFinancialInput,
  resolveNaturalLanguageWealth,
  parseCurrencyAmount,
} from './resolvers/index.js';
import { isPlanningIntent, generatePlan, createPlan } from './planning/index.js';
import { hasAction } from '../actions/actionRegistry.js';
import { normalizeActionDate } from '../actions/actionSchemas.js';
import { validateAction } from '../actions/actionValidator.js';


/**
 * @typedef {Object} DexActionIntent
 * @property {'action'} intent
 * @property {string} action
 * @property {Object} params
 * @property {'high'|'medium'|'low'} confidence
 * @property {string} displayMessage
 */

/**
 * @typedef {Object} DexClarifyIntent
 * @property {'clarify'} intent
 * @property {string} question
 * @property {string} context
 */

/**
 * @typedef {Object} DexConversationalIntent
 * @property {'conversational'} intent
 * @property {string} displayMessage
 */

/**
 * @typedef {Object} DexUnsupportedIntent
 * @property {'unsupported'} intent
 * @property {string} displayMessage
 */

/**
 * @typedef {DexActionIntent|DexClarifyIntent|DexConversationalIntent|DexUnsupportedIntent} ParsedIntent
 */

/**
 * Serializes only the essential parts of today's context for the prompt.
 * Keeps the prompt compact to reduce token usage and cost.
 * @param {Object} context
 * @returns {string}
 */
export function serializeContextForPrompt(context) {
  if (!context) return '';

  const lines = [`Today: ${context.date}`];

  // Habits summary
  if (context.habits && !context.habits.error) {
    const h = context.habits;
    lines.push(
      `Habits: ${h.completedToday}/${h.totalHabits} done, ${h.pendingToday} pending`
    );
    if (h.habits && h.habits.length > 0) {
      const pending = h.habits.filter((x) => !x.completed && !x.skipped);
      if (pending.length > 0) {
        lines.push(`  Pending habits: ${pending.map((x) => `"${x.name}" (id:${x.id})`).join(', ')}`);
      }
    }
  }

  // Health summary
  if (context.health && !context.health.error) {
    const h = context.health;
    lines.push(`Water: ${h.waterMlToday}ml today`);
    if (h.lastSleep) {
      lines.push(`Last sleep: ${h.lastSleep.hours}h, quality ${h.lastSleep.quality}/5`);
    }
    if (h.activeMinutesToday > 0) {
      lines.push(`Active minutes today: ${h.activeMinutesToday}min`);
    }
  }

  // Food summary
  if (context.food && !context.food.error) {
    const f = context.food;
    const cal = f.totals?.calories ?? f.calories ?? 0;
    const pro = f.totals?.protein ?? f.protein ?? 0;
    lines.push(
      `Food today: ${f.mealCount || 0} meals, ${cal} kcal, ${pro}g protein`
    );
  }

  // Wealth summary
  if (context.wealth && !context.wealth.error) {
    const w = context.wealth;
    lines.push(`Spent today: ₹${w.spentToday} | Month: ₹${w.totalExpensesMonth} expenses`);
    if (w.upcomingBills && w.upcomingBills.length > 0) {
      lines.push(
        `Upcoming bills: ${w.upcomingBills.map((b) => `${b.name} ₹${b.amount} (${b.dueDate})`).join(', ')}`
      );
    }
  }

  // Growth summary
  if (context.growth && !context.growth.error) {
    const g = context.growth;
    lines.push(
      `Tasks: ${g.pendingTaskCount} pending | Focus: ${g.focusMinutesToday}min today`
    );
    if (g.pendingTasks && g.pendingTasks.length > 0) {
      const top = g.pendingTasks.slice(0, 5);
      lines.push(`  Pending tasks: ${top.map((t) => `"${t.name}" (id:${t.id}, p${t.priority})`).join(', ')}`);
    }
  }

  return lines.join('\n');
}

/**
 * Normalizes confidence scores into float numbers between 0.0 and 1.0.
 * @param {any} val
 * @returns {number}
 */
export function normalizeConfidence(val) {
  if (typeof val === 'number') {
    return Math.max(0, Math.min(1, Math.round(val * 100) / 100));
  }
  if (typeof val === 'string') {
    const l = val.toLowerCase().trim();
    if (l === 'high') return 0.95;
    if (l === 'medium') return 0.75;
    if (l === 'low') return 0.50;
    const num = parseFloat(l);
    if (!isNaN(num)) return Math.max(0, Math.min(1, Math.round(num * 100) / 100));
  }
  return 0.85;
}

/**
 * Parses the AI model's raw text response into a structured intent.
 * Strips any markdown code fences if the model ignores the no-fence rule.
 * @param {string} rawText
 * @returns {ParsedIntent}
 */
export function parseIntentResponse(rawText) {
  let cleaned = rawText.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '').trim();
  }

  const parsed = JSON.parse(cleaned);

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('AI response is not a JSON object.');
  }

  const validIntents = ['action', 'clarify', 'conversational', 'unsupported', 'plan', 'multi_action'];
  if (!validIntents.includes(parsed.intent)) {
    throw new Error(`Unknown intent: "${parsed.intent}"`);
  }

  if (parsed.intent === 'action') {
    if (!parsed.action || typeof parsed.action !== 'string') {
      throw new Error('Action intent missing "action" field.');
    }
    if (!hasAction(parsed.action)) {
      throw new Error(`Invalid or unregistered action: "${parsed.action}".`);
    }
    if (!parsed.params || typeof parsed.params !== 'object') {
      throw new Error('Action intent missing "params" object.');
    }
    // Security: strip any injected userId fields
    delete parsed.params.userId;
    delete parsed.params.user_id;

    parsed.confidence = normalizeConfidence(parsed.confidence);
    parsed.source = parsed.source || 'ai';
  }

  if (parsed.intent === 'multi_action') {
    if (!Array.isArray(parsed.actions)) {
      throw new Error('Multi-action intent missing "actions" array.');
    }
    for (const a of parsed.actions) {
      if (!a.action || !hasAction(a.action)) {
        throw new Error(`Invalid or unregistered action: "${a.action}".`);
      }
      if (a.params && typeof a.params === 'object') {
        delete a.params.userId;
        delete a.params.user_id;
      }
      a.confidence = normalizeConfidence(a.confidence);
      a.source = a.source || 'ai';
    }
    parsed.confidence = normalizeConfidence(parsed.confidence);
    parsed.source = parsed.source || 'ai';
  }

  if (parsed.intent === 'plan') {
    if (parsed.plan && typeof parsed.plan === 'object') {
      delete parsed.plan.userId;
      delete parsed.plan.user_id;
    }
    parsed.confidence = normalizeConfidence(parsed.confidence);
    parsed.source = parsed.source || 'ai';
  }

  return parsed;
}

/**
 * Resolves natural language navigation requests to safe whitelisted routes.
 * @param {string} text
 * @returns {{ route: string, label: string }|null}
 */
export function resolveNavigationDestination(text) {
  if (!text || typeof text !== 'string') return null;
  const str = text.trim().replace(/[.?!]+$/, '').toLowerCase();

  const match = str.match(/^(?:open|go to|show|take me to|navigate to|switch to|view)\s+(.+)$/i);
  if (!match) return null;

  const target = match[1].replace(/^(?:my\s+|the\s+)/i, '').replace(/[.?!]+$/, '').trim();

  // Health / Body / Nutrition
  if (/^(?:health|body|food|nutrition|vitals|water|sleep log)$/i.test(target)) {
    return { route: '/health', label: 'Health' };
  }
  // Wealth / Money / Finance / Bills
  if (/^(?:wealth|money|finances?|bills?|expenses?|budget)$/i.test(target)) {
    return { route: '/wealth', label: 'Wealth' };
  }
  // Growth / Tasks / Plan / Projects / Focus
  if (/^(?:growth|tasks?|plan|today'?s plan|projects?|focus|backlog|habits?)$/i.test(target)) {
    return { route: '/growth', label: 'Growth' };
  }
  // Zenith / Home / Overview
  if (/^(?:zenith|home|overview|life overview|dashboard)$/i.test(target)) {
    return { route: '/zenith', label: 'Zenith' };
  }
  // Stats / Analytics
  if (/^(?:stats|statistics|analytics|history)$/i.test(target)) {
    return { route: '/stats', label: 'Stats' };
  }
  // Profile / Settings
  if (/^(?:profile|settings|account)$/i.test(target)) {
    return { route: '/profile', label: 'Profile' };
  }
  // Challenge
  if (/^(?:challenge|challenges)$/i.test(target)) {
    return { route: '/challenge', label: 'Challenges' };
  }

  return null;
}

/**
 * Attempts fast deterministic intent resolution before calling the AI model.
 * This guarantees 100% offline consistency and zero hallucination for standard patterns.
 *
 * @param {string} userMessage
 * @param {Object|null} context
 * @returns {ParsedIntent|null}
 */
export function resolveDeterministicIntent(userMessage, context) {
  if (!userMessage || typeof userMessage !== 'string') return null;
  const str = userMessage.trim();
  const lower = str.toLowerCase();
  const todayStr = new Date().toISOString().split('T')[0];

  const extractDateFromContext = (t) => {
    if (!t) return null;
    const l = t.toLowerCase();
    if (l.includes('yesterday') || l.includes('last night')) return normalizeActionDate('yesterday');
    if (l.includes('tomorrow')) return normalizeActionDate('tomorrow');
    if (l.includes('this morning') || l.includes('tonight') || l.includes('today')) return normalizeActionDate('today');
    if (l.includes('last week')) return normalizeActionDate('last week');
    const dMatch = l.match(/\b\d{4}-\d{2}-\d{2}\b/);
    if (dMatch) return normalizeActionDate(dMatch[0]);
    return null;
  };

  // 0a. Subtask hierarchy guard: unsupported in this phase
  if (/\b(?:subtask|sub-task|sub\s+task|under\s+task)\b/i.test(lower)) {
    return {
      intent: 'unsupported',
      displayMessage: 'Subtasks under tasks are not yet supported. You can create a top-level task instead.',
      reasoning: 'Subtask hierarchy is not yet supported in this version.',
    };
  }

  // 0b. Compound Multi-Action check (e.g. "I had 2 eggs and oats for breakfast and spent ₹300 on lunch.")
  const compoundMatch = str.match(/^(.+?)\s+(?:and\s+(?:i\s+)?|&\s*|;\s*)(spent|paid|drank|slept|walked|ran|weighed|did|mark|complete|create|add)\b(.+)$/i);
  if (compoundMatch) {
    const clause1 = compoundMatch[1].trim();
    const clause2 = `${compoundMatch[2]} ${compoundMatch[3]}`.trim();
    // Resolve both clauses independently
    const res1 = resolveDeterministicIntent(clause1, context);
    const res2 = resolveDeterministicIntent(clause2, context);
    if (res1 && res2 && res1.intent === 'action' && res2.intent === 'action') {
      return {
        intent: 'multi_action',
        actions: [
          { action: res1.action, params: res1.params, confidence: 0.95, source: 'deterministic' },
          { action: res2.action, params: res2.params, confidence: 0.95, source: 'deterministic' },
        ],
        confidence: 0.95,
        source: 'deterministic',
        reasoning: 'Compound independent actions detected across domains',
        displayMessage: `Understood: ${res1.action} and ${res2.action}.`,
      };
    }
  }

  // 0c. Repeat Meal: "Repeat yesterday's breakfast", "Log the same breakfast as yesterday"
  if (/\b(?:repeat|log\s+the\s+same)\s+(?:yesterday'?s|previous)?\s*(breakfast|lunch|dinner|snack|meal)\b/i.test(lower)) {
    const m = lower.match(/\b(?:repeat|log\s+the\s+same)\s+(?:yesterday'?s|previous)?\s*(breakfast|lunch|dinner|snack|meal)\b/i);
    const mealType = m[1] === 'meal' ? 'breakfast' : m[1];
    return {
      intent: 'action',
      action: 'repeat_meal',
      params: { mealType, date: todayStr },
      confidence: 0.95,
      source: 'deterministic',
      reasoning: `Repeat previous ${mealType}`,
      displayMessage: `Repeating yesterday's ${mealType}.`,
    };
  }

  // 0d. Planning Requests: "I have 45 minutes. What should I do?", "Plan my next hour", "Create a study plan for DSA"
  if (isPlanningIntent(str)) {
    const planRes = generatePlan({ userMessage: str, context });
    if (planRes.success && planRes.plan) {
      return {
        intent: 'plan',
        plan: planRes.plan,
        confidence: 0.95,
        source: 'deterministic',
        reasoning: 'Context-driven plan generated',
        displayMessage: 'Here is a suggested plan based on your context:',
      };
    }
  }

  // 1. Conversational Queries: "How am I doing?", "What did I spend today?", etc.
  if (isConversationalQuery(str)) {
    const conv = resolveConversationalQuery({ userMessage: str, context });
    if (conv.isHandled) {
      return {
        intent: 'conversational',
        displayMessage: conv.displayMessage,
        confidence: 0.95,
        source: 'deterministic',
      };
    }
  }

  // 1b. Navigation: "Open Health", "Go to Wealth", "Show my Growth tasks", "Open today's plan", "Take me to my bills"
  const navTarget = resolveNavigationDestination(str);
  if (navTarget) {
    return {
      intent: 'action',
      action: 'navigate',
      params: { route: navTarget.route },
      confidence: 0.95,
      source: 'deterministic',
      displayMessage: `Opening ${navTarget.label}...`,
    };
  }

  // 2. Focus Session: "Start a 25 minute focus session", "Give me 45 minutes of focused study", "start focus 25"
  if (/\b(?:focus(?:ed|ing)?|pomodoro)\b/i.test(lower) && !/\b(?:task|habit|spent)\b/i.test(lower)) {
    const mins = parseDurationMinutes(lower);
    if (mins) {
      return {
        intent: 'action',
        action: 'start_focus',
        params: { durationMinutes: mins },
        confidence: 0.95,
        source: 'deterministic',
        displayMessage: `Starting ${mins}-minute focus session.`,
      };
    }
  }

  // 3. Water Log: "I drank 750ml water", "I drank 750 ml of water", "I had 2 glasses of water"
  const isFoodMention = /\b(?:milk|juice|tea|coffee|shake|chai|oats|breakfast|lunch|dinner|snack|ate|eating|eggs?|dates)\b/i.test(lower);
  if (!isFoodMention && (/\b(?:water|hydration)\b/i.test(lower) || (/\b(?:drank|drunk)\b/i.test(lower) && !/\b(?:beer|wine|alcohol|soda|coke)\b/i.test(lower)) || (/\b\d+\s*ml\s*water\b/i.test(lower)) || (/\bglasses?\s+of\s+water\b/i.test(lower)))) {
    const amountMl = parseWaterAmount(lower);
    if (amountMl) {
      const explicitDate = extractDateFromContext(str);
      const params = { amountMl };
      if (explicitDate) params.date = explicitDate;
      return {
        intent: 'action',
        action: 'log_water',
        params,
        confidence: 0.95,
        source: 'deterministic',
        reasoning: `Logged ${amountMl}ml hydration`,
        displayMessage: `Logged ${amountMl}ml water.`,
      };
    }
  }

  // 4. Sleep Log: "I slept 7 hours", "I slept from 11pm to 6am", "I slept 7 hours last night"
  if (/\b(?:slept|sleep)\b/i.test(lower) && !/\b(?:habit|task|spent)\b/i.test(lower)) {
    const sleep = parseSleepDetails(lower);
    if (sleep) {
      const explicitDate = extractDateFromContext(str);
      const params = { durationHours: sleep.durationHours, quality: sleep.quality };
      if (explicitDate) params.date = explicitDate;
      return {
        intent: 'action',
        action: 'log_sleep',
        params,
        confidence: 0.95,
        source: 'deterministic',
        reasoning: `Logged ${sleep.durationHours}h sleep`,
        displayMessage: `Logged ${sleep.durationHours}h sleep (quality ${sleep.quality}/5).`,
      };
    }
  }

  // 5. Activity / Workout Log: "I did a 45 minute workout", "I ran 5 km", "Log today's workout", "Log my workout from yesterday"
  if (/\b(?:walked|walking|ran|running|cycling|swimming|lifted|workout|gym|yoga)\b/i.test(lower) && !/\b(?:habit|skip)\b/i.test(lower)) {
    const act = parseActivityDetails(lower);
    if (act) {
      const explicitDate = extractDateFromContext(str);
      const params = { activityType: act.activityType, activeMinutes: act.activeMinutes, rpe: act.rpe };
      if (explicitDate) params.date = explicitDate;
      return {
        intent: 'action',
        action: 'log_activity',
        params,
        confidence: 0.95,
        source: 'deterministic',
        reasoning: `Logged ${act.activeMinutes}min ${act.activityType}`,
        displayMessage: `Logged ${act.activeMinutes}min ${act.activityType}.`,
      };
    }
  }

  // 5b. Weight Log: "Log my weight as 62 kg", "Log 68 kilos", "Weighed in at 68 kg"
  const weightMatch = lower.match(/(?:log\s+(?:my\s+)?weight(?:\s+as)?\s+|log\s+|weighed\s+in\s+at\s+|i\s+weigh\s+)?(\d+(?:\.\d+)?)\s*(?:kilos?|kgs?|kg)\b/i);
  if (weightMatch && !/\b(?:spent|paid|food|rice|dal|water|focus)\b/i.test(lower)) {
    const weightKg = parseFloat(weightMatch[1]);
    if (!isNaN(weightKg) && weightKg > 0) {
      const explicitDate = extractDateFromContext(str);
      const params = { weightKg, weight: weightKg };
      if (explicitDate) params.date = explicitDate;
      return {
        intent: 'action',
        action: 'log_weight',
        params,
        confidence: 0.95,
        source: 'deterministic',
        reasoning: `Logged scale weight of ${weightKg} kg`,
        displayMessage: `Logged weight of ${weightKg} kg.`,
      };
    }
  }

  // 6. Food Log: "I ate 2 eggs", "I had 80g oats and 200ml milk for breakfast", "I ate oats, milk and 5 dates", "I had 3 eggs at 9am"
  if (/\b(?:ate|had|eating|lunch|dinner|breakfast|snack|poha|dosa|idli|dates|eggs?|oats?|milk)\b/i.test(lower)) {
    const foodRes = resolveFoodInput(str);
    if (foodRes.success && foodRes.resolved) {
      const hasExplicitCurrency = /[₹]|(?:\brs\.?\b)|(?:\brupees\b)|(?:\bbucks\b)|(?:\binr\b)|\b(?:spent|paid|cost)\b|\bfor\s+(?:₹|rs\.?|inr)?\s*\d+/i.test(str);
      const finAmount = hasExplicitCurrency ? parseCurrencyAmount(str) : null;
      const explicitDate = extractDateFromContext(str);
      if (explicitDate) {
        foodRes.mealParams.date = explicitDate;
      }

      if (finAmount && finAmount > 0) {
        // Cross-domain capture: Food/Fuel state and Wealth spending together
        return {
          intent: 'plan',
          plan: createPlan({
            goal: `Log ${foodRes.mealParams.foodName} & record ₹${finAmount} spending`,
            rationale: `Cross-domain capture: updates Health fuel state and Wealth everyday spending.`,
            steps: [
              {
                id: crypto.randomUUID(),
                action: 'log_meal',
                params: foodRes.mealParams,
                label: `Log ${foodRes.mealParams.foodName} (${foodRes.mealParams.calories} kcal)`,
                order: 1,
              },
              {
                id: crypto.randomUUID(),
                action: 'add_expense',
                params: {
                  amount: finAmount,
                  category: 'Food',
                  note: foodRes.mealParams.foodName,
                  date: explicitDate || todayStr,
                },
                label: `Record ₹${finAmount} food expense`,
                order: 2,
                requiresConfirmation: true,
              },
            ],
          }),
          confidence: 0.95,
          source: 'deterministic',
          displayMessage: `Understood: Log ${foodRes.mealParams.foodName} and record ₹${finAmount} food spending.`,
        };
      }

      return {
        intent: 'action',
        action: 'log_meal',
        params: foodRes.mealParams,
        confidence: 0.95,
        source: 'deterministic',
        reasoning: `Food log for ${foodRes.mealParams.foodName}`,
        displayMessage: `Logged ${foodRes.mealParams.foodName} (${foodRes.mealParams.calories} kcal).`,
      };
    } else if (foodRes.clarificationNeeded && !/[₹]|(?:\brs\.?\b)|(?:\brupees\b)|(?:\bbucks\b)|(?:\binr\b)|\b(?:spent|paid|cost)\b/i.test(str)) {
      return {
        intent: 'clarify',
        question: foodRes.question || 'What food did you have?',
        context: str,
      };
    }
  }

  // 7. Habits: "I finished my workout habit", "Mark reading complete", "Skip meditation today", "Create a habit to study DSA every day"
  const createHabitMatch = str.match(/^(?:create|add|start)\s+(?:a\s+)?habit\s+(?:to\s+|called\s+|for\s+)?(.+)$/i);
  if (createHabitMatch && !/\b(?:task|project|expense)\b/i.test(lower)) {
    let habitName = createHabitMatch[1].trim();
    let frequency = 'daily';
    if (/\b(?:every\s+day|daily)\b/i.test(habitName)) {
      frequency = 'daily';
      habitName = habitName.replace(/\b(?:every\s+day|daily)\b/gi, '').trim();
    } else if (/\b(?:every\s+week|weekly)\b/i.test(habitName)) {
      frequency = 'weekly';
      habitName = habitName.replace(/\b(?:every\s+week|weekly)\b/gi, '').trim();
    }
    if (habitName.length >= 2) {
      return {
        intent: 'action',
        action: 'create_habit',
        params: { name: habitName, frequency },
        confidence: 0.95,
        source: 'deterministic',
        reasoning: 'Habit creation intent',
        displayMessage: `Created habit "${habitName}".`,
      };
    }
  }

  if (/\b(?:complete|finish|finished|done|skip|skipped|did|mark)\b/i.test(lower) && /\b(?:run|habit|morning|evening|workout|reading|meditation)\b/i.test(lower)) {
    const actionType = /\bskip\b/i.test(lower) ? 'skip' : 'complete';
    const habitsList = context?.habits?.habits || [];
    const habitRes = resolveHabitMention({ userMessage: str, habits: habitsList, actionType });
    if (habitRes.status === 'resolved') {
      const explicitDate = extractDateFromContext(str);
      const params = { habitId: habitRes.habitId };
      if (explicitDate) params.date = explicitDate;
      return {
        intent: 'action',
        action: actionType === 'skip' ? 'skip_habit' : 'complete_habit',
        params,
        confidence: 0.95,
        source: 'deterministic',
        reasoning: `${actionType === 'skip' ? 'Skipped' : 'Completed'} habit ${habitRes.habitName}`,
        displayMessage: `${actionType === 'skip' ? 'Skipped' : 'Completed'} habit "${habitRes.habitName}".`,
      };
    } else if (habitRes.status === 'ambiguous') {
      return {
        intent: 'clarify',
        action: actionType === 'skip' ? 'skip_habit' : 'complete_habit',
        question: habitRes.question,
        context: str,
      };
    } else if (habitRes.status === 'not_found') {
      return {
        intent: 'clarify',
        question: habitRes.question,
        context: str,
      };
    }
  }

  // 8. Wealth: Natural Language Wealth (record_expense, record_income, record_transfer, record_lending, record_borrowing, record_refund, & ambiguities)
  const nlWealth = resolveNaturalLanguageWealth(str);
  if (nlWealth.status === 'clarify') {
    return {
      intent: 'clarify',
      question: nlWealth.question,
      options: nlWealth.options,
      context: str,
      reasoning: nlWealth.reasoning,
    };
  } else if (nlWealth.status === 'resolved') {
    return {
      intent: 'action',
      action: nlWealth.action,
      params: nlWealth.params,
      confidence: 0.95,
      source: 'deterministic',
      reasoning: nlWealth.reasoning,
      displayMessage: `Record ${nlWealth.action.replace('record_', '')} of ₹${nlWealth.params.amount}?`,
    };
  }

  // 8b. Legacy Financial input resolver fallback
  const finRes = resolveFinancialInput(str);
  if (finRes.status === 'resolved') {
    return {
      intent: 'action',
      action: finRes.action,
      params: finRes.params,
      confidence: 0.95,
      source: 'deterministic',
      displayMessage: finRes.action === 'add_expense' ? `Record expense of ₹${finRes.params.amount}?` : `Record ${finRes.action === 'add_income' ? 'income' : 'bill'} of ₹${finRes.params.amount}?`,
    };
  } else if (finRes.status === 'clarify') {
    return {
      intent: 'clarify',
      question: finRes.question,
      options: finRes.options || finRes.clarifyOptions,
      context: str,
    };
  }

  // 9. Growth: Projects
  // "Create a project for DSA preparation"
  const projMatch = str.match(/^(?:create|add|start)\s+(?:a\s+)?project\s+(?:for|called|named)?\s*(.+)$/i);
  if (projMatch && !/\b(?:habit|task|spent|meal|expense)\b/i.test(lower)) {
    const projName = projMatch[1].trim();
    if (projName.length >= 2) {
      return {
        intent: 'action',
        action: 'create_project',
        params: { name: projName },
        confidence: 0.95,
        source: 'deterministic',
        reasoning: 'Project creation intent',
        displayMessage: `Created project "${projName}".`,
      };
    }
  }

  // 9a. Delete Task: "Delete the API task", "Delete task API"
  const delMatch = str.match(/^(?:delete|remove)\s+(?:the\s+)?task\s*(?:called|named)?\s*(.+)$/i) ||
                   str.match(/^(?:delete|remove)\s+(.+?)\s+task$/i);
  if (delMatch && !/\b(?:habit|project|expense)\b/i.test(lower)) {
    const rawTarget = delMatch[1].replace(/^(?:the\s+|my\s+)/i, '').trim();
    const pendingTasks = context?.growth?.pendingTasks || [];
    const match = pendingTasks.find((t) => t.name.toLowerCase().includes(rawTarget.toLowerCase()) || t.id === rawTarget);
    return {
      intent: 'action',
      action: 'delete_task',
      params: { taskId: match ? match.id : rawTarget },
      confidence: 0.95,
      source: 'deterministic',
      reasoning: 'Task deletion intent',
      displayMessage: `Delete task "${match ? match.name : rawTarget}"?`,
    };
  }

  // 9b. Complete Task: "Mark clean my room as done", "Mark database design complete", "complete task study DSA", "Finished the Wealth UI"
  const doneMatch = str.match(/^(?:mark\s+task\s+|mark\s+)?(.+?)\s+(?:as\s+done|as\s+completed|done|completed|complete)$/i) ||
    str.match(/^(?:complete\s+task|finish\s+task|finished\s+the|finished|completed|done\s+with)\s+(.+)$/i);
  if (doneMatch && !/\b(?:habit|run|workout|reading|meditation)\b/i.test(str)) {
    const rawTarget = doneMatch[1].replace(/^(?:the\s+|task\s+|my\s+)/i, '').trim().toLowerCase();
    const pendingTasks = context?.growth?.pendingTasks || [];
    if (pendingTasks.length > 0) {
      const match = pendingTasks.find((t) => t.name.toLowerCase().includes(rawTarget) || rawTarget.includes(t.name.toLowerCase()));
      if (match) {
        return {
          intent: 'action',
          action: 'complete_task',
          params: { taskId: match.id, status: 'done' },
          confidence: 0.95,
          source: 'deterministic',
          displayMessage: `Marked task "${match.name}" as done.`,
        };
      }
    }
    // If no context or not found in context, return action with rawTarget if it appears to be a direct task request
    if (!context || !pendingTasks.length) {
      return {
        intent: 'action',
        action: 'complete_task',
        params: { taskId: rawTarget, status: 'done' },
        confidence: 0.95,
        source: 'deterministic',
        displayMessage: `Marked task "${rawTarget}" as done.`,
      };
    }
    return {
      intent: 'clarify',
      action: 'complete_task',
      question: `Could not find a pending task matching "${rawTarget}". Which task did you mean?`,
      context: str,
    };
  }

  // 9c. Add task to project: "Add API implementation to my project"
  const addToProjMatch = str.match(/^(?:add|create)\s+(.+?)\s+to\s+(?:my\s+)?project(?:\s+([a-z0-9\s]+))?$/i);
  if (addToProjMatch) {
    const taskName = addToProjMatch[1].trim();
    return {
      intent: 'action',
      action: 'create_task',
      params: { name: taskName },
      confidence: 0.95,
      source: 'deterministic',
      reasoning: 'Task addition to project',
      displayMessage: `Task "${taskName}" added to project.`,
    };
  }

  // 9d. Priority Task: "Make studying DSA my top priority", "Make DSA high priority"
  const priorityMatch = str.match(/^(?:make\s+)?(.+?)\s+(?:as\s+|my\s+)?(?:top priority|highest priority|high priority|p1|priority 1|urgent)$/i);
  if (priorityMatch && !/\b(?:habit|run|workout|spent)\b/i.test(str)) {
    let taskName = priorityMatch[1].replace(/^(?:task\s+|my\s+)/i, '').trim();
    if (taskName.length >= 2) {
      return {
        intent: 'action',
        action: 'create_task',
        params: { name: taskName, priority: 1 },
        confidence: 0.95,
        source: 'deterministic',
        displayMessage: `Task "${taskName}" set as top priority.`,
      };
    }
  }

  // 9e. Task Creation: "Create a task called database design", "I need to clean my room today", "Finish my DSA assignment"
  const taskMatch = str.match(/^(?:create\s+(?:a\s+)?task\s+(?:called|named|to)?\s*|add\s+(?:a\s+)?task\s+(?:called|named|to)?\s*|add\s+|remind\s+me\s+to\s+|need\s+to\s+|i\s+need\s+to\s+)(.+)$/i);
  if (taskMatch || /^(?:finish|study|complete|submit|review|prepare|write|read)\b/i.test(str)) {
    let taskName = (taskMatch ? taskMatch[1] : str).replace(/[.?!]+$/, '').trim();
    let priority = 3;
    if (/\b(?:high priority|p1|urgent|critical|important)\b/i.test(str)) {
      priority = 1;
      taskName = taskName.replace(/\b(?:as\s+)?(?:high priority|p1|urgent|critical|important)\b/gi, '').trim();
    } else if (/\b(?:medium priority|p2)\b/i.test(str)) {
      priority = 2;
      taskName = taskName.replace(/\b(?:as\s+)?(?:medium priority|p2)\b/gi, '').trim();
    }

    const explicitDate = extractDateFromContext(taskName);
    if (explicitDate) {
      taskName = taskName.replace(/\b(?:today|tonight|tomorrow|yesterday)\b/gi, '').trim();
    }

    if (taskName.length >= 3) {
      const params = { name: taskName, priority };
      if (explicitDate) params.dueDate = explicitDate;
      return {
        intent: 'action',
        action: 'create_task',
        params,
        confidence: 0.95,
        source: 'deterministic',
        reasoning: 'Task creation intent',
        displayMessage: `Task "${taskName}" added${explicitDate ? ' for ' + explicitDate : ''}.`,
      };
    }
  }

  return null;
}

/**
 * Sends the user's natural language input to the AI model or deterministic resolver and returns a parsed intent.
 *
 * @param {Object} args
 * @param {string} args.userMessage - Raw text from the user
 * @param {Object|null} args.context - Today's Dex context snapshot from dexContextProvider
 * @returns {Promise<{success: boolean, intent?: ParsedIntent, rawResponse?: string, error?: string}>}
 */
export async function parseIntent({ userMessage, context }) {
  if (!userMessage || typeof userMessage !== 'string' || !userMessage.trim()) {
    return { success: false, error: 'User message cannot be empty.' };
  }

  const cleanMessage = userMessage.trim();

  // Fast Path 1: Deterministic Resolution First
  const deterministicIntent = resolveDeterministicIntent(cleanMessage, context);
  if (deterministicIntent) {
    return { success: true, intent: deterministicIntent, rawResponse: JSON.stringify(deterministicIntent) };
  }

  // Fast Path 2: AI Intent Resolution
  const systemPrompt = buildDexSystemPrompt();
  const contextSummary = serializeContextForPrompt(context);

  const userContent = contextSummary
    ? `User context:\n${contextSummary}\n\nUser message: "${cleanMessage}"`
    : `User message: "${cleanMessage}"`;

  try {
    const rawResponse = await askZyra(
      [{ role: 'user', text: userContent }],
      systemPrompt
    );

    const intent = parseIntentResponse(rawResponse);

    // Post-AI Deterministic Normalization & Safety Bounds
    if (intent.intent === 'action') {
      // If AI proposed log_meal, ensure nutrition is calculated deterministically from FOOD_DB
      if (intent.action === 'log_meal') {
        const resolvedMeal = resolveFoodInput(intent.params?.foodName || cleanMessage);
        if (resolvedMeal.success && resolvedMeal.resolved) {
          intent.params = { ...intent.params, ...resolvedMeal.mealParams };
        }
      }

      // If AI proposed complete_habit or skip_habit, ensure candidate is validated against context habits
      if (intent.action === 'complete_habit' || intent.action === 'skip_habit') {
        const habitsList = context?.habits?.habits || [];
        if (habitsList.length > 0) {
          const actionType = intent.action === 'skip_habit' ? 'skip' : 'complete';
          const match = resolveHabitMention({
            userMessage: cleanMessage,
            habits: habitsList,
            actionType,
          });
          if (match.status === 'ambiguous') {
            return {
              success: true,
              intent: {
                intent: 'clarify',
                question: match.question,
                context: cleanMessage,
              },
            };
          } else if (match.status === 'resolved') {
            intent.params.habitId = match.habitId;
          }
        }
      }

      // If AI proposed financial action without amount, elevate to clarify
      if (['add_expense', 'add_income', 'add_bill', 'record_expense', 'record_income'].includes(intent.action)) {
        if (!intent.params?.amount || Number(intent.params.amount) <= 0) {
          return {
            success: true,
            intent: {
              intent: 'clarify',
              question: 'How much did you spend?',
              context: cleanMessage,
            },
          };
        }
      }

      // Strictly validate through actionValidator
      const validation = validateAction({
        action: intent.action,
        params: intent.params,
        userId: 'validation-check-user',
      });
      if (!validation.valid) {
        return {
          success: false,
          error: `AI action validation failed: ${validation.error}`,
        };
      }
      intent.params = validation.normalizedParams;
    }

    return { success: true, intent, rawResponse };
  } catch (err) {
    const isParseError =
      err instanceof SyntaxError || err.message?.includes('intent') || err.message?.includes('action');

    if (isParseError) {
      return {
        success: false,
        error: 'Dex had trouble understanding that. Please rephrase.',
      };
    }

    // Graceful degraded mode: return calm conversational guidance instead of a red error screen
    return {
      success: true,
      intent: {
        intent: 'conversational',
        displayMessage: "Dex AI is momentarily unavailable, but direct voice actions work! Try saying 'Log 500 ml water', 'Add ₹500 food', or 'Open Health'.",
      },
      rawResponse: JSON.stringify({ error: err.message }),
    };
  }
}
