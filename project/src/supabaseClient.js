import { createClient } from '@supabase/supabase-js'

// 1. ไปที่ Supabase Dashboard -> Project Settings -> API
// 2. Copy "Project URL" และ "anon public key" มาใส่ตรงนี้
const supabaseUrl = 'https://wjabjvminwfgzhsfsryc.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqYWJqdm1pbndmZ3poc2ZzcnljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxNzkwNzgsImV4cCI6MjA4Mzc1NTA3OH0.-jngbpAg11qJej7KDxLFbs7MGHv698j-U3lHZFvPS-U'

export const supabase = createClient(supabaseUrl, supabaseKey)