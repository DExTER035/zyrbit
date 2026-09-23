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
    /^(how am i doing|how's my day|how is my day|daily status|daily summary|how did i do today|what happened today|life summary|what needs my attention)\b/i,
    /^(how much (did i spend|have i spent|spent today)|what did i spend)\b/i,
    /^(how much can i (safely )?spend|what can i spend|safe to spend|can i spend)\b/i,
    /^(what bills (are coming up|do i have|are due)|upcoming bills|show bills|bills coming up)\b/i,
    /^(how much water (should i drink|have i had|logged)|water status|am i drinking enough)\b/i,
    /^(am i eating enough protein|protein status|how much protein|nutrition status)\b/i,
    /^(what should i work on|what should i do (next|now)?|give me something useful to do|what's next|what is next)\b/i,
    /^(who are you|what can you do|help)\b/i,
    /^(hello|hi|hey|good morning|good afternoon|good evening|what's up|yo|greetings|hey dex)\b/i,
    /^(voice commands?|how to use voice|what can i say)\b/i,
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

  // 0. Greetings: "Hello", "Hi Dex", "Good morning"
  if (/^(?:hello|hi|hey|good morning|good afternoon|good evening|what's up|yo|greetings|hey dex)\b/i.test(str)) {
    return {
      isHandled: true,
      displayMessage: "Hello! I'm Dex. You can speak commands like 'Log 500 ml water', 'Add ₹500 lunch expense', 'Start a 25 min focus', or 'Open Health'.",
    };
  }

  // 0b. Voice instructions: "Voice commands", "What can I say"
  if (/^(?:voice commands?|how to use voice|what can i say)\b/i.test(str)) {
    return {
      isHandled: true,
      displayMessage: "You can speak actions across domains: log water or sleep, record expenses, create tasks, start focus sessions, or navigate between tabs.",
    };
  }

  // 1. Spending Query: "How much did I spend today?" / "What did I spend today?"
  if (/how much (did i spend|have i spent|spent today)|what did i spend/i.test(str)) {
    const spentToday = context?.wealth?.spentToday || 0;
    const formatted = Number(spentToday).toLocaleString('en-IN');
    return {
      isHandled: true,
      displayMessage: `You've spent ₹${formatted} today.`,
    };
  }

  // 1b. Safe-to-Spend / Spending Capacity Query: "How much can I safely spend today?" / "Can I spend 3000 today?"
  if (/how much can i (safely )?spend|what can i spend|safe to spend|can i spend/i.test(str)) {
    const targetMatch = str.match(/can i spend\s*(?:₹|rs\.?|inr)?\s*(\d+(?:,\d+)?)/i);
    const spentToday = Number(context?.wealth?.spentToday || 0);
    const totalIncome = Number(context?.wealth?.totalIncomeMonth || 0);
    const totalExpenses = Number(context?.wealth?.totalExpensesMonth || 0);
    const monthlyBudget = totalIncome > 0 ? totalIncome : 15000;
    const remainingMonth = Math.max(0, monthlyBudget - totalExpenses);

    if (targetMatch) {
      const askAmt = parseInt(targetMatch[1].replace(/,/g, ''), 10);
      if (askAmt > remainingMonth && remainingMonth > 0) {
        return {
          isHandled: true,
          displayMessage: `Spending ₹${askAmt.toLocaleString('en-IN')} would exceed your remaining monthly cushion (₹${remainingMonth.toLocaleString('en-IN')}). Consider deferring or reducing.`,
        };
      }
      return {
        isHandled: true,
        displayMessage: `You have spent ₹${spentToday.toLocaleString('en-IN')} today. Spending ₹${askAmt.toLocaleString('en-IN')} fits within your monthly cushion of ₹${remainingMonth.toLocaleString('en-IN')}.`,
      };
    }

    return {
      isHandled: true,
      displayMessage: `You've spent ₹${spentToday.toLocaleString('en-IN')} today. Your remaining monthly cushion is ₹${remainingMonth.toLocaleString('en-IN')}.`,
    };
  }

  // 1c. Upcoming Bills Query: "What bills are coming up?" / "Upcoming bills"
  if (/what bills|upcoming bills|bills coming up|bills due/i.test(str)) {
    const bills = context?.wealth?.upcomingBills || [];
    if (!bills || bills.length === 0) {
      return {
        isHandled: true,
        displayMessage: 'You have no upcoming bills due this month.',
      };
    }
    const billList = bills.slice(0, 3).map((b) => `${b.name} (₹${Number(b.amount).toLocaleString('en-IN')} due ${b.dueDate || b.due_date})`).join(', ');
    return {
      isHandled: true,
      displayMessage: `Upcoming bills: ${billList}.`,
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

  // 5. Daily Summary / Progress: "How am I doing?" / "How did I do today?"
  if (/how am i doing|how's my day|how is my day|daily status|daily summary|how did i do today|what happened today|life summary|what needs my attention/i.test(str)) {
    const hDone = context?.habits?.completedToday || 0;
    const hTotal = context?.habits?.totalHabits || 0;
    const tPending = context?.growth?.pendingTaskCount || 0;
    const focusMin = context?.growth?.focusMinutesToday || 0;
    const waterMl = context?.health?.waterMlToday || 0;
    const spentToday = context?.wealth?.spentToday || 0;

    return {
      isHandled: true,
      displayMessage: `Life summary: ${hDone}/${hTotal} habits done, ${tPending} tasks pending, ${focusMin}m focus, ${waterMl}ml water, and ₹${Number(spentToday).toLocaleString('en-IN')} spent today.`,
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
