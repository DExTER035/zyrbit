/**
 * DexOS — Habit Resolver
 * Deterministically matches natural language habit commands against active/pending habits in context.
 *
 * Rules:
 * - Match against pending habits for today.
 * - Normalize case, punctuation, possessives, filler words ("my", "today", "tonight", etc.).
 * - If exactly 1 candidate: resolve directly.
 * - If multiple candidates match: NEVER guess. Propose clarification (e.g. "Which run — morning or evening?").
 * - If zero candidates: clarify or return not_found.
 * - Pure JavaScript. Zero direct database queries.
 */

/**
 * Cleans user message to extract core habit query string.
 * @param {string} text
 * @returns {string}
 */
export function cleanHabitQuery(text) {
  if (!text || typeof text !== 'string') return '';

  return text
    .toLowerCase()
    .replace(/^(?:please\s+|dex\s+|i\s+)?(?:complete|finish|finished|done|skip|skipped|mark|do|did|checked off|check off|mark done|mark completed)\s+/i, '')
    .replace(/\s+(?:complete|completed|done|as done|as completed)$/i, '')
    .replace(/\b(my|the|a|an|today|tonight|this morning|this evening|this afternoon|habit|go for a|went for a)\b/gi, '')
    .replace(/[?!.,;]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Resolves a natural language habit mention against habits in context.
 *
 * @param {Object} args
 * @param {string} args.userMessage - e.g. "Skip my morning run", "Skip my run"
 * @param {Array<Object>} [args.habits=[]] - List of habit objects from context: [{ id, name, completed, skipped }]
 * @param {'complete'|'skip'} [args.actionType='complete'] - Target habit action
 * @returns {{
 *   status: 'resolved' | 'ambiguous' | 'not_found',
 *   habitId?: string,
 *   habitName?: string,
 *   candidates?: Array<Object>,
 *   question?: string,
 * }}
 */
export function resolveHabitMention({ userMessage, habits = [], actionType = 'complete' }) {
  if (!habits || habits.length === 0) {
    return {
      status: 'not_found',
      question: 'You do not have any active habits set up for today.',
    };
  }

  const getHabitName = (h) => (h?.title || h?.name || '').trim();

  // Filter for pending habits first (not already completed/skipped for this action)
  const pendingHabits = habits.filter((h) => !h.completed && !h.skipped);
  const targetPool = pendingHabits.length > 0 ? pendingHabits : habits;

  const raw = (userMessage || '').toLowerCase();
  const query = cleanHabitQuery(userMessage);

  // 1. Exact Name Match (case-insensitive)
  const exact = targetPool.filter((h) => getHabitName(h).toLowerCase() === query);
  if (exact.length === 1) {
    return {
      status: 'resolved',
      habitId: exact[0].id,
      habitName: getHabitName(exact[0]),
    };
  }

  // 2. Exact match on raw input (e.g. user literally typed the exact habit name)
  const exactRaw = targetPool.filter((h) => {
    const name = getHabitName(h).toLowerCase();
    return name && raw.includes(name);
  });
  if (exactRaw.length === 1) {
    return {
      status: 'resolved',
      habitId: exactRaw[0].id,
      habitName: getHabitName(exactRaw[0]),
    };
  } else if (exactRaw.length > 1) {
    // Multiple exact matches in raw string
    return _buildAmbiguityResponse(exactRaw, actionType, getHabitName);
  }

  // 3. Substring & Word Token Overlap Match
  const queryWords = query.split(/\s+/).filter((w) => w.length > 1);

  const matched = targetPool.filter((h) => {
    const hName = getHabitName(h).toLowerCase();
    if (!hName) return false;
    // Substring match
    if (query && hName.includes(query)) return true;
    // Word tokens overlap
    if (queryWords.some((w) => hName.includes(w))) return true;
    return false;
  });

  // Check for time-of-day hint if user specifically said "morning habit" or "evening habit"
  if (matched.length === 0 && (raw.includes('morning') || raw.includes('evening') || raw.includes('night'))) {
    const timeMatch = targetPool.filter((h) => {
      const hName = getHabitName(h).toLowerCase();
      if (raw.includes('morning') && (hName.includes('morning') || h.is_morning)) return true;
      if (raw.includes('evening') && (hName.includes('evening') || h.is_evening)) return true;
      if (raw.includes('night') && (hName.includes('night') || hName.includes('evening'))) return true;
      return false;
    });
    if (timeMatch.length === 1) {
      return {
        status: 'resolved',
        habitId: timeMatch[0].id,
        habitName: getHabitName(timeMatch[0]),
      };
    } else if (timeMatch.length > 1) {
      return _buildAmbiguityResponse(timeMatch, actionType, getHabitName);
    }
  }

  // Evaluate candidate matches
  if (matched.length === 1) {
    return {
      status: 'resolved',
      habitId: matched[0].id,
      habitName: getHabitName(matched[0]),
    };
  }

  if (matched.length > 1) {
    // Ambiguous collision! NEVER guess.
    return _buildAmbiguityResponse(matched, actionType, getHabitName);
  }

  // Zero matches
  return {
    status: 'not_found',
    question: `Could not find a pending habit matching "${query || userMessage}". Which habit did you mean?`,
  };
}

/**
 * Builds a human, direct clarification question for ambiguous habit candidates.
 * E.g. "Which run — morning or evening?"
 * @param {Array<Object>} candidates
 * @param {'complete'|'skip'} actionType
 * @param {Function} [getName]
 * @returns {{ status: 'ambiguous', question: string, candidates: Array<Object> }}
 */
function _buildAmbiguityResponse(candidates, actionType, getName = (h) => (h?.title || h?.name || '')) {
  // Check if candidates differ by time (morning vs evening / night)
  const names = candidates.map(getName);
  const hasMorning = names.some((n) => /morning/i.test(n));
  const hasEvening = names.some((n) => /evening|night/i.test(n));

  let question = '';
  if (hasMorning && hasEvening) {
    // E.g. "Which run — morning or evening?"
    const baseNoun = names[0].replace(/morning|evening|night/gi, '').trim().toLowerCase() || 'one';
    question = `Which ${baseNoun} — morning or evening?`;
  } else {
    // General direct choice
    question = `Which habit did you want to ${actionType} — ${names.slice(0, 2).map((n) => `"${n}"`).join(' or ')}?`;
  }

  return {
    status: 'ambiguous',
    question,
    candidates,
  };
}
