import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;
let supabaseServiceRoleInstance: SupabaseClient | null = null;

const normalizeEnvValue = (value: string | undefined): string => {
  if (!value) return '';
  const trimmed = value.trim().replace(/^['"]|['"]$/g, '');
  return trimmed.replace(/^Bearer\s+/i, '').trim();
};

const isLikelyPlaceholderKey = (key: string): boolean => {
  if (!key) return true;
  const lower = key.toLowerCase();
  return lower.startsWith('your_') || lower.includes('placeholder') || lower === 'dummy-key';
};

// Validate Supabase URL
const isValidSupabaseUrl = (url: string | undefined): boolean => {
  if (!url) return false;
  // Check if it's a placeholder value
  if (url.includes('your_supabase') || url === 'dummy-key' || url.startsWith('your_')) {
    return false;
  }
  // Check if it's a valid HTTP/HTTPS URL
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
};

// Lazy initialization to avoid build-time errors
export const getSupabase = (): SupabaseClient => {
  if (!supabaseInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = normalizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    
    if (!supabaseUrl || !supabaseAnonKey || !isValidSupabaseUrl(supabaseUrl)) {
      throw new Error(
        'Missing or invalid Supabase environment variables. ' +
        'Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env file. ' +
        'Get your credentials from https://supabase.com/dashboard'
      );
    }
    
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  }
  return supabaseInstance;
};

export const getSupabaseServiceRole = (): SupabaseClient => {
  if (!supabaseServiceRoleInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = normalizeEnvValue(
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.SUPABASE_SERVICE_KEY ||
        process.env.SUPABASE_SERVICE_ROLE ||
        process.env.SUPABASE_SECRET_KEY
    );

    if (!supabaseUrl || !serviceRoleKey || !isValidSupabaseUrl(supabaseUrl) || isLikelyPlaceholderKey(serviceRoleKey)) {
      throw new Error(
        'Missing or invalid Supabase service role configuration. ' +
          'Please set NEXT_PUBLIC_SUPABASE_URL and a valid SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_KEY) in your .env/Vercel env.'
      );
    }

    supabaseServiceRoleInstance = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return supabaseServiceRoleInstance;
};

// Single instance for backward compatibility (avoids "Multiple GoTrueClient instances")
export const supabase = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    const client = getSupabase();
    const val = (client as any)[prop];
    return typeof val === 'function' ? val.bind(client) : val;
  },
});
