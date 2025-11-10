import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://jmaxcgoooguzmcnnanfb.supabase.co"
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptYXhjZ29vb2d1em1jbm5hbmZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1ODA1NzUsImV4cCI6MjA3NzE1NjU3NX0.GGksh-MJUxhzxXQG47KbhzpOuLdNRPuflCkbnAvMfMY"

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
