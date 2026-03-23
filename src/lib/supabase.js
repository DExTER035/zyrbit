import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Validate URL before creating client
const isValidUrl = supabaseUrl && supabaseUrl.startsWith('https://')

export const supabase = isValidUrl
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createClient('https://placeholder.supabase.co', 'placeholder_key')

export default supabase

