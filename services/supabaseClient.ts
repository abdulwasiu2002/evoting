import { createClient } from '@supabase/supabase-js';

// Helper to find env var with various prefixes
const getEnv = (key: string) => {
  // Check standard Create React App prefix
  if (process.env[`REACT_APP_${key}`]) return process.env[`REACT_APP_${key}`];
  // Check Vite prefix
  if (process.env[`VITE_${key}`]) return process.env[`VITE_${key}`];
  // Check Next.js / Vercel public prefix
  if (process.env[`NEXT_PUBLIC_${key}`]) return process.env[`NEXT_PUBLIC_${key}`];
  // Check raw key (Node/Server)
  if (process.env[key]) return process.env[key];
  
  return '';
};

// Use placeholders if env vars are missing to prevent "supabaseUrl is required" crash
const supabaseUrl = getEnv('SUPABASE_URL') || getEnv('REACT_APP_SUPABASE_URL') || 'https://placeholder.supabase.co';
const supabaseAnonKey = getEnv('SUPABASE_ANON_KEY') || getEnv('REACT_APP_SUPABASE_ANON_KEY') || 'placeholder-key';

if (supabaseUrl === 'https://placeholder.supabase.co') {
  console.warn("Supabase credentials missing. Using placeholder to prevent crash. Please set SUPABASE_URL and SUPABASE_ANON_KEY.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);