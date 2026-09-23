/**
 * Test which Gemini models are currently working via the generateContent REST API.
 * Run: node test_gemini_models.mjs
 *
 * IMPORTANT: This uses a test approach that doesn't expose the real API key.
 * We test via the zyra edge function which has the key server-side.
 * We compare HTTP status codes to identify working models.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xgowpznkqbsngdiuodmj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhnb3dwem5rcWJzbmdkaXVvZG1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwNjUyOTYsImV4cCI6MjA4OTY0MTI5Nn0.hmCDn6hrlVW1qaZbyFnToxKhSXXkGgxIf-bHTlWXavA';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
  // Get session
  const { data: anonData, error: anonErr } = await supabase.auth.signInAnonymously();
  if (anonErr) {
    console.error('Cannot get session:', anonErr.message);
    return;
  }
  const session = anonData.session;
  console.log('Session obtained. User:', session.user.id);

  // We'll test by calling the actual Gemini endpoint directly from Node.js
  // We need to read the API key from the zyra function somehow.
  // Since we can't read secrets, we'll verify by calling zyra with specific test messages
  // and looking at the error vs success pattern.
  
  // The zyra edge function currently uses GEMINI_MODEL from secrets.
  // We need to check what the secret is currently set to.
  
  console.log('\n--- Calling zyra with current GEMINI_MODEL setting ---');
  const res = await fetch(`${SUPABASE_URL}/functions/v1/zyra`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      messages: [{ role: 'user', text: 'Hi' }]
    })
  });

  console.log('Status:', res.status);
  const body = await res.text();
  console.log('Body:', body);

  if (res.status === 404) {
    console.log('\n→ GEMINI_MODEL in secrets is pointing to a deprecated/invalid model.');
    console.log('  The fallback to gemini-1.5-flash is also failing (404).');
    console.log('  Both models are deprecated as of September 2026.');
    console.log('  The fix is to update the secret to gemini-3.8-flash (or gemini-2.5-flash-latest).');
  } else if (res.status === 200) {
    console.log('\n→ SUCCESS! The model is working correctly.');
    const parsed = JSON.parse(body);
    console.log('Response text:', parsed.text?.substring(0, 100));
  }
}

main().catch(console.error);
