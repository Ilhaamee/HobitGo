import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://sqpoqpjornvivwhcxecx.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxcG9xcGpvcm52aXZ3aGN4ZWN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1ODczNTAsImV4cCI6MjA4MDE2MzM1MH0.d--yOdU5-hL2TXY9ixIRfkd8axx8uhkxgczaaP-th0c'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
