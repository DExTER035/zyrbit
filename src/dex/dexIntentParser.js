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
} from './resolvers/index.js';
import { isPlanningIntent, generatePlan } from './planning/index.js';


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
    lines.push(
      `Food today: ${f.mealCount} meals, ${f.totals.calories} kcal, ${f.totals.protein}g protein`
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

  const validIntents = ['action', 'clarify', 'conversational', 'unsupported', 'plan'];
  if (!validIntents.includes(parsed.intent)) {
    throw new Error(`Unknown intent: "${parsed.intent}"`);
  }

  if (parsed.intent === 'action') {
    if (!parsed.action || typeof parsed.action !== 'string') {
      throw new Error('Action intent missing "action" field.');
    }
    if (!parsed.params || typeof parsed.params !== 'object') {
      throw new Error('Action intent missing "params" object.');
    }
    // Security: strip any injected userId fields
    delete parsed.params.userId;
    delete parsed.params.user_id;
  }

  if (parsed.intent === 'plan') {
    if (parsed.plan && typeof parsed.plan === 'object') {
      delete parsed.plan.userId;
      delete parsed.plan.user_id;
    }
  }

  return parsed;
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

  // 0. Planning Requests: "I have 45 minutes. What should I do?", "Plan my next hour", etc.
  if (isPlanningIntent(str)) {
    const planRes = generatePlan({ userMessage: str, context });
    if (planRes.success && planRes.plan) {
      return {
        intent: 'plan',
        plan: planRes.plan,
        confidence: 'high',
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
      };
    }
  }

  // 2. Focus Session: "Start a 25 minute focus session", "Give me 45 minutes of focused study", "start focus 25"
  if (/\b(?:focus(?:ed|ing)?|pomodoro)\b/i.test(lower) && !/\b(?:task|habit|spent)\b/i.test(lower)) {
    const mins = parseDurationMinutes(lower);
    if (mins) {
      return {
        intent: 'action',
        action: 'start_focus',
        params: { durationMinutes: mins },
        confidence: 'high',
        displayMessage: `Starting ${mins}-minute focus session.`,
      };
    }
  }

  // 3. Water Log: "I drank 750 ml of water", "I just had 500ml", "drank 750"
  if (/\b(?:water|hydration|drank|drunk)\b/i.test(lower) || /\b\d+\s*ml\b/i.test(lower) || /\b\d+(?:\.\d+)?\s*(?:l|liters?|litres?)\b/i.test(lower)) {
    const amountMl = parseWaterAmount(lower);
    if (amountMl) {
      return {
        intent: 'action',
        action: 'log_water',
        params: { amountMl },
        confidence: 'high',
        displayMessage: `Logged ${amountMl}ml water.`,
      };
    }
  }

  // 4. Sleep Log: "I slept 8 hours", "slept 7.5 hours"
  if (/\b(?:slept|sleep)\b/i.test(lower) && !/\b(?:habit|task|spent)\b/i.test(lower)) {
    const sleep = parseSleepDetails(lower);
    if (sleep) {
      return {
        intent: 'action',
        action: 'log_sleep',
        params: { durationHours: sleep.durationHours, quality: sleep.quality },
        confidence: 'high',
        displayMessage: `Logged ${sleep.durationHours}h sleep (quality ${sleep.quality}/5).`,
      };
    }
  }

  // 5. Activity / Workout Log: "I walked for 30 minutes", "30 minute walk"
  if (/\b(?:walked|walking|ran|running|cycling|swimming|lifted|workout|gym|yoga)\b/i.test(lower) && !/\b(?:habit|skip)\b/i.test(lower)) {
    const act = parseActivityDetails(lower);
    if (act) {
      return {
        intent: 'action',
        action: 'log_activity',
        params: { activityType: act.activityType, activeMinutes: act.activeMinutes, rpe: act.rpe },
        confidence: 'high',
        displayMessage: `Logged ${act.activeMinutes}min ${act.activityType}.`,
      };
    }
  }

  // 6. Food Log: "I ate 4 boiled eggs and a banana", "I had two boiled eggs", "Had rice and dal"
  if (/\b(?:ate|had|eating|lunch|dinner|breakfast|snack)\b/i.test(lower) && !/\b(?:spent|cost|paid|money|bill)\b/i.test(lower)) {
    const foodRes = resolveFoodInput(str);
    if (foodRes.success && foodRes.resolved) {
      return {
        intent: 'action',
        action: 'log_meal',
        params: foodRes.mealParams,
        confidence: 'high',
        displayMessage: `Logged ${foodRes.mealParams.foodName} (${foodRes.mealParams.calories} kcal).`,
      };
    } else if (foodRes.clarificationNeeded) {
      return {
        intent: 'clarify',
        question: foodRes.question || 'What food did you have?',
        context: str,
      };
    }
  }

  // 7. Habits: "Skip my morning run", "Complete my morning run", "Skip my run", "Do my morning habit"
  if (/\b(?:complete|finish|done|skip|did)\b/i.test(lower) && /\b(?:run|habit|morning|evening|workout|reading|meditation)\b/i.test(lower)) {
    const actionType = /\bskip\b/i.test(lower) ? 'skip' : 'complete';
    const habitsList = context?.habits?.habits || [];
    const habitRes = resolveHabitMention({ userMessage: str, habits: habitsList, actionType });
    if (habitRes.status === 'resolved') {
      return {
        intent: 'action',
        action: actionType === 'skip' ? 'skip_habit' : 'complete_habit',
        params: { habitId: habitRes.habitId },
        confidence: 'high',
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

  // 8. Money: "I spent ₹200 on lunch", "Lunch cost me 200", "I got paid ₹50,000", "I spent money"
  const finRes = resolveFinancialInput(str);
  if (finRes.status === 'resolved') {
    return {
      intent: 'action',
      action: finRes.action,
      params: finRes.params,
      confidence: 'high',
      displayMessage: finRes.action === 'add_expense' ? `Record expense of ₹${finRes.params.amount}?` : `Record ${finRes.action === 'add_income' ? 'income' : 'bill'} of ₹${finRes.params.amount}?`,
    };
  } else if (finRes.status === 'clarify') {
    return {
      intent: 'clarify',
      question: finRes.question,
      context: str,
    };
  }

  // 9a. Complete Task: "Mark clean my room as done", "clean my room is done", "complete task study DSA"
  const doneMatch = str.match(/^(?:mark\s+task\s+|mark\s+)?(.+?)\s+(?:as\s+done|as\s+completed|done|completed)$/i) ||
    str.match(/^(?:complete\s+task|finish\s+task)\s+(.+)$/i);
  if (doneMatch && !/\b(?:habit|run|workout|reading|meditation)\b/i.test(str)) {
    const rawTarget = doneMatch[1].replace(/^(?:task\s+|my\s+)/i, '').trim().toLowerCase();
    const pendingTasks = context?.growth?.pendingTasks || [];
    if (pendingTasks.length > 0) {
      const match = pendingTasks.find((t) => t.name.toLowerCase().includes(rawTarget) || rawTarget.includes(t.name.toLowerCase()));
      if (match) {
        return {
          intent: 'action',
          action: 'complete_task',
          params: { taskId: match.id, status: 'done' },
          confidence: 'high',
          displayMessage: `Marked task "${match.name}" as done.`,
        };
      }
    }
    return {
      intent: 'clarify',
      action: 'complete_task',
      question: `Could not find a pending task matching "${rawTarget}". Which task did you mean?`,
      context: str,
    };
  }

  // 9b. Priority Task: "Make studying DSA my top priority", "Make DSA high priority"
  const priorityMatch = str.match(/^(?:make\s+)?(.+?)\s+(?:as\s+|my\s+)?(?:top priority|highest priority|high priority|p1|priority 1|urgent)$/i);
  if (priorityMatch && !/\b(?:habit|run|workout|spent)\b/i.test(str)) {
    let taskName = priorityMatch[1].replace(/^(?:task\s+|my\s+)/i, '').trim();
    if (taskName.length >= 2) {
      return {
        intent: 'action',
        action: 'create_task',
        params: { name: taskName, priority: 1 },
        confidence: 'high',
        displayMessage: `Task "${taskName}" set as top priority.`,
      };
    }
  }

  // 9c. Task Creation: "I need to clean my room today", "Finish my DSA assignment", "Add study for tomorrow's exam"
  const taskMatch = str.match(/^(?:add\s+task\s+|add\s+|create\s+task\s+|remind\s+me\s+to\s+|need\s+to\s+|i\s+need\s+to\s+)(.+)$/i);
  if (taskMatch || /^(?:finish|study|complete|submit|review|prepare|write|read)\b/i.test(str)) {
    // Only if not already handled by habits/financial
    let taskName = taskMatch ? taskMatch[1].trim() : str.trim();
    // Check priority hint
    let priority = 3;
    if (/\b(?:high priority|p1|urgent|critical|important)\b/i.test(str)) {
      priority = 1;
      taskName = taskName.replace(/\b(?:as\s+)?(?:high priority|p1|urgent|critical|important)\b/gi, '').trim();
    } else if (/\b(?:medium priority|p2)\b/i.test(str)) {
      priority = 2;
      taskName = taskName.replace(/\b(?:as\s+)?(?:medium priority|p2)\b/gi, '').trim();
    }

    // Check if ends with "today" or "tonight"
    let dueDate = null;
    const todayMatch = taskName.match(/^(.+?)\s+(?:today|tonight)$/i);
    if (todayMatch) {
      taskName = todayMatch[1].trim();
      dueDate = new Date().toISOString().split('T')[0];
    }

    if (taskName.length >= 3) {
      const params = { name: taskName, priority };
      if (dueDate) params.dueDate = dueDate;
      return {
        intent: 'action',
        action: 'create_task',
        params,
        confidence: 'high',
        displayMessage: `Task "${taskName}" added${dueDate ? ' for today' : ''}.`,
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
      if (['add_expense', 'add_income', 'add_bill'].includes(intent.action)) {
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
    }

    return { success: true, intent, rawResponse };
  } catch (err) {
    const isParseError =
      err instanceof SyntaxError || err.message.includes('intent') || err.message.includes('action');

    return {
      success: false,
      error: isParseError
        ? 'Dex had trouble understanding that. Please rephrase.'
        : err.message || 'AI service temporarily unavailable.',
    };
  }
}
