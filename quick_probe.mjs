// quick_probe.mjs — Minimal direct Zyra probe, no auth needed
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

console.log('Remote URL:', SUPABASE_URL);
console.log('Anon Key (safe):', ANON_KEY ? ANON_KEY.slice(0, 8) + '...[REDACTED]' : '[NOT SET]');

// Unauthenticated probe
const res = await fetch(`${SUPABASE_URL}/functions/v1/zyra`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': ANON_KEY,
  },
  body: JSON.stringify({}),
});
const body = await res.text();
console.log('Unauthenticated probe HTTP:', res.status);
console.log('Unauthenticated probe body:', body.substring(0, 300));

// Check what error code comes back — our code says "Missing Authorization header"
// Remote code says "UNAUTHORIZED_NO_AUTH_HEADER" which suggests a DIFFERENT version is live
if (body.includes('UNAUTHORIZED_NO_AUTH_HEADER')) {
  console.log('\n⚠️  REMOTE CODE IS A DIFFERENT VERSION THAN LOCAL');
  console.log('  Local zyra/index.ts returns: "Authentication required. Missing Authorization header."');
  console.log('  Remote zyra returns: {"code":"UNAUTHORIZED_NO_AUTH_HEADER",...}');
  console.log('  This means the REMOTE FUNCTION HAS NOT BEEN UPDATED to the hardened local version.');
} else if (body.includes('Missing Authorization header')) {
  console.log('\n✅ Remote function matches local hardened version (same 401 message format).');
} else {
  console.log('\n? Unknown response format — manual inspection required.');
}
