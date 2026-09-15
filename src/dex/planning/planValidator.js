/**
 * DexOS — Plan Validator
 * Deterministically enforces schema, temporal bounds, action registry membership,
 * parameter validity, and security constraints on proposed plans before presentation or execution.
 *
 * Rules:
 * - Pure JavaScript logic. Zero direct database queries.
 * - Total executable duration must never exceed availableMinutes.
 * - Every step must map to a registered action in ACTION_REGISTRY.
 * - Parameters must pass ActionValidator rules (including spoofed userId rejection).
 * - Financial actions are marked as requiring independent confirmation.
 */

import { getAction } from '../../actions/actionRegistry.js';
import { validateAction } from '../../actions/actionValidator.js';
import { PLAN_STATUS } from './planSchema.js';

/**
 * Validates a Dex plan for structural integrity, time constraints, and action safety.
 *
 * @param {Object} plan - Plan object to validate
 * @param {Object} [options]
 * @param {string} [options.userId] - Authenticated user UUID
 * @param {Object|null} [options.context] - Dex context snapshot
 * @returns {{ valid: boolean, errors: string[], normalizedPlan?: Object }}
 */
export function validatePlan(plan, { userId, context } = {}) {
  const errors = [];

  // 1. Structural Checks
  if (!plan || typeof plan !== 'object') {
    return { valid: false, errors: ['Plan must be a non-null object.'] };
  }

  if (!plan.id || typeof plan.id !== 'string') {
    errors.push('Plan is missing a valid id.');
  }

  if (!plan.goal || typeof plan.goal !== 'string' || !plan.goal.trim()) {
    errors.push('Plan must have a non-empty goal.');
  }

  if (!Array.isArray(plan.steps)) {
    errors.push('Plan steps must be an array.');
    return { valid: false, errors };
  }

  // A plan must have at least 1 executable step or 1 recommendation
  const hasSteps = plan.steps.length > 0;
  const hasRecommendations = Array.isArray(plan.recommendations) && plan.recommendations.length > 0;
  if (!hasSteps && !hasRecommendations) {
    errors.push('Plan must contain at least one step or recommendation.');
  }

  // 2. Temporal Bounds Check
  let totalDurationMinutes = 0;
  const availableMinutes = plan.availableMinutes;

  if (availableMinutes !== null && availableMinutes !== undefined) {
    if (typeof availableMinutes !== 'number' || availableMinutes <= 0) {
      errors.push('availableMinutes must be a positive integer when specified.');
    }
  }

  const normalizedSteps = [];

  // 3. Step-by-Step Action Layer Validation
  for (let i = 0; i < plan.steps.length; i++) {
    const step = plan.steps[i];
    const stepIdx = i + 1;

    if (!step || typeof step !== 'object') {
      errors.push(`Step ${stepIdx} must be a valid object.`);
      continue;
    }

    if (!step.action || typeof step.action !== 'string') {
      errors.push(`Step ${stepIdx} is missing an action name.`);
      continue;
    }

    // A. Action Registry Check
    const actionDef = getAction(step.action);
    if (!actionDef) {
      errors.push(`Step ${stepIdx} references unsupported action "${step.action}". Only registered actions are permitted.`);
      continue;
    }

    // B. Parameter Spoofing & ActionValidator Check
    // Always validate parameters using existing authoritative ActionValidator
    const validation = validateAction({
      action: step.action,
      params: step.params || {},
      userId: userId || 'validation-placeholder',
    });

    if (!validation.valid) {
      errors.push(`Step ${stepIdx} (${step.action}) parameter error: ${validation.error}`);
      continue;
    }

    // C. Duration Accumulation
    const duration = typeof step.durationMinutes === 'number' && step.durationMinutes > 0
      ? Math.round(step.durationMinutes)
      : (step.action === 'start_focus' && typeof step.params?.durationMinutes === 'number'
          ? Math.round(step.params.durationMinutes)
          : 0);

    totalDurationMinutes += duration;

    // D. Financial Risk Flag
    const requiresConfirmation = Boolean(actionDef.requiresConfirmation);

    // E. Context Consistency Check (if context is available)
    if (context) {
      // If task completion is proposed, verify task exists in pendingTasks
      if (step.action === 'complete_task' && step.params?.taskId) {
        const pending = context.growth?.pendingTasks || [];
        const exists = pending.some((t) => t.id === step.params.taskId);
        if (!exists) {
          errors.push(`Step ${stepIdx} references task ID "${step.params.taskId}" which is not in today's pending tasks.`);
        }
      }

      // If habit completion or skip is proposed, verify habit exists
      if ((step.action === 'complete_habit' || step.action === 'skip_habit') && step.params?.habitId) {
        const habits = context.habits?.habits || [];
        const exists = habits.some((h) => h.id === step.params.habitId);
        if (!exists) {
          errors.push(`Step ${stepIdx} references habit ID "${step.params.habitId}" which is not found in today's habits.`);
        }
      }
    }

    // Normalized step
    normalizedSteps.push({
      id: step.id || crypto.randomUUID(),
      action: step.action,
      params: validation.normalizedParams,
      label: step.label || actionDef.description || step.action,
      durationMinutes: duration > 0 ? duration : undefined,
      order: stepIdx,
      requiresConfirmation,
    });
  }

  // 4. Time Bound Violation: Total duration cannot exceed available time
  if (typeof availableMinutes === 'number' && availableMinutes > 0) {
    if (totalDurationMinutes > availableMinutes) {
      errors.push(
        `Plan total duration (${totalDurationMinutes} min) exceeds available time (${availableMinutes} min).`
      );
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: [],
    normalizedPlan: {
      ...plan,
      availableMinutes: typeof availableMinutes === 'number' && availableMinutes > 0 ? Math.round(availableMinutes) : null,
      steps: normalizedSteps,
      status: plan.status || PLAN_STATUS.PROPOSED,
    },
  };
}
