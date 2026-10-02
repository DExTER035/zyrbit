import { describe, it, expect } from 'vitest';
import {
  assembleDayReceipt,
  formatReceiptDate,
  sanitizeReceiptForShare,
} from '../services/dayReceiptService.js';

describe('Day Receipt Engine & Synthesis', () => {
  const TEST_DATE = '2026-10-02';

  // ── 1. EMPTY DAY ─────────────────────────────────────────────────────────
  it('handles an empty day without fabricating metrics or scores', () => {
    const receipt = assembleDayReceipt({
      date: TEST_DATE,
    });

    expect(receipt.date).toBe(TEST_DATE);
    expect(receipt.metrics).toHaveLength(0);
    expect(receipt.isQuietDay).toBe(true);
    expect(receipt.interpretation).toBe('Not enough captured yet.');
    expect(receipt.tomorrow).toBeNull();
    expect(receipt.domainsTouched).toHaveLength(0);
  });

  // ── 2. NORMAL / QUIET DAY ────────────────────────────────────────────────
  it('handles a quiet day with single completed habit', () => {
    const receipt = assembleDayReceipt({
      date: TEST_DATE,
      habits: [{ id: 'h1', name: 'Read 30 pages' }],
      activity: [{ habit_id: 'h1', status: 'completed', completed_date: TEST_DATE }],
    });

    expect(receipt.metrics).toHaveLength(1);
    expect(receipt.metrics[0].label).toBe('Read 30 pages');
    expect(receipt.metrics[0].value).toBe('done');
    expect(receipt.interpretation).toContain('Quiet day');
    expect(receipt.tomorrow).toBe('one deep-work block is enough');
  });

  // ── 3. HEALTH-HEAVY DAY ──────────────────────────────────────────────────
  it('synthesizes a health-heavy day (sleep + water + workout + meal)', () => {
    const receipt = assembleDayReceipt({
      date: TEST_DATE,
      sleepLogs: [{ sleep_date: TEST_DATE, duration_hours: 7.5, quality: 4 }],
      waterLogs: [{ log_date: TEST_DATE, amount_ml: 2000 }],
      foodLogs: [{ log_date: TEST_DATE, name: 'Eggs & toast', calories: 450 }],
      moveLogs: [{ log_date: TEST_DATE, activity_type: 'Morning Run', active_minutes: 35 }],
    });

    expect(receipt.domainsTouched).toContain('health');
    const sleepMetric = receipt.metrics.find((m) => m.id === 'sleep');
    const waterMetric = receipt.metrics.find((m) => m.id === 'water');
    const fuelMetric = receipt.metrics.find((m) => m.id === 'food');
    const moveMetric = receipt.metrics.find((m) => m.id === 'movement');

    expect(sleepMetric).toBeDefined();
    expect(sleepMetric.value).toBe('7h 30m');
    expect(waterMetric.value).toBe('8 / 8');
    expect(fuelMetric.value).toBe('Eggs & toast');
    expect(moveMetric.value).toBe('35m');
  });

  // ── 4. GROWTH-HEAVY DAY (FOCUS + TASKS) ───────────────────────────────────
  it('synthesizes a strong study/focus day with deep focus duration', () => {
    const receipt = assembleDayReceipt({
      date: TEST_DATE,
      focusSessions: [
        { session_date: TEST_DATE, duration_minutes: 80, notes: 'System design' },
        { session_date: TEST_DATE, duration_minutes: 45, notes: 'DSA' },
      ],
      tasks: [
        { name: 'System design - load balancers', status: 'done', completed_at: `${TEST_DATE}T14:00:00` },
      ],
    });

    expect(receipt.domainsTouched).toContain('growth');
    const focusMetric = receipt.metrics.find((m) => m.id === 'focus');
    expect(focusMetric.value).toBe('2h 5m');

    const topicMetric = receipt.metrics.find((m) => m.id === 'focus_topic');
    expect(topicMetric).toBeDefined();

    const taskMetric = receipt.metrics.find((m) => m.id === 'task_single');
    expect(taskMetric.value).toBe('completed');
  });

  // ── 5. WEALTH-HEAVY DAY ──────────────────────────────────────────────────
  it('synthesizes financial signals without duplicating or inventing data', () => {
    const receipt = assembleDayReceipt({
      date: TEST_DATE,
      expenses: [
        { amount: 500, expense_date: TEST_DATE, category: 'Shopping' },
        { amount: 200, expense_date: TEST_DATE, category: 'Food' },
      ],
      incomes: [
        { amount: 3000, income_date: TEST_DATE, source: 'Freelance Editing' },
      ],
      currencySymbol: '₹',
    });

    expect(receipt.domainsTouched).toContain('wealth');
    const spentMetric = receipt.metrics.find((m) => m.id === 'spent');
    const earnedMetric = receipt.metrics.find((m) => m.id === 'earned');

    expect(spentMetric.value).toBe('₹700');
    expect(earnedMetric.value).toBe('₹3,000');
  });

  // ── 6. POHA ₹30 CROSS-DOMAIN CASE ────────────────────────────────────────
  it('handles "I ate poha for ₹30" correctly across Health and Wealth without double counting', () => {
    const receipt = assembleDayReceipt({
      date: TEST_DATE,
      foodLogs: [{ log_date: TEST_DATE, name: 'Poha', calories: 250 }],
      expenses: [{ amount: 30, expense_date: TEST_DATE, category: 'Food', note: 'poha' }],
      currencySymbol: '₹',
    });

    expect(receipt.domainsTouched).toContain('health');
    expect(receipt.domainsTouched).toContain('wealth');

    const fuelMetric = receipt.metrics.find((m) => m.id === 'food');
    const spentMetric = receipt.metrics.find((m) => m.id === 'spent');

    expect(fuelMetric.value).toBe('Poha');
    expect(spentMetric.value).toBe('₹30');
    expect(receipt.metrics).toHaveLength(2);
  });

  // ── 7. NINAD OWES ₹300 RECEIVABLE ────────────────────────────────────────
  it('properly represents receivables as money promises', () => {
    const receipt = assembleDayReceipt({
      date: TEST_DATE,
      bills: [
        { status: 'receivable', name: 'Ninad owes me', amount: 300, due_date: TEST_DATE },
      ],
      currencySymbol: '₹',
    });

    const owedMetric = receipt.metrics.find((m) => m.id === 'owed_to_me');
    expect(owedMetric).toBeDefined();
    expect(owedMetric.value).toBe('₹300');
  });

  // ── 8. COMPOUND DAY: "Slept badly, studied DSA for 45m, finished Wealth UI" ─
  it('matches compound state: "On pace, under-fuelled" or "Good progress. Recovery was light"', () => {
    const receipt = assembleDayReceipt({
      date: TEST_DATE,
      sleepLogs: [{ sleep_date: TEST_DATE, duration_hours: 5.67, quality: 2 }],
      waterLogs: [{ log_date: TEST_DATE, amount_ml: 750 }],
      focusSessions: [{ session_date: TEST_DATE, duration_minutes: 80 }],
      tasks: [{ name: 'Wealth UI', status: 'done', completed_at: `${TEST_DATE}T12:00:00` }],
      expenses: [{ amount: 30, expense_date: TEST_DATE }],
      bills: [{ status: 'receivable', name: 'Ninad owes you', amount: 300, due_date: TEST_DATE }],
      currencySymbol: '₹',
    });

    expect(receipt.metrics.map((m) => m.label)).toContain('Slept');
    expect(receipt.metrics.map((m) => m.label)).toContain('Deep focus');
    expect(receipt.metrics.map((m) => m.label)).toContain('Spent');
    expect(receipt.metrics.map((m) => m.label)).toContain('Owed to me');

    expect(receipt.interpretation).toBe('On pace,\nunder-fuelled.');
    expect(receipt.tomorrow).toBe('tomorrow is already softer');
  });

  // ── 9. PRIVACY SANITIZATION ──────────────────────────────────────────────
  it('sanitizes financial figures when masked for sharing', () => {
    const rawReceipt = assembleDayReceipt({
      date: TEST_DATE,
      sleepLogs: [{ sleep_date: TEST_DATE, duration_hours: 6.5 }],
      expenses: [{ amount: 1500, expense_date: TEST_DATE }],
      bills: [{ status: 'receivable', name: 'Loan', amount: 4000, due_date: TEST_DATE }],
      currencySymbol: '₹',
    });

    const sanitized = sanitizeReceiptForShare(rawReceipt, { hideMoney: true });
    expect(sanitized.isSanitized).toBe(true);

    const spent = sanitized.metrics.find((m) => m.id === 'spent');
    const owed = sanitized.metrics.find((m) => m.id === 'owed_to_me');
    const sleep = sanitized.metrics.find((m) => m.id === 'sleep');

    expect(spent.value).toBe('Logged');
    expect(owed.value).toBe('Logged');
    expect(sleep.value).toBe('6h 30m'); // Non-financial preserved
  });

  // ── 10. DATE FORMATTING ──────────────────────────────────────────────────
  it('formats header date in uppercase canonical receipt style', () => {
    const formatted = formatReceiptDate('2026-10-02');
    expect(formatted).toBe('DAY RECEIPT · FRI 2 OCT');
  });

  // ── 11. HISTORICAL DATE INDEPENDENCE ─────────────────────────────────────
  it('reconstructs historical dates accurately without today assumption', () => {
    const pastDate = '2026-09-20';
    const pastReceipt = assembleDayReceipt({
      date: pastDate,
      focusSessions: [{ session_date: pastDate, duration_minutes: 90 }],
    });

    expect(pastReceipt.date).toBe(pastDate);
    expect(pastReceipt.dateFormatted).toBe('DAY RECEIPT · SUN 20 SEP');
    expect(pastReceipt.metrics[0].value).toBe('1h 30m');
  });

  // ── 12. HISTORICAL PROMISES RESOLUTION (OCT 2 VS OCT 6) ───────────────────
  it('correctly shows active receivable on Oct 2, but omits it on Oct 6 after being paid on Oct 5', () => {
    const historicalBills = [
      {
        id: 'rec-ninad',
        status: 'paid',
        name: 'Ninad owes me',
        amount: 300,
        due_date: '2026-10-02',
        created_at: '2026-10-02T10:00:00Z',
        paid_at: '2026-10-05T14:00:00Z',
      },
    ];

    // On Oct 2: Was owed (not paid yet)
    const oct2Receipt = assembleDayReceipt({
      date: '2026-10-02',
      bills: historicalBills,
      currencySymbol: '₹',
    });
    const oct2Owed = oct2Receipt.metrics.find((m) => m.id === 'owed_to_me');
    expect(oct2Owed).toBeDefined();
    expect(oct2Owed.value).toBe('₹300');

    // On Oct 6: Already paid on Oct 5, so should not show
    const oct6Receipt = assembleDayReceipt({
      date: '2026-10-06',
      bills: historicalBills,
      currencySymbol: '₹',
    });
    const oct6Owed = oct6Receipt.metrics.find((m) => m.id === 'owed_to_me');
    expect(oct6Owed).toBeUndefined();
  });

  // ── 13. PARTIAL / OFFLINE DATA ───────────────────────────────────────────
  it('handles partial domain data gracefully without crashing or fabricating', () => {
    const partialReceipt = assembleDayReceipt({
      date: TEST_DATE,
      expenses: [{ amount: 45, expense_date: TEST_DATE }],
      // All other domains empty/null
    });

    expect(partialReceipt.domainsTouched).toEqual(['wealth']);
    expect(partialReceipt.metrics).toHaveLength(1);
    expect(partialReceipt.metrics[0].label).toBe('Spent');
    expect(partialReceipt.metrics[0].value).toBe('₹45');
    expect(partialReceipt.interpretation).toContain('Quiet day');
  });
});
