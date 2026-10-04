import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://xgowpznkqbsngdiuodmj.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhnb3dwem5rcWJzbmdkaXVvZG1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwNjUyOTYsImV4cCI6MjA4OTY0MTI5Nn0.hmCDn6hrlVW1qaZbyFnToxKhSXXkGgxIf-bHTlWXavA';

describe('Multi-Domain Two-User Isolation Verification', () => {
  let clientA, clientB;
  let userA, userB;

  it('creates two distinct authenticated user sessions', async () => {
    clientA = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
    clientB = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });

    const resA = await clientA.auth.signInAnonymously();
    const resB = await clientB.auth.signInAnonymously();

    expect(resA.data?.user).toBeDefined();
    expect(resB.data?.user).toBeDefined();

    userA = resA.data.user;
    userB = resB.data.user;

    expect(userA.id).not.toBe(userB.id);
  }, 15000);

  const domains = [
    {
      domain: 'Wealth (Expenses)',
      table: 'money_expenses',
      idCol: 'id',
      record: (uid) => ({ user_id: uid, amount: 150, category: 'Food', note: 'Secret Dinner A', expense_date: '2026-10-03' }),
      updatePayload: { note: 'HACKED BY B' },
    },
    {
      domain: 'Wealth (Promises)',
      table: 'money_promises',
      idCol: 'id',
      record: (uid) => ({ user_id: uid, person: 'Friend A', amount: 500, type: 'lent', status: 'outstanding' }),
      updatePayload: { note: 'HACKED BY B' },
    },
    {
      domain: 'Connect Money',
      table: 'statement_import_batches',
      idCol: 'id',
      record: (uid) => ({ user_id: uid, batch_code: 'BATCH-A-TEST', source: 'paytm', status: 'pending_review' }),
      updatePayload: { status: 'HACKED BY B' },
    },
    {
      domain: 'Growth (Tasks)',
      table: 'tasks',
      idCol: 'id',
      record: (uid) => ({ user_id: uid, name: 'Secret Task A', status: 'todo' }),
      updatePayload: { name: 'HACKED BY B' },
    },
    {
      domain: 'Health (Meals)',
      table: 'health_meals',
      idCol: 'id',
      record: (uid) => ({ user_id: uid, food_name: 'Secret Protein Shake', calories: 250 }),
      updatePayload: { food_name: 'HACKED BY B' },
    },
    {
      domain: 'Zenith (Logs)',
      table: 'zenith_daily_logs',
      idCol: 'id',
      record: (uid) => ({ user_id: uid, log_date: '2026-10-03', brain_dump: 'Private Thoughts A' }),
      updatePayload: { brain_dump: 'HACKED BY B' },
    },
    {
      domain: 'Zenith (Secret Notes)',
      table: 'secret_notes',
      idCol: 'user_id',
      record: (uid) => ({ user_id: uid, encrypted_content: 'Super Secret Encrypted A' }),
      updatePayload: { encrypted_content: 'HACKED BY B' },
    },
  ];

  for (const { domain, table, idCol, record, updatePayload } of domains) {
    it(`enforces strict RLS cross-user isolation on ${domain} (${table})`, async () => {
      // 1. User A inserts a record
      const insertA = await clientA.from(table).insert(record(userA.id)).select().single();
      expect(insertA.error).toBeNull();
      const recordKeyVal = insertA.data[idCol];
      expect(recordKeyVal).toBeDefined();

      // 2. User B attempts to read User A's record -> MUST RETURN EMPTY / NOT FOUND
      const selectB = await clientB.from(table).select('*').eq(idCol, recordKeyVal);
      expect(selectB.error).toBeNull();
      expect((selectB.data || []).length).toBe(0);

      // 3. User B attempts to update User A's record -> MUST NOT MODIFY
      const updateB = await clientB.from(table).update(updatePayload).eq(idCol, recordKeyVal).select();
      expect((updateB.data || []).length).toBe(0);

      // Verify User A's record was NOT modified
      const verifyA = await clientA.from(table).select('*').eq(idCol, recordKeyVal).single();
      for (const [key, val] of Object.entries(updatePayload)) {
        expect(verifyA.data[key]).not.toBe(val);
      }

      // 4. User B attempts to delete User A's record -> MUST NOT DELETE
      const deleteB = await clientB.from(table).delete().eq(idCol, recordKeyVal).select();
      expect((deleteB.data || []).length).toBe(0);

      // Verify User A can still read their record
      const reVerifyA = await clientA.from(table).select('*').eq(idCol, recordKeyVal).single();
      expect(reVerifyA.data).toBeDefined();

      // 5. User B attempts to insert a record pretending to be User A -> MUST FAIL WITH RLS ERROR
      const spoofInsertB = await clientB.from(table).insert(record(userA.id));
      expect(spoofInsertB.error).toBeDefined();
      expect(spoofInsertB.error.message.toLowerCase()).toMatch(/row-level security|policy|permission|violates/);

      // 6. Clean up User A's record
      await clientA.from(table).delete().eq(idCol, recordKeyVal);
    }, 15000);
  }
});
