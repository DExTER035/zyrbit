import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';

import { parsePaytmStatement, parseStatementDate } from '../services/statementParserService.js';
import { normalizeTransaction, extractCounterparty, generateFingerprint } from '../services/transactionNormalizer.js';
import { classifyTransaction } from '../services/transactionClassifier.js';
import { deduplicateTransactions, generateBatchCode } from '../services/statementImportService.js';
import { resolveConversationalQuery } from '../dex/resolvers/conversationalResolver.js';

// Helper to create in-memory XLSX binary buffer for tests
function createTestExcelBuffer(rows) {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Passbook');
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
}

describe('Connect Money V1 — Paytm Statement Import & Transaction Intelligence', () => {

  // ── 1. Valid Paytm Excel -> Transactions Parsed ───────────────────────────
  it('1. correctly parses a valid Paytm statement workbook with header offset', async () => {
    const rawData = [
      ['Paytm Payments Bank / Wallet Statement'],
      ['Generated On: 02-10-2026'],
      [],
      ['Date', 'Transaction Details', 'Order ID', 'Debit', 'Credit', 'Status'],
      ['02-10-2026 10:15:00', 'Paid to XYZ POHA', 'PTM1001', '30.00', '', 'SUCCESS'],
      ['02-10-2026 11:30:00', 'Metro Rail Recharge', 'PTM1002', '30.00', '', 'SUCCESS'],
      ['02-10-2026 13:00:00', 'Printing and Xerox', 'PTM1003', '70.00', '', 'SUCCESS'],
    ];

    const buffer = createTestExcelBuffer(rawData);
    const res = await parsePaytmStatement(buffer, 'Paytm_Statement.xlsx');

    expect(res.success).toBe(true);
    expect(res.rawTransactions).toHaveLength(3);
    expect(res.rawTransactions[0].amount).toBe(30);
    expect(res.rawTransactions[0].direction).toBe('out');
    expect(res.rawTransactions[0].sourceTransactionId).toBe('PTM1001');
    expect(res.rawTransactions[0].date).toBe('2026-10-02');
  });

  // ── 2. Empty Statement -> Graceful Empty State ─────────────────────────────
  it('2. handles empty statement gracefully without throwing errors', async () => {
    const buffer = createTestExcelBuffer([]);
    const res = await parsePaytmStatement(buffer, 'Empty.xlsx');

    expect(res.success).toBe(true);
    expect(res.rawTransactions).toEqual([]);
  });

  // ── 3. Invalid File -> Useful Error ────────────────────────────────────────
  it('3. returns useful error message for invalid or unrecognizable file format', async () => {
    const invalidBuffer = new Uint8Array([1, 2, 3, 4, 5]);
    const res = await parsePaytmStatement(invalidBuffer, 'Invalid.xlsx');

    expect(res.success).toBe(false);
    expect(res.error).toBeDefined();

    // Check PDF rejection
    const pdfRes = await parsePaytmStatement(invalidBuffer, 'statement.pdf');
    expect(pdfRes.success).toBe(false);
    expect(pdfRes.error).toContain('Excel (.xlsx/.xls) or CSV format');
  });

  // ── 4. Duplicate Statement -> No Duplicate Transactions ────────────────────
  it('4. deduplicates identical statement re-imports using fingerprinting', async () => {
    const candidateA = normalizeTransaction({
      sourceTransactionId: 'PTM9999',
      date: '2026-10-02',
      amount: 50,
      direction: 'out',
      rawDescription: 'Chai point',
    });

    const candidateB = normalizeTransaction({
      sourceTransactionId: 'PTM9999',
      date: '2026-10-02',
      amount: 50,
      direction: 'out',
      rawDescription: 'Chai point',
    });

    const res = await deduplicateTransactions('user-123', [candidateA]);
    expect(res[0].fingerprint).toBe(candidateB.fingerprint);
  });

  // ── 5. Duplicate Transaction ID -> No Duplicate ────────────────────────────
  it('5. detects duplicate transactions with matching sourceTransactionId', () => {
    const fp1 = generateFingerprint({ sourceTransactionId: 'UPI-TXN-12345678' });
    const fp2 = generateFingerprint({ sourceTransactionId: 'UPI-TXN-12345678' });

    expect(fp1).toBe(fp2);
    expect(fp1).toBe('paytm:upi-txn-12345678');
  });

  // ── 6. Food Transaction -> Food Expense ────────────────────────────────────
  it('6. classifies food merchant transactions as Food expense', () => {
    const tx = normalizeTransaction({
      rawDescription: 'Paid to XYZ POHA',
      amount: 30,
      direction: 'out',
    });

    const classified = classifyTransaction(tx);
    expect(classified.suggestedAction).toBe('add_expense');
    expect(classified.suggestedCategory).toBe('Food');
    expect(classified.resolutionState).toBe('resolved');
  });

  // ── 7. Transport Transaction -> Transport Expense ──────────────────────────
  it('7. classifies transit payments (Metro, Uber, Ola) as Transport expense', () => {
    const tx = normalizeTransaction({
      rawDescription: 'DMRC Metro Rail Travel',
      amount: 30,
      direction: 'out',
    });

    const classified = classifyTransaction(tx);
    expect(classified.suggestedAction).toBe('add_expense');
    expect(classified.suggestedCategory).toBe('Transport');
    expect(classified.resolutionState).toBe('resolved');
  });

  // ── 8. Education Transaction -> Education Expense ──────────────────────────
  it('8. classifies printing / xerox / course payments as Education expense', () => {
    const tx = normalizeTransaction({
      rawDescription: 'College Xerox Printing Center',
      amount: 70,
      direction: 'out',
    });

    const classified = classifyTransaction(tx);
    expect(classified.suggestedAction).toBe('add_expense');
    expect(classified.suggestedCategory).toBe('Education');
    expect(classified.resolutionState).toBe('resolved');
  });

  // ── 9. Incoming Transaction -> Income / Needs Review ───────────────────────
  it('9. classifies incoming payment from a person as needs_review for semantic clarity', () => {
    const tx = normalizeTransaction({
      rawDescription: 'Received from Vasu',
      amount: 500,
      direction: 'in',
    });

    const classified = classifyTransaction(tx);
    expect(classified.suggestedAction).toBe('add_income');
    expect(classified.resolutionState).toBe('needs_review');
    expect(classified.reviewReason).toContain('clarify');
  });

  // ── 10. Own-Account Transfer -> Transfer, Not Expense ──────────────────────
  it('10. classifies self transfer as Transfer without counting as everyday spending', () => {
    const tx = normalizeTransaction({
      rawDescription: 'Transfer to Savings A/C',
      amount: 2000,
      direction: 'out',
    });

    const classified = classifyTransaction(tx);
    expect(classified.suggestedAction).toBe('transfer');
    expect(classified.suggestedCategory).toBe('Transfer');
    expect(classified.resolutionState).toBe('resolved');
  });

  // ── 11. Investment Transaction -> Investment, Not Expense ──────────────────
  it('11. classifies Zerodha / SIP / Mutual fund transactions as Investment', () => {
    const tx = normalizeTransaction({
      rawDescription: 'Zerodha Broking Limited Coin SIP',
      amount: 1000,
      direction: 'out',
    });

    const classified = classifyTransaction(tx);
    expect(classified.suggestedAction).toBe('investment');
    expect(classified.suggestedCategory).toBe('Investment');
    expect(classified.resolutionState).toBe('resolved');
  });

  // ── 12. Refund -> Refund, Not Ordinary Income ──────────────────────────────
  it('12. classifies refunds / cashback as Refund rather than ordinary salary income', () => {
    const tx = normalizeTransaction({
      rawDescription: 'Swiggy Order Refund Reversal',
      amount: 180,
      direction: 'in',
    });

    const classified = classifyTransaction(tx);
    expect(classified.suggestedAction).toBe('refund');
    expect(classified.suggestedCategory).toBe('Refund');
    expect(classified.resolutionState).toBe('resolved');
  });

  // ── 13. Ambiguous Transaction -> Needs Review ──────────────────────────────
  it('13. flags ambiguous or unrecognized transactions with needs_review', () => {
    const tx = normalizeTransaction({
      rawDescription: 'Paid to Vasu',
      amount: 500,
      direction: 'out',
    });

    const classified = classifyTransaction(tx);
    expect(classified.resolutionState).toBe('needs_review');
    expect(classified.reviewReason).toContain('Sent to a person');
  });

  // ── 14. Batch Code Generation & Integrity ──────────────────────────────────
  it('14. generates clean 4-character alphanumeric batch identity code', () => {
    const code = generateBatchCode();
    expect(code).toHaveLength(4);
    expect(code).toMatch(/^[A-Z0-9]{4}$/);
  });

  // ── 15. Historical Dates Preserved ─────────────────────────────────────────
  it('15. correctly preserves exact historical transaction date & time', () => {
    const parsed = parseStatementDate('25-09-2026 14:35:10');
    expect(parsed.date).toBe('2026-09-25');
    expect(parsed.time).toBe('14:35:10');
    expect(parsed.iso).toBe('2026-09-25T14:35:10Z');
  });

  // ── 16. Subscription Detection ─────────────────────────────────────────────
  it('16. identifies digital subscriptions (Spotify, Netflix) accurately', () => {
    const tx = normalizeTransaction({
      rawDescription: 'Spotify India Subscription',
      amount: 119,
      direction: 'out',
    });

    const classified = classifyTransaction(tx);
    expect(classified.suggestedAction).toBe('add_expense');
    expect(classified.suggestedCategory).toBe('Tools & Subscriptions');
    expect(classified.isSubscription).toBe(true);
  });

  // ── 17. Counterparty Sanitization ──────────────────────────────────────────
  it('17. cleans messy UPI narration into readable counterparty names', () => {
    const clean1 = extractCounterparty('Paid to XYZ POHA');
    expect(clean1).toBe('XYZ POHA');

    const clean2 = extractCounterparty('UPI/P2P/458921/Ninad Sharma/kotak@okaxis');
    expect(clean2).toBe('Ninad Sharma');

    const clean3 = extractCounterparty('Received from Vasu');
    expect(clean3).toBe('Vasu');
  });

  // ── 18. Dex Context Integration ────────────────────────────────────────────
  describe('Dex Conversational Intelligence for Wealth', () => {
    const mockContext = {
      wealth: {
        totalExpensesMonth: 1250,
        totalIncomeMonth: 5000,
        foodSpentMonth: 450,
        upiSpentMonth: 1100,
        spentYesterday: 350,
        transfersMonth: 2000,
        subscriptionsPaidMonth: 119,
        subscriptionItems: [{ name: 'Spotify', amount: 119 }],
        whoPaidMe: [{ payer: 'Vasu', amount: 500 }, { payer: 'Client', amount: 4500 }],
        whoIPaid: [{ payee: 'XYZ POHA', amount: 30 }, { payee: 'Metro Rail', amount: 30 }],
        pendingClarifications: [
          { amount: 500, counterparty: 'Vasu', review_reason: 'Clarify if loan repayment' },
        ],
      },
    };

    it('answers "How much did I spend on food?"', () => {
      const res = resolveConversationalQuery('How much did I spend on food?', mockContext);
      expect(res.isHandled).toBe(true);
      expect(res.displayMessage).toContain('₹450 on food this month');
    });

    it('answers "How much did I spend through UPI?"', () => {
      const res = resolveConversationalQuery('How much did I spend through UPI?', mockContext);
      expect(res.isHandled).toBe(true);
      expect(res.displayMessage).toContain('₹1,100 through UPI this month');
    });

    it('answers "What did I spend yesterday?"', () => {
      const res = resolveConversationalQuery('What did I spend yesterday?', mockContext);
      expect(res.isHandled).toBe(true);
      expect(res.displayMessage).toContain('₹350 yesterday');
    });

    it('answers "Who paid me?"', () => {
      const res = resolveConversationalQuery('Who paid me?', mockContext);
      expect(res.isHandled).toBe(true);
      expect(res.displayMessage).toContain('Vasu: ₹500');
    });

    it('answers "Who did I pay?"', () => {
      const res = resolveConversationalQuery('Who did I pay?', mockContext);
      expect(res.isHandled).toBe(true);
      expect(res.displayMessage).toContain('XYZ POHA');
    });

    it('answers "How much money came in?"', () => {
      const res = resolveConversationalQuery('How much money came in this month?', mockContext);
      expect(res.isHandled).toBe(true);
      expect(res.displayMessage).toContain('₹5,000');
    });

    it('answers "How much did I transfer?"', () => {
      const res = resolveConversationalQuery('How much did I transfer?', mockContext);
      expect(res.isHandled).toBe(true);
      expect(res.displayMessage).toContain('₹2,000');
      expect(res.displayMessage).toContain('not counted as spending');
    });

    it('answers "What subscriptions did I pay?"', () => {
      const res = resolveConversationalQuery('What subscriptions did I pay?', mockContext);
      expect(res.isHandled).toBe(true);
      expect(res.displayMessage).toContain('Spotify (₹119)');
    });

    it('answers "What transactions need clarification?"', () => {
      const res = resolveConversationalQuery('What transactions need clarification?', mockContext);
      expect(res.isHandled).toBe(true);
      expect(res.displayMessage).toContain('1 transaction needs clarification');
      expect(res.displayMessage).toContain('Vasu');
    });
  });

  // ── 19. Full Acceptance Test Suite ─────────────────────────────────────────
  describe('Full Acceptance Test (Realistic Sample Statement)', () => {
    it('executes realistic statement import and categorizes each transaction according to specification', async () => {
      const acceptanceData = [
        ['Paytm UPI Transaction Statement'],
        ['Generated: 02 Oct 2026'],
        [],
        ['Date', 'Transaction Details', 'Order ID', 'Debit', 'Credit', 'Status'],
        ['02-10-2026 09:30', 'Paid to XYZ POHA', 'ACC001', '30.00', '', 'SUCCESS'],
        ['02-10-2026 10:45', 'Metro Rail Ticket', 'ACC002', '30.00', '', 'SUCCESS'],
        ['02-10-2026 12:15', 'Printing and Photocopy', 'ACC003', '70.00', '', 'SUCCESS'],
        ['02-10-2026 14:00', 'Received from Vasu', 'ACC004', '', '500.00', 'SUCCESS'],
        ['02-10-2026 15:30', 'Self Transfer to Bank Account', 'ACC005', '2000.00', '', 'SUCCESS'],
        ['02-10-2026 16:15', 'Zerodha Coin Mutual Fund SIP', 'ACC006', '1000.00', '', 'SUCCESS'],
        ['02-10-2026 18:00', 'Spotify Monthly Subscription', 'ACC007', '119.00', '', 'SUCCESS'],
      ];

      const buffer = createTestExcelBuffer(acceptanceData);
      const parseRes = await parsePaytmStatement(buffer, 'Paytm_Passbook.xlsx');

      expect(parseRes.success).toBe(true);
      expect(parseRes.rawTransactions).toHaveLength(7);

      const normalized = parseRes.rawTransactions.map(r => normalizeTransaction(r));
      const classified = normalized.map(t => ({ ...t, ...classifyTransaction(t) }));

      // 1. Food: ₹30
      const foodTx = classified.find(t => t.amount === 30 && t.suggestedCategory === 'Food');
      expect(foodTx).toBeDefined();
      expect(foodTx.suggestedAction).toBe('add_expense');

      // 2. Transport: ₹30
      const transTx = classified.find(t => t.amount === 30 && t.suggestedCategory === 'Transport');
      expect(transTx).toBeDefined();
      expect(transTx.suggestedAction).toBe('add_expense');

      // 3. Education: ₹70
      const eduTx = classified.find(t => t.amount === 70 && t.suggestedCategory === 'Education');
      expect(eduTx).toBeDefined();
      expect(eduTx.suggestedAction).toBe('add_expense');

      // 4. Received: ₹500 -> Needs semantic classification
      const recvTx = classified.find(t => t.amount === 500 && t.direction === 'in');
      expect(recvTx).toBeDefined();
      expect(recvTx.suggestedAction).toBe('add_income');
      expect(recvTx.resolutionState).toBe('needs_review');

      // 5. Transfer: ₹2,000 -> Transfer, not expense
      const transferTx = classified.find(t => t.amount === 2000);
      expect(transferTx).toBeDefined();
      expect(transferTx.suggestedAction).toBe('transfer');
      expect(transferTx.suggestedCategory).toBe('Transfer');

      // 6. Investment: ₹1,000 -> Investment, not expense
      const investTx = classified.find(t => t.amount === 1000);
      expect(investTx).toBeDefined();
      expect(investTx.suggestedAction).toBe('investment');
      expect(investTx.suggestedCategory).toBe('Investment');

      // 7. Subscription: ₹119
      const subTx = classified.find(t => t.amount === 119);
      expect(subTx).toBeDefined();
      expect(subTx.suggestedAction).toBe('add_expense');
      expect(subTx.isSubscription).toBe(true);
    });
  });
});
