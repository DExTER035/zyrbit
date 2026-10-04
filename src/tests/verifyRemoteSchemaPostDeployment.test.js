import { describe, it, expect, beforeAll } from 'vitest';
import { supabase } from '../lib/supabase/client.js';

describe('Post-Deployment Remote Supabase Verification', () => {
  const requiredTables = [
    'profiles',
    'habits',
    'habit_logs',
    'focus_sessions',
    'tasks',
    'health_meals',
    'health_workouts',
    'health_sleep',
    'money_expenses',
    'wealth_income',
    'wealth_bills',
    'money_promises',
    'money_promise_repayments',
    'wealth_accounts',
    'wealth_savings_goals',
    'statement_import_batches',
    'imported_transactions',
    'zenith_daily_logs',
    'secret_notes'
  ];

  beforeAll(async () => {
    await supabase.auth.signInAnonymously();
  });

  for (const table of requiredTables) {
    it(`verifies remote table is accessible via PostgREST: ${table}`, async () => {
      const res = await supabase.from(table).select('*').limit(1);
      console.log(`[POST-DEPLOY] ${table}:`, res.error ? `${res.error.code} - ${res.error.message}` : `SUCCESS (status=${res.status})`);
      expect(res.error).toBeNull();
      expect(res.status).toBe(200);
    }, 15000);
  }
});
