import { createClient } from '@supabase/supabase-js';

// Helper to find env var with various prefixes (Vite, CRA, Next.js)
const getEnv = (key: string) => {
  let val = '';
  
  // 1. Try Vite (import.meta.env)
  try {
    // @ts-ignore
    if (import.meta && import.meta.env) {
      // @ts-ignore
      val = import.meta.env[`VITE_${key}`] || import.meta.env[key];
    }
  } catch (e) {}

  if (val) return val;

  // 2. Try Standard Process (CRA / Next.js / Node)
  if (typeof process !== 'undefined' && process.env) {
    val = 
      process.env[`VITE_${key}`] || 
      process.env[`REACT_APP_${key}`] || 
      process.env[`NEXT_PUBLIC_${key}`] || 
      process.env[key];
  }
  
  return val;
};

// Raw values
const rawUrl = getEnv('SUPABASE_URL');
const rawKey = getEnv('SUPABASE_ANON_KEY');

// Helper to sanitize inputs (remove spaces, ensure https)
const sanitizeUrl = (url: string) => {
    if (!url) return '';
    let cleaned = url.trim();
    if (!cleaned.startsWith('http')) {
        cleaned = `https://${cleaned}`;
    }
    if (cleaned.endsWith('/')) {
        cleaned = cleaned.slice(0, -1);
    }
    return cleaned;
};

const envUrl = sanitizeUrl(rawUrl);
const envKey = rawKey ? rawKey.trim() : '';

// Constants
const PLACEHOLDER_URL = 'https://placeholder.supabase.co';

export const isSupabaseConfigured = () => {
  return !!envUrl && !!envKey && !envUrl.includes('placeholder');
};

const supabaseUrl = isSupabaseConfigured() ? envUrl : PLACEHOLDER_URL;
const supabaseAnonKey = isSupabaseConfigured() ? envKey : 'placeholder-key';

if (!isSupabaseConfigured()) {
  console.warn("Supabase credentials missing. App will default to Demo Mode (MockDB). Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel.");
} else {
  console.log("Supabase Client initialized successfully.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);