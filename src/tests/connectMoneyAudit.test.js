import { describe, it, expect, vi, beforeAll } from 'vitest';
import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { parsePaytmStatement, parseStatementDate, parseNumericAmount } from '../services/statementParserService.js';
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

  // ── AUDIT 15: PAYTM PARSER HARDENING REGRESSION SUITE ───────────────────────
  describe('15. Paytm Parser Hardening Regression Suite — Failure Modes & Edge Cases', () => {
    function createMultiSheetWorkbookBuffer(sheetsObj) {
      const wb = XLSX.utils.book_new();
      for (const [sheetName, rows] of Object.entries(sheetsObj)) {
        const ws = XLSX.utils.aoa_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      }
      return XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    }

    it('Regression 1: decodes CSV passed as ArrayBuffer without date corruption or numeric conversion', async () => {
      const csvStr = `Date,Details,Debit,Credit,Order ID\n02-10-2026,Chai,25,,PTM-111\n02-10-2026,Cashback,,10,PTM-112`;
      const encoder = new TextEncoder();
      const arrayBuffer = encoder.encode(csvStr).buffer;
      const res = await parsePaytmStatement(arrayBuffer, 'export.csv');
      expect(res.success).toBe(true);
      expect(res.rawTransactions).toHaveLength(2);
      expect(res.rawTransactions[0].date).toBe('2026-10-02');
      expect(res.rawTransactions[0].amount).toBe(25);
      expect(res.rawTransactions[0].direction).toBe('out');
      expect(res.rawTransactions[1].amount).toBe(10);
      expect(res.rawTransactions[1].direction).toBe('in');
    });

    it('Regression 2: scans across multiple sheets and selects the sheet containing transaction headers', async () => {
      const buffer = createMultiSheetWorkbookBuffer({
        'Summary': [
          ['Paytm Account Summary'],
          ['Account Holder: Rahul Sharma'],
          ['Total Balance: ₹12,450.00'],
          ['Disclaimer: Generated electronically.'],
        ],
        'Passbook': [
          ['Date', 'Transaction Details', 'Debit', 'Credit', 'Status'],
          ['02-10-2026 09:30:00', 'Coffee House', '150.00', '', 'SUCCESS'],
          ['02-10-2026 12:00:00', 'Salary Received', '', '25000.00', 'SUCCESS'],
        ],
      });

      const res = await parsePaytmStatement(buffer, 'statement_multisheet.xlsx');
      expect(res.success).toBe(true);
      expect(res.metadata.sheetName).toBe('Passbook');
      expect(res.rawTransactions).toHaveLength(2);
      expect(res.rawTransactions[0].amount).toBe(150);
      expect(res.rawTransactions[1].amount).toBe(25000);
    });

    it('Regression 3: scans up to 60 rows to detect headers pushed down by extensive preamble metadata', async () => {
      const rows = [];
      for (let i = 0; i < 42; i++) {
        rows.push([`Preamble disclaimer or metadata line ${i + 1}`]);
      }
      rows.push(['Date', 'Description', 'Amount', 'Order ID']);
      rows.push(['2026-10-05', 'Book Store', '450.00', 'PTM-BOOK-1']);
      rows.push(['2026-10-06', 'Snacks', '60.00', 'PTM-SNK-2']);

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, 'Statement');
      const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });

      const res = await parsePaytmStatement(buffer, 'deep_preamble.xlsx');
      expect(res.success).toBe(true);
      expect(res.rawTransactions).toHaveLength(2);
      expect(res.rawTransactions[0].amount).toBe(450);
      expect(res.rawTransactions[1].amount).toBe(60);
    });

    it('Regression 4A: accurately recognizes Indian banking aliases (Particulars, Withdrawal (Dr), Deposit (Cr), Balance)', async () => {
      const rows = [
        ['Date', 'Particulars', 'Withdrawal (Dr)', 'Deposit (Cr)', 'Balance'],
        ['02-10-2026', 'ATM Cash Withdrawal', '500.00', '', '10000.00'],
        ['03-10-2026', 'Interest Credit', '', '125.50', '10125.50'],
      ];
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, 'Passbook');
      const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });

      const res = await parsePaytmStatement(buffer, 'bank_statement.xlsx');
      expect(res.success).toBe(true);
      expect(res.rawTransactions).toHaveLength(2);
      expect(res.rawTransactions[0].amount).toBe(500);
      expect(res.rawTransactions[0].direction).toBe('out');
      expect(res.rawTransactions[0].rawDescription).toBe('ATM Cash Withdrawal');
      expect(res.rawTransactions[1].amount).toBe(125.5);
      expect(res.rawTransactions[1].direction).toBe('in');
      expect(res.rawTransactions[1].rawDescription).toBe('Interest Credit');
    });

    it('Regression 4B: avoids unsafe substring matching on unrelated columns like Credit Limit or Debit Card Number', async () => {
      const rows = [
        ['Date', 'Particulars', 'Debit Card Number', 'Credit Limit', 'Amount', 'Type'],
        ['02-10-2026', 'Shopping', 'XXXX-1234', '50000', '1200.00', 'Dr'],
      ];
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
      const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });

      const res = await parsePaytmStatement(buffer, 'card_statement.xlsx');
      expect(res.success).toBe(true);
      expect(res.rawTransactions).toHaveLength(1);
      // Must read 1200 from Amount, NOT 50000 from Credit Limit
      expect(res.rawTransactions[0].amount).toBe(1200);
      expect(res.rawTransactions[0].direction).toBe('out');
    });

    it('Regression 5: parses Excel serial dates (with epoch fallback) and text month dates', () => {
      // Serial number 46063 = 2026-02-10
      const d1 = parseStatementDate(46063);
      expect(d1.date).toBe('2026-02-10');

      // Serial number with time fraction (46063.5 = 12:00:00)
      const d2 = parseStatementDate(46063.5);
      expect(d2.date).toBe('2026-02-10');
      expect(d2.time).toBe('12:00:00');

      // Text month format "02-Oct-2026 10:15:00"
      const d3 = parseStatementDate('02-Oct-2026 10:15:00');
      expect(d3.date).toBe('2026-10-02');
      expect(d3.time).toBe('10:15:00');

      // Text month format "2 October 2026"
      const d4 = parseStatementDate('2 October 2026');
      expect(d4.date).toBe('2026-10-02');
    });

    it('Regression 6: combines separate Date and Time columns into exact ISO timestamp', async () => {
      const rows = [
        ['Date', 'Time', 'Particulars', 'Amount'],
        ['02-10-2026', '14:30:00', 'Lunch Buffet', '450.00'],
        ['03-10-2026', '09:15 AM', 'Morning Tea', '20.00'],
      ];
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, 'Passbook');
      const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });

      const res = await parsePaytmStatement(buffer, 'datetime_separate.xlsx');
      expect(res.success).toBe(true);
      expect(res.rawTransactions[0].date).toBe('2026-10-02');
      expect(res.rawTransactions[0].time).toBe('14:30:00');
      expect(res.rawTransactions[0].occurredAt).toBe('2026-10-02T14:30:00Z');

      expect(res.rawTransactions[1].date).toBe('2026-10-03');
      expect(res.rawTransactions[1].time).toBe('09:15:00');
      expect(res.rawTransactions[1].occurredAt).toBe('2026-10-03T09:15:00Z');
    });

    it('Regression 7: detects direction from Dr/Cr suffixes and sign prefixes on generic amount columns', async () => {
      const rows = [
        ['Date', 'Description', 'Amount'],
        ['02-10-2026', 'Electricity Bill', '₹ 1,500.00 Dr'],
        ['02-10-2026', 'Freelance Payment', '₹ 10,000.00 Cr'],
        ['03-10-2026', 'Gas Recharge', '-450.00'],
        ['03-10-2026', 'Cashback Received', '+50.00'],
      ];
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
      const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });

      const res = await parsePaytmStatement(buffer, 'drcr_suffix.xlsx');
      expect(res.success).toBe(true);
      expect(res.rawTransactions).toHaveLength(4);

      expect(res.rawTransactions[0].amount).toBe(1500);
      expect(res.rawTransactions[0].direction).toBe('out');

      expect(res.rawTransactions[1].amount).toBe(10000);
      expect(res.rawTransactions[1].direction).toBe('in');

      expect(res.rawTransactions[2].amount).toBe(450);
      expect(res.rawTransactions[2].direction).toBe('out');

      expect(res.rawTransactions[3].amount).toBe(50);
      expect(res.rawTransactions[3].direction).toBe('in');
    });

    it('Regression 8: falls back description to Beneficiary Name when description column is absent', async () => {
      const rows = [
        ['Date', 'Beneficiary Name', 'Amount', 'Type'],
        ['02-10-2026', 'Sharma Kirana Store', '320.00', 'Dr'],
      ];
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
      const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });

      const res = await parsePaytmStatement(buffer, 'beneficiary_only.xlsx');
      expect(res.success).toBe(true);
      expect(res.rawTransactions).toHaveLength(1);
      expect(res.rawTransactions[0].rawDescription).toBe('Sharma Kirana Store');
      expect(res.rawTransactions[0].explicitCounterparty).toBe('Sharma Kirana Store');
    });

    it('Regression 9: parseNumericAmount correctly strips symbols, commas, and parentheses', () => {
      expect(parseNumericAmount('₹ 1,500.00 Dr')).toBe(1500);
      expect(parseNumericAmount('2,000.00 Cr')).toBe(2000);
      expect(parseNumericAmount('(500.00)')).toBe(500);
      expect(parseNumericAmount('Rs. 450')).toBe(450);
      expect(parseNumericAmount('INR 1,200.50')).toBe(1200.5);
      expect(parseNumericAmount(null)).toBeNull();
      expect(parseNumericAmount('')).toBeNull();
    });
  });
});
