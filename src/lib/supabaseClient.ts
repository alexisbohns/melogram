import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://olixcgppvluthbgcjtkf.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9saXhjZ3Bwdmx1dGhiZ2NqdGtmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyNzczOTMsImV4cCI6MjA3Mjg1MzM5M30.YMOKUKSHXq0vByyCI6miRtHJLoXm9r4_HMIIXtXkbWA'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)