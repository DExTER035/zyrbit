import { supabase } from '../src/lib/supabase/index.js';

async function probe() {
  console.log('Probing wealth_settings...');
  const { data, error } = await supabase.from('wealth_settings').select('*').limit(1);
  console.log('Result:', { data, error });
}

probe().catch(console.error);
