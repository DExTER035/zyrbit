/**
 * Zyrbit Wealth Money State Engine Tests
 * Pure unit tests. Zero network/database. Uses Vitest.
 */
import { describe, it, expect } from 'vitest';
import { computeMoneyState, ZONE_MAP, ZONES } from '../engines/wealth/moneyState.js';
import { parseCurrencyAmount, inferCategory, resolveFinancialInput } from '../dex/resolvers/moneyResolver.js';
import { computeBurnRateAndRunway } from '../engines/wealth/wealthCalculator.js';

const TODAY = '2026-09-28';

const mkExp = (amount, category = 'Food', expense_date = TODAY) => ({
  id: Math.random().toString(36),
  amount, category, expense_date, note: '',
});

const mkInc = (amount, source = 'Salary', income_date = TODAY) => ({
  id: Math.random().toString(36),
  amount, source, income_date,
});

const mkBill = (amount, status = 'unpaid', due_date = TODAY, name = 'Rent') => ({
  id: Math.random().toString(36),
  name, amount, status, due_date, frequency: 'monthly',
});

const baseSettings = { monthly_budget: 15000, currency: 'INR' };

// ─── 1. Empty State ───────────────────────────────────────────────────────────

describe('computeMoneyState — empty', () => {
  it('returns zeroes when no data', () => {
    const s = computeMoneyState({ today: TODAY });
    expect(s.liquidCash).toBe(0);
    expect(s.monthSpend).toBe(0);
    expect(s.safeToSpendDaily).toBe(0);
    expect(s.runwayDays).toBeNull();
    expect(s.runwayHasData).toBe(false);
  });
  it('safe-to-spend status is zero with no income', () => {
    const s = computeMoneyState({ today: TODAY });
    expect(s.safeToSpendStatus).toBe('zero');
  });
});

// ─── 2. Basic flow ────────────────────────────────────────────────────────────

describe('computeMoneyState — basic', () => {
  it('liquidCash = income - expenses', () => {
    const s = computeMoneyState({ incomes: [mkInc(35000)], expenses: [mkExp(5000)], today: TODAY });
    expect(s.liquidCash).toBe(30000);
  });
  it('monthSpend only includes current month', () => {
    const expenses = [mkExp(5000, 'Food', TODAY), mkExp(2000, 'Food', '2026-08-15')];
    const s = computeMoneyState({ expenses, today: TODAY });
    expect(s.monthSpend).toBe(5000);
  });
  it('todaySpend sums only today', () => {
    const expenses = [mkExp(500, 'Food', TODAY), mkExp(200, 'Food', TODAY), mkExp(1000, 'Food', '2026-09-20')];
    const s = computeMoneyState({ expenses, today: TODAY });
    expect(s.todaySpend).toBe(700);
  });
});

// ─── 3. Safe-to-Spend ─────────────────────────────────────────────────────────

describe('safeToSpendDaily', () => {
  it('is positive with positive cash and budget', () => {
    const s = computeMoneyState({ incomes: [mkInc(30000)], expenses: [mkExp(5000)], settings: baseSettings, today: TODAY });
    expect(s.safeToSpendDaily).toBeGreaterThan(0);
  });
  it('is 0 when all cash reserved for bills', () => {
    const s = computeMoneyState({ incomes: [mkInc(10000)], bills: [mkBill(12000, 'unpaid', '2026-09-30')], today: TODAY });
    expect(s.safeToSpendDaily).toBe(0);
    expect(s.safeToSpendStatus).toBe('constrained');
  });
  it('is 0 when budget limit reached', () => {
    const s = computeMoneyState({ incomes: [mkInc(30000)], expenses: [mkExp(15000)], settings: { monthly_budget: 15000 }, today: TODAY });
    expect(s.safeToSpendDaily).toBe(0);
    expect(s.safeToSpendStatus).toBe('constrained');
  });
  it('decreases when bill is added', () => {
    const incomes = [mkInc(20000)];
    const a = computeMoneyState({ incomes, settings: baseSettings, today: TODAY });
    const b = computeMoneyState({ incomes, bills: [mkBill(8000, 'unpaid', '2026-09-30')], settings: baseSettings, today: TODAY });
    expect(b.safeToSpendDaily).toBeLessThan(a.safeToSpendDaily);
  });
  it('increases when bill is marked paid', () => {
    const incomes = [mkInc(20000)];
    const a = computeMoneyState({ incomes, bills: [mkBill(5000, 'unpaid', '2026-09-30')], today: TODAY });
    const b = computeMoneyState({ incomes, bills: [mkBill(5000, 'paid',   '2026-09-30')], today: TODAY });
    expect(b.safeToSpendDaily).toBeGreaterThan(a.safeToSpendDaily);
  });
  it('never NaN or Infinity even on last day', () => {
    const s = computeMoneyState({ incomes: [mkInc(1)], today: '2026-09-30' });
    expect(isFinite(s.safeToSpendDaily)).toBe(true);
    expect(isNaN(s.safeToSpendDaily)).toBe(false);
  });
});

// ─── 4. Unencumbered Cash ─────────────────────────────────────────────────────

describe('unencumberedCash', () => {
  it('equals liquidCash when no bills', () => {
    const s = computeMoneyState({ incomes: [mkInc(20000)], expenses: [mkExp(3000)], today: TODAY });
    expect(s.unencumberedCash).toBe(s.liquidCash);
  });
  it('equals liquidCash minus unpaid bills', () => {
    const s = computeMoneyState({ incomes: [mkInc(20000)], bills: [mkBill(5000, 'unpaid', '2026-09-30')], today: TODAY });
    expect(s.unencumberedCash).toBe(15000);
  });
  it('never negative', () => {
    const s = computeMoneyState({ incomes: [mkInc(1000)], bills: [mkBill(5000, 'unpaid', '2026-09-30')], today: TODAY });
    expect(s.unencumberedCash).toBe(0);
  });
  it('paid bills NOT counted in committed total', () => {
    const s = computeMoneyState({ incomes: [mkInc(20000)], bills: [mkBill(5000, 'paid', '2026-09-30')], today: TODAY });
    expect(s.upcomingBillTotal).toBe(0);
    expect(s.unencumberedCash).toBe(20000);
  });
});

// ─── 5. Runway ────────────────────────────────────────────────────────────────

describe('runwayDays', () => {
  it('is null with fewer than 3 recent expenses', () => {
    const s = computeMoneyState({ incomes: [mkInc(30000)], expenses: [mkExp(1000), mkExp(2000)], today: TODAY });
    expect(s.runwayDays).toBeNull();
    expect(s.runwayHasData).toBe(false);
  });
  it('is null with zero expenses', () => {
    const s = computeMoneyState({ incomes: [mkInc(50000)], today: TODAY });
    expect(s.runwayDays).toBeNull();
  });
  it('is 0 when liquid cash is 0', () => {
    const expenses = [mkExp(1000), mkExp(2000), mkExp(3000), mkExp(500), mkExp(800)];
    const s = computeMoneyState({ expenses, today: TODAY });
    expect(s.runwayDays).toBe(0);
  });
  it('is positive when enough data and positive cash', () => {
    const incomes  = [mkInc(100000, 'Salary', '2026-09-01')];
    const expenses = [
      mkExp(3000, 'Food', '2026-09-05'), mkExp(2000, 'Food', '2026-09-10'),
      mkExp(1500, 'Food', '2026-09-15'), mkExp(1000, 'Food', '2026-09-20'),
      mkExp(2500, 'Food', '2026-09-25'),
    ];
    const s = computeMoneyState({ incomes, expenses, today: TODAY });
    expect(s.runwayHasData).toBe(true);
    expect(s.runwayDays).toBeGreaterThan(0);
  });
  it('NEVER 999, 9999, or Infinity', () => {
    const s = computeMoneyState({ incomes: [mkInc(999999)], today: TODAY });
    expect(s.runwayDays).toBeNull();
    expect(s.runwayDays).not.toBe(999);
    expect(s.runwayDays).not.toBe(Infinity);
  });
});

// ─── 6. Spending Pace ─────────────────────────────────────────────────────────

describe('spendingPace', () => {
  it('null when no budget', () => {
    const s = computeMoneyState({ today: TODAY });
    expect(s.spendingPace).toBeNull();
  });
  it('exceeded when spend >= budget', () => {
    const s = computeMoneyState({ expenses: [mkExp(15001)], settings: { monthly_budget: 15000 }, today: TODAY });
    expect(s.spendingPace?.status).toBe('exceeded');
  });
});

// ─── 7. Zone Breakdown ────────────────────────────────────────────────────────

describe('zoneBreakdown', () => {
  it('always 4 zones', () => {
    const s = computeMoneyState({ today: TODAY });
    expect(s.zoneBreakdown.length).toBe(4);
  });
  it('Food maps to needs', () => {
    const s = computeMoneyState({ expenses: [mkExp(5000, 'Food', TODAY)], today: TODAY });
    expect(s.zoneBreakdown.find(z => z.key === 'needs').amount).toBe(5000);
  });
  it('Leisure maps to joy', () => {
    const s = computeMoneyState({ expenses: [mkExp(2000, 'Leisure', TODAY)], today: TODAY });
    expect(s.zoneBreakdown.find(z => z.key === 'joy').amount).toBe(2000);
  });
  it('pct sum <= 101 (rounding tolerance)', () => {
    const expenses = [mkExp(5000, 'Food', TODAY), mkExp(2000, 'Leisure', TODAY), mkExp(1000, 'Education', TODAY)];
    const s = computeMoneyState({ expenses, today: TODAY });
    const total = s.zoneBreakdown.reduce((sum, z) => sum + z.pct, 0);
    expect(total).toBeLessThanOrEqual(101);
  });
});

// ─── 8. Edge Cases ────────────────────────────────────────────────────────────

describe('edge cases', () => {
  it('negative amount expenses excluded', () => {
    const s = computeMoneyState({ expenses: [{ id:'x', amount: -500, category: 'Food', expense_date: TODAY }], today: TODAY });
    expect(s.monthSpend).toBe(0);
  });
  it('null settings handled', () => {
    const s = computeMoneyState({ settings: null, today: TODAY });
    expect(s.monthlyBudget).toBeNull();
    expect(s.spendingPace).toBeNull();
  });
  it('daysLeft always >= 1', () => {
    const s = computeMoneyState({ today: '2026-09-30' });
    expect(s.daysLeft).toBeGreaterThanOrEqual(1);
  });
});

// ─── 9. wealthCalculator (legacy no-999 check) ───────────────────────────────

describe('computeBurnRateAndRunway (legacy)', () => {
  it('returns null (not 999) when has cash but no burn data', () => {
    const { runwayDays } = computeBurnRateAndRunway([], 10000, '2026-09-01');
    expect(runwayDays).toBeNull();
    expect(runwayDays).not.toBe(999);
  });
  it('returns 0 when cash is 0', () => {
    const { runwayDays } = computeBurnRateAndRunway([], 0, '2026-09-01');
    expect(runwayDays).toBe(0);
  });
});

// ─── 10. moneyResolver ────────────────────────────────────────────────────────

describe('parseCurrencyAmount', () => {
  it('parses ₹500',     () => expect(parseCurrencyAmount('₹500')).toBe(500));
  it('parses Rs 200',   () => expect(parseCurrencyAmount('Rs 200')).toBe(200));
  it('parses 50k',      () => expect(parseCurrencyAmount('50k')).toBe(50000));
  it('parses ₹15,000',  () => expect(parseCurrencyAmount('₹15,000')).toBe(15000));
  it('null for empty',  () => expect(parseCurrencyAmount('')).toBeNull());
});

describe('resolveFinancialInput', () => {
  it('resolves expense', () => {
    const r = resolveFinancialInput('Add ₹500 food expense');
    expect(r.status).toBe('resolved');
    expect(r.action).toBe('add_expense');
    expect(r.params.amount).toBe(500);
  });
  it('resolves income', () => {
    const r = resolveFinancialInput('got paid ₹35000 salary');
    expect(r.status).toBe('resolved');
    expect(r.action).toBe('add_income');
    expect(r.params.amount).toBe(35000);
  });
  it('resolves bill', () => {
    const r = resolveFinancialInput('add ₹799 wifi bill');
    expect(r.status).toBe('resolved');
    expect(r.action).toBe('add_bill');
  });
  it('clarifies when amount missing', () => {
    const r = resolveFinancialInput('I spent money on lunch');
    expect(r.status).toBe('clarify');
  });
  it('not_financial for sleep', () => {
    const r = resolveFinancialInput('I slept 6 hours');
    expect(r.status).toBe('not_financial');
  });
});

describe('inferCategory', () => {
  it('Food from lunch',     () => expect(inferCategory('lunch')).toBe('Food'));
  it('Transport from cab',  () => expect(inferCategory('cab')).toBe('Transport'));
  it('Housing from rent',   () => expect(inferCategory('rent')).toBe('Housing'));
  it('General for unknown', () => expect(inferCategory('random stuff')).toBe('General'));
  it('Food from poha',      () => expect(inferCategory('poha')).toBe('Food'));
  it('Education from assignment', () => expect(inferCategory('assignment papers')).toBe('Education'));
});

// ─── 11. Money State V1 Features ──────────────────────────────────────────────

describe('Money State V1 — Flow, Assets & Commitments', () => {
  it('calibrates status honestly (false if no income)', () => {
    const s = computeMoneyState({ expenses: [mkExp(500)], today: TODAY });
    expect(s.isCalibrated).toBe(false);
  });

  it('calibrates status honestly (true if positive liquid cash)', () => {
    const s = computeMoneyState({ incomes: [mkInc(18500)], expenses: [mkExp(4000)], today: TODAY });
    expect(s.isCalibrated).toBe(true);
    expect(s.assets.cash).toBe(14500);
  });

  it('computes semantic flow categories accurately', () => {
    const expenses = [
      mkExp(30, 'Food', TODAY),
      mkExp(30, 'Transport', TODAY),
      mkExp(300, 'Lend', TODAY),
      mkExp(1000, 'Transfer', TODAY),
      mkExp(2000, 'Investment', TODAY),
    ];
    const incomes = [
      mkInc(8000, 'Salary', TODAY),
      mkInc(200, 'Refund', TODAY),
    ];
    const s = computeMoneyState({ incomes, expenses, today: TODAY });

    expect(s.flow.income).toBe(8000);
    expect(s.flow.spent).toBe(60); // 30 food + 30 transport
    expect(s.flow.lent).toBe(300);
    expect(s.flow.transfers).toBe(1000);
    expect(s.flow.invested).toBe(2000);
    expect(s.flow.refunds).toBe(200);
  });

  it('tracks money promises (receivables) separately from payable commitments', () => {
    const bills = [
      { id: '1', name: 'Rent', amount: 2500, due_date: '2026-10-05', status: 'unpaid', frequency: 'monthly' },
      { id: '2', name: 'Spotify', amount: 119, due_date: '2026-10-08', status: 'unpaid', frequency: 'monthly' },
      { id: '3', name: 'Ninad owes you', amount: 300, due_date: '2026-10-10', status: 'receivable', frequency: 'one_off' },
    ];
    const s = computeMoneyState({ bills, today: TODAY });

    // Payable commitments should NOT include receivables
    expect(s.next30Commitments.length).toBe(2);
    expect(s.committedNext30Total).toBe(2619);

    // Receivables are money promises
    expect(s.moneyPromises.length).toBe(1);
    expect(s.moneyPromises[0].amount).toBe(300);
    expect(s.assets.owedToYou).toBe(300);
  });

  it('creates unified recent events in chronological order', () => {
    const expenses = [
      { id: 'e1', amount: 30, category: 'Food', note: 'Poha', expense_date: '2026-09-28' },
      { id: 'e2', amount: 30, category: 'Transport', note: 'Metro', expense_date: '2026-09-27' },
    ];
    const incomes = [
      { id: 'i1', amount: 3000, source: 'Editing', note: 'Editing video', income_date: '2026-09-28' },
    ];
    const s = computeMoneyState({ incomes, expenses, today: TODAY });

    expect(s.unifiedRecent.length).toBe(3);
    expect(s.unifiedRecent[0].amount).toBe(30); // Poha or Editing on 2026-09-28
    expect(s.unifiedRecent[2].amount).toBe(30); // Metro on 2026-09-27
  });
});

describe('Money State V1 — Natural Language Resolution', () => {
  it('resolves "Poha 30" to Food expense', () => {
    const r = resolveFinancialInput('Poha 30');
    expect(r.status).toBe('resolved');
    expect(r.action).toBe('add_expense');
    expect(r.params.amount).toBe(30);
    expect(r.params.category).toBe('Food');
  });

  it('resolves "Metro 30" to Transport expense', () => {
    const r = resolveFinancialInput('Metro 30');
    expect(r.status).toBe('resolved');
    expect(r.action).toBe('add_expense');
    expect(r.params.amount).toBe(30);
    expect(r.params.category).toBe('Transport');
  });

  it('resolves "Ninad owes me 300" to Lend receivable', () => {
    const r = resolveFinancialInput('Ninad owes me 300');
    expect(r.status).toBe('resolved');
    expect(r.action).toBe('add_expense');
    expect(r.params.amount).toBe(300);
    expect(r.params.category).toBe('Lend');
    expect(r.params.note).toContain('Ninad');
  });

  it('resolves "Took 500 from Vasu, return Oct 10" to liability commitment', () => {
    const r = resolveFinancialInput('Took 500 from Vasu, return Oct 10');
    expect(r.status).toBe('resolved');
    expect(r.action).toBe('add_bill');
    expect(r.params.amount).toBe(500);
    expect(r.params.name).toContain('Vasu');
  });

  it('resolves "Spotify 119 every month" to recurring monthly bill', () => {
    const r = resolveFinancialInput('Spotify 119 every month');
    expect(r.status).toBe('resolved');
    expect(r.action).toBe('add_bill');
    expect(r.params.amount).toBe(119);
    expect(r.params.frequency).toBe('monthly');
  });

  it('resolves "Made 3000 from editing" to income', () => {
    const r = resolveFinancialInput('Made 3000 from editing');
    expect(r.status).toBe('resolved');
    expect(r.action).toBe('add_income');
    expect(r.params.amount).toBe(3000);
    expect(r.params.source).toBe('Editing');
  });

  it('resolves "Invested 2000 today" to Investment expense', () => {
    const r = resolveFinancialInput('Invested 2000 today');
    expect(r.status).toBe('resolved');
    expect(r.action).toBe('add_expense');
    expect(r.params.amount).toBe(2000);
    expect(r.params.category).toBe('Investment');
  });

  it('resolves "Moved ₹2,000 to savings" to Transfer', () => {
    const r = resolveFinancialInput('Moved ₹2,000 to savings');
    expect(r.status).toBe('resolved');
    expect(r.action).toBe('add_expense');
    expect(r.params.amount).toBe(2000);
    expect(r.params.category).toBe('Transfer');
    expect(r.params.note).toContain('Savings');
  });

  it('resolves "Borrowed ₹500 from Vasu, return Oct 10" with parsed due date', () => {
    const r = resolveFinancialInput('Borrowed ₹500 from Vasu, return Oct 10');
    expect(r.status).toBe('resolved');
    expect(r.action).toBe('add_bill');
    expect(r.params.amount).toBe(500);
    expect(r.params.name).toContain('Vasu');
    expect(r.params.dueDate).toContain('10');
  });

  it('parses historical dates e.g. "I spent ₹500 on September 20"', () => {
    const r = resolveFinancialInput('I spent ₹500 on September 20');
    expect(r.status).toBe('resolved');
    expect(r.action).toBe('add_expense');
    expect(r.params.amount).toBe(500);
    expect(r.params.date).toContain('-09-20');
  });

  it('parses historical income e.g. "I earned ₹3,000 last month from editing"', () => {
    const r = resolveFinancialInput('I earned ₹3,000 last month from editing');
    expect(r.status).toBe('resolved');
    expect(r.action).toBe('add_income');
    expect(r.params.amount).toBe(3000);
    expect(r.params.source).toBe('Editing');
    expect(r.params.date).toBeDefined();
  });

  it('asks for clarification on ambiguous "Gave Ninad 300"', () => {
    const r = resolveFinancialInput('Gave Ninad 300');
    expect(r.status).toBe('clarify');
    expect(r.question).toBe('Was this a loan, gift, or reimbursement?');
    expect(r.options).toContain('Loan');
    expect(r.options).toContain('Gift');
    expect(r.options).toContain('Reimbursement');
  });

  it('treats "Ate eggs I already owned" as non-financial event', () => {
    const r = resolveFinancialInput('Ate eggs I already owned');
    expect(r.status).toBe('not_financial');
  });
});

import { resolveConversationalQuery } from '../dex/resolvers/conversationalResolver.js';

describe('Dex Money Intelligence & Decision Queries', () => {
  const mockContext = {
    wealth: {
      liquidCash: 25000,
      unencumberedCash: 18000,
      upcomingBillTotal: 7000,
      spentToday: 30,
      totalExpensesMonth: 4500,
      totalIncomeMonth: 30000,
      moneyPromises: [
        { person: 'Ninad', amount: 300, dueDate: '2026-10-10' },
      ],
      liabilities: [
        { person: 'Vasu', amount: 500, dueDate: '2026-10-10' },
      ],
      commitmentsThisWeek: [
        { name: 'Phone bill', amount: 2600, dueDate: '2026-10-06' },
      ],
      subscriptions: [
        { name: 'Netflix', amount: 199, frequency: 'monthly' },
      ],
      zoneBreakdown: [
        { label: 'Food', amount: 3000, pct: 67 },
        { label: 'Transport', amount: 1500, pct: 33 },
      ],
    },
  };

  it('answers "Can I afford ₹2,000?" affirmatively when within unencumbered cushion', () => {
    const res = resolveConversationalQuery({ userMessage: 'Can I afford ₹2,000?', context: mockContext });
    expect(res.isHandled).toBe(true);
    expect(res.displayMessage).toContain('Yes');
    expect(res.displayMessage).toContain('18,000');
  });

  it('answers "Who owes me money?" accurately from moneyPromises', () => {
    const res = resolveConversationalQuery({ userMessage: 'Who owes me money?', context: mockContext });
    expect(res.isHandled).toBe(true);
    expect(res.displayMessage).toContain('Ninad');
    expect(res.displayMessage).toContain('300');
  });

  it('answers "Who do I owe?" from personal liabilities', () => {
    const res = resolveConversationalQuery({ userMessage: 'Who do I owe?', context: mockContext });
    expect(res.isHandled).toBe(true);
    expect(res.displayMessage).toContain('Vasu');
    expect(res.displayMessage).toContain('500');
  });

  it('answers "What am I committed to this week?"', () => {
    const res = resolveConversationalQuery({ userMessage: 'What am I committed to this week?', context: mockContext });
    expect(res.isHandled).toBe(true);
    expect(res.displayMessage).toContain('Phone bill');
    expect(res.displayMessage).toContain('2,600');
  });

  it('answers "Where did my money go this month?" with category breakdown', () => {
    const res = resolveConversationalQuery({ userMessage: 'Where did my money go this month?', context: mockContext });
    expect(res.isHandled).toBe(true);
    expect(res.displayMessage).toContain('Food');
    expect(res.displayMessage).toContain('4,500');
  });

  it('answers "What subscriptions are coming?"', () => {
    const res = resolveConversationalQuery({ userMessage: 'What subscriptions are coming?', context: mockContext });
    expect(res.isHandled).toBe(true);
    expect(res.displayMessage).toContain('Netflix');
    expect(res.displayMessage).toContain('199');
  });

  it('answers "How much money is actually available?"', () => {
    const res = resolveConversationalQuery({ userMessage: 'How much money is actually available?', context: mockContext });
    expect(res.isHandled).toBe(true);
    expect(res.displayMessage).toContain('18,000');
    expect(res.displayMessage).toContain('25,000');
  });
});

describe('Money State V1 — Master Reconciliation Verification Scenario', () => {
  it('balances starting 5000, food 30, groceries 450, income 2000, lend 500, friend returns 200, transfer 1000, transport 300, refund 100, borrow 500, repay 200', () => {
    const TODAY = '2026-10-04';
    const incomes = [
      { id: 'i1', amount: 5000, source: 'Starting Balance', income_date: TODAY },
      { id: 'i2', amount: 2000, source: 'Income', income_date: TODAY },
      { id: 'i3', amount: 200, source: 'Friend return', note: 'returned', income_date: TODAY },
      { id: 'i4', amount: 100, source: 'Refund', note: 'refund', income_date: TODAY },
      { id: 'i5', amount: 500, source: 'Borrow', note: 'borrowed', income_date: TODAY },
    ];
    const expenses = [
      { id: 'e1', amount: 30, category: 'Food', expense_date: TODAY },
      { id: 'e2', amount: 450, category: 'Food', note: 'Groceries', expense_date: TODAY },
      { id: 'e3', amount: 500, category: 'Lend', note: 'loan to friend', expense_date: TODAY },
      { id: 'e4', amount: 1000, category: 'Transfer', note: 'to savings', expense_date: TODAY },
      { id: 'e5', amount: 300, category: 'Transport', expense_date: TODAY },
      { id: 'e6', amount: 200, category: 'Debt', note: 'repay debt', expense_date: TODAY },
    ];
    const bills = [
      { id: 'b1', name: 'Friend owes you', amount: 300, status: 'receivable', due_date: TODAY },
      { id: 'b2', name: 'Debt to repay', amount: 300, status: 'unpaid', due_date: TODAY },
    ];

    const res = computeMoneyState({ incomes, expenses, bills, today: TODAY });

    expect(res.liquidCash).toBe(5320);
    expect(res.assets.savings).toBe(1000);
    expect(res.assets.owedToYou).toBe(300);
    expect(res.liabilities.iOweTotal).toBe(300);
    expect(res.assets.netAssets).toBe(6320);
    expect(res.flow.grossLifestyleSpend).toBe(780);
    expect(res.flow.netSpending).toBe(680);
  });
});

