import { supabase } from '../src/lib/supabase/index.js';

async function testIdUpsert() {
  console.log('Testing select id with limit 1:');
  const res = await supabase.from('wealth_settings').select('*').limit(1);
  console.log('Existing row:', res.data);
}

testIdUpsert().catch(console.error);
