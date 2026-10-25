import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(url, anonKey);

async function testRpc() {
  const { data: auth } = await supabase.auth.signInAnonymously();
  const uid = auth.user.id;
  console.log('Testing RPC check_and_increment_ai_usage for user', uid);
  
  const { data, error } = await supabase.rpc('check_and_increment_ai_usage', {
    p_user_id: uid,
    p_daily_limit: 50
  });

  console.log('RPC check_and_increment_ai_usage result:', { data, error });
}

testRpc();
