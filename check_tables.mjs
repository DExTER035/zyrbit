import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://xgowpznkqbsngdiuodmj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhnb3dwem5rcWJzbmdkaXVvZG1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwNjUyOTYsImV4cCI6MjA4OTY0MTI5Nn0.hmCDn6hrlVW1qaZbyFnToxKhSXXkGgxIf-bHTlWXavA'
)

const TABLES = [
  'profiles', 'habits', 'activity_log', 'user_streaks',
  'zyron_wallet', 'zyron_transactions',
  'diary_entries', 'diary_settings', 'secret_notes',
  'study_subjects', 'study_exams', 'study_sessions',
  'study_notes', 'study_goals', 'daily_tasks',
  'move_logs', 'move_streaks',
  'money_settings', 'money_expenses', 'money_budgets', 'money_savings_goals',
  'friendships', 'battles', 'leaderboard_cache',
  'global_orbits', 'orbit_members', 'orbit_messages', 'orbit_requests',
  'orbit_journal', 'shop_purchases'
]

const results = []

for (const table of TABLES) {
  const { error } = await supabase.from(table).select('*').limit(1)
  if (error && error.code === '42P01') {
    results.push(`MISSING: ${table}`)
  } else if (error && error.message?.includes('does not exist')) {
    results.push(`MISSING: ${table} — ${error.message}`)
  } else if (error && error.code === 'PGRST204') {
    results.push(`OK: ${table}`)
  } else if (error && error.code !== 'PGRST116') {
    results.push(`ERROR: ${table} (${error.code}) — ${error.message}`)
  } else {
    results.push(`OK: ${table}`)
  }
}

console.log('\n=== DATABASE TABLE AUDIT ===\n')
results.forEach(r => console.log(r))
console.log('\n============================\n')
