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
    .replace(/^(please\s+|dex\s+)?(complete|finish|done|skip|do|did|checked off|check off|mark done|mark completed)\s+/i, '')
    .replace(/\b(my|the|a|an|today|tonight|this morning|this evening|this afternoon|habit|go for a|went for a)\b/gi, '')
    .replace(/[?!.,;]/g, '')
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

  // Filter for pending habits first (not already completed/skipped for this action)
  const pendingHabits = habits.filter((h) => !h.completed && !h.skipped);
  const targetPool = pendingHabits.length > 0 ? pendingHabits : habits;

  const raw = (userMessage || '').toLowerCase();
  const query = cleanHabitQuery(userMessage);

  // 1. Exact Name Match (case-insensitive)
  const exact = targetPool.filter((h) => h.name.toLowerCase().trim() === query);
  if (exact.length === 1) {
    return {
      status: 'resolved',
      habitId: exact[0].id,
      habitName: exact[0].name,
    };
  }

  // 2. Exact match on raw input (e.g. user literally typed the exact habit name)
  const exactRaw = targetPool.filter((h) => raw.includes(h.name.toLowerCase().trim()));
  if (exactRaw.length === 1) {
    return {
      status: 'resolved',
      habitId: exactRaw[0].id,
      habitName: exactRaw[0].name,
    };
  } else if (exactRaw.length > 1) {
    // Multiple exact matches in raw string
    return _buildAmbiguityResponse(exactRaw, actionType);
  }

  // 3. Substring & Word Token Overlap Match
  const queryWords = query.split(/\s+/).filter((w) => w.length > 1);

  const matched = targetPool.filter((h) => {
    const hName = h.name.toLowerCase();
    // Substring match
    if (query && hName.includes(query)) return true;
    // Word tokens overlap
    if (queryWords.some((w) => hName.includes(w))) return true;
    return false;
  });

  // Check for time-of-day hint if user specifically said "morning habit" or "evening habit"
  if (matched.length === 0 && (raw.includes('morning') || raw.includes('evening') || raw.includes('night'))) {
    const timeMatch = targetPool.filter((h) => {
      const hName = h.name.toLowerCase();
      if (raw.includes('morning') && hName.includes('morning')) return true;
      if (raw.includes('evening') && hName.includes('evening')) return true;
      if (raw.includes('night') && (hName.includes('night') || hName.includes('evening'))) return true;
      return false;
    });
    if (timeMatch.length === 1) {
      return {
        status: 'resolved',
        habitId: timeMatch[0].id,
        habitName: timeMatch[0].name,
      };
    } else if (timeMatch.length > 1) {
      return _buildAmbiguityResponse(timeMatch, actionType);
    }
  }

  // Evaluate candidate matches
  if (matched.length === 1) {
    return {
      status: 'resolved',
      habitId: matched[0].id,
      habitName: matched[0].name,
    };
  }

  if (matched.length > 1) {
    // Ambiguous collision! NEVER guess.
    return _buildAmbiguityResponse(matched, actionType);
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
 * @returns {{ status: 'ambiguous', question: string, candidates: Array<Object> }}
 */
function _buildAmbiguityResponse(candidates, actionType) {
  // Check if candidates differ by time (morning vs evening / night)
  const names = candidates.map((c) => c.name);
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
