/**
 * DexOS — Conversational & Read Query Resolver
 * Deterministically answers status and recommendation queries from today's context.
 *
 * Rules:
 * - Read requests MUST NEVER mutate database or trigger ActionExecutor.
 * - Concise, calm 1-2 sentence answers matching DexOS identity.
 * - Recommendations derive deterministically from top-priority tasks and pending habits.
 * - Pure JavaScript. Zero direct database queries.
 */

/**
 * Checks if a message is a conversational or read-only status query.
 * @param {string} userMessage
 * @returns {boolean}
 */
export function isConversationalQuery(userMessage) {
  if (!userMessage || typeof userMessage !== 'string') return false;
  const str = userMessage.trim().toLowerCase();

  const patterns = [
    /^(how am i doing|how's my day|how is my day|daily status|daily summary)\b/i,
    /^(how much (did i spend|have i spent|spent today)|what did i spend)\b/i,
    /^(how much water (should i drink|have i had|logged)|water status|am i drinking enough)\b/i,
    /^(am i eating enough protein|protein status|how much protein|nutrition status)\b/i,
    /^(what should i work on|what should i do (next|now)?|give me something useful to do|what's next|what is next)\b/i,
    /^(who are you|what can you do|help)\b/i,
  ];

  return patterns.some((p) => p.test(str));
}

/**
 * Generates a deterministic conversational response based on today's context.
 *
 * @param {Object} args
 * @param {string} args.userMessage
 * @param {Object|null} args.context - Dex context snapshot from dexContextProvider
 * @returns {{ isHandled: boolean, displayMessage?: string }}
 */
export function resolveConversationalQuery({ userMessage, context }) {
  if (!userMessage || typeof userMessage !== 'string') {
    return { isHandled: false };
  }

  const str = userMessage.trim().toLowerCase();

  // 1. Spending Query: "How much did I spend today?" / "What did I spend today?"
  if (/how much (did i spend|have i spent|spent today)|what did i spend/i.test(str)) {
    const spentToday = context?.wealth?.spentToday || 0;
    const formatted = Number(spentToday).toLocaleString('en-IN');
    return {
      isHandled: true,
      displayMessage: `You've spent ₹${formatted} today.`,
    };
  }

  // 2. Hydration Query: "How much water should I drink?" / "Am I drinking enough water?"
  if (/water (should i drink|have i had|logged)|am i drinking enough|water status/i.test(str)) {
    const waterMl = context?.health?.waterMlToday || 0;
    if (waterMl >= 2500) {
      return {
        isHandled: true,
        displayMessage: `Great hydration today: ${waterMl}ml logged. Target of 2,500ml achieved.`,
      };
    }
    const remaining = Math.max(0, 2500 - waterMl);
    return {
      isHandled: true,
      displayMessage: `You've logged ${waterMl}ml today. Aim for 2,500ml (${remaining}ml remaining).`,
    };
  }

  // 3. Nutrition / Protein Query: "Am I eating enough protein?"
  if (/protein|nutrition status/i.test(str)) {
    const protein = context?.food?.totals?.protein || 0;
    const meals = context?.food?.mealCount || 0;
    const cal = context?.food?.totals?.calories || 0;

    return {
      isHandled: true,
      displayMessage: `You've logged ${protein}g protein and ${cal} kcal across ${meals} meal${meals === 1 ? '' : 's'} today.`,
    };
  }

  // 4. Recommendation Query: "What should I work on?" / "What should I do next?" / "Give me something useful to do"
  if (/what should i (work on|do)|give me something useful to do|what's next|what is next/i.test(str)) {
    const pendingTasks = context?.growth?.pendingTasks || [];
    const pendingHabits = context?.habits?.habits?.filter((h) => !h.completed && !h.skipped) || [];

    // Highest priority task
    if (pendingTasks.length > 0) {
      const topTask = pendingTasks[0];
      const pLabel = topTask.priority === 1 ? 'Critical Priority' : topTask.priority === 2 ? 'High Priority' : 'Normal Priority';
      return {
        isHandled: true,
        displayMessage: `Focus on your top task: "${topTask.name}" (${pLabel}). Or start a 25-minute focus session.`,
      };
    }

    // Pending habit
    if (pendingHabits.length > 0) {
      return {
        isHandled: true,
        displayMessage: `All tasks are clear. Knock out your pending habit: "${pendingHabits[0].name}".`,
      };
    }

    // Clear state
    return {
      isHandled: true,
      displayMessage: 'You are completely caught up on tasks and habits today. Take a break or start a focus block.',
    };
  }

  // 5. Daily Summary / Progress: "How am I doing?"
  if (/how am i doing|how's my day|how is my day|daily status|daily summary/i.test(str)) {
    const hDone = context?.habits?.completedToday || 0;
    const hTotal = context?.habits?.totalHabits || 0;
    const tPending = context?.growth?.pendingTaskCount || 0;
    const focusMin = context?.growth?.focusMinutesToday || 0;
    const waterMl = context?.health?.waterMlToday || 0;

    return {
      isHandled: true,
      displayMessage: `Today: ${hDone}/${hTotal} habits done, ${tPending} tasks pending, ${focusMin}m focus, and ${waterMl}ml water logged.`,
    };
  }

  // 6. Identity / Help
  if (/who are you|what can you do|help\b/i.test(str)) {
    return {
      isHandled: true,
      displayMessage: 'I am Dex, your personal operator. Tell me what you did or ask what to work on.',
    };
  }

  return { isHandled: false };
}
