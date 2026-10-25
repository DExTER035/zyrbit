import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(url, anonKey);

async function testDirectFetch() {
  console.log('Signing in anonymously...');
  const { data, error } = await supabase.auth.signInAnonymously({
    options: { data: { full_name: 'Direct Tester' } }
  });

  if (error) {
    console.error('Sign in error:', error);
    return;
  }

  const token = data.session.access_token;
  console.log('Token acquired (len=' + token.length + '). Sending POST to functions/v1/zyra...');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);

  try {
    const res = await fetch(`${url}/functions/v1/zyra`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'apikey': anonKey
      },
      body: JSON.stringify({
        messages: [{ role: 'user', text: 'Hello Dex, reply with PONG.' }]
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);
    console.log(`HTTP Status: ${res.status} ${res.statusText}`);
    const text = await res.text();
    console.log('Response body:', text);
  } catch (err) {
    console.error('Fetch failed or timed out:', err.name, err.message);
  }
}

testDirectFetch();
