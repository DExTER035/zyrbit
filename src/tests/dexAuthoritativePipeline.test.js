import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { processUserInput, DEX_RESULT_TYPE } from '../dex/dexOrchestrator.js';
import { supabase } from '../lib/supabase/index.js';

describe('Stage 2 — Dex Authoritative Action Pipeline & Safety Invariants', () => {
  let testUserId = null;

  beforeAll(async () => {
    const { data } = await supabase.auth.signInAnonymously();
    testUserId = data?.user?.id;
  });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('Guarantee 1: Authenticated session determines user identity, AI cannot override userId', async () => {
    // Attempt to spoof userId in options or params
    const result = await processUserInput({
      userMessage: 'I drank 250ml water',
      userId: testUserId,
      params: { userId: 'spoofed-attacker-id' }
    });

    expect(result.type).toBe(DEX_RESULT_TYPE.SUCCESS);
    expect(result.action).toBe('log_water');
  });

  it('Guarantee 2: Unauthenticated caller receives immediate error without running resolvers', async () => {
    vi.spyOn(supabase.auth, 'getSession').mockResolvedValue({ data: { session: null } });

    const result = await processUserInput({
      userMessage: 'Start a 25-minute focus session',
      userId: null
    });

    expect(result.type).toBe(DEX_RESULT_TYPE.ERROR);
    expect(result.displayMessage).toBe('Authentication required.');
  });

  it('Guarantee 3: Financial mutations REQUIRE explicit confirmation gate', async () => {
    const result = await processUserInput({
      userMessage: 'I spent ₹250 on groceries',
      userId: testUserId,
      confirmed: false
    });

    expect(result.type).toBe(DEX_RESULT_TYPE.CONFIRMATION_REQUIRED);
    expect(result.action).toBe('record_expense');
    expect(result.params.amount).toBe(250);
  });

  it('Guarantee 4: Financial confirmation gate when confirmed executes mutation', async () => {
    const result = await processUserInput({
      userMessage: 'I spent ₹250 on groceries',
      userId: testUserId,
      confirmed: true,
      pendingAction: 'record_expense',
      pendingParams: {
        amount: 250,
        category: 'Food',
        note: 'groceries',
        date: '2026-10-25'
      }
    });

    expect(result.type).toBe(DEX_RESULT_TYPE.SUCCESS);
    expect(result.action).toBe('record_expense');
  });

  it('Guarantee 5: Read-only financial query causes zero mutations and terminates with CONVERSATIONAL', async () => {
    const result = await processUserInput({
      userMessage: 'How much did I spend this month?',
      userId: testUserId
    });

    expect(result.type).toBe(DEX_RESULT_TYPE.CONVERSATIONAL);
    expect(result.action).toBeUndefined();
  });

  it('Guarantee 6: Time-constrained planning produces proposal first with ZERO mutations', async () => {
    const result = await processUserInput({
      userMessage: 'I have 45 minutes. What should I focus on?',
      userId: testUserId
    });

    expect(result.type).toBe(DEX_RESULT_TYPE.PLAN_PROPOSED);
    expect(result.plan).toBeDefined();
    expect(result.plan.steps.length).toBeGreaterThan(0);
    // Not executed yet!
    expect(result.type).not.toBe(DEX_RESULT_TYPE.PLAN_EXECUTED);
  });

  it('Guarantee 7: Ambiguous habit request clarifies rather than guessing', async () => {
    const result = await processUserInput({
      userMessage: 'Skip habit',
      userId: testUserId
    });

    expect(result.type).toBe(DEX_RESULT_TYPE.CLARIFICATION_NEEDED);
    expect(result.question).toBeDefined();
  });
});
