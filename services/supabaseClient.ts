import { createClient } from '@supabase/supabase-js';

// REPLACE THESE WITH YOUR ACTUAL SUPABASE URL AND ANON KEY
// OR CONFIGURE THEM IN YOUR VERCEL ENVIRONMENT VARIABLES
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://YOUR_PROJECT_ID.supabase.co';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'YOUR_ANON_KEY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);