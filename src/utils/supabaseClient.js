import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://xkpdusmqfprmhkzchwgp.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhrcGR1c21xZnBybWhremNod2dwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI0NzAxMTAsImV4cCI6MjEwODA0NjExMH0.5qLWOH5iO0UYh4l7u8G4ckVbK9RZg7LUiZzaygCA14g';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

export default supabase;
