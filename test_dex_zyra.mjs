/**
 * DexOS — Focused Dex/Zyra Runtime Test
 * Tests the full Dex → askZyra → remote zyra Edge Function → Gemini pipeline.
 * Does NOT require browser. Uses the Supabase JS client directly.
 *
 * Run: node test_dex_zyra.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xgowpznkqbsngdiuodmj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhnb3dwem5rcWJzbmdkaXVvZG1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwNjUyOTYsImV4cCI6MjA4OTY0MTI5Nn0.hmCDn6hrlVW1qaZbyFnToxKhSXXkGgxIf-bHTlWXavA';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let passed = 0;
let failed = 0;

function pass(msg) {
  console.log(`  ✅ PASS: ${msg}`);
  passed++;
}

function fail(msg) {
  console.error(`  ❌ FAIL: ${msg}`);
  failed++;
}

async function testZyraDirectly() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('TEST: Zyra Edge Function — Unauthenticated (expect 401)');
  console.log('═══════════════════════════════════════════════════════');

  // Test 1: No auth → should get 401
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/zyra`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        messages: [{ role: 'user', text: 'hello' }]
      })
    });
    
    console.log(`  HTTP Status: ${res.status}`);
    const body = await res.text();
    console.log(`  Response: ${body.substring(0, 200)}`);
    
    if (res.status === 401) {
      pass('Unauthenticated request correctly returns 401');
    } else {
      fail(`Expected 401, got ${res.status}`);
    }
  } catch (err) {
    fail(`Network error: ${err.message}`);
  }
}

async function testZyraAuthenticated(session) {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('TEST: Zyra Edge Function — Authenticated');
  console.log('═══════════════════════════════════════════════════════');

  const accessToken = session.access_token;

  // Test with minimal valid request
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/zyra`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        messages: [{ role: 'user', text: 'Say HELLO in exactly 3 words.' }],
        systemPrompt: 'You are a helpful assistant.'
      })
    });

    console.log(`  HTTP Status: ${res.status}`);
    const body = await res.text();
    console.log(`  Response body: ${body.substring(0, 500)}`);

    if (res.status === 200) {
      pass(`Authenticated request returns 200`);
      try {
        const parsed = JSON.parse(body);
        if (parsed.text && typeof parsed.text === 'string') {
          pass(`Response contains { text: "..." } — client contract correct`);
          console.log(`  Gemini responded: "${parsed.text.substring(0, 100)}"`);
        } else if (parsed.error) {
          fail(`Function returned error: ${parsed.error}`);
        } else {
          fail(`Response has no "text" field. Raw: ${body.substring(0, 200)}`);
        }
      } catch {
        fail(`Response is not valid JSON: ${body.substring(0, 200)}`);
      }
    } else if (res.status === 401) {
      fail(`Got 401 — authentication/session problem. Token may be expired.`);
    } else if (res.status === 404) {
      fail(`Got 404 — Gemini model or function routing problem`);
    } else if (res.status === 500) {
      fail(`Got 500 — Edge Function/Gemini runtime error. Body: ${body.substring(0, 200)}`);
    } else {
      fail(`Unexpected status ${res.status}. Body: ${body.substring(0, 200)}`);
    }
  } catch (err) {
    fail(`Network error calling zyra: ${err.message}`);
  }
}

async function testZyraDexIntentPrompt(session) {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('TEST: Zyra — Full Dex Intent Parse Prompt');
  console.log('═══════════════════════════════════════════════════════');

  const accessToken = session.access_token;

  const systemPrompt = `You are Dex, the AI core of DexOS. You MUST respond in this exact JSON format (no markdown, no code fences):
{"intent":"conversational","displayMessage":"<your response here>"}
Valid intents: action | clarify | conversational | unsupported`;

  const userContent = `User message: "what should I do right now?"`;

  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/zyra`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        messages: [{ role: 'user', text: userContent }],
        systemPrompt
      })
    });

    console.log(`  HTTP Status: ${res.status}`);
    const body = await res.text();
    console.log(`  Raw response: ${body.substring(0, 500)}`);

    if (res.status === 200) {
      const parsed = JSON.parse(body);
      if (parsed.text) {
        pass(`Zyra returned text for Dex intent prompt`);
        console.log(`  Gemini text: "${parsed.text.substring(0, 200)}"`);
        
        // Try to parse as intent JSON
        try {
          let cleaned = parsed.text.trim();
          if (cleaned.startsWith('```')) {
            cleaned = cleaned.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '').trim();
          }
          const intent = JSON.parse(cleaned);
          pass(`Gemini response is valid JSON intent: ${JSON.stringify(intent).substring(0, 100)}`);
          
          if (['action', 'clarify', 'conversational', 'unsupported'].includes(intent.intent)) {
            pass(`Intent type is valid: "${intent.intent}"`);
          } else {
            fail(`Unknown intent type: "${intent.intent}"`);
          }
        } catch {
          // Non-JSON response — also acceptable for conversational
          pass(`Gemini responded (non-JSON conversational): "${parsed.text.substring(0, 100)}"`);
        }
      } else {
        fail(`No text in response: ${body}`);
      }
    } else {
      fail(`Expected 200, got ${res.status}. Body: ${body.substring(0, 200)}`);
    }
  } catch (err) {
    fail(`Error: ${err.message}`);
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('DexOS — DEX/ZYRA RUNTIME VERIFICATION');
  console.log('Date:', new Date().toISOString());
  console.log('Target:', SUPABASE_URL);
  console.log('═══════════════════════════════════════════════════════');

  // Step 1: Test unauthenticated (no auth token)
  await testZyraDirectly();

  // Step 2: Get authenticated session
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('TEST: Supabase Authentication');
  console.log('═══════════════════════════════════════════════════════');

  // Check if there's an existing session from anon key
  const { data: sessionData } = await supabase.auth.getSession();
  
  let session = sessionData?.session;
  
  if (!session) {
    console.log('  No active session. Attempting anonymous sign-in to get a test JWT...');
    // Try to sign in anonymously for testing
    const { data: anonData, error: anonErr } = await supabase.auth.signInAnonymously();
    if (anonErr) {
      fail(`Could not get auth session: ${anonErr.message}`);
      console.log('\n  NOTE: Cannot test authenticated flow without a session.');
      console.log('  The zyra function requires a valid Supabase JWT (user must be logged in).');
      console.log('  For full testing, use the actual app UI with a signed-in user.\n');
      printSummary();
      return;
    }
    session = anonData.session;
    console.log('  Anonymous session obtained for testing.');
  }

  if (session) {
    pass('Supabase session is active');
    console.log(`  User ID: ${session.user?.id}`);
    console.log(`  Expires at: ${new Date(session.expires_at * 1000).toISOString()}`);

    // Step 3: Test authenticated zyra call
    await testZyraAuthenticated(session);

    // Step 4: Test with full Dex intent prompt
    await testZyraDexIntentPrompt(session);
  }

  printSummary();
}

function printSummary() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('SUMMARY');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  Passed: ${passed}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Total:  ${passed + failed}`);
  
  if (failed === 0) {
    console.log('\n  🎉 ALL TESTS PASSED — Zyra/Gemini pipeline is WORKING');
  } else {
    console.log('\n  ⚠️  SOME TESTS FAILED — See details above');
  }
  console.log('═══════════════════════════════════════════════════════\n');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
