import { supabase } from '../src/lib/supabase/index.js';

async function checkColumns() {
  // Try selecting non-existent column vs user_id vs id
  const r1 = await supabase.from('wealth_settings').select('id, currency, monthly_budget').limit(0);
  console.log('Select id, currency, monthly_budget:', r1.error ? r1.error.message : 'OK');

  const r2 = await supabase.from('wealth_settings').select('user_id').limit(0);
  console.log('Select user_id:', r2.error ? r2.error.message : 'OK');
}

checkColumns().catch(console.error);
