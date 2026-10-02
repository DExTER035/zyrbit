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
    /^(how much can i (safely )?spend|what can i spend|safe to spend|can i spend|can i afford)\b/i,
    /^(who owes me money|who owes me|who do i owe|who i owe)\b/i,
    /^(what am i committed to this week|commitments this week|committed this week)\b/i,
    /^(where did my money go|spending breakdown)\b/i,
    /^(what subscriptions are coming|upcoming subscriptions|show subscriptions)\b/i,
    /^(how much money is actually available|how much is available|available cash|available money)\b/i,
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
export function resolveConversationalQuery(arg1, arg2) {
  let userMessage = '';
  let context = null;

  if (typeof arg1 === 'string') {
    userMessage = arg1;
    context = arg2;
  } else if (arg1 && typeof arg1 === 'object') {
    userMessage = arg1.userMessage;
    context = arg1.context;
  }

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

  // 1a. Specific spending queries (must precede generic "what did I spend" / "how much did I spend")
  if (/spend(?:t)? on food|food spend(?:ing)?|how much for food/i.test(str)) {
    const food = Number(context?.wealth?.foodSpentMonth || 0);
    return {
      isHandled: true,
      displayMessage: `You spent ₹${food.toLocaleString('en-IN')} on food this month.`,
    };
  }

  if (/spend(?:t)? (?:through|via|on|using) upi|upi spend(?:ing)?/i.test(str)) {
    const upi = Number(context?.wealth?.upiSpentMonth || 0);
    return {
      isHandled: true,
      displayMessage: `You spent ₹${upi.toLocaleString('en-IN')} through UPI this month.`,
    };
  }

  if (/spend(?:t)? yesterday|yesterday(?:'s)? spend(?:ing)?/i.test(str)) {
    const yest = Number(context?.wealth?.spentYesterday || 0);
    return {
      isHandled: true,
      displayMessage: yest > 0
        ? `You spent ₹${yest.toLocaleString('en-IN')} yesterday.`
        : 'You had no expenses recorded yesterday.',
    };
  }

  // 1b. Generic Spending Query: "How much did I spend today?" / "What did I spend today?"
  if (/how much (did i spend|have i spent|spent today)|what did i spend/i.test(str)) {
    const spentToday = context?.wealth?.spentToday || 0;
    const formatted = Number(spentToday).toLocaleString('en-IN');
    return {
      isHandled: true,
      displayMessage: `You've spent ₹${formatted} today.`,
    };
  }

  // 1c. Can I afford / Safe-to-Spend Query: "Can I afford ₹2,000?" / "How much can I safely spend?"
  if (/can i afford|how much can i (safely )?spend|what can i spend|safe to spend|can i spend/i.test(str)) {
    const targetMatch = str.match(/(?:can i afford|can i spend)\s*(?:₹|rs\.?|inr)?\s*(\d+(?:,\d+)?)/i);
    const unencumbered = Number(context?.wealth?.unencumberedCash || context?.wealth?.liquidCash || 0);

    if (targetMatch) {
      const askAmt = parseInt(targetMatch[1].replace(/,/g, ''), 10);
      if (askAmt <= unencumbered && unencumbered > 0) {
        return {
          isHandled: true,
          displayMessage: `Yes. You have ₹${unencumbered.toLocaleString('en-IN')} unencumbered cash available after setting aside upcoming commitments.`,
        };
      }
      const shortfall = Math.max(0, askAmt - unencumbered);
      return {
        isHandled: true,
        displayMessage: `Tight: you have ₹${unencumbered.toLocaleString('en-IN')} available. Spending ₹${askAmt.toLocaleString('en-IN')} leaves a ₹${shortfall.toLocaleString('en-IN')} deficit against upcoming commitments.`,
      };
    }

    return {
      isHandled: true,
      displayMessage: `You have ₹${unencumbered.toLocaleString('en-IN')} unencumbered cash available today.`,
    };
  }

  // 1c. "Who owes me money?" / "Who owes me?"
  if (/who owes me/i.test(str)) {
    const promises = context?.wealth?.moneyPromises || [];
    if (promises.length === 0) {
      return {
        isHandled: true,
        displayMessage: 'No one owes you money right now.',
      };
    }
    const list = promises.map(p => `${p.person} (₹${Number(p.amount).toLocaleString('en-IN')})`).join(', ');
    return {
      isHandled: true,
      displayMessage: `Money owed to you: ${list}.`,
    };
  }

  // 1d. "Who do I owe?" / "Who i owe?"
  if (/who do i owe|who i owe/i.test(str)) {
    const liabilities = context?.wealth?.liabilities || [];
    if (liabilities.length === 0) {
      return {
        isHandled: true,
        displayMessage: 'You have no personal debts or borrowed money outstanding.',
      };
    }
    const list = liabilities.map(l => `${l.person} (₹${Number(l.amount).toLocaleString('en-IN')})`).join(', ');
    return {
      isHandled: true,
      displayMessage: `You owe: ${list}.`,
    };
  }

  // 1e. "What am I committed to this week?"
  if (/committed to this week|commitments this week/i.test(str)) {
    const comms = context?.wealth?.commitmentsThisWeek || [];
    if (comms.length === 0) {
      return {
        isHandled: true,
        displayMessage: 'You have no bill commitments due this week.',
      };
    }
    const total = comms.reduce((s, c) => s + c.amount, 0);
    const list = comms.map(c => `${c.name} (₹${c.amount.toLocaleString('en-IN')})`).join(', ');
    return {
      isHandled: true,
      displayMessage: `Committed this week: ₹${total.toLocaleString('en-IN')} across ${list}.`,
    };
  }

  // 1f. "Where did my money go this month?"
  if (/where did my money go|spending breakdown/i.test(str)) {
    const totalExp = Number(context?.wealth?.totalExpensesMonth || 0);
    const breakdown = context?.wealth?.zoneBreakdown || [];
    if (totalExp === 0) {
      return {
        isHandled: true,
        displayMessage: 'No expenses recorded for this month yet.',
      };
    }
    const parts = breakdown.filter(b => b.amount > 0).map(b => `${b.label}: ₹${b.amount.toLocaleString('en-IN')} (${b.pct}%)`).join(', ');
    return {
      isHandled: true,
      displayMessage: `This month you spent ₹${totalExp.toLocaleString('en-IN')}: ${parts || 'routine expenses'}.`,
    };
  }

  // 1g. "What subscriptions are coming?" (exclude "did I pay")
  if (/upcoming subscriptions|subscriptions coming|scheduled subscriptions|active subscriptions/i.test(str) || (/subscriptions/i.test(str) && !/paid|did i pay/i.test(str))) {
    const subs = context?.wealth?.subscriptions || [];
    if (subs.length === 0) {
      return {
        isHandled: true,
        displayMessage: 'No active recurring subscriptions scheduled.',
      };
    }
    const list = subs.map(s => `${s.name} (₹${s.amount.toLocaleString('en-IN')}/${s.frequency})`).join(', ');
    return {
      isHandled: true,
      displayMessage: `Upcoming subscriptions: ${list}.`,
    };
  }

  // 1h. "How much money is actually available?"
  if (/how much money is actually available|how much is available|available cash|available money/i.test(str)) {
    const unencumbered = Number(context?.wealth?.unencumberedCash || 0);
    const liquid = Number(context?.wealth?.liquidCash || 0);
    const billsTotal = Number(context?.wealth?.upcomingBillTotal || 0);
    return {
      isHandled: true,
      displayMessage: `You have ₹${unencumbered.toLocaleString('en-IN')} available (₹${liquid.toLocaleString('en-IN')} in cash minus ₹${billsTotal.toLocaleString('en-IN')} promised for bills).`,
    };
  }

  // 1i. Upcoming Bills Query: "What bills are coming up?" / "Upcoming bills"
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

  // 1m. "Who paid me?" / "Income sources"
  if (/who paid me|who sent me money|received money from whom/i.test(str)) {
    const payers = context?.wealth?.whoPaidMe || [];
    if (!payers.length) {
      return {
        isHandled: true,
        displayMessage: 'No incoming payments or income recorded this month.',
      };
    }
    const list = payers.slice(0, 5).map(p => `${p.payer}: ₹${p.amount.toLocaleString('en-IN')}`).join(', ');
    return {
      isHandled: true,
      displayMessage: `Incoming payments this month: ${list}.`,
    };
  }

  // 1n. "Who did I pay?" / "Top payees"
  if (/who did i pay|who i paid|payees/i.test(str)) {
    const payees = context?.wealth?.whoIPaid || [];
    if (!payees.length) {
      return {
        isHandled: true,
        displayMessage: 'No expenses recorded this month.',
      };
    }
    const list = payees.slice(0, 5).map(p => `${p.payee}: ₹${p.amount.toLocaleString('en-IN')}`).join(', ');
    return {
      isHandled: true,
      displayMessage: `Your top payments this month: ${list}.`,
    };
  }

  // 1o. "How much money came in?" / "Total income"
  if (/how much (?:money )?came in|total income(?: this month)?|money received/i.test(str)) {
    const inc = Number(context?.wealth?.totalIncomeMonth || 0);
    return {
      isHandled: true,
      displayMessage: `Total money that came in this month: ₹${inc.toLocaleString('en-IN')}.`,
    };
  }

  // 1p. "How much did I transfer?" / "Transfers"
  if (/how much did i transfer|transfers this month|total transferred/i.test(str)) {
    const tr = Number(context?.wealth?.transfersMonth || 0);
    return {
      isHandled: true,
      displayMessage: `You transferred ₹${tr.toLocaleString('en-IN')} between accounts this month (not counted as spending).`,
    };
  }

  // 1q. "What subscriptions did I pay?"
  if (/what subscriptions did i pay|subscriptions paid|paid subscriptions/i.test(str)) {
    const total = Number(context?.wealth?.subscriptionsPaidMonth || 0);
    const items = context?.wealth?.subscriptionItems || [];
    if (!items.length) {
      return {
        isHandled: true,
        displayMessage: 'No subscription charges logged this month.',
      };
    }
    const list = items.map(s => `${s.name} (₹${s.amount.toLocaleString('en-IN')})`).join(', ');
    return {
      isHandled: true,
      displayMessage: `Subscriptions paid this month: ₹${total.toLocaleString('en-IN')} across ${list}.`,
    };
  }

  // 1r. "What transactions need clarification?" / "Unclarified transactions"
  if (/transactions? need(?:s)? clarification|clarif(?:y|ication) (?:transactions|items)|unclarified/i.test(str)) {
    const pending = context?.wealth?.pendingClarifications || [];
    if (!pending.length) {
      return {
        isHandled: true,
        displayMessage: 'All imported transactions are fully resolved and clarified.',
      };
    }
    const list = pending.slice(0, 3).map(p => `₹${Number(p.amount).toLocaleString('en-IN')} (${p.counterparty}): ${p.review_reason || 'Needs classification'}`).join('; ');
    return {
      isHandled: true,
      displayMessage: `${pending.length} transaction${pending.length > 1 ? 's need' : ' needs'} clarification: ${list}. Review them in Connect Money.`,
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
