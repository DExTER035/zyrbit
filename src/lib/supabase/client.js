import { createClient } from '@supabase/supabase-js'

const supabaseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || (typeof globalThis !== 'undefined' && globalThis.process?.env?.VITE_SUPABASE_URL) || ''
const supabaseAnonKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || (typeof globalThis !== 'undefined' && globalThis.process?.env?.VITE_SUPABASE_ANON_KEY) || ''

// Validate URL before creating client
const isValidUrl = supabaseUrl && supabaseUrl.startsWith('https://')

export const supabase = isValidUrl
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createClient('https://placeholder.supabase.co', 'placeholder_key')

export default supabase

