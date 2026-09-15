/**
 * Zyrbit / DexOS — Action Executor
 * Controlled execution engine for validated Dex actions.
 * Enforces risk classification, confirmation gates, authenticated context, and service dispatch.
 * Zero direct database access.
 */

import { getAction } from './actionRegistry.js';
import { validateAction } from './actionValidator.js';

/**
 * Executes a Dex action through the validated action pipeline.
 * @param {Object} args
 * @param {string} args.userId - Authenticated user UUID from current session
 * @param {string} args.action - Action identifier (e.g. 'add_expense', 'log_water')
 * @param {Object} args.params - Proposed action parameters
 * @param {boolean} [args.confirmed=false] - Explicit user confirmation flag (required for medium-risk actions)
 * @returns {Promise<{success: boolean, action?: string, data?: Object, requiresConfirmation?: boolean, message?: string, errorType?: 'validation'|'execution', error?: string, normalizedParams?: Object}>}
 */
export async function executeAction({ userId, action, params, confirmed = false }) {
  // 1. Session Context Guard
  if (!userId || typeof userId !== 'string' || !userId.trim()) {
    return {
      success: false,
      errorType: 'validation',
      error: 'Authenticated user ID is required.',
    };
  }

  // 2. Validation & Normalization Boundary
  const validation = validateAction({ action, params, userId });
  if (!validation.valid) {
    return {
      success: false,
      errorType: 'validation',
      error: validation.error,
    };
  }

  // 3. Registry Lookup
  const entry = getAction(validation.action);
  if (!entry) {
    return {
      success: false,
      errorType: 'validation',
      error: `Action "${action}" is not registered.`,
    };
  }

  // 4. Confirmation Gate for Medium/High Risk Actions
  if (entry.requiresConfirmation && confirmed !== true) {
    const confirmationMessage = entry.formatConfirmation
      ? entry.formatConfirmation(validation.normalizedParams)
      : `Are you sure you want to execute ${entry.action}?`;

    return {
      success: false,
      requiresConfirmation: true,
      action: entry.action,
      message: confirmationMessage,
      normalizedParams: validation.normalizedParams,
    };
  }

  // 5. Domain Service Dispatch
  try {
    const serviceResult = await entry.execute({
      userId: userId.trim(),
      params: validation.normalizedParams,
    });

    if (!serviceResult || !serviceResult.success) {
      return {
        success: false,
        errorType: 'execution',
        action: entry.action,
        error: (serviceResult && serviceResult.error) ? serviceResult.error : `Failed to execute ${entry.action}.`,
      };
    }

    return {
      success: true,
      action: entry.action,
      data: serviceResult.data !== undefined ? serviceResult.data : null,
    };
  } catch (err) {
    return {
      success: false,
      errorType: 'execution',
      action: entry.action,
      error: err.message || `An unexpected error occurred executing ${entry.action}.`,
    };
  }
}
