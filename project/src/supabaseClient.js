import { createClient } from '@supabase/supabase-js'

// Read Supabase config from Vite environment variables.
// Create a `.env` or `.env.local` with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
	// Warn in development if env vars are missing — avoid exposing secrets in source.
	// Do NOT commit real keys into the repository.
	console.warn('Missing Supabase environment variables: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)