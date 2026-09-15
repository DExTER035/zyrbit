/**
 * DexOS — Context-Driven Planner
 * Synthesizes user goals, explicit time constraints, and live cross-domain signals into structured, safe plans.
 *
 * Rules:
 * - Pure JavaScript logic. Zero direct database queries.
 * - Context-driven decision making — no hardcoded arbitrary recipes.
 * - Explicit user intent always overrides generic defaults.
 * - Single-step plans are fully supported without artificial filler steps.
 * - Distinguishes executable steps from informational recommendations.
 * - Never executes actions or mutates data — produces validated proposals only.
 */

import { parseDurationMinutes } from '../resolvers/timeResolver.js';
import { createPlan } from './planSchema.js';
import { validatePlan } from './planValidator.js';

/**
 * Extracts explicit available time in minutes from natural language phrasing.
 * E.g.:
 * - "I have 45 minutes" -> 45
 * - "I have half an hour" -> 30
 * - "I have an hour before class" -> 60
 * - "30 minutes before I leave" -> 30
 * - "I have 20 mins" -> 20
 * - "Plan my next hour" -> 60
 * - "I have the whole evening" -> 120
 *
 * @param {string} text
 * @returns {number|null} Available minutes or null
 */
export function extractAvailableTime(text) {
  if (!text || typeof text !== 'string') return null;
  const str = text.toLowerCase().trim();

  // Explicit phrases for evening/afternoon
  if (/\b(?:the whole evening|my evening|this evening)\b/.test(str)) {
    return 120; // reasonable 2-hour evening block
  }
  if (/\b(?:my morning|this morning)\b/.test(str)) {
    return 60;
  }

  // "before I leave in X", "X minutes before class/leaving"
  const beforeMatch = str.match(/(\d+|half an hour|an hour|one hour)\s*(?:min|mins|minutes|hr|hrs|hours)?\s+before\b/);
  if (beforeMatch) {
    const mins = parseDurationMinutes(beforeMatch[1]);
    if (mins) return mins;
  }

  // "I have X [minutes/hours/mins]" / "have about X"
  const haveMatch = str.match(/\b(?:i\s+have|have\s+about|got\s+about|got)\s+([^,.]+?)(?:\s+(?:left|free|to\s+spare|before|to\s+work|available|until)|\s*$)/);
  if (haveMatch) {
    const mins = parseDurationMinutes(haveMatch[1]);
    if (mins) return mins;
  }

  // "Plan my next X [minutes/hours/mins]" / "for the next X" / "next hour"
  if (/\b(?:next\s+hour|an\s+hour|one\s+hour)\b/.test(str)) {
    return 60;
  }
  const nextMatch = str.match(/\b(?:next|for\s+the\s+next)\s+([^,.]+?)(?:\s+(?:minutes|mins|hours|hrs|min|hour|m|h))?\b/);
  if (nextMatch) {
    const mins = parseDurationMinutes(nextMatch[0].replace(/^(?:next|for\s+the\s+next)\s+/, ''));
    if (mins) return mins;
  }

  // Direct duration parsing fallback
  const directMins = parseDurationMinutes(str);
  if (directMins && /\b(?:minutes|mins|hours|hrs|min|hour|half an hour|an hour)\b/.test(str)) {
    return directMins;
  }

  return null;
}

/**
 * Detects whether a user message expresses a planning intent.
 *
 * @param {string} text
 * @returns {boolean}
 */
export function isPlanningIntent(text) {
  if (!text || typeof text !== 'string') return false;
  const str = text.toLowerCase().trim();

  // 1. Explicit planning verbs
  if (/\b(?:plan\s+my|plan\s+the|make\s+a\s+plan|help\s+me\s+plan|give\s+me\s+a\s+plan|plan\s+for)\b/i.test(str)) {
    return true;
  }

  const hasTime = extractAvailableTime(str) !== null;

  // 2. Available time + direction question ("I have 45 minutes. What should I do?", "Got 30 mins, what next?")
  const asksDirection = /\b(?:what\s+should\s+i\s+do|what\s+can\s+i\s+do|what\s+to\s+do|how\s+should\s+i\s+spend|what\s+should\s+i\s+work\s+on|give\s+me\s+something\s+useful)\b/i.test(str);
  if (hasTime && asksDirection) {
    return true;
  }

  // 3. Available time + context constraint ("I have 30 minutes before I leave", "45 mins before class")
  if (hasTime && /\b(?:before\s+i\s+leave|before\s+leaving|before\s+class|before\s+meeting|before\s+work)\b/i.test(str)) {
    return true;
  }

  // 4. Stated time + goal intent ("I have 45 minutes and want to study", "I have an hour to focus")
  if (hasTime && /\b(?:want\s+to|need\s+to|to\s+study|to\s+work|to\s+finish|to\s+focus)\b/i.test(str)) {
    return true;
  }

  // 5. Time block question without "I have": "What should I do with my next 30 minutes?"
  if (/\bwhat\s+should\s+i\s+do\s+with\s+(?:my\s+)?next\b/i.test(str)) {
    return true;
  }

  // 6. Prioritization requests: "I have a lot to do today. Help me prioritize.", "Help me prioritize"
  if (/\b(?:help\s+me\s+prioritize|prioritize\s+my|how\s+to\s+prioritize|help\s+me\s+choose|what\s+should\s+i\s+prioritize)\b/i.test(str)) {
    return true;
  }

  // 7. Stated urgency & uncompleted work: "I have college tomorrow and haven't finished my DSA work."
  if (/\b(?:haven't\s+finished|haven't\s+done|have\s+not\s+finished)\b/i.test(str)) {
    return true;
  }

  return false;
}

/**
 * Extracts any explicit goal or task mention from the user's message.
 * E.g. "I have 45 minutes. I want to study DSA." -> "study DSA"
 *
 * @param {string} text
 * @returns {string|null}
 */
export function extractExplicitUserGoal(text) {
  if (!text || typeof text !== 'string') return null;
  const str = text.trim();

  const goalPatterns = [
    /\b(?:want\s+to\s+study|to\s+study|study)\s+([^,.]+)/i,
    /\b(?:want\s+to\s+finish|to\s+finish|finish)\s+([^,.]+)/i,
    /\b(?:haven't\s+finished\s+my|haven't\s+finished|haven't\s+done\s+my|haven't\s+done)\s+([^,.]+)/i,
    /\b(?:want\s+to\s+work\s+on|work\s+on)\s+([^,.]+)/i,
    /\b(?:want\s+to|need\s+to)\s+([^,.]+)/i,
    /\b(?:focus\s+on)\s+([^,.]+)/i,
  ];

  for (const pattern of goalPatterns) {
    const match = str.match(pattern);
    if (match && match[1]) {
      const candidate = match[1].replace(/\b(?:today|now|tomorrow|next|for\s+class)\b/gi, '').trim();
      if (candidate.length >= 2) {
        return candidate;
      }
    }
  }

  return null;
}

/**
 * Synthesizes a structured plan proposal from the user's goal, available time, and live context.
 *
 * Priority Hierarchy:
 * 1. Explicit user goal
 * 2. Explicit user constraints (available time)
 * 3. Today's priorities (high-priority pending tasks)
 * 4. Task dependencies
 * 5. Current focus state (do not duplicate active timer)
 * 6. Relevant health/recovery signals (pacing & hydration)
 * 7. Relevant pending habits
 * 8. General productivity recommendation
 *
 * @param {Object} args
 * @param {string} args.userMessage
 * @param {Object|null} args.context
 * @param {string} args.userId
 * @returns {{ success: boolean, plan?: Object, clarificationNeeded?: boolean, question?: string, error?: string }}
 */
export function generatePlan({ userMessage, context, userId }) {
  if (!userMessage || typeof userMessage !== 'string') {
    return { success: false, error: 'User message is required for planning.' };
  }

  const cleanMessage = userMessage.trim();
  const availableMinutes = extractAvailableTime(cleanMessage) || null;
  const explicitGoal = extractExplicitUserGoal(cleanMessage);

  // Retrieve contextual signals
  const pendingTasks = context?.growth?.pendingTasks || [];
  const currentFocus = context?.growth?.currentFocus || null;
  const healthRecovery = context?.health?.recoveryScore || null;
  const waterLogged = context?.health?.waterMlToday || 0;
  const sleepHours = context?.health?.lastSleep?.hours || null;
  const pendingHabits = (context?.habits?.habits || []).filter((h) => !h.completed && !h.skipped);

  // 1. Check if a focus session is ALREADY ACTIVE
  if (currentFocus && currentFocus.active) {
    const focusDuration = currentFocus.durationMinutes || 25;
    return {
      success: true,
      plan: createPlan({
        goal: 'Continue Active Focus Session',
        availableMinutes,
        rationale: `You already have an active focus session running (${focusDuration}m). It's best to maintain focus until the timer completes.`,
        steps: [],
        recommendations: [
          `Stay in flow with your current focus session (${focusDuration}m).`,
          'Take a short hydration break once the timer rings.',
        ],
      }),
    };
  }

  // 2. Identify Primary Task / Subject
  let targetTaskName = explicitGoal;
  let targetProjectId = null;
  let taskPriorityLabel = '';

  if (explicitGoal) {
    // If user stated explicit goal, check if it matches a pending task in context
    const matchingTask = pendingTasks.find((t) =>
      t.name.toLowerCase().includes(explicitGoal.toLowerCase()) ||
      explicitGoal.toLowerCase().includes(t.name.toLowerCase())
    );
    if (matchingTask) {
      targetTaskName = matchingTask.name;
      targetProjectId = matchingTask.projectId || null;
      taskPriorityLabel = matchingTask.priority === 1 ? ' (Critical Priority)' : matchingTask.priority === 2 ? ' (High Priority)' : '';
    }
  } else if (pendingTasks.length > 0) {
    // Top pending task by priority (P1 > P2 > P3)
    const topTask = pendingTasks[0];
    targetTaskName = topTask.name;
    targetProjectId = topTask.projectId || null;
    taskPriorityLabel = topTask.priority === 1 ? ' (Critical Priority)' : topTask.priority === 2 ? ' (High Priority)' : '';
  }

  // 3. Determine Step Duration & Allocation
  // Respect availableMinutes strictly!
  const effectiveAvailable = availableMinutes || 45; // default reasonable block if unspecified

  const steps = [];
  const recommendations = [];
  let rationale = '';

  if (targetTaskName) {
    // A single, focused work block on the primary task
    const focusMinutes = effectiveAvailable;

    steps.push({
      id: crypto.randomUUID(),
      action: 'start_focus',
      params: {
        durationMinutes: focusMinutes,
        notes: `Focus on ${targetTaskName}`,
        projectId: targetProjectId || undefined,
      },
      label: `Focus on ${targetTaskName} (${focusMinutes}m)`,
      durationMinutes: focusMinutes,
      order: 1,
    });

    if (explicitGoal) {
      rationale = `Focused on your requested goal: "${targetTaskName}".`;
    } else {
      rationale = `Prioritized "${targetTaskName}"${taskPriorityLabel} as today's top pending task.`;
    }

    // Contextual health & habit recommendations (non-executable advice)
    if (waterLogged < 1000) {
      recommendations.push('Keep a glass of water nearby to stay hydrated during focus.');
    }
    if (healthRecovery !== null && healthRecovery < 50) {
      recommendations.push('Take it steady — your recovery signals suggest avoiding intense back-to-back strain.');
    } else if (sleepHours !== null && sleepHours < 6) {
      recommendations.push('Short sleep logged last night — take regular breaks if concentration dips.');
    }
  } else if (pendingHabits.length > 0) {
    // No tasks, but pending habits exist
    const habit = pendingHabits[0];
    steps.push({
      id: crypto.randomUUID(),
      action: 'complete_habit',
      params: {
        habitId: habit.id,
      },
      label: `Complete habit: ${habit.name}`,
      order: 1,
    });
    rationale = `No urgent tasks pending. Focus on completing your daily habit "${habit.name}".`;
    recommendations.push('Consistent daily habits build steady momentum.');
  } else {
    // No tasks and no pending habits: general focus or review block
    const focusMinutes = Math.min(effectiveAvailable, 30);
    steps.push({
      id: crypto.randomUUID(),
      action: 'start_focus',
      params: {
        durationMinutes: focusMinutes,
        notes: 'Strategic Planning & Review',
      },
      label: `Review & Planning Session (${focusMinutes}m)`,
      durationMinutes: focusMinutes,
      order: 1,
    });
    rationale = 'All current tasks and habits are up to date. Use this time for planning or deep reading.';
  }

  // Create plan object
  const planGoal = explicitGoal
    ? `Progress on ${explicitGoal}`
    : targetTaskName
    ? `Complete ${targetTaskName}`
    : 'Focused Productivity Session';

  const proposedPlan = createPlan({
    goal: planGoal,
    availableMinutes: availableMinutes || null,
    rationale,
    steps,
    recommendations,
  });

  // Validate the plan before returning
  const validation = validatePlan(proposedPlan, { userId, context });
  if (!validation.valid) {
    return {
      success: false,
      error: `Plan validation failed: ${validation.errors.join('; ')}`,
    };
  }

  return {
    success: true,
    plan: validation.normalizedPlan,
  };
}
