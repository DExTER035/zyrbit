/**
 * DexOS — Brain Dump Parser
 *
 * Extracts a structured list of domain signals from a messy, multi-topic
 * natural language brain dump (e.g. "I slept badly, CEP presentation tomorrow,
 * need to finish the Wealth UI today, ₹2,500 commitments this week").
 *
 * Rules:
 * - Calls askZyra only. No direct Gemini API or fetch calls.
 * - Returns { success, signals, dexResponse } — never mutates state.
 * - Signals are display-only until the user confirms.
 * - Actual mutations go through processUserInput (dexOrchestrator).
 */

import { askZyra } from '../lib/ai/index.js';

/**
 * @typedef {Object} DomainSignal
 * @property {'health'|'growth'|'wealth'|'zenith'} domain
 * @property {string} label            – concise human-readable description
 * @property {'log_sleep'|'create_task'|'add_bill'|'note'} actionHint  – which action this maps to
 * @property {Object} actionParams     – params to pass to processUserInput
 * @property {string} userMessage      – minimal natural-language message to feed dexOrchestrator
 */

/**
 * @typedef {Object} BrainDumpResult
 * @property {boolean} success
 * @property {DomainSignal[]} signals  – extracted domain signals
 * @property {string} dexResponse      – Dex's contextual 2-3 sentence guidance
 * @property {string|null} focusCta    – optional CTA label e.g. "Start 45 min Focus"
 * @property {number|null} focusMinutes
 * @property {string|null} error
 */

const BRAIN_DUMP_SYSTEM_PROMPT = `You are Dex — the personal operator inside Zyrbit, a calm personal operating system.

The user has given you a messy, multi-topic brain dump about their life right now.

Your job is to:
1. Extract discrete domain signals: what they need Zyrbit to understand or track.
2. Write a concise 2-3 sentence contextual response as Dex.
3. Suggest one optional focus CTA if a deep-work session would help.

## Output Format
Respond ONLY with a valid JSON object — no markdown, no prose outside JSON:

{
  "signals": [
    {
      "domain": "health" | "growth" | "wealth" | "zenith",
      "label": "<concise human-readable description, max 12 words>",
      "userMessage": "<minimal natural-language message to pass to Dex action pipeline>"
    }
  ],
  "dexResponse": "<2-3 calm, direct sentences. Address the user's actual situation. Do NOT use generic filler phrases.>",
  "focusCta": "<label like 'Start 45 min Focus' or null>",
  "focusMinutes": <number or null>
}

## Domain Assignment Rules
- HEALTH: sleep quality/hours, energy, hydration, sickness, diet, mood, body state
- GROWTH: tasks, deadlines, projects, presentations, deliverables, focus blocks
- WEALTH: expenses, commitments, bills, income, money owed
- ZENITH: overall situation, stress, calendar, life context that doesn't fit above

## Signal Extraction Rules
- Extract ONLY what the user explicitly mentioned. Never invent signals.
- Each signal becomes a Dex action or awareness note.
- For sleep: userMessage = "I slept badly" or "I slept 5 hours" with specifics if given.
- For tasks: userMessage = "CEP presentation tomorrow" or "Finish Wealth UI today".
- For wealth: userMessage = "₹2500 commitments this week" — this is a note, not a bill creation.
- Keep userMessage short and in first-person — as if the user is telling Dex directly.
- Maximum 5 signals. Prioritize by domain impact.

## Dex Response Rules
- Address what matters most based on the signals.
- Acknowledge constraints (sleep, time, money) before suggesting action.
- Maximum 3 sentences. Each sentence earns its place.
- End with a single clear direction if one obvious next step exists.

## Hard Rules
1. Only respond with JSON. Nothing else.
2. Never invent data not present in the user's message.
3. Keep all text calm and direct. No hype, no emojis, no filler.`;

/**
 * Parses a messy brain dump into structured domain signals and Dex guidance.
 *
 * @param {string} rawText — the user's messy natural-language brain dump
 * @returns {Promise<BrainDumpResult>}
 */
export async function parseBrainDump(rawText) {
  if (!rawText || typeof rawText !== 'string' || !rawText.trim()) {
    return { success: false, signals: [], dexResponse: '', focusCta: null, focusMinutes: null, error: 'Empty input.' };
  }

  const text = rawText.trim();

  try {
    const rawResponse = await askZyra(
      [{ role: 'user', text: `Brain dump: "${text}"` }],
      BRAIN_DUMP_SYSTEM_PROMPT
    );

    // Strip markdown fences if present
    let cleaned = rawResponse.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '').trim();
    }

    const parsed = JSON.parse(cleaned);

    if (!parsed || !Array.isArray(parsed.signals)) {
      throw new Error('Invalid response structure from AI.');
    }

    return {
      success: true,
      signals: (parsed.signals || []).slice(0, 5).map((s) => ({
        domain: s.domain || 'zenith',
        label: s.label || '',
        userMessage: s.userMessage || '',
      })),
      dexResponse: parsed.dexResponse || '',
      focusCta: parsed.focusCta || null,
      focusMinutes: typeof parsed.focusMinutes === 'number' ? parsed.focusMinutes : null,
      error: null,
    };
  } catch (err) {
    console.error('[brainDumpParser] Failed to parse brain dump:', err.message);
    return {
      success: false,
      signals: [],
      dexResponse: '',
      focusCta: null,
      focusMinutes: null,
      error: err.message || 'Dex could not understand the brain dump. Try rephrasing.',
    };
  }
}
