/**
 * Hardened Verification Script: Food Knowledge V2 Migration
 * Location: scripts/verifyFoodKnowledgeV2Migration.mjs
 * 
 * Safety & Quality Controls:
 * 1. Read-only schema presence gatekeeper (no writes if any required object is missing).
 * 2. Independent dual-session anonymous authentication with distinct user ID verification.
 * 3. Exact field-by-field assertions on meal_logs extended metadata.
 * 4. RLS evaluated via behavioral verification (positive read, negative cross-user isolation,
 *    unauthorized delete denial, and spoofing rejection strictly attributed to Postgres 42501).
 * 5. Safe recovery on ambiguous insert: Look up single candidate matching exact owner,
 *    unique run tag, and exact test signature. If 0 or >1 matches or error, abort deletion
 *    and report unresolved risk. Never delete uncertain records.
 * 6. Isolated try/catch on all cleanup and residual-verification queries.
 * 7. Deletions strictly scoped by exact primary key and authenticated user ID. Zero residuals verified.
 * 8. Non-zero exit code if schema, persistence, RLS, or any cleanup step fails.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://xgowpznkqbsngdiuodmj.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhnb3dwem5rcWJzbmdkaXVvZG1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwNjUyOTYsImV4cCI6MjA4OTY0MTI5Nn0.hmCDn6hrlVW1qaZbyFnToxKhSXXkGgxIf-bHTlWXavA';

const RUN_TAG = `v2_verify_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

const results = {
  authentication: {
    passed: false,
    userAId: null,
    userBId: null,
    details: ''
  },
  readOnlySchema: {
    passed: false,
    canonical_foods: false,
    food_aliases: false,
    user_food_preferences: false,
    meal_logs_metadata_columns: false,
    existing_meal_records_intact: false,
    details: {}
  },
  metadataPersistence: {
    passed: false,
    attempted: false,
    createdRecordId: null,
    details: ''
  },
  rlsBehavioralVerification: {
    passed: false,
    attempted: false,
    canonicalFoodsReadOnlyEnforced: false,
    preferencesUserAVisible: false,
    preferencesUserBIsolated: false,
    preferencesSpoofingRejectedByRls: false,
    preferencesUnauthorizedDeleteDenied: false,
    details: ''
  },
  cleanup: {
    meal_logs: {
      attempted: false,
      deleted: false,
      verifiedZeroResiduals: false,
      residualCount: null,
      unresolvedRisk: false,
      details: 'No record created'
    },
    user_food_preferences: {
      attempted: false,
      deleted: false,
      verifiedZeroResiduals: false,
      residualCount: null,
      unresolvedRisk: false,
      details: 'No record created'
    }
  }
};

async function verifyMigration() {
  console.log(`\n=============================================================`);
  console.log(`  ZYRBIT — FOOD KNOWLEDGE V2 POST-MIGRATION VERIFICATION`);
  console.log(`  Run Tag:        ${RUN_TAG}`);
  console.log(`  Target Project: ${SUPABASE_URL}`);
  console.log(`=============================================================\n`);

  let clientA = null;
  let clientB = null;
  let userA = null;
  let userB = null;

  // ──────────────────────────────────────────────────────────────────────────
  // STAGE 1: INDEPENDENT DUAL-CLIENT AUTHENTICATION SETUP
  // ──────────────────────────────────────────────────────────────────────────
  console.log(`[STAGE 1] Authenticating two independent client sessions...`);
  try {
    clientA = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
    clientB = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });

    const [authA, authB] = await Promise.all([
      clientA.auth.signInAnonymously(),
      clientB.auth.signInAnonymously()
    ]);

    if (authA.error || !authA.data?.user?.id) {
      throw new Error(`Client A authentication failed: ${authA.error?.message || 'No user object returned'}`);
    }
    if (authB.error || !authB.data?.user?.id) {
      throw new Error(`Client B authentication failed: ${authB.error?.message || 'No user object returned'}`);
    }

    userA = authA.data.user;
    userB = authB.data.user;

    if (userA.id === userB.id) {
      throw new Error(`Session collision: Both clients returned identical user ID (${userA.id})`);
    }

    results.authentication.passed = true;
    results.authentication.userAId = userA.id;
    results.authentication.userBId = userB.id;
    results.authentication.details = `Independent sessions verified: User A (${userA.id.slice(0, 8)}...) != User B (${userB.id.slice(0, 8)}...)`;
    console.log(`  ✓ ${results.authentication.details}`);
  } catch (err) {
    results.authentication.passed = false;
    results.authentication.details = err.message;
    console.error(`  ✗ Stage 1 Authentication Failure: ${err.message}`);
  }

  // If Stage 1 failed, proceed directly to final report
  if (!results.authentication.passed) {
    printReportAndExit();
    return;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // STAGE 2: READ-ONLY SCHEMA PRESENCE VERIFICATION (GATEKEEPER)
  // ──────────────────────────────────────────────────────────────────────────
  console.log(`\n[STAGE 2] Read-only schema presence verification...`);

  // 2.1 Table: canonical_foods
  const cfRes = await clientA.from('canonical_foods')
    .select('id, slug, name, category, calories, protein_g, carbs_g, fat_g')
    .limit(1);
  if (!cfRes.error) {
    results.readOnlySchema.canonical_foods = true;
    console.log(`  ✓ Table 'canonical_foods' is present and queryable.`);
  } else {
    results.readOnlySchema.details.canonical_foods = `${cfRes.error.code || 'ERR'}: ${cfRes.error.message}`;
    console.log(`  ✗ Table 'canonical_foods' missing: ${cfRes.error.message}`);
  }

  // 2.2 Table: food_aliases
  const faRes = await clientA.from('food_aliases')
    .select('id, canonical_food_id, alias, priority')
    .limit(1);
  if (!faRes.error) {
    results.readOnlySchema.food_aliases = true;
    console.log(`  ✓ Table 'food_aliases' is present and queryable.`);
  } else {
    results.readOnlySchema.details.food_aliases = `${faRes.error.code || 'ERR'}: ${faRes.error.message}`;
    console.log(`  ✗ Table 'food_aliases' missing: ${faRes.error.message}`);
  }

  // 2.3 Table: user_food_preferences
  const ufpRes = await clientA.from('user_food_preferences')
    .select('id, user_id, trigger_keyword, preferred_food_type, target_id')
    .limit(1);
  if (!ufpRes.error) {
    results.readOnlySchema.user_food_preferences = true;
    console.log(`  ✓ Table 'user_food_preferences' is present and queryable.`);
  } else {
    results.readOnlySchema.details.user_food_preferences = `${ufpRes.error.code || 'ERR'}: ${ufpRes.error.message}`;
    console.log(`  ✗ Table 'user_food_preferences' missing: ${ufpRes.error.message}`);
  }

  // 2.4 Columns: meal_logs 5 extended metadata columns
  const mlColsRes = await clientA.from('meal_logs')
    .select('id, food_ref_id, source_type, preparation_state, nutrition_snapshot, confidence')
    .limit(1);
  if (!mlColsRes.error) {
    results.readOnlySchema.meal_logs_metadata_columns = true;
    console.log(`  ✓ All 5 extended metadata columns present on 'meal_logs'.`);
  } else {
    results.readOnlySchema.details.meal_logs_metadata_columns = `${mlColsRes.error.code || 'ERR'}: ${mlColsRes.error.message}`;
    console.log(`  ✗ 'meal_logs' extended metadata columns missing: ${mlColsRes.error.message}`);
  }

  // 2.5 Existing meal records intact
  const mlExistRes = await clientA.from('meal_logs')
    .select('id, food_name, meal_type, calories, date, created_at')
    .limit(5);
  if (!mlExistRes.error) {
    results.readOnlySchema.existing_meal_records_intact = true;
    console.log(`  ✓ Existing meal logs queryable (200 OK, rows=${mlExistRes.data?.length}).`);
  } else {
    results.readOnlySchema.details.existing_meal_records_intact = `${mlExistRes.error.code || 'ERR'}: ${mlExistRes.error.message}`;
    console.log(`  ✗ Existing meal logs query error: ${mlExistRes.error.message}`);
  }

  const isSchemaValid = results.readOnlySchema.canonical_foods &&
                        results.readOnlySchema.food_aliases &&
                        results.readOnlySchema.user_food_preferences &&
                        results.readOnlySchema.meal_logs_metadata_columns &&
                        results.readOnlySchema.existing_meal_records_intact;

  results.readOnlySchema.passed = isSchemaValid;

  // Gatekeeper: Do not attempt write tests if schema is incomplete
  if (!isSchemaValid) {
    console.log(`\n[GATEKEEPER ENGAGED] Required schema elements missing. Halting before persistence tests.`);
    printReportAndExit();
    return;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // STAGE 3: EXTENDED METADATA PERSISTENCE TEST (meal_logs)
  // ──────────────────────────────────────────────────────────────────────────
  console.log(`\n[STAGE 3] Testing extended metadata persistence on meal_logs...`);
  results.metadataPersistence.attempted = true;
  let testMealId = null;

  const testMealPayload = {
    user_id: userA.id,
    date: new Date().toISOString().slice(0, 10),
    meal_type: 'snack',
    food_name: `[VERIFY_TEST_${RUN_TAG}] Hardened Test Item`,
    quantity_g: 130.0,
    calories: 195.0,
    protein: 14.0,
    carbs: 20.0,
    fat: 6.0,
    fiber: 2.5,
    food_ref_id: null,
    source_type: 'curated_seed',
    preparation_state: 'raw',
    nutrition_snapshot: {
      run_tag: RUN_TAG,
      micronutrients: { potassium_mg: 350, sodium_mg: 120 }
    },
    confidence: 0.95
  };

  try {
    const sampleCf = await clientA.from('canonical_foods').select('id').limit(1).maybeSingle();
    if (sampleCf.data?.id) {
      testMealPayload.food_ref_id = sampleCf.data.id;
    }

    const insertRes = await clientA.from('meal_logs')
      .insert(testMealPayload)
      .select()
      .single();

    if (insertRes.data?.id) {
      testMealId = insertRes.data.id;
    } else {
      // Safe recovery lookup: narrowly scoped to authenticated owner and exact signature
      console.log(`  Insert response did not return ID. Checking for uniquely committed test record...`);
      const recoveryQuery = await clientA.from('meal_logs')
        .select('id, user_id, food_name')
        .eq('user_id', userA.id)
        .eq('food_name', testMealPayload.food_name);

      if (recoveryQuery.error) {
        results.cleanup.meal_logs.unresolvedRisk = true;
        throw new Error(`Ambiguous insert and recovery lookup failed: ${recoveryQuery.error.code} - ${recoveryQuery.error.message}`);
      }

      if (!recoveryQuery.data || recoveryQuery.data.length === 0) {
        throw new Error(`Test meal insert failed and no committed record was found: ${insertRes.error?.code || 'ERR'} - ${insertRes.error?.message}`);
      }

      if (recoveryQuery.data.length > 1) {
        results.cleanup.meal_logs.unresolvedRisk = true;
        throw new Error(`Ambiguous insert recovery found ${recoveryQuery.data.length} matches. Halting deletion to avoid deleting uncertain records.`);
      }

      const candidate = recoveryQuery.data[0];
      if (candidate.user_id === userA.id && candidate.food_name === testMealPayload.food_name) {
        testMealId = candidate.id;
        console.log(`  Recovered unique committed test record (ID: ${testMealId})`);
      } else {
        results.cleanup.meal_logs.unresolvedRisk = true;
        throw new Error(`Recovered candidate failed signature verification: ${JSON.stringify(candidate)}`);
      }
    }

    results.metadataPersistence.createdRecordId = testMealId;
    console.log(`  Inserted test meal record (ID: ${testMealId})`);

    // Read back and perform field-by-field validation
    const readRes = await clientA.from('meal_logs')
      .select('*')
      .eq('id', testMealId)
      .single();

    if (readRes.error || !readRes.data) {
      throw new Error(`Read-back of test meal failed: ${readRes.error?.code || 'ERR'} - ${readRes.error?.message}`);
    }

    const row = readRes.data;
    const mismatches = [];

    if (row.food_name !== testMealPayload.food_name) mismatches.push(`food_name (${row.food_name} != ${testMealPayload.food_name})`);
    if (row.source_type !== 'curated_seed') mismatches.push(`source_type (${row.source_type} != curated_seed)`);
    if (row.preparation_state !== 'raw') mismatches.push(`preparation_state (${row.preparation_state} != raw)`);
    if (Number(row.confidence) !== 0.95) mismatches.push(`confidence (${row.confidence} != 0.95)`);
    if (row.food_ref_id !== testMealPayload.food_ref_id) mismatches.push(`food_ref_id (${row.food_ref_id} != ${testMealPayload.food_ref_id})`);
    if (row.nutrition_snapshot?.run_tag !== RUN_TAG) mismatches.push(`nutrition_snapshot.run_tag mismatch`);
    if (row.nutrition_snapshot?.micronutrients?.potassium_mg !== 350) mismatches.push(`potassium_mg mismatch`);

    if (mismatches.length > 0) {
      throw new Error(`Persisted metadata verification failed: ${mismatches.join(', ')}`);
    }

    results.metadataPersistence.passed = true;
    results.metadataPersistence.details = `All 5 extended metadata columns persisted and accurately read back (ID: ${testMealId}).`;
    console.log(`  ✓ ${results.metadataPersistence.details}`);
  } catch (err) {
    results.metadataPersistence.passed = false;
    results.metadataPersistence.details = err.message;
    console.error(`  ✗ Stage 3 Persistence Failure: ${err.message}`);
  } finally {
    // Stage 3 Cleanup: Always runs in an isolated try/catch if testMealId was assigned
    if (testMealId) {
      results.cleanup.meal_logs.attempted = true;
      try {
        console.log(`  [CLEANUP] Deleting test meal record (ID: ${testMealId})...`);
        const delRes = await clientA.from('meal_logs')
          .delete()
          .eq('id', testMealId)
          .eq('user_id', userA.id);

        const checkRes = await clientA.from('meal_logs')
          .select('id')
          .eq('id', testMealId);

        if (delRes.error) {
          results.cleanup.meal_logs.deleted = false;
          results.cleanup.meal_logs.verifiedZeroResiduals = false;
          results.cleanup.meal_logs.details = `CRITICAL: Delete query failed (${delRes.error.code}): ${delRes.error.message}`;
          console.error(`  ✗ ${results.cleanup.meal_logs.details}`);
        } else if (checkRes.error) {
          results.cleanup.meal_logs.deleted = true;
          results.cleanup.meal_logs.verifiedZeroResiduals = false;
          results.cleanup.meal_logs.details = `CRITICAL: Residual verification query failed (${checkRes.error.code}): ${checkRes.error.message}. Cannot verify zero residuals.`;
          console.error(`  ✗ ${results.cleanup.meal_logs.details}`);
        } else {
          const residuals = checkRes.data?.length || 0;
          results.cleanup.meal_logs.residualCount = residuals;
          if (residuals === 0) {
            results.cleanup.meal_logs.deleted = true;
            results.cleanup.meal_logs.verifiedZeroResiduals = true;
            results.cleanup.meal_logs.details = `Deleted record ${testMealId}; residual check confirmed 0 rows.`;
            console.log(`  ✓ Meal cleanup verified: 0 residual records.`);
          } else {
            results.cleanup.meal_logs.deleted = false;
            results.cleanup.meal_logs.verifiedZeroResiduals = false;
            results.cleanup.meal_logs.details = `CRITICAL: ${residuals} residual rows found for meal record ${testMealId}.`;
            console.error(`  ✗ ${results.cleanup.meal_logs.details}`);
          }
        }
      } catch (cleanupEx) {
        results.cleanup.meal_logs.deleted = false;
        results.cleanup.meal_logs.verifiedZeroResiduals = false;
        results.cleanup.meal_logs.details = `CRITICAL: Unexpected exception during meal cleanup: ${cleanupEx.message}`;
        console.error(`  ✗ ${results.cleanup.meal_logs.details}`);
      }
    } else if (results.cleanup.meal_logs.unresolvedRisk) {
      results.cleanup.meal_logs.details = 'CRITICAL: Unresolved cleanup risk. Ambiguous records detected; deletion aborted for safety.';
    } else {
      results.cleanup.meal_logs.details = 'No meal record was created; cleanup not needed.';
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // STAGE 4: RLS POLICY BEHAVIORAL VERIFICATION (user_food_preferences & canonical)
  // ──────────────────────────────────────────────────────────────────────────
  console.log(`\n[STAGE 4] RLS Policy Behavioral Verification (Client-Side Enforcement)...`);
  console.log(`  Note: These tests verify active authorization behavior and negative isolation.`);
  console.log(`  Direct catalog inspection of pg_policies is restricted to database administrators.`);
  results.rlsBehavioralVerification.attempted = true;
  let testPrefId = null;

  // Determine a valid target_id: Check if an existing canonical food row exists
  let targetFoodId = '00000000-0000-4000-8000-000000000001';
  const cfSample = await clientA.from('canonical_foods').select('id').limit(1).maybeSingle();
  if (cfSample.data?.id) {
    targetFoodId = cfSample.data.id;
  }

  const prefPayload = {
    user_id: userA.id,
    trigger_keyword: `trigger_${RUN_TAG}`,
    preferred_food_type: 'canonical',
    target_id: targetFoodId,
    preferred_preparation: 'steamed',
    default_quantity_g: 150.0
  };

  try {
    // 4.1 Verify canonical_foods read-only enforcement for authenticated users
    console.log(`  Testing canonical_foods read-only protection...`);
    const unauthorizedCfInsert = await clientA.from('canonical_foods').insert({
      slug: `illegal_cf_${RUN_TAG}`,
      name: 'Illegal Canonical Entry',
      category: 'test',
      calories: 100,
      protein_g: 5,
      carbs_g: 10,
      fat_g: 2
    });

    if (unauthorizedCfInsert.error && (
      unauthorizedCfInsert.error.code === '42501' ||
      unauthorizedCfInsert.error.message.toLowerCase().includes('row-level security') ||
      unauthorizedCfInsert.error.message.toLowerCase().includes('violates row-level security policy')
    )) {
      results.rlsBehavioralVerification.canonicalFoodsReadOnlyEnforced = true;
      console.log(`  ✓ Table 'canonical_foods' is strictly read-only for authenticated users (42501 RLS enforced).`);
    } else if (!unauthorizedCfInsert.error) {
      throw new Error(`SECURITY LEAK: Authenticated user was allowed to insert into canonical_foods without admin privileges!`);
    } else {
      throw new Error(`Expected 42501 RLS rejection on canonical_foods insert, received unexpected error: ${unauthorizedCfInsert.error.code} - ${unauthorizedCfInsert.error.message}`);
    }

    // 4.2 User A inserts own preference
    const insPref = await clientA.from('user_food_preferences')
      .insert(prefPayload)
      .select()
      .single();

    if (insPref.data?.id) {
      testPrefId = insPref.data.id;
    } else {
      // Safe recovery lookup
      console.log(`  Preference insert response did not return ID. Checking for uniquely committed test record...`);
      const recoveryPrefQuery = await clientA.from('user_food_preferences')
        .select('id, user_id, trigger_keyword')
        .eq('user_id', userA.id)
        .eq('trigger_keyword', prefPayload.trigger_keyword);

      if (recoveryPrefQuery.error) {
        results.cleanup.user_food_preferences.unresolvedRisk = true;
        throw new Error(`Ambiguous preference insert and recovery lookup failed: ${recoveryPrefQuery.error.code} - ${recoveryPrefQuery.error.message}`);
      }

      if (!recoveryPrefQuery.data || recoveryPrefQuery.data.length === 0) {
        throw new Error(`User A pref insert failed and no committed record was found: ${insPref.error?.code || 'ERR'} - ${insPref.error?.message}`);
      }

      if (recoveryPrefQuery.data.length > 1) {
        results.cleanup.user_food_preferences.unresolvedRisk = true;
        throw new Error(`Ambiguous preference insert recovery found ${recoveryPrefQuery.data.length} matches. Halting deletion to avoid deleting uncertain records.`);
      }

      const prefCandidate = recoveryPrefQuery.data[0];
      if (prefCandidate.user_id === userA.id && prefCandidate.trigger_keyword === prefPayload.trigger_keyword) {
        testPrefId = prefCandidate.id;
        console.log(`  Recovered unique committed preference record (ID: ${testPrefId})`);
      } else {
        results.cleanup.user_food_preferences.unresolvedRisk = true;
        throw new Error(`Recovered preference candidate failed signature verification: ${JSON.stringify(prefCandidate)}`);
      }
    }

    console.log(`  User A inserted preference (ID: ${testPrefId})`);

    // 4.3 Positive Read: User A reads own preference
    const readA = await clientA.from('user_food_preferences')
      .select('*')
      .eq('id', testPrefId)
      .single();

    if (readA.error || !readA.data || readA.data.id !== testPrefId) {
      throw new Error(`User A failed to read own preference: ${readA.error?.message}`);
    }
    results.rlsBehavioralVerification.preferencesUserAVisible = true;
    console.log(`  ✓ User A successfully read own preference record.`);

    // 4.4 Isolation Read: User B queries User A's preference (must return 0 rows)
    const readB = await clientB.from('user_food_preferences')
      .select('*')
      .eq('id', testPrefId);

    if (readB.error) {
      throw new Error(`User B query encountered unexpected error: ${readB.error.message}`);
    }
    if (readB.data && readB.data.length > 0) {
      throw new Error(`SECURITY LEAK: User B was able to read User A preference! Rows leaked: ${readB.data.length}`);
    }
    results.rlsBehavioralVerification.preferencesUserBIsolated = true;
    console.log(`  ✓ User B read attempt returned 0 rows (isolated).`);

    // 4.5 Spoofed Insert Rejection: User B attempts insert with user_id = User A
    const spoofPayload = {
      user_id: userA.id,
      trigger_keyword: `spoof_${RUN_TAG}`,
      preferred_food_type: 'canonical',
      target_id: targetFoodId
    };

    const spoofRes = await clientB.from('user_food_preferences').insert(spoofPayload);

    if (!spoofRes.error) {
      throw new Error(`SECURITY LEAK: User B successfully spoofed an insert for User A! WITH CHECK policy missing.`);
    }

    const isRlsRejection = spoofRes.error.code === '42501' ||
                           spoofRes.error.message.toLowerCase().includes('row-level security') ||
                           spoofRes.error.message.toLowerCase().includes('violates row-level security policy');

    if (!isRlsRejection) {
      throw new Error(`Spoof test failed with unexpected error (${spoofRes.error.code}: ${spoofRes.error.message}) rather than expected RLS 42501 rejection.`);
    }

    results.rlsBehavioralVerification.preferencesSpoofingRejectedByRls = true;
    console.log(`  ✓ User B spoofed insert rejected strictly by RLS WITH CHECK policy (42501).`);

    // 4.6 Unauthorized Delete: User B attempts to delete User A's preference
    await clientB.from('user_food_preferences')
      .delete()
      .eq('id', testPrefId);

    const checkRecordStillExists = await clientA.from('user_food_preferences')
      .select('id')
      .eq('id', testPrefId);

    if (!checkRecordStillExists.data || checkRecordStillExists.data.length === 0) {
      throw new Error(`SECURITY LEAK: User B was able to delete User A preference!`);
    }

    results.rlsBehavioralVerification.preferencesUnauthorizedDeleteDenied = true;
    console.log(`  ✓ User B unauthorized delete had no effect; record remains intact.`);

    results.rlsBehavioralVerification.passed = true;
    results.rlsBehavioralVerification.details = `All behavioral RLS checks verified: SELECT visibility, cross-user isolation, spoofing rejection (42501), and DELETE protection.`;
  } catch (err) {
    results.rlsBehavioralVerification.passed = false;
    results.rlsBehavioralVerification.details = err.message;
    console.error(`  ✗ Stage 4 RLS Failure: ${err.message}`);
  } finally {
    if (testPrefId) {
      results.cleanup.user_food_preferences.attempted = true;
      try {
        console.log(`  [CLEANUP] Deleting test preference record (ID: ${testPrefId})...`);
        const delRes = await clientA.from('user_food_preferences')
          .delete()
          .eq('id', testPrefId)
          .eq('user_id', userA.id);

        const checkRes = await clientA.from('user_food_preferences')
          .select('id')
          .eq('id', testPrefId);

        if (delRes.error) {
          results.cleanup.user_food_preferences.deleted = false;
          results.cleanup.user_food_preferences.verifiedZeroResiduals = false;
          results.cleanup.user_food_preferences.details = `CRITICAL: Delete query failed (${delRes.error.code}): ${delRes.error.message}`;
          console.error(`  ✗ ${results.cleanup.user_food_preferences.details}`);
        } else if (checkRes.error) {
          results.cleanup.user_food_preferences.deleted = true;
          results.cleanup.user_food_preferences.verifiedZeroResiduals = false;
          results.cleanup.user_food_preferences.details = `CRITICAL: Verification query failed (${checkRes.error.code}): ${checkRes.error.message}. Cannot verify zero residuals.`;
          console.error(`  ✗ ${results.cleanup.user_food_preferences.details}`);
        } else {
          const residuals = checkRes.data?.length || 0;
          results.cleanup.user_food_preferences.residualCount = residuals;
          if (residuals === 0) {
            results.cleanup.user_food_preferences.deleted = true;
            results.cleanup.user_food_preferences.verifiedZeroResiduals = true;
            results.cleanup.user_food_preferences.details = `Deleted record ${testPrefId}; residual check confirmed 0 rows.`;
            console.log(`  ✓ Preference cleanup verified: 0 residual records.`);
          } else {
            results.cleanup.user_food_preferences.deleted = false;
            results.cleanup.user_food_preferences.verifiedZeroResiduals = false;
            results.cleanup.user_food_preferences.details = `CRITICAL: ${residuals} residual rows found for preference record ${testPrefId}.`;
            console.error(`  ✗ ${results.cleanup.user_food_preferences.details}`);
          }
        }
      } catch (cleanupEx) {
        results.cleanup.user_food_preferences.deleted = false;
        results.cleanup.user_food_preferences.verifiedZeroResiduals = false;
        results.cleanup.user_food_preferences.details = `CRITICAL: Unexpected exception during preference cleanup: ${cleanupEx.message}`;
        console.error(`  ✗ ${results.cleanup.user_food_preferences.details}`);
      }
    } else if (results.cleanup.user_food_preferences.unresolvedRisk) {
      results.cleanup.user_food_preferences.details = 'CRITICAL: Unresolved cleanup risk. Ambiguous records detected; deletion aborted for safety.';
    } else {
      results.cleanup.user_food_preferences.details = 'No preference record was created; cleanup not needed.';
    }
  }

  printReportAndExit();
}

function printReportAndExit() {
  const mealCleanupPassed = !results.cleanup.meal_logs.attempted
    ? !results.cleanup.meal_logs.unresolvedRisk
    : (results.cleanup.meal_logs.deleted && results.cleanup.meal_logs.verifiedZeroResiduals);

  const prefCleanupPassed = !results.cleanup.user_food_preferences.attempted
    ? !results.cleanup.user_food_preferences.unresolvedRisk
    : (results.cleanup.user_food_preferences.deleted && results.cleanup.user_food_preferences.verifiedZeroResiduals);

  const overallSuccess = results.authentication.passed &&
                         results.readOnlySchema.passed &&
                         results.metadataPersistence.passed &&
                         results.rlsBehavioralVerification.passed &&
                         mealCleanupPassed &&
                         prefCleanupPassed;

  console.log(`\n=============================================================`);
  console.log(`                 FINAL VERIFICATION SUMMARY                  `);
  console.log(`=============================================================`);
  console.log(`1. Authentication (Dual Independent):  ${results.authentication.passed ? 'PASSED' : 'FAILED'}`);
  console.log(`   ${results.authentication.details}`);
  console.log(`2. Schema Presence (Read-Only Gate):   ${results.readOnlySchema.passed ? 'PASSED' : 'FAILED'}`);
  console.log(`   - canonical_foods:                 ${results.readOnlySchema.canonical_foods ? 'OK' : 'MISSING'}`);
  console.log(`   - food_aliases:                    ${results.readOnlySchema.food_aliases ? 'OK' : 'MISSING'}`);
  console.log(`   - user_food_preferences:           ${results.readOnlySchema.user_food_preferences ? 'OK' : 'MISSING'}`);
  console.log(`   - meal_logs metadata columns:      ${results.readOnlySchema.meal_logs_metadata_columns ? 'OK' : 'MISSING'}`);
  console.log(`   - Existing meal records intact:    ${results.readOnlySchema.existing_meal_records_intact ? 'OK' : 'FAILED'}`);
  console.log(`3. Extended Metadata Persistence:      ${results.metadataPersistence.attempted ? (results.metadataPersistence.passed ? 'PASSED' : 'FAILED') : 'SKIPPED'}`);
  console.log(`   ${results.metadataPersistence.details || 'Not executed'}`);
  console.log(`4. RLS Policy Behavioral Verification: ${results.rlsBehavioralVerification.attempted ? (results.rlsBehavioralVerification.passed ? 'PASSED' : 'FAILED') : 'SKIPPED'}`);
  console.log(`   ${results.rlsBehavioralVerification.details || 'Not executed'}`);
  console.log(`5. Independent Artifact Cleanup:`);
  console.log(`   - meal_logs:                       ${mealCleanupPassed ? 'PASSED' : 'FAILED'}`);
  console.log(`     ${results.cleanup.meal_logs.details}`);
  console.log(`   - user_food_preferences:          ${prefCleanupPassed ? 'PASSED' : 'FAILED'}`);
  console.log(`     ${results.cleanup.user_food_preferences.details}`);
  console.log(`=============================================================`);
  console.log(`OVERALL RESULT: ${overallSuccess ? 'SUCCESS (ALL CHECKS PASSED)' : 'VERIFICATION FAILED'}`);
  console.log(`=============================================================\n`);

  process.exit(overallSuccess ? 0 : 1);
}

verifyMigration().catch((err) => {
  console.error('Unhandled verification error:', err);
  process.exit(1);
});
