import { supabase } from '../src/lib/supabase/index.js';

async function testSaveLogic() {
  console.log('Testing select on wealth_settings...');
  const { data, error } = await supabase
    .from('wealth_settings')
    .select('*')
    .limit(5);
  console.log('Select result:', { data, error });
}

testSaveLogic().catch(console.error);
