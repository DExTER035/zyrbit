/**
 * DexOS — Dex Orchestrator
 * The single entry point for all Dex interactions.
 * Coordinates: Context → Fast / AI Intent → Resolvers → Validation → Execution → Result.
 *
 * Architecture:
 *   USER INPUT
 *       ↓
 *   buildDexContext()       [dexContextProvider]
 *       ↓
 *   parseIntent()           [dexIntentParser → deterministic resolvers or Gemini AI]
 *       ↓
 *   executeAction()         [actionExecutor → actionValidator → actionRegistry]
 *       ↓
 *   DOMAIN SERVICE          [growthService / healthService / foodService / etc.]
 *       ↓
 *   SUPABASE
 *       ↓
 *   DexResult (returned to UI)
 *
 * Rules:
 * - This file is the ONLY public interface for Dex. UI calls processUserInput().
 * - AI NEVER directly accesses Supabase.
 * - Conversational queries terminate with DEX_RESULT_TYPE.CONVERSATIONAL — zero database mutations.
 * - userId is ALWAYS from the authenticated session — never from AI output.
 * - Confirmation handling is surfaced to the UI; this module does not block.
 */

import { buildDexContext } from './dexContextProvider.js';
import { parseIntent } from './dexIntentParser.js';
import { executeAction } from '../actions/actionExecutor.js';
import { executePlan } from './planning/index.js';

// ─── Result Type Constants ────────────────────────────────────────────────────

export const DEX_RESULT_TYPE = {
  SUCCESS: 'success',           // Action executed successfully
  CONFIRMATION_REQUIRED: 'confirmation_required', // Medium-risk action needs user approval
  CLARIFICATION_NEEDED: 'clarification_needed',  // AI/Resolver needs more info from user
  CONVERSATIONAL: 'conversational', // Read-only query / guidance answered without mutation
  PLAN_PROPOSED: 'plan_proposed', // Context-derived plan proposed; requires user approval
  PLAN_EXECUTED: 'plan_executed', // Approved plan executed through Action Layer
  UNSUPPORTED: 'unsupported',   // No matching action
  ERROR: 'error',               // Technical or validation failure
};

// ─── Main Orchestrator ────────────────────────────────────────────────────────

/**
 * Processes a user's natural language input through the full Dex pipeline.
 *
 * @param {Object} args
 * @param {string} args.userId - Authenticated user UUID from session. NEVER from AI.
 * @param {string} args.userMessage - Raw text from the user
 * @param {boolean} [args.confirmed=false] - Set to true when user confirms a pending action or plan
 * @param {string|null} [args.pendingAction=null] - Action name from a prior confirmation/clarification prompt
 * @param {Object|null} [args.pendingParams=null] - Params from a prior confirmation/clarification prompt
 * @param {Object|null} [args.pendingPlan=null] - Approved plan from a prior PLAN_PROPOSED result
 *
 * @returns {Promise<{
 *   type: string,
 *   displayMessage: string,
 *   action?: string,
 *   params?: Object,
 *   data?: Object,
 *   plan?: Object,
 *   status?: string,
 *   executedSteps?: Array<Object>,
 *   abortedSteps?: Array<Object>,
 *   affectedDomains?: string[],
 *   question?: string,
 *   context?: string,
 *   intent?: Object,
 * }>}
 */
export async function processUserInput({
  userId,
  userMessage,
  confirmed = false,
  pendingAction = null,
  pendingParams = null,
  pendingPlan = null,
}) {
  // ── Guard: Authenticated User ───────────────────────────────────────────────
  if (!userId || typeof userId !== 'string' || !userId.trim()) {
    return {
      type: DEX_RESULT_TYPE.ERROR,
      displayMessage: 'Authentication required.',
    };
  }

  // ── Fast path: Confirmed pending plan execution ─────────────────────────────
  if (confirmed && pendingPlan) {
    return _executePendingPlan({ userId, plan: pendingPlan });
  }

  // ── Fast path: Confirmed pending action (bypass context + AI) ───────────────
  if (confirmed && pendingAction && pendingParams) {
    return _executePendingAction({ userId, pendingAction, pendingParams });
  }

  // ── Conversational Approval Guard: "Do it", "Start it", "Yes", etc. ────────
  if (typeof userMessage === 'string' && /^(?:do it|start it|start plan|confirm|yes|go ahead)\b/i.test(userMessage.trim())) {
    if (pendingPlan) {
      return _executePendingPlan({ userId, plan: pendingPlan });
    }
    if (pendingAction && pendingParams) {
      return _executePendingAction({ userId, pendingAction, pendingParams });
    }
    // No active pending item: return conversational guidance without mutation
    return {
      type: DEX_RESULT_TYPE.CONVERSATIONAL,
      displayMessage: "There is no active plan or action waiting for approval. Tell me what you'd like to do or ask me to plan your time.",
    };
  }

  // ── Step 1: Build today's context ───────────────────────────────────────────
  const contextResult = await buildDexContext(userId);
  const context = contextResult.success ? contextResult.context : null;
  // Context failure is non-fatal — Dex works with reduced context

  // ── Step 2: Handle follow-up clarification continuity ───────────────────────
  let effectiveMessage = userMessage;
  if (pendingAction && !confirmed && typeof userMessage === 'string') {
    // If pendingAction was set during a clarification (e.g. skip_habit), synthesize
    const actionLabel = pendingAction.replace(/_/g, ' ');
    effectiveMessage = `${actionLabel} ${userMessage.trim()}`;
  }

  // ── Step 3: Parse intent via deterministic resolvers or AI ──────────────────
  const parseResult = await parseIntent({ userMessage: effectiveMessage, context });

  if (!parseResult.success) {
    return {
      type: DEX_RESULT_TYPE.ERROR,
      displayMessage: parseResult.error || 'Could not understand that. Try rephrasing.',
    };
  }

  const intent = parseResult.intent;

  // ── Step 4: Handle by intent type ──────────────────────────────────────────

  // Plan proposal — context-driven plan generated with ZERO mutations until approved
  if (intent.intent === 'plan') {
    return {
      type: DEX_RESULT_TYPE.PLAN_PROPOSED,
      displayMessage: intent.displayMessage || 'Here is a suggested plan based on your context:',
      plan: intent.plan,
      intent,
    };
  }

  // Clarification needed
  if (intent.intent === 'clarify') {
    return {
      type: DEX_RESULT_TYPE.CLARIFICATION_NEEDED,
      displayMessage: intent.question,
      question: intent.question,
      context: intent.context || null,
      action: intent.action || pendingAction || null,
      params: intent.params || pendingParams || null,
      intent,
    };
  }

  // Conversational response — read/guidance request terminated without ActionExecutor
  if (intent.intent === 'conversational') {
    return {
      type: DEX_RESULT_TYPE.CONVERSATIONAL,
      displayMessage: intent.displayMessage || 'Here is your current status.',
      intent,
    };
  }

  // Unsupported request
  if (intent.intent === 'unsupported') {
    return {
      type: DEX_RESULT_TYPE.UNSUPPORTED,
      displayMessage:
        intent.displayMessage ||
        "Dex can't help with that yet. Try logging something or adding a task.",
      intent,
    };
  }

  // Action intent — execute through the Action Layer
  if (intent.intent === 'action') {
    return _executeIntent({ userId, intent, confirmed });
  }

  // Fallback
  return {
    type: DEX_RESULT_TYPE.ERROR,
    displayMessage: 'Unexpected response from Dex. Please try again.',
  };
}


// ─── Private Helpers ─────────────────────────────────────────────────────────

/**
 * Executes a confirmed pending plan through the controlled planExecutor.
 * @param {Object} args
 * @param {string} args.userId
 * @param {Object} args.plan
 * @returns {Promise<Object>}
 */
async function _executePendingPlan({ userId, plan }) {
  const result = await executePlan({ userId, plan });
  return {
    type: DEX_RESULT_TYPE.PLAN_EXECUTED,
    displayMessage: result.displayMessage,
    plan,
    status: result.status,
    executedSteps: result.executedSteps,
    abortedSteps: result.abortedSteps,
    affectedDomains: result.affectedDomains,
    requiresConfirmation: result.requiresConfirmation,
    confirmationStep: result.confirmationStep,
  };
}

/**
 * Executes a confirmed pending action (bypasses context + AI re-parse).
 * @param {Object} args
 * @param {string} args.userId
 * @param {string} args.pendingAction
 * @param {Object} args.pendingParams
 * @returns {Promise<Object>}
 */
async function _executePendingAction({ userId, pendingAction, pendingParams }) {
  const result = await executeAction({
    userId,
    action: pendingAction,
    params: pendingParams,
    confirmed: true,
  });

  if (result.success) {
    return {
      type: DEX_RESULT_TYPE.SUCCESS,
      displayMessage: `Done. ${_actionSuccessMessage(pendingAction)}`,
      action: result.action,
      data: result.data,
    };
  }

  return {
    type: DEX_RESULT_TYPE.ERROR,
    displayMessage: result.error || 'Failed to execute action.',
    action: pendingAction,
  };
}

/**
 * Executes an AI/resolver-parsed action intent through the Action Layer.
 * @param {Object} args
 * @param {string} args.userId
 * @param {Object} args.intent
 * @param {boolean} args.confirmed
 * @returns {Promise<Object>}
 */
async function _executeIntent({ userId, intent, confirmed }) {
  const result = await executeAction({
    userId,
    action: intent.action,
    params: intent.params,
    confirmed,
  });

  // Action requires user confirmation (e.g. financial mutations)
  if (result.requiresConfirmation) {
    return {
      type: DEX_RESULT_TYPE.CONFIRMATION_REQUIRED,
      displayMessage: result.message,
      action: result.action,
      params: result.normalizedParams,
      intent,
    };
  }

  // Execution error
  if (!result.success) {
    return {
      type: DEX_RESULT_TYPE.ERROR,
      displayMessage: result.error || 'Action failed. Please try again.',
      action: intent.action,
      intent,
    };
  }

  // Success
  return {
    type: DEX_RESULT_TYPE.SUCCESS,
    displayMessage: intent.displayMessage || _actionSuccessMessage(intent.action),
    action: result.action,
    data: result.data,
    intent,
  };
}

/**
 * Generates a fallback success message for an action.
 * Used when AI did not provide a displayMessage.
 * @param {string} action
 * @returns {string}
 */
function _actionSuccessMessage(action) {
  const messages = {
    create_task: 'Task added.',
    complete_task: 'Task marked complete.',
    start_focus: 'Focus session logged.',
    log_water: 'Water logged.',
    log_sleep: 'Sleep logged.',
    log_activity: 'Activity logged.',
    log_meal: 'Meal logged.',
    add_expense: 'Expense recorded.',
    add_income: 'Income recorded.',
    add_bill: 'Bill added.',
    complete_habit: 'Habit completed.',
    skip_habit: 'Habit skipped.',
  };
  return messages[action] || 'Done.';
}
