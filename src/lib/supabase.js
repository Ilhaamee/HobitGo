import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://jvrggsrtmsixzziessms.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2cmdnc3J0bXNpeHp6aWVzc21zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNTYzODMsImV4cCI6MjA4ODYzMjM4M30.YIP576uPmIfugQoWBP3d1hDVLTfuXKm6U7pRdIJmJk8'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
