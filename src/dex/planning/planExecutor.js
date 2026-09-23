/**
 * DexOS — Plan Executor
 * Controlled execution engine for user-approved plans.
 * Enforces sequential execution, client-session double-click protection,
 * failure halting, financial confirmation preservation, and honest reflection.
 *
 * Rules:
 * - Every step MUST route through executeAction() (Action Registry -> Action Validator -> Action Executor -> Service).
 * - AI never directly calls services or Supabase.
 * - Approving a plan NEVER bypasses financial confirmation requirements.
 * - If step K fails, subsequent steps are aborted — no synthetic completions.
 * - Double-click protection prevents duplicate concurrent executions within the current client session.
 */

import { executeAction } from '../../actions/actionExecutor.js';
import { PLAN_STATUS } from './planSchema.js';

// In-memory execution set: prevents duplicate concurrent execution within the current client session
const activeExecutionPlanIds = new Set();

/**
 * Executes a verified, user-approved plan through the authoritative Action Layer.
 *
 * @param {Object} args
 * @param {string} args.userId - Authenticated user UUID from current session
 * @param {Object} args.plan - Approved DexPlan object
 * @returns {Promise<{
 *   success: boolean,
 *   status: string,
 *   planId: string,
 *   executedSteps: Array<{stepId: string, action: string, label: string, success: boolean, data?: any, error?: string}>,
 *   abortedSteps: Array<{stepId: string, action: string, label: string}>,
 *   displayMessage: string,
 *   affectedDomains: string[],
 *   requiresConfirmation?: boolean,
 *   confirmationStep?: Object,
 *   error?: string
 * }>}
 */
export async function executePlan({ userId, plan }) {
  // 1. Session Guard
  if (!userId || typeof userId !== 'string' || !userId.trim()) {
    return {
      success: false,
      status: PLAN_STATUS.FAILED,
      planId: plan?.id || 'unknown',
      executedSteps: [],
      abortedSteps: [],
      displayMessage: 'Authentication required to execute plan.',
      affectedDomains: [],
      error: 'Missing authenticated user ID.',
    };
  }

  // 2. Plan Integrity Guard
  if (!plan || !plan.id || !Array.isArray(plan.steps)) {
    return {
      success: false,
      status: PLAN_STATUS.FAILED,
      planId: plan?.id || 'unknown',
      executedSteps: [],
      abortedSteps: [],
      displayMessage: 'Invalid plan structure provided.',
      affectedDomains: [],
      error: 'Invalid plan structure.',
    };
  }

  // 3. Client Session Double-Click Guard
  // Prevents duplicate concurrent execution within current client/session
  if (activeExecutionPlanIds.has(plan.id)) {
    return {
      success: false,
      status: PLAN_STATUS.FAILED,
      planId: plan.id,
      executedSteps: [],
      abortedSteps: [],
      displayMessage: 'Plan execution is already in progress.',
      affectedDomains: [],
      error: 'Concurrent execution rejected by client double-click guard.',
    };
  }

  activeExecutionPlanIds.add(plan.id);

  const executedSteps = [];
  const abortedSteps = [];
  const affectedDomains = new Set();
  let stepFailureOccurred = false;

  try {
    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i];

      // If a previous step failed, abort remaining steps immediately
      if (stepFailureOccurred) {
        abortedSteps.push({
          stepId: step.id,
          action: step.action,
          label: step.label,
        });
        continue;
      }

      // Financial Guard: If step is financial, ensure it does not bypass confirmation
      const isFinancial = ['add_expense', 'add_income', 'add_bill'].includes(step.action);
      const confirmed = step.confirmed === true;

      if (isFinancial && !confirmed) {
        // Halt plan execution: surface confirmation requirement
        activeExecutionPlanIds.delete(plan.id);
        return {
          success: false,
          status: PLAN_STATUS.PROPOSED,
          planId: plan.id,
          executedSteps,
          abortedSteps: plan.steps.slice(i + 1).map((s) => ({ stepId: s.id, action: s.action, label: s.label })),
          displayMessage: `Financial action "${step.label || step.action}" requires independent confirmation before executing.`,
          affectedDomains: Array.from(affectedDomains),
          requiresConfirmation: true,
          confirmationStep: step,
        };
      }

      // Execute through Action Layer
      const result = await executeAction({
        userId: userId.trim(),
        action: step.action,
        params: step.params,
        confirmed,
      });

      if (result.success) {
        executedSteps.push({
          stepId: step.id,
          action: step.action,
          label: step.label,
          success: true,
          data: result.data,
        });

        // Record domain
        const domain = _getDomainForAction(step.action);
        if (domain) affectedDomains.add(domain);
      } else {
        // Step failed: Halt execution of subsequent steps
        stepFailureOccurred = true;
        executedSteps.push({
          stepId: step.id,
          action: step.action,
          label: step.label,
          success: false,
          error: result.error || 'Action failed during execution.',
        });
      }
    }

    // 4. Determine Final Plan Status & Factual Reflection
    let status = PLAN_STATUS.COMPLETED;
    let displayMessage = '';

    if (stepFailureOccurred) {
      const successfulCount = executedSteps.filter((s) => s.success).length;
      if (successfulCount > 0) {
        status = PLAN_STATUS.PARTIALLY_COMPLETED;
        displayMessage = `Plan partially completed (${successfulCount}/${plan.steps.length} steps).\n` +
          executedSteps.map((s) => s.success ? `✓ ${s.label}` : `✗ ${s.label}: ${s.error}`).join('\n');
      } else {
        status = PLAN_STATUS.FAILED;
        const failedStep = executedSteps[0];
        displayMessage = `Plan failed at step 1 (${failedStep.label}): ${failedStep.error}`;
      }
    } else {
      status = PLAN_STATUS.COMPLETED;
      const stepSummary = executedSteps.map((s) => `✓ ${s.label}`).join('\n');
      displayMessage = `Plan complete.\n${stepSummary}`;
    }

    return {
      success: !stepFailureOccurred,
      status,
      planId: plan.id,
      executedSteps,
      abortedSteps,
      displayMessage,
      affectedDomains: Array.from(affectedDomains),
    };
  } finally {
    // Release client session lock
    activeExecutionPlanIds.delete(plan.id);
  }
}

function _getDomainForAction(action) {
  if (['create_task', 'complete_task', 'start_focus'].includes(action)) return 'growth';
  if (['log_water', 'log_sleep', 'log_activity', 'log_weight', 'log_meal'].includes(action)) return 'health';
  if (['add_expense', 'add_income', 'add_bill'].includes(action)) return 'wealth';
  if (['complete_habit', 'skip_habit'].includes(action)) return 'zenith';
  return null;
}
