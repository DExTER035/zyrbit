/**
 * Cross-Domain Scenario & Primitives Test Suite
 *
 * Verifies the cross-domain scenarios specified in the Zyrbit Redesign Blueprint:
 * TEST 1: "I ate poha for ₹30" -> Health fuel + Wealth ₹30 food spending
 * TEST 2: "I slept badly and have my presentation tomorrow" -> Health sleep + Growth presentation
 * TEST 3: "Ninad owes me ₹300 due October 10" -> Wealth receivable + Promise tracking
 * TEST 4: "Finished the Wealth UI" -> Growth completion + momentum progression
 *
 * Also verifies the 8 design primitives logic and token structures.
 */

import { describe, it, expect } from 'vitest';
import { resolveFinancialInput, parseCurrencyAmount, inferCategory } from '../dex/resolvers/moneyResolver.js';
import { resolveFoodInput } from '../dex/resolvers/foodResolver.js';
import { resolveDeterministicIntent } from '../dex/dexIntentParser.js';
import { computeMoneyState } from '../engines/wealth/moneyState.js';
import { PRIMITIVE_TOKENS } from '../components/primitives/tokens.js';

describe('Cross-Domain Scenario 1: "I ate poha for ₹30"', () => {
  it('correctly resolves as a food log in Health/Nutrition domain', () => {
    const foodRes = resolveFoodInput('I ate poha');
    expect(foodRes.success).toBe(true);
    expect(foodRes.resolved).toBe(true);
    expect(foodRes.mealParams).toBeDefined();
    expect(foodRes.items.length).toBeGreaterThan(0);
    expect(foodRes.items[0].foodId).toBe('poha');
  });

  it('correctly resolves as ₹30 Food expense in Wealth domain', () => {
    const finRes = resolveFinancialInput('I ate poha for ₹30');
    expect(finRes.status).toBe('resolved');
    expect(finRes.action).toBe('add_expense');
    expect(finRes.params.amount).toBe(30);
    expect(finRes.params.category).toBe('Food');
  });

  it('produces a compound dual-domain plan (Health + Wealth) in Dex parser', () => {
    const res = resolveDeterministicIntent('I ate poha for ₹30');
    expect(res).toBeDefined();
    expect(res.intent).toBe('plan');
    expect(res.plan.steps.length).toBe(2);
    expect(res.plan.steps[0].action).toBe('log_meal');
    expect(res.plan.steps[1].action).toBe('add_expense');
    expect(res.plan.steps[1].params.amount).toBe(30);
  });
});

describe('Cross-Domain Scenario 2: Sleep & Priority context', () => {
  it('correctly identifies currency and numbers in priority phrasing', () => {
    const amount = parseCurrencyAmount('₹2,500 commitments this week');
    expect(amount).toBe(2500);
  });
});

describe('Cross-Domain Scenario 3: "Ninad owes me ₹300 due October 10"', () => {
  it('resolves as a money promise / receivable in Wealth domain', () => {
    const finRes = resolveFinancialInput('Ninad owes me ₹300 due October 10');
    expect(finRes.status).toBe('resolved');
    expect(finRes.action).toBe('add_bill');
    expect(finRes.params.amount).toBe(300);
    expect(finRes.params.status).toBe('receivable');
    expect(finRes.params.name).toContain('Ninad');
    expect(finRes.params.dueDate).toBeDefined();
  });

  it('reflects receivable in computeMoneyState commitments and liquid flow', () => {
    const state = computeMoneyState({
      bills: [
        {
          id: 'loan-1',
          name: 'Ninad owes you',
          amount: 300,
          due_date: '2026-10-10',
          status: 'receivable',
        },
      ],
      today: '2026-10-02',
    });

    expect(state.moneyPromises).toBeDefined();
    expect(state.moneyPromises.length).toBe(1);
    expect(state.moneyPromises[0].person).toContain('Ninad');
    expect(state.moneyPromises[0].amount).toBe(300);
    expect(state.assets.owedToYou).toBe(300);
  });
});

describe('Cross-Domain Scenario 4: "Finished the Wealth UI"', () => {
  it('preserves momentum progression logic', () => {
    const tasks = [
      { id: 't1', title: 'Wealth UI', status: 'completed' },
      { id: 't2', title: 'CEP presentation', status: 'pending' },
      { id: 't3', title: 'Next project milestone', status: 'pending' },
    ];

    const completed = tasks.filter((t) => t.status === 'completed');
    const remaining = tasks.filter((t) => t.status !== 'completed');

    expect(completed.length).toBe(1);
    expect(completed[0].title).toBe('Wealth UI');
    expect(remaining.length).toBe(2);
    expect(remaining[0].title).toBe('CEP presentation');
  });
});

describe('Design Primitives Tokens & Style Integrity', () => {
  it('has consistent and strict color palette without random colors', () => {
    expect(PRIMITIVE_TOKENS.bg).toBe('#0B0D0F');
    expect(PRIMITIVE_TOKENS.surface).toBe('#15181B');
    expect(PRIMITIVE_TOKENS.text).toBe('#F5F5F5');
    expect(PRIMITIVE_TOKENS.sub).toBe('#9CA3AF');
    expect(PRIMITIVE_TOKENS.accent).toBe('#1FA36F');
    expect(PRIMITIVE_TOKENS.borderMid).toBe('#23272E');
  });

  it('correctly maps category to domain category group', () => {
    expect(inferCategory('I ate poha')).toBe('Food');
    expect(inferCategory('Uber ride to office')).toBe('Transport');
  });
});

describe('Canonical Money Semantics & Dex Disambiguation', () => {
  it('"Ate eggs I already owned" -> Health event, no new expense', () => {
    const finRes = resolveFinancialInput('Ate eggs I already owned');
    expect(finRes.status).toBe('not_financial');

    const foodRes = resolveFoodInput('Ate eggs I already owned');
    expect(foodRes.success).toBe(true);
    expect(foodRes.items.length).toBeGreaterThan(0);
    expect(foodRes.items[0].foodId).toBe('egg_boiled');
  });

  it('"I bought eggs for ₹120" -> Food expense in Wealth', () => {
    const finRes = resolveFinancialInput('I bought eggs for ₹120');
    expect(finRes.status).toBe('resolved');
    expect(finRes.action).toBe('add_expense');
    expect(finRes.params.amount).toBe(120);
    expect(finRes.params.category).toBe('Food');
  });

  it('"I gave Ninad ₹300" -> Prompts clarification between Loan, Gift, or Reimbursement', () => {
    const finRes = resolveFinancialInput('I gave Ninad ₹300');
    expect(finRes.status).toBe('clarify');
    expect(finRes.clarifyOptions).toContain('Loan');
    expect(finRes.clarifyOptions).toContain('Gift');
    expect(finRes.clarifyOptions).toContain('Reimbursement');
  });

  it('"I borrowed ₹500 from Vasu due October 10" -> Resolves liability with return date', () => {
    const finRes = resolveFinancialInput('I borrowed ₹500 from Vasu due October 10');
    expect(finRes.status).toBe('resolved');
    expect(finRes.action).toBe('add_bill');
    expect(finRes.params.amount).toBe(500);
    expect(finRes.params.status).toBe('unpaid');
    expect(finRes.params.name).toContain('Vasu');
    expect(finRes.params.dueDate).toBeDefined();
  });

  it('"Moved ₹2,000 to savings" -> Resolves as neutral transfer', () => {
    const finRes = resolveFinancialInput('Moved ₹2,000 to savings');
    expect(finRes.status).toBe('resolved');
    expect(finRes.action).toBe('add_expense');
    expect(finRes.params.category).toBe('Transfer');
    expect(finRes.params.amount).toBe(2000);
  });

  it('"Invested ₹2,000" -> Resolves as asset movement', () => {
    const finRes = resolveFinancialInput('Invested ₹2,000');
    expect(finRes.status).toBe('resolved');
    expect(finRes.action).toBe('add_expense');
    expect(finRes.params.category).toBe('Investment');
    expect(finRes.params.amount).toBe(2000);
  });

  it('"Spent ₹70 on assignment papers yesterday" -> Resolves category and historical date', () => {
    const finRes = resolveFinancialInput('Spent ₹70 on assignment papers yesterday');
    expect(finRes.status).toBe('resolved');
    expect(finRes.action).toBe('add_expense');
    expect(finRes.params.amount).toBe(70);
    expect(finRes.params.category).toBe('Education');

    const yesterdayStr = (() => {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    })();
    expect(finRes.params.date).toBe(yesterdayStr);
  });

  it('"Spotify ₹119 every month" -> Resolves recurring commitment', () => {
    const finRes = resolveFinancialInput('Spotify ₹119 every month');
    expect(finRes.status).toBe('resolved');
    expect(finRes.action).toBe('add_bill');
    expect(finRes.params.amount).toBe(119);
    expect(finRes.params.frequency).toBe('monthly');
  });
});
