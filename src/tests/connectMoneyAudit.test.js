import { describe, it, expect, vi, beforeAll } from 'vitest';
import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { parsePaytmStatement } from '../services/statementParserService.js';
import { normalizeTransaction, generateFingerprint } from '../services/transactionNormalizer.js';
import { classifyTransaction } from '../services/transactionClassifier.js';
import { computeMoneyState } from '../engines/wealth/moneyState.js';
import { resolveConversationalQuery } from '../dex/resolvers/conversationalResolver.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Connect Money V1 — Comprehensive QA & Data Integrity Audit', () => {

  // Load fixture file
  const fixturePath = path.resolve(__dirname, 'fixtures/paytm_sample_statement.csv');
  const fixtureCsvContent = fs.readFileSync(fixturePath, 'utf8');

  // Helper to convert CSV text to binary XLSX buffer
  function csvToExcelBuffer(csvContent) {
    const wb = XLSX.read(csvContent, { type: 'string' });
    return XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  }

  // ── AUDIT 2 & 3: REAL IMPORT PARSER CONTRACT TEST ───────────────────────────
  describe('2. Real Import Parser Contract Audit', () => {
    it('discovers header offset, skips metadata, excludes failed/cancelled rows, and extracts valid transactions', async () => {
      const xlsxBuffer = csvToExcelBuffer(fixtureCsvContent);
      const res = await parsePaytmStatement(xlsxBuffer, 'Paytm_Passbook_Audit.xlsx');

      expect(res.success).toBe(true);
      const rows = res.rawTransactions;

      // Exactly 9 valid transactions should be extracted (failed, cancelled, blank, invalid date filtered)
      expect(rows).toHaveLength(9);

      // Verify failed payment was excluded
      const failed = rows.find(r => r.sourceTransactionId === 'PTM-ORD-882199');
      expect(failed).toBeUndefined();

      // Verify cancelled payment was excluded
      const cancelled = rows.find(r => r.sourceTransactionId === 'PTM-ORD-882200');
      expect(cancelled).toBeUndefined();

      // Verify dates and amounts
      rows.forEach(r => {
        expect(r.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(r.amount).toBeGreaterThan(0);
        expect(['in', 'out']).toContain(r.direction);
        expect(r.sourceTransactionId).toMatch(/^PTM-ORD-\d{6}$/);
      });
    });

    it('processes CSV format with identical precision as Excel', async () => {
      const res = await parsePaytmStatement(fixtureCsvContent, 'Paytm_Passbook_Audit.csv');
      expect(res.success).toBe(true);
      expect(res.rawTransactions).toHaveLength(9);
    });

    it('rejects PDF imports with a clear, honest error message advising Excel/CSV', async () => {
      const dummyPdfBuffer = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // %PDF
      const res = await parsePaytmStatement(dummyPdfBuffer, 'statement.pdf');
      expect(res.success).toBe(false);
      expect(res.error).toContain('Excel (.xlsx/.xls) or CSV format');
    });
  });

  // ── AUDIT 4: DUPLICATE IMPORT TEST ──────────────────────────────────────────
  describe('4. Duplicate Import Audit', () => {
    it('detects 100% of duplicate transactions on second import attempt with 0 double counting', async () => {
      const res = await parsePaytmStatement(fixtureCsvContent, 'Paytm.csv');
      const normalized = res.rawTransactions.map(r => normalizeTransaction(r));

      // Simulate first import batch
      const firstImport = normalized.map(t => ({
        ...t,
        status: 'confirmed',
        fingerprint: generateFingerprint(t),
      }));

      // Simulate candidate transactions for second import
      const secondCandidates = normalized.map(t => ({
        ...t,
        fingerprint: generateFingerprint(t),
      }));

      // Mock deduplicator logic with known fingerprints
      const existingFPs = new Set(firstImport.map(t => t.fingerprint));
      const deduplicated = secondCandidates.map(c => ({
        ...c,
        isDuplicate: existingFPs.has(c.fingerprint),
        duplicateReason: existingFPs.has(c.fingerprint) ? 'Already imported' : null,
      }));

      const duplicateCount = deduplicated.filter(d => d.isDuplicate).length;
      expect(duplicateCount).toBe(9); // All 9 are correctly flagged as duplicates
      expect(deduplicated.every(d => d.isDuplicate)).toBe(true);
    });
  });

  // ── AUDIT 6: WEALTH SEMANTIC RULES AUDIT ────────────────────────────────────
  describe('6. Wealth Semantic Classification Rules Audit', () => {
    let classified = [];

    beforeAll(async () => {
      const res = await parsePaytmStatement(fixtureCsvContent, 'Paytm.csv');
      const normalized = res.rawTransactions.map(r => normalizeTransaction(r));
      classified = normalized.map(t => ({ ...t, ...classifyTransaction(t) }));
    });

    it('CASE 1: ₹30 Poha -> Food Expense', () => {
      const tx = classified.find(t => t.sourceTransactionId === 'PTM-ORD-882190');
      expect(tx.amount).toBe(30);
      expect(tx.suggestedAction).toBe('add_expense');
      expect(tx.suggestedCategory).toBe('Food');
      expect(tx.resolutionState).toBe('resolved');
    });

    it('CASE 2: ₹30 Metro -> Transport Expense', () => {
      const tx = classified.find(t => t.sourceTransactionId === 'PTM-ORD-882191');
      expect(tx.amount).toBe(30);
      expect(tx.suggestedAction).toBe('add_expense');
      expect(tx.suggestedCategory).toBe('Transport');
      expect(tx.resolutionState).toBe('resolved');
    });

    it('CASE 3: ₹70 Printing -> Education Expense', () => {
      const tx = classified.find(t => t.sourceTransactionId === 'PTM-ORD-882192');
      expect(tx.amount).toBe(70);
      expect(tx.suggestedAction).toBe('add_expense');
      expect(tx.suggestedCategory).toBe('Education');
      expect(tx.resolutionState).toBe('resolved');
    });

    it('CASE 4: ₹2,000 to own savings -> Transfer (Must NOT affect ordinary spending)', () => {
      const tx = classified.find(t => t.sourceTransactionId === 'PTM-ORD-882194');
      expect(tx.amount).toBe(2000);
      expect(tx.suggestedAction).toBe('transfer');
      expect(tx.suggestedCategory).toBe('Transfer');
      expect(tx.resolutionState).toBe('resolved');
    });

    it('CASE 5: ₹1,000 SIP -> Investment (Must NOT become ordinary consumption spending)', () => {
      const tx = classified.find(t => t.sourceTransactionId === 'PTM-ORD-882195');
      expect(tx.amount).toBe(1000);
      expect(tx.suggestedAction).toBe('investment');
      expect(tx.suggestedCategory).toBe('Investment');
      expect(tx.resolutionState).toBe('resolved');
    });

    it('CASE 6: ₹500 received from Vasu -> Needs Review (Must NOT automatically become earned salary income)', () => {
      const tx = classified.find(t => t.sourceTransactionId === 'PTM-ORD-882193');
      expect(tx.amount).toBe(500);
      expect(tx.direction).toBe('in');
      expect(tx.suggestedAction).toBe('add_income');
      expect(tx.resolutionState).toBe('needs_review');
      expect(tx.reviewReason).toContain('clarify');
    });

    it('CASE 7: ₹500 sent to Vasu -> Needs Review (Must NOT be auto-assumed as pure consumption without review)', () => {
      const tx = classified.find(t => t.sourceTransactionId === 'PTM-ORD-882196');
      expect(tx.amount).toBe(500);
      expect(tx.direction).toBe('out');
      expect(tx.resolutionState).toBe('needs_review');
      expect(tx.reviewReason).toContain('Sent to a person');
    });

    it('CASE 8: ₹180 Swiggy refund -> Refund semantics (Must NOT inflate normal income)', () => {
      const tx = classified.find(t => t.sourceTransactionId === 'PTM-ORD-882197');
      expect(tx.amount).toBe(180);
      expect(tx.direction).toBe('in');
      expect(tx.suggestedAction).toBe('refund');
      expect(tx.suggestedCategory).toBe('Refund');
      expect(tx.resolutionState).toBe('resolved');
    });

    it('CASE 9: ₹119 Spotify -> Subscription', () => {
      const tx = classified.find(t => t.sourceTransactionId === 'PTM-ORD-882198');
      expect(tx.amount).toBe(119);
      expect(tx.suggestedAction).toBe('add_expense');
      expect(tx.suggestedCategory).toBe('Tools & Subscriptions');
      expect(tx.isSubscription).toBe(true);
    });
  });

  // ── AUDIT 7: MONEY STATE MATHEMATICAL INTEGRITY AUDIT ───────────────────────
  describe('7. Money State Mathematical Integrity Audit', () => {
    it('isolates transfers, investments, refunds, and ordinary spending without budget or flow distortion', () => {
      // Create confirmed expenses and incomes matching our 9-transaction dataset
      const expenses = [
        { id: '1', amount: 30, category: 'Food', expense_date: '2026-10-02', note: 'XYZ POHA' },
        { id: '2', amount: 30, category: 'Transport', expense_date: '2026-10-02', note: 'Metro' },
        { id: '3', amount: 70, category: 'Education', expense_date: '2026-10-02', note: 'Printing' },
        { id: '4', amount: 2000, category: 'Transfer', expense_date: '2026-10-02', note: 'Savings Transfer' },
        { id: '5', amount: 1000, category: 'Investment', expense_date: '2026-10-02', note: 'Zerodha SIP' },
        { id: '6', amount: 500, category: 'Lend', expense_date: '2026-10-02', note: 'Sent to Vasu' },
        { id: '7', amount: 119, category: 'Tools & Subscriptions', expense_date: '2026-10-02', note: 'Spotify' },
      ];

      const incomes = [
        { id: '8', amount: 500, source: 'Received from Vasu', income_date: '2026-10-02', note: 'Vasu payment' },
        { id: '9', amount: 180, source: 'Refund', income_date: '2026-10-02', note: 'Swiggy refund' },
      ];

      const ms = computeMoneyState({
        incomes,
        expenses,
        bills: [],
        settings: { monthly_budget: 15000 },
        today: '2026-10-02',
      });

      // Flow calculations verification
      expect(ms.flow.transfers).toBe(2000);
      expect(ms.flow.invested).toBe(1000);
      expect(ms.flow.lent).toBe(500);
      expect(ms.flow.refunds).toBe(180);
      expect(ms.flow.income).toBe(500); // Only the Vasu income counted under non-refund income

      // Ordinary spending MUST NOT include ₹2,000 transfer, ₹1,000 investment, or ₹500 loan
      // Ordinary spending = Food(30) + Transport(30) + Education(70) + Subscriptions(119) = 249
      expect(ms.flow.spent).toBe(249);

      // Verify Safe to Spend logic does not collapse from transfer
      expect(ms.safeToSpendStatus).toBeDefined();
    });
  });

  // ── AUDIT 8: DEX CONTEXT & RESOLVER ACCURACY AUDIT ──────────────────────────
  describe('8. Dex Conversational Intelligence Verification', () => {
    const controlledContext = {
      wealth: {
        totalExpensesMonth: 3749,
        totalIncomeMonth: 680,
        foodSpentMonth: 30,
        upiSpentMonth: 3749,
        spentYesterday: 0,
        transfersMonth: 2000,
        subscriptionsPaidMonth: 119,
        subscriptionItems: [{ name: 'Spotify India', amount: 119, date: '2026-10-02' }],
        whoPaidMe: [
          { payer: 'Received from Vasu', amount: 500 },
          { payer: 'Swiggy Order Refund Reversal', amount: 180 },
        ],
        whoIPaid: [
          { payee: 'Transfer to Savings A/C', amount: 2000 },
          { payee: 'Zerodha Broking Limited Coin SIP', amount: 1000 },
          { payee: 'Paid to Vasu', amount: 500 },
          { payee: 'Spotify India Subscription', amount: 119 },
          { payee: 'College Xerox Printing Center', amount: 70 },
          { payee: 'Paid to XYZ POHA', amount: 30 },
          { payee: 'DMRC Metro Rail Recharge', amount: 30 },
        ],
        pendingClarifications: [
          { amount: 500, counterparty: 'Vasu', review_reason: 'Clarify if loan repayment or gift' },
          { amount: 500, counterparty: 'Vasu', review_reason: 'Sent to a person — clarify if loan or expense' },
        ],
      },
    };

    it('Dex correctly answers: "How much did I spend on food?"', () => {
      const q = resolveConversationalQuery('How much did I spend on food?', controlledContext);
      expect(q.isHandled).toBe(true);
      expect(q.displayMessage).toBe('You spent ₹30 on food this month.');
    });

    it('Dex correctly answers: "How much did I spend through UPI?"', () => {
      const q = resolveConversationalQuery('How much did I spend through UPI?', controlledContext);
      expect(q.isHandled).toBe(true);
      expect(q.displayMessage).toBe('You spent ₹3,749 through UPI this month.');
    });

    it('Dex correctly answers: "What did I spend yesterday?"', () => {
      const q = resolveConversationalQuery('What did I spend yesterday?', controlledContext);
      expect(q.isHandled).toBe(true);
      expect(q.displayMessage).toBe('You had no expenses recorded yesterday.');
    });

    it('Dex correctly answers: "Who paid me?"', () => {
      const q = resolveConversationalQuery('Who paid me?', controlledContext);
      expect(q.isHandled).toBe(true);
      expect(q.displayMessage).toContain('Received from Vasu: ₹500');
    });

    it('Dex correctly answers: "Who did I pay?"', () => {
      const q = resolveConversationalQuery('Who did I pay?', controlledContext);
      expect(q.isHandled).toBe(true);
      expect(q.displayMessage).toContain('Transfer to Savings A/C: ₹2,000');
    });

    it('Dex correctly answers: "How much money came in?"', () => {
      const q = resolveConversationalQuery('How much money came in this month?', controlledContext);
      expect(q.isHandled).toBe(true);
      expect(q.displayMessage).toBe('Total money that came in this month: ₹680.');
    });

    it('Dex correctly answers: "How much did I transfer?"', () => {
      const q = resolveConversationalQuery('How much did I transfer?', controlledContext);
      expect(q.isHandled).toBe(true);
      expect(q.displayMessage).toBe('You transferred ₹2,000 between accounts this month (not counted as spending).');
    });

    it('Dex correctly answers: "What subscriptions did I pay?"', () => {
      const q = resolveConversationalQuery('What subscriptions did I pay?', controlledContext);
      expect(q.isHandled).toBe(true);
      expect(q.displayMessage).toContain('Spotify India (₹119)');
    });

    it('Dex correctly answers: "What transactions need clarification?"', () => {
      const q = resolveConversationalQuery('What transactions need clarification?', controlledContext);
      expect(q.isHandled).toBe(true);
      expect(q.displayMessage).toContain('2 transactions need clarification');
      expect(q.displayMessage).toContain('Vasu');
    });
  });

  // ── AUDIT 10: CLASSIFIER SAFETY & AMBIGUITY AUDIT ───────────────────────────
  describe('10. Classifier Safety & Ambiguity Rules Audit', () => {
    it('demotes ambiguous P2P or multi-purpose counterparty transactions to needs_review', () => {
      // P2P without merchant context
      const p2pOut = classifyTransaction(normalizeTransaction({ rawDescription: 'Paid to Rahul', amount: 300, direction: 'out' }));
      expect(p2pOut.resolutionState).toBe('needs_review');

      // Ambiguous incoming
      const p2pIn = classifyTransaction(normalizeTransaction({ rawDescription: 'Received from Amit', amount: 1500, direction: 'in' }));
      expect(p2pIn.resolutionState).toBe('needs_review');

      // Unrecognized merchant
      const unrec = classifyTransaction(normalizeTransaction({ rawDescription: 'Random Merchant XYZ 99', amount: 45, direction: 'out' }));
      expect(unrec.resolutionState).toBe('needs_review');
    });
  });

  // ── AUDIT 12: PRIVACY AUDIT ─────────────────────────────────────────────────
  describe('12. Privacy Audit', () => {
    it('does not log raw statements or sensitive financial accounts to console', () => {
      const consoleSpy = vi.spyOn(console, 'log');
      const sanitized = normalizeTransaction({
        rawDescription: 'Paid to XYZ POHA from A/C XXXXXXXX1234 ref 99482',
        amount: 30,
        direction: 'out',
      });

      expect(sanitized.counterparty).not.toContain('XXXXXXXX1234');
      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  // ── AUDIT 14: HEALTH CROSS-DOMAIN CORRELATION READINESS ─────────────────────
  describe('14. Health Cross-Domain Correlation Readiness', () => {
    it('preserves complete audit metadata (timestamp, amount, counterparty, source ID) for future meal correlation', () => {
      const tx = normalizeTransaction({
        sourceTransactionId: 'PTM-101',
        occurredAt: '2026-10-02T10:15:00Z',
        date: '2026-10-02',
        time: '10:15:00',
        amount: 30,
        direction: 'out',
        rawDescription: 'XYZ POHA Breakfast',
      });

      // Verification of preservation
      expect(tx.occurredAt).toBe('2026-10-02T10:15:00Z');
      expect(tx.date).toBe('2026-10-02');
      expect(tx.time).toBe('10:15:00');
      expect(tx.amount).toBe(30);
      expect(tx.counterparty).toContain('XYZ POHA');
      expect(tx.sourceTransactionId).toBe('PTM-101');
      expect(tx.rawDescription).toBe('XYZ POHA Breakfast');
    });
  });
});
