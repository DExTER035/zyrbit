/**
 * Zyrbit / DexOS — Action Validator
 * Pre-execution validation and parameter normalization boundary.
 * Strictly verifies types, bounds, enums, and authenticated user context.
 * Rejects malformed input, NaN, Infinity, negative values, and caller-injected user IDs.
 */

import { ACTION_SCHEMAS } from './actionSchemas.js';
import { hasAction } from './actionRegistry.js';

/**
 * Validates an incoming action intent before execution.
 * @param {Object} args
 * @param {string} args.action - Action identifier (e.g. 'add_expense')
 * @param {Object} args.params - Action parameters dictionary
 * @param {string} args.userId - Authenticated user UUID from session
 * @returns {{valid: boolean, action?: string, normalizedParams?: Object, errorType?: string, error?: string}}
 */
export function validateAction({ action, params, userId }) {
  // 1. Authenticated User Context Check
  if (!userId || typeof userId !== 'string' || !userId.trim()) {
    return {
      valid: false,
      errorType: 'validation',
      error: 'Authenticated user ID is required.',
    };
  }

  // 2. Action Name Verification
  if (!action || typeof action !== 'string' || !action.trim()) {
    return {
      valid: false,
      errorType: 'validation',
      error: 'Action name is required.',
    };
  }

  const normalizedActionName = action.trim().toLowerCase();
  if (!hasAction(normalizedActionName) || !ACTION_SCHEMAS[normalizedActionName]) {
    return {
      valid: false,
      errorType: 'validation',
      error: `Unknown or unsupported action: "${action}".`,
    };
  }

  // 3. Parameters Structure & Security Boundary
  if (params === null || params === undefined || typeof params !== 'object' || Array.isArray(params)) {
    return {
      valid: false,
      errorType: 'validation',
      error: 'Action parameters must be an object.',
    };
  }

  // Parameter Spoofing Protection: AI/caller must NEVER provide userId in params
  if (params.userId !== undefined || params.user_id !== undefined) {
    return {
      valid: false,
      errorType: 'validation',
      error: 'Action parameters must not contain userId.',
    };
  }

  // 4. Schema-Specific Validation & Normalization
  const schema = ACTION_SCHEMAS[normalizedActionName];
  const validationResult = schema.validate(params);

  if (!validationResult.valid) {
    return {
      valid: false,
      errorType: 'validation',
      error: validationResult.error,
    };
  }

  return {
    valid: true,
    action: normalizedActionName,
    normalizedParams: validationResult.normalized,
  };
}
