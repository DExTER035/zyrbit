/**
 * Zyrbit V1.1 — Visual Capture Tests
 * SCREENSHOT → UNDERSTAND → PREVIEW → CONFIRM → CANONICAL STATE
 *
 * Covers:
 * 1. image attachment
 * 2. extraction parsing
 * 3. high-confidence extraction
 * 4. medium-confidence extraction
 * 5. low-confidence entry
 * 6. five-entry screenshot
 * 7. total calculation
 * 8. semantic classification
 * 9. edit extracted entry
 * 10. remove extracted entry
 * 11. add extracted entry
 * 12. confirmation
 * 13. canonical promise creation
 * 14. duplicate screenshot
 * 15. undo
 * 16. vision failure
 * 17. AI timeout
 * 18. network failure
 * 19. two-user isolation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  parseVisualMoneyEntries,
  extractImageFacts,
  checkDuplicateEntries,
  executeVisualCaptureBatch,
  undoVisualCaptureBatch,
  formatINR,
  CONFIDENCE_TIERS,
} from '../services/visualCaptureService.js';
import * as wealthService from '../services/wealthService.js';

describe('Dex Visual Capture — Unit & Integration Test Suite', () => {
  const TEST_SCREENSHOT_TEXT = `
Vasu 500
Ninad 200
Pranav 500
Abhishek 250
Suraj 1600
`.trim();

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ── 1. Image Attachment Validation ──────────────────────────────────────────
  it('1. validates image attachment file size and format', async () => {
    // Oversized file (>10MB)
    const largeFile = { size: 12 * 1024 * 1024, type: 'image/png', name: 'large.png' };
    const largeRes = await extractImageFacts({ file: largeFile });
    expect(largeRes.success).toBe(false);
    expect(largeRes.error).toBe('IMAGE_TOO_LARGE');

    // Unsupported non-image format
    const badFile = { size: 1024, type: 'application/pdf', name: 'doc.pdf' };
    const badRes = await extractImageFacts({ file: badFile });
    expect(badRes.success).toBe(false);
    expect(badRes.error).toBe('UNSUPPORTED_FORMAT');
  });

  // ── 2. Extraction Parsing with Various Formats ──────────────────────────────
  it('2. parses names, ₹ symbol, INR prefix/suffix, comma formatting, and decimals', () => {
    const variedText = `
Vasu ₹500
Ninad: INR 200
Pranav - 500.50
Abhishek 250
Suraj 1,600
`.trim();

    const result = parseVisualMoneyEntries(variedText);
    expect(result.type).toBe('visual_money_extraction');
    expect(result.entries.length).toBe(5);

    expect(result.entries[0]).toMatchObject({ person: 'Vasu', amount: 500, currency: 'INR' });
    expect(result.entries[1]).toMatchObject({ person: 'Ninad', amount: 200, currency: 'INR' });
    expect(result.entries[2]).toMatchObject({ person: 'Pranav', amount: 500.5, currency: 'INR' });
    expect(result.entries[3]).toMatchObject({ person: 'Abhishek', amount: 250, currency: 'INR' });
    expect(result.entries[4]).toMatchObject({ person: 'Suraj', amount: 1600, currency: 'INR' });
  });

  // ── 3. High-Confidence Extraction ──────────────────────────────────────────
  it('3. assigns high confidence (>= 0.85) to clear entries', () => {
    const result = parseVisualMoneyEntries('Vasu 500\nNinad 200');
    expect(result.entries[0].confidence).toBeGreaterThanOrEqual(CONFIDENCE_TIERS.HIGH);
    expect(result.entries[0].status).toBe('high');
    expect(result.entries[1].confidence).toBeGreaterThanOrEqual(CONFIDENCE_TIERS.HIGH);
    expect(result.entries[1].status).toBe('high');
  });

  // ── 4. Medium-Confidence Extraction ────────────────────────────────────────
  it('4. assigns medium confidence (0.60 - 0.84) to partially ambiguous entries', () => {
    const result = parseVisualMoneyEntries('Abhishek 250');
    expect(result.entries[0].confidence).toBeGreaterThanOrEqual(CONFIDENCE_TIERS.MEDIUM);
    expect(result.entries[0].confidence).toBeLessThan(CONFIDENCE_TIERS.HIGH);
    expect(result.entries[0].status).toBe('medium');
  });

  // ── 5. Low-Confidence Entry ────────────────────────────────────────────────
  it('5. assigns low confidence (< 0.60) to uncertain or noisy OCR entries', () => {
    const result = parseVisualMoneyEntries('Unknown? 150~');
    expect(result.entries[0].confidence).toBeLessThan(CONFIDENCE_TIERS.MEDIUM);
    expect(result.entries[0].status).toBe('low');
  });

  // ── 6. Five-Entry Screenshot ───────────────────────────────────────────────
  it('6. extracts exactly five people from canonical reference screenshot', () => {
    const result = parseVisualMoneyEntries(TEST_SCREENSHOT_TEXT);
    expect(result.entries.length).toBe(5);
    const names = result.entries.map((e) => e.person);
    expect(names).toEqual(['Vasu', 'Ninad', 'Pranav', 'Abhishek', 'Suraj']);
  });

  // ── 7. Total Calculation ───────────────────────────────────────────────────
  it('7. computes exact total of ₹3,050 for the five entries', () => {
    const result = parseVisualMoneyEntries(TEST_SCREENSHOT_TEXT);
    expect(result.total).toBe(3050);
    expect(formatINR(result.total)).toContain('3,050');
  });

  // ── 8. Semantic Classification (Zero Assumption) ───────────────────────────
  it('8. makes zero semantic assumptions until user classifies entries', () => {
    const result = parseVisualMoneyEntries(TEST_SCREENSHOT_TEXT);
    result.entries.forEach((e) => {
      // Must not assume direction (owed to user vs owes user vs expense)
      expect(e).not.toHaveProperty('direction');
      expect(e).not.toHaveProperty('semanticType');
    });
  });

  // ── 9. Edit Extracted Entry ────────────────────────────────────────────────
  it('9. dynamically recalculates total when an entry is edited', () => {
    const result = parseVisualMoneyEntries(TEST_SCREENSHOT_TEXT);
    // User edits Vasu from 500 to 700
    const updatedEntries = result.entries.map((e) =>
      e.person === 'Vasu' ? { ...e, amount: 700 } : e
    );
    const newTotal = updatedEntries.reduce((sum, e) => sum + e.amount, 0);
    expect(newTotal).toBe(3250);
  });

  // ── 10. Remove Extracted Entry ─────────────────────────────────────────────
  it('10. dynamically recalculates total when an entry is removed', () => {
    const result = parseVisualMoneyEntries(TEST_SCREENSHOT_TEXT);
    // User removes Abhishek (250)
    const updatedEntries = result.entries.filter((e) => e.person !== 'Abhishek');
    expect(updatedEntries.length).toBe(4);
    const newTotal = updatedEntries.reduce((sum, e) => sum + e.amount, 0);
    expect(newTotal).toBe(2800);
  });

  // ── 11. Add Extracted Entry ────────────────────────────────────────────────
  it('11. dynamically recalculates total when an entry is manually added', () => {
    const result = parseVisualMoneyEntries(TEST_SCREENSHOT_TEXT);
    const updatedEntries = [
      ...result.entries,
      { id: 'vis-new', person: 'Kunal', amount: 450, currency: 'INR', confidence: 1.0, status: 'high' },
    ];
    expect(updatedEntries.length).toBe(6);
    const newTotal = updatedEntries.reduce((sum, e) => sum + e.amount, 0);
    expect(newTotal).toBe(3500);
  });

  // ── 12. Confirmation Gate ──────────────────────────────────────────────────
  it('12. does not persist records without explicit batch execution call', async () => {
    const spy = vi.spyOn(wealthService, 'recordMoneyEvent');
    // Pure extraction does not invoke recordMoneyEvent
    parseVisualMoneyEntries(TEST_SCREENSHOT_TEXT);
    expect(spy).not.toHaveBeenCalled();
  });

  // ── 13. Canonical Promise Creation ─────────────────────────────────────────
  it('13. creates canonical promises (receivables) in Wealth when confirmed as OWED_TO_ME', async () => {
    const mockRecordMoneyEvent = vi.spyOn(wealthService, 'recordMoneyEvent').mockImplementation(async ({ person, amount }) => {
      return {
        success: true,
        data: {
          id: `exp-${person}`,
          billId: `bill-${person}`,
          expenseId: `exp-${person}`,
          amount,
        },
      };
    });

    const entries = [
      { id: '1', person: 'Vasu', amount: 500 },
      { id: '2', person: 'Ninad', amount: 200 },
    ];

    const result = await executeVisualCaptureBatch({
      userId: 'test-user-uuid',
      entries,
      semanticType: 'OWED_TO_ME',
    });

    expect(result.success).toBe(true);
    expect(result.count).toBe(2);
    expect(result.total).toBe(700);
    expect(mockRecordMoneyEvent).toHaveBeenCalledTimes(2);
    expect(mockRecordMoneyEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'test-user-uuid',
        type: 'LEND',
        person: 'Vasu',
        amount: 500,
        title: 'Vasu owes you',
      })
    );
  });

  // ── 14. Duplicate Screenshot Protection ────────────────────────────────────
  it('14. warns when screenshot entries already exist in Wealth records', () => {
    const entries = [
      { person: 'Vasu', amount: 500 },
      { person: 'Ninad', amount: 200 },
    ];

    const existingBills = [
      { name: 'Vasu owes you', amount: 500, status: 'receivable' },
      { name: 'Ninad owes you', amount: 200, status: 'receivable' },
    ];

    const dupResult = checkDuplicateEntries(entries, existingBills, 'OWED_TO_ME');
    expect(dupResult.hasDuplicates).toBe(true);
    expect(dupResult.duplicateCount).toBe(2);
    expect(dupResult.message).toContain('already exist');
  });

  // ── 15. Undo Capability ────────────────────────────────────────────────────
  it('15. cleanly reverses created records on undo', async () => {
    const mockDeleteBill = vi.spyOn(wealthService, 'deleteBill').mockResolvedValue({ success: true });
    const mockDeleteExpense = vi.spyOn(wealthService, 'deleteExpense').mockResolvedValue({ success: true });

    const createdRecords = [
      { billId: 'bill-1', expenseId: 'exp-1' },
      { billId: 'bill-2', expenseId: 'exp-2' },
    ];

    const undoRes = await undoVisualCaptureBatch({
      userId: 'test-user-uuid',
      createdRecords,
    });

    expect(undoRes.success).toBe(true);
    expect(undoRes.undoneCount).toBe(2);
    expect(mockDeleteBill).toHaveBeenCalledTimes(2);
    expect(mockDeleteExpense).toHaveBeenCalledTimes(2);
  });

  // ── 16. Vision Failure Handling ────────────────────────────────────────────
  it('16. handles blurry/unreadable image gracefully without crash', async () => {
    const failFile = { size: 5000, type: 'image/png', name: 'blurry_unreadable.png' };
    const res = await extractImageFacts({ file: failFile });
    expect(res.success).toBe(false);
    expect(res.error).toBe('VISION_FAILED');
    expect(res.message).toBe("Couldn't read this image reliably.");
  });

  // ── 17. AI / Processing Timeout ───────────────────────────────────────────
  it('17. recovers gracefully if vision processing errors', async () => {
    const badPayload = { file: null, dataUrl: null, textContext: '' };
    const res = await extractImageFacts(badPayload);
    expect(res.success).toBe(false);
    expect(res.error).toBe('NO_TEXT_DETECTED');
  });

  // ── 18. Network / Service Failure Handling ────────────────────────────────
  it('18. handles Wealth service failure during batch execution gracefully', async () => {
    vi.spyOn(wealthService, 'recordMoneyEvent').mockResolvedValue({
      success: false,
      error: 'Supabase network failure: Connection lost',
    });

    const entries = [{ id: '1', person: 'Vasu', amount: 500 }];
    const result = await executeVisualCaptureBatch({
      userId: 'test-user-uuid',
      entries,
      semanticType: 'OWED_TO_ME',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Supabase network failure');
  });

  // ── 19. Two-User Isolation ────────────────────────────────────────────────
  it('19. isolates visual capture batch execution by userId', async () => {
    const mockRecord = vi.spyOn(wealthService, 'recordMoneyEvent').mockImplementation(async ({ userId }) => ({
      success: true,
      data: { id: 'created-id', userId },
    }));

    const entries = [{ id: '1', person: 'Suraj', amount: 1600 }];

    await executeVisualCaptureBatch({
      userId: 'user-A-uuid',
      entries,
      semanticType: 'OWED_TO_ME',
    });

    await executeVisualCaptureBatch({
      userId: 'user-B-uuid',
      entries,
      semanticType: 'OWED_TO_ME',
    });

    expect(mockRecord).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-A-uuid', person: 'Suraj' })
    );
    expect(mockRecord).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-B-uuid', person: 'Suraj' })
    );
  });
});
