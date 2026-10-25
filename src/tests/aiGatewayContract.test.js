import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { askZyra, generateContent } from '../lib/ai/gemini.js';
import { supabase } from '../lib/supabase/index.js';

describe('Stage 1 — Remote Dex AI Gateway Contract & Invariants', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('Requirement 1: Enforces consistent request and response contract', async () => {
    // Mock successful Edge Function response matching documented contract
    vi.spyOn(supabase.functions.constructor.prototype, 'invoke').mockResolvedValue({
      data: { text: 'Hello! I am Dex, your personal OS assistant.' },
      error: null
    });

    const response = await askZyra([{ role: 'user', text: 'Hello Dex' }]);
    expect(response).toBe('Hello! I am Dex, your personal OS assistant.');
  });

  it('Requirement 2: Surfaces clean authentication required error on 401', async () => {
    vi.spyOn(supabase.functions.constructor.prototype, 'invoke').mockResolvedValue({
      data: null,
      error: { status: 401, message: 'Unauthorized user session.' }
    });

    await expect(askZyra([{ role: 'user', text: 'Hello' }])).rejects.toThrow(
      'Authentication required. Please sign in to speak with Dex.'
    );
  });

  it('Requirement 3: Surfaces user-friendly rate limit error on 429', async () => {
    vi.spyOn(supabase.functions.constructor.prototype, 'invoke').mockResolvedValue({
      data: null,
      error: { status: 429, message: 'Daily limit reached.' }
    });

    await expect(askZyra([{ role: 'user', text: 'Hello' }])).rejects.toThrow(
      /Rate limit reached/
    );
  });

  it('Requirement 4 & 5: Fast timeout handling with AbortController and calm degradation', async () => {
    // Mock hanging request
    vi.spyOn(supabase.functions.constructor.prototype, 'invoke').mockImplementation(() => {
      return new Promise((resolve) => {
        // never resolves within timeoutMs
        setTimeout(() => resolve({ data: { text: 'Late' }, error: null }), 500);
      });
    });

    // Call with 50ms test timeout
    await expect(askZyra([{ role: 'user', text: 'Quick test' }], null, 50)).rejects.toThrow(
      'Dex AI timed out. Direct offline commands remain active.'
    );
  });

  it('Requirement 6 & 7: Never leaks Gemini API keys, service role keys, or technical stack traces', async () => {
    // Mock server 500 error containing internal server detail
    vi.spyOn(supabase.functions.constructor.prototype, 'invoke').mockResolvedValue({
      data: { error: 'Internal AI processing error at https://generativelanguage.googleapis.com?key=AIzaSySecretKey' },
      error: null
    });

    try {
      await askZyra([{ role: 'user', text: 'Test secrets' }]);
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err.message).not.toContain('AIzaSy');
      expect(err.message).not.toContain('googleapis.com');
      expect(err.message).toBe('Dex AI is temporarily resting. Direct offline commands remain active.');
    }
  });

  it('Requirement 8: Preserves graceful degradation on upstream 502/503 errors', async () => {
    vi.spyOn(supabase.functions.constructor.prototype, 'invoke').mockResolvedValue({
      data: null,
      error: { status: 502, message: 'Edge Function returned a non-2xx status code' }
    });

    await expect(generateContent('Give me a motivation quote')).rejects.toThrow(
      'Dex AI is temporarily resting. Direct offline commands remain active.'
    );
  });
});
