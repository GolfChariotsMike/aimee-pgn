import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://kouembkldbpdbhzeaoth.supabase.co'
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// Use service key for admin operations
export const supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey)

export const SUPABASE_URL = supabaseUrl
export const FUNCTIONS_URL = `${supabaseUrl}/functions/v1`
