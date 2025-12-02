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

// Raw values
const rawUrl = getEnv('SUPABASE_URL') || getEnv('REACT_APP_SUPABASE_URL');
const rawKey = getEnv('SUPABASE_ANON_KEY') || getEnv('REACT_APP_SUPABASE_ANON_KEY');

// Helper to sanitize inputs (remove spaces, ensure https)
const sanitizeUrl = (url: string) => {
    if (!url) return '';
    let cleaned = url.trim();
    // Fix common copy-paste issue where URL doesn't start with https
    if (!cleaned.startsWith('http')) {
        cleaned = `https://${cleaned}`;
    }
    // Remove trailing slash if present
    if (cleaned.endsWith('/')) {
        cleaned = cleaned.slice(0, -1);
    }
    return cleaned;
};

const envUrl = sanitizeUrl(rawUrl);
const envKey = rawKey ? rawKey.trim() : '';

// Determine if we are using real credentials
export const isSupabaseConfigured = () => {
  return !!envUrl && !!envKey && envUrl !== 'https://placeholder.supabase.co';
};

const supabaseUrl = envUrl || 'https://placeholder.supabase.co';
const supabaseAnonKey = envKey || 'placeholder-key';

if (!isSupabaseConfigured()) {
  console.warn("Supabase credentials missing or invalid. App will default to Demo Mode (MockDB). Set SUPABASE_URL and SUPABASE_ANON_KEY to enable Production Mode.");
} else {
  console.log("Supabase Client initialized with URL:", supabaseUrl);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);