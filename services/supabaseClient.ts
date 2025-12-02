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
const envUrl = getEnv('SUPABASE_URL') || getEnv('REACT_APP_SUPABASE_URL');
const envKey = getEnv('SUPABASE_ANON_KEY') || getEnv('REACT_APP_SUPABASE_ANON_KEY');

// Determine if we are using real credentials
export const isSupabaseConfigured = () => {
  return !!envUrl && !!envKey && envUrl !== 'https://placeholder.supabase.co';
};

const supabaseUrl = envUrl || 'https://placeholder.supabase.co';
const supabaseAnonKey = envKey || 'placeholder-key';

if (!isSupabaseConfigured()) {
  console.warn("Supabase credentials missing. App will default to Demo Mode (MockDB). Set SUPABASE_URL and SUPABASE_ANON_KEY to enable Production Mode.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);