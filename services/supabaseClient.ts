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
let rawUrl = getEnv('SUPABASE_URL');
let rawKey = getEnv('SUPABASE_ANON_KEY');

// --- INTELLIGENT CONFIG FIXER ---
// Detect if user swapped URL and Key (Common mistake)
const isKeyLikelyUrl = (val: string) => val && (val.includes('supabase.co') || val.startsWith('http'));
const isUrlLikelyKey = (val: string) => val && val.startsWith('ey');

if (isUrlLikelyKey(rawUrl) && isKeyLikelyUrl(rawKey)) {
    console.warn("⚠️ CONFIG WARNING: It looks like VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are swapped. Swapping them automatically...");
    const temp = rawUrl;
    rawUrl = rawKey;
    rawKey = temp;
} else if (isUrlLikelyKey(rawUrl)) {
    console.error("❌ CONFIG ERROR: VITE_SUPABASE_URL looks like an API Key. Please check your Vercel Environment Variables.");
}
// --------------------------------

// Helper to sanitize inputs (remove spaces, ensure https)
const sanitizeUrl = (url: string) => {
    if (!url) return '';
    let cleaned = url.trim();
    if (cleaned.startsWith('ey')) return cleaned; // It's a key, not a url (fallback)
    
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
  return !!envUrl && !!envKey && !envUrl.includes('placeholder') && !envUrl.startsWith('ey');
};

const supabaseUrl = isSupabaseConfigured() ? envUrl : PLACEHOLDER_URL;
const supabaseAnonKey = isSupabaseConfigured() ? envKey : 'placeholder-key';

if (!isSupabaseConfigured()) {
  console.warn("Supabase credentials missing or invalid. App will default to Demo Mode (MockDB).");
} else {
  console.log("Supabase Client initialized successfully.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);