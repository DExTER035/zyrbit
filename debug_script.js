import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.resolve('.env') })

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

async function run() {
  const { data: friendships } = await supabase.from('friendships').select('*')
  console.log('FRIENDSHIPS:', friendships)
  
  const { data: profiles } = await supabase.from('profiles').select('id, username, is_public')
  console.log('\nPROFILES:', profiles)
}
run()
