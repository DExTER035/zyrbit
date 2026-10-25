import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in environment.');
  process.exit(1);
}

const supabase = createClient(url, anonKey);

async function testZyraEndpoint() {
  console.log('Testing remote "zyra" Supabase Edge Function with authenticated guest...');
  
  // 1. Authenticate anonymously
  const { data: authData, error: authErr } = await supabase.auth.signInAnonymously({
    options: { data: { full_name: 'AI Smoke Tester' } }
  });

  if (authErr) {
    console.error('Authentication failed:', authErr.message);
    return;
  }

  console.log('✓ Guest session acquired. User ID:', authData.user.id);

  // 2. Invoke 'zyra' function
  try {
    console.log('Invoking supabase.functions.invoke("zyra")...');
    const startTime = Date.now();
    const res = await supabase.functions.invoke('zyra', {
      body: {
        messages: [{ role: 'user', text: 'Hello Dex, reply with Pong if you can hear me.' }]
      }
    });

    const elapsed = Date.now() - startTime;
    console.log(`Invocation finished in ${elapsed}ms.`);
    console.log('Result data:', JSON.stringify(res.data, null, 2));
    if (res.error) {
      console.log('Result error:', res.error);
      console.log('Error context:', res.error.context);
    }
  } catch (err) {
    console.error('Invocation threw exception:', err.message);
  }
}

testZyraEndpoint();
