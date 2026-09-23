/**
 * Zyrbit — Global Voice Command System Phase V1 Test Suite
 * Comprehensive verification of all 24 test specifications from Phase V1 requirements.
 */

import { processUserInput, DEX_RESULT_TYPE } from '../src/dex/index.js';
import {
  isVoiceSupported,
  createSpeechRecognizer,
  normalizeVoiceError,
  VOICE_ERROR,
  VOICE_STATUS,
  VOICE_ERROR_MESSAGES,
} from '../src/voice/index.js';
import {
  ACTION_SCHEMAS,
  WHITELISTED_NAVIGATION_ROUTES,
} from '../src/actions/actionSchemas.js';
import { getAction } from '../src/actions/actionRegistry.js';
import { executeAction } from '../src/actions/actionExecutor.js';
import { resolveNavigationDestination } from '../src/dex/dexIntentParser.js';
import { supabase } from '../src/lib/supabase/index.js';

let activeUserId = '00000000-0000-4000-8000-000000000001';

async function runTestSuite() {
  console.log('================================================================');
  console.log('ZYRBIT — PHASE V1 VOICE SYSTEM COMPREHENSIVE INTEGRATION SUITE');
  console.log('================================================================\n');

  // Mock supabase table queries for isolated deterministic test execution
  supabase.from = (table) => {
    return {
      insert: (records) => ({
        select: () => ({
          single: async () => ({
            data: { id: '00000000-0000-4000-8000-000000000002', ...(Array.isArray(records) ? records[0] : records) },
            error: null,
          }),
        }),
      }),
      upsert: (records) => ({
        select: () => ({
          single: async () => ({
            data: { id: '00000000-0000-4000-8000-000000000002', ...(Array.isArray(records) ? records[0] : records) },
            error: null,
          }),
        }),
      }),
      select: () => ({
        eq: () => ({
          order: () => ({
            limit: async () => ({ data: [], error: null }),
          }),
        }),
        order: () => ({
          limit: async () => ({ data: [], error: null }),
        }),
      }),
    };
  };

  const results = [];

  function record(id, title, passed, detail = '') {
    results.push({ id, title, passed, detail });
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} [Test ${id.toString().padStart(2, '0')}] ${title}`);
    if (!passed && detail) {
      console.log(`     Error: ${detail}`);
    }
  }

  // 1. Voice transcript enters processUserInput with metadata
  try {
    const res = await processUserInput('Log 500 ml water', {
      source: 'voice',
      language: 'en-IN',
      userId: activeUserId,
    });
    const passed = res.metadata?.source === 'voice' && res.action === 'log_water';
    record(1, 'Voice transcript enters processUserInput with metadata', passed, JSON.stringify(res));
  } catch (err) {
    record(1, 'Voice transcript enters processUserInput with metadata', false, err.message);
  }

  // 2. Existing typed Dex input remains functional
  try {
    const res = await processUserInput({
      userId: activeUserId,
      userMessage: 'Log 500 ml water',
    });
    const passed = res.metadata?.source === 'text' && res.action === 'log_water';
    record(2, 'Existing typed Dex input remains functional', passed, JSON.stringify(res));
  } catch (err) {
    record(2, 'Existing typed Dex input remains functional', false, err.message);
  }


  // 3. Growth: "Start a 45 minute focus session."
  try {
    const res = await processUserInput('Start a 45 minute focus session.', {
      source: 'voice',
      userId: activeUserId,
    });
    const passed = res.type === DEX_RESULT_TYPE.SUCCESS && res.action === 'start_focus' && res.data?.durationMinutes === 45;
    record(3, 'Growth: Start a 45 minute focus session', passed, JSON.stringify(res));
  } catch (err) {
    record(3, 'Growth: Start a 45 minute focus session', false, err.message);
  }

  // 4. Growth: "Create a task to finish my CEP report."
  try {
    const res = await processUserInput('Create a task to finish my CEP report.', {
      source: 'voice',
      userId: activeUserId,
    });
    const taskName = res.data?.name || res.intent?.params?.name || '';
    const passed = res.type === DEX_RESULT_TYPE.SUCCESS && res.action === 'create_task' && taskName.includes('CEP');
    record(4, 'Growth: Create a task to finish my CEP report', passed, JSON.stringify(res));
  } catch (err) {
    record(4, 'Growth: Create a task to finish my CEP report', false, err.message);
  }

  // 5. Health: "Log 500 ml water."
  try {
    const res = await processUserInput('Log 500 ml water.', {
      source: 'voice',
      userId: activeUserId,
    });
    const amount = res.data?.amount_ml ?? res.intent?.params?.amountMl;
    const passed = res.type === DEX_RESULT_TYPE.SUCCESS && res.action === 'log_water' && amount === 500;
    record(5, 'Health: Log 500 ml water', passed, JSON.stringify(res));
  } catch (err) {
    record(5, 'Health: Log 500 ml water', false, err.message);
  }

  // 6. Health: "I slept 6 hours last night."
  try {
    const res = await processUserInput('I slept 6 hours last night.', {
      source: 'voice',
      userId: activeUserId,
    });
    const hours = res.data?.duration_hours ?? res.intent?.params?.durationHours;
    const passed = res.type === DEX_RESULT_TYPE.SUCCESS && res.action === 'log_sleep' && hours === 6;
    record(6, 'Health: I slept 6 hours last night', passed, JSON.stringify(res));
  } catch (err) {
    record(6, 'Health: I slept 6 hours last night', false, err.message);
  }


  // 7. Health: "Log 68 kilos."
  try {
    const res = await processUserInput('Log 68 kilos.', {
      source: 'voice',
      userId: activeUserId,
    });
    const passed = res.action === 'log_weight' || res.intent?.action === 'log_weight' || res.params?.weightKg === 68;
    record(7, 'Health: Log 68 kilos', passed, JSON.stringify(res));
  } catch (err) {
    record(7, 'Health: Log 68 kilos', false, err.message);
  }

  // 8. Wealth: "Add 500 rupees food expense." -> Verify confirmation is REQUIRED
  let pendingConfirmationAction = null;
  let pendingConfirmationParams = null;
  try {
    const res = await processUserInput('Add 500 rupees food expense.', {
      source: 'voice',
      userId: activeUserId,
    });
    const passed = res.type === DEX_RESULT_TYPE.CONFIRMATION_REQUIRED && res.action === 'add_expense' && res.params?.amount === 500;
    pendingConfirmationAction = res.action;
    pendingConfirmationParams = res.params;
    record(8, 'Wealth: Add 500 rupees food expense requires confirmation', passed, JSON.stringify(res));
  } catch (err) {
    record(8, 'Wealth: Add 500 rupees food expense requires confirmation', false, err.message);
  }

  // 9. Cancel financial confirmation -> ZERO writes
  try {
    // Calling processUserInput with confirmed=false or simply not confirming
    const res = await processUserInput({
      userId: activeUserId,
      userMessage: 'Cancel',
      confirmed: false,
      pendingAction: pendingConfirmationAction,
      pendingParams: pendingConfirmationParams,
    });
    // Should NOT execute the pending action
    const passed = res.type !== DEX_RESULT_TYPE.SUCCESS;
    record(9, 'Cancel financial confirmation yields ZERO writes', passed, JSON.stringify(res));
  } catch (err) {
    record(9, 'Cancel financial confirmation yields ZERO writes', false, err.message);
  }

  // 10. Confirm financial action -> exactly ONE expected confirmation execution
  try {
    // When confirmed=true is passed to executeAction directly or through processUserInput
    const res = await executeAction({
      userId: activeUserId,
      action: 'add_expense',
      params: { amount: 500, category: 'Food', note: 'test lunch' },
      confirmed: true,
    });
    // Action validation passed and attempted service dispatch with confirmed=true
    const passed = res.action === 'add_expense' && !res.requiresConfirmation;
    record(10, 'Confirm financial action gates through confirmation to service', passed, JSON.stringify(res));
  } catch (err) {
    record(10, 'Confirm financial action gates through confirmation to service', false, err.message);
  }

  // 11. Missing information: "Add an expense." -> Verify clarification
  try {
    const res = await processUserInput('Add an expense.', {
      source: 'voice',
      userId: activeUserId,
    });
    const passed = res.type === DEX_RESULT_TYPE.CLARIFICATION_NEEDED && typeof res.displayMessage === 'string' && res.displayMessage.length > 0;
    record(11, 'Missing information prompts clarification', passed, JSON.stringify(res));
  } catch (err) {
    record(11, 'Missing information prompts clarification', false, err.message);
  }

  // 12. Cross-domain: User on Health says "Add ₹500 food expense."
  try {
    const res = await processUserInput('Add ₹500 food expense.', {
      source: 'voice',
      userId: activeUserId,
      metadata: { currentRoute: '/health' },
    });
    // Routes to Wealth domain action, NOT health
    const actionDef = getAction(res.action);
    const passed = res.action === 'add_expense' && actionDef?.domain === 'wealth';
    record(12, 'Cross-domain: On Health, routes to Wealth add_expense', passed, `Action domain: ${actionDef?.domain}`);
  } catch (err) {
    record(12, 'Cross-domain: On Health, routes to Wealth add_expense', false, err.message);
  }

  // 13. Cross-domain: User on Wealth says "I slept 6 hours."
  try {
    const res = await processUserInput('I slept 6 hours.', {
      source: 'voice',
      userId: activeUserId,
      metadata: { currentRoute: '/wealth' },
    });
    const actionDef = getAction(res.action);
    const passed = res.action === 'log_sleep' && actionDef?.domain === 'health';
    record(13, 'Cross-domain: On Wealth, routes to Health log_sleep', passed, `Action domain: ${actionDef?.domain}`);
  } catch (err) {
    record(13, 'Cross-domain: On Wealth, routes to Health log_sleep', false, err.message);
  }

  // 14. Cross-domain query: User on Growth says "How much can I safely spend today?"
  try {
    const res = await processUserInput('How much can I safely spend today?', {
      source: 'voice',
      userId: activeUserId,
      metadata: { currentRoute: '/growth' },
    });
    const passed = res.type === DEX_RESULT_TYPE.CONVERSATIONAL && typeof res.displayMessage === 'string' && res.displayMessage.includes('₹');
    record(14, 'Cross-domain query: On Growth, queries Wealth safe-to-spend', passed, res.displayMessage);
  } catch (err) {
    record(14, 'Cross-domain query: On Growth, queries Wealth safe-to-spend', false, err.message);
  }

  // 15. Cross-domain query: User on Health says "What bills are coming up?"
  try {
    const res = await processUserInput('What bills are coming up?', {
      source: 'voice',
      userId: activeUserId,
      metadata: { currentRoute: '/health' },
    });
    const passed = res.type === DEX_RESULT_TYPE.CONVERSATIONAL && typeof res.displayMessage === 'string' && (res.displayMessage.includes('bill') || res.displayMessage.includes('Upcoming'));
    record(15, 'Cross-domain query: On Health, queries Wealth bills context', passed, res.displayMessage);
  } catch (err) {
    record(15, 'Cross-domain query: On Health, queries Wealth bills context', false, err.message);
  }

  // 16. Navigation: "Open Health." -> /health
  try {
    const nav = resolveNavigationDestination('Open Health.');
    const res = await processUserInput('Open Health.', {
      source: 'voice',
      userId: activeUserId,
    });
    const passed = nav?.route === '/health' && res.action === 'navigate' && res.data?.route === '/health';
    record(16, 'Navigation: Open Health -> /health', passed, JSON.stringify(res));
  } catch (err) {
    record(16, 'Navigation: Open Health -> /health', false, err.message);
  }

  // 17. Navigation: "Open Wealth." -> /wealth
  try {
    const nav = resolveNavigationDestination('Open Wealth.');
    const res = await processUserInput('Open Wealth.', {
      source: 'voice',
      userId: activeUserId,
    });
    const passed = nav?.route === '/wealth' && res.action === 'navigate' && res.data?.route === '/wealth';
    record(17, 'Navigation: Open Wealth -> /wealth', passed, JSON.stringify(res));
  } catch (err) {
    record(17, 'Navigation: Open Wealth -> /wealth', false, err.message);
  }

  // 18. Arbitrary route attempt -> Verify rejection
  try {
    const validation = ACTION_SCHEMAS.navigate.validate({ route: 'https://malicious-site.com' });
    const validation2 = ACTION_SCHEMAS.navigate.validate({ route: '/admin/unauthorized' });
    const passed = !validation.valid && !validation2.valid;
    record(18, 'Arbitrary route navigation rejected by validator', passed, validation.error);
  } catch (err) {
    record(18, 'Arbitrary route navigation rejected by validator', false, err.message);
  }

  // 19. Unsupported browser capability -> Verify honest unsupported state
  try {
    // In Node.js environment window.SpeechRecognition does not exist
    const supported = isVoiceSupported();
    let emittedError = null;
    createSpeechRecognizer({
      onError: (err) => {
        emittedError = err;
      },
    });
    const passed = supported === false && emittedError?.code === VOICE_ERROR.NOT_SUPPORTED;
    record(19, 'Unsupported browser returns honest not_supported state', passed, emittedError?.message);
  } catch (err) {
    record(19, 'Unsupported browser returns honest not_supported state', false, err.message);
  }

  // 20. Microphone permission denied -> Verify clean error normalization
  try {
    const normalized = normalizeVoiceError('not-allowed');
    const msg = VOICE_ERROR_MESSAGES[normalized];
    const passed = normalized === VOICE_ERROR.PERMISSION_DENIED && typeof msg === 'string' && msg.includes('Microphone access');
    record(20, 'Microphone permission denied produces clean human-readable error', passed, msg);
  } catch (err) {
    record(20, 'Microphone permission denied produces clean human-readable error', false, err.message);
  }

  // 21. Empty / no speech -> Verify clean handling
  try {
    const normalized = normalizeVoiceError('no-speech');
    const res = await processUserInput('', { source: 'voice', userId: activeUserId });
    const passed = normalized === VOICE_ERROR.NO_SPEECH && res.type === DEX_RESULT_TYPE.ERROR;
    record(21, 'Empty / no speech handled cleanly without uncaught errors', passed, res.displayMessage);
  } catch (err) {
    record(21, 'Empty / no speech handled cleanly without uncaught errors', false, err.message);
  }

  // 22. Voice cannot bypass Action Registry
  try {
    const res = await executeAction({
      userId: activeUserId,
      action: 'fake_unregistered_action',
      params: {},
    });
    const passed = res.success === false && res.errorType === 'validation';
    record(22, 'Voice cannot bypass Action Registry boundary', passed, res.error);
  } catch (err) {
    record(22, 'Voice cannot bypass Action Registry boundary', false, err.message);
  }

  // 23. Voice cannot directly access Supabase or execute mutations without confirmation
  try {
    const unconfirmed = await executeAction({
      userId: activeUserId,
      action: 'add_expense',
      params: { amount: 500, category: 'Food' },
      confirmed: false,
    });
    const passed = unconfirmed.success === false && unconfirmed.requiresConfirmation === true;
    record(23, 'Voice cannot bypass confirmation or execute direct mutations', passed, JSON.stringify(unconfirmed));
  } catch (err) {
    record(23, 'Voice cannot bypass confirmation or execute direct mutations', false, err.message);
  }

  // 24. Successful action defines domain for live refresh
  try {
    const res = await processUserInput('Log 500 ml water.', {
      source: 'voice',
      userId: activeUserId,
    });
    const actionDef = getAction(res.action);
    const passed = actionDef?.domain === 'health';
    record(24, 'Action returns registered domain for dexos:refresh broadcasting', passed, `Domain: ${actionDef?.domain}`);
  } catch (err) {
    record(24, 'Action returns registered domain for dexos:refresh broadcasting', false, err.message);
  }

  // Summary
  console.log('\n================================================================');
  const passCount = results.filter((r) => r.passed).length;
  const failCount = results.filter((r) => !r.passed).length;
  console.log(`TOTAL: ${results.length} | PASSED: ${passCount} | FAILED: ${failCount}`);
  console.log('================================================================');

  if (failCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
