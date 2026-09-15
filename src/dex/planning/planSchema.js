/**
 * DexOS — Plan Schema & Status Definitions
 * Defines the structured contract for proposed, executing, and completed Dex plans.
 *
 * Rules:
 * - Pure JavaScript definitions.
 * - Zero Supabase or Gemini direct access.
 * - Distinguishes executable steps (registered actions) from informational recommendations.
 */

export const PLAN_STATUS = {
  PROPOSED: 'proposed',
  EXECUTING: 'executing',
  COMPLETED: 'completed',
  PARTIALLY_COMPLETED: 'partially_completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
};

/**
 * @typedef {Object} PlanStep
 * @property {string} id - Unique step ID (UUID)
 * @property {string} action - Registered action name from ACTION_REGISTRY (e.g. 'start_focus', 'log_water')
 * @property {Object} params - Action parameters
 * @property {string} label - Human-readable description (e.g. "Focus on DSA Assignment")
 * @property {number} [durationMinutes] - Duration in minutes (if time-bound)
 * @property {number} order - Step sequence index (1, 2, 3...)
 * @property {boolean} [requiresConfirmation=false] - Whether this step requires independent confirmation
 */

/**
 * @typedef {Object} DexPlan
 * @property {string} id - Plan UUID
 * @property {string} goal - User's stated or synthesized goal
 * @property {number|null} availableMinutes - Stated or inferred time constraint in minutes
 * @property {string} rationale - Calm, context-derived explanation of why these steps were chosen
 * @property {PlanStep[]} steps - Executable actions
 * @property {string[]} recommendations - Non-executable informational guidance
 * @property {string} status - PLAN_STATUS value
 * @property {number} createdAt - Creation timestamp
 */

/**
 * Creates a new structured plan object.
 *
 * @param {Object} args
 * @param {string} [args.id]
 * @param {string} args.goal
 * @param {number|null} [args.availableMinutes=null]
 * @param {string} args.rationale
 * @param {PlanStep[]} [args.steps=[]]
 * @param {string[]} [args.recommendations=[]]
 * @returns {DexPlan}
 */
export function createPlan({
  id = crypto.randomUUID(),
  goal,
  availableMinutes = null,
  rationale,
  steps = [],
  recommendations = [],
}) {
  return {
    id,
    goal: typeof goal === 'string' ? goal.trim() : 'Daily Focus Plan',
    availableMinutes: typeof availableMinutes === 'number' && availableMinutes > 0 ? Math.round(availableMinutes) : null,
    rationale: typeof rationale === 'string' ? rationale.trim() : '',
    steps: Array.isArray(steps) ? steps : [],
    recommendations: Array.isArray(recommendations) ? recommendations.filter((r) => typeof r === 'string' && r.trim().length > 0) : [],
    status: PLAN_STATUS.PROPOSED,
    createdAt: Date.now(),
  };
}
