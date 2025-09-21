// src/lib/supabaseClient.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const URL = import.meta.env.VITE_SUPABASE_URL as string;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const isSupabaseConfigured = () => !!URL && !!KEY;
if (!isSupabaseConfigured()) {
  console.warn('Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your env.');
}

// Give each app/env its own storage key so tokens don't collide
const STORAGE_KEY = import.meta.env.VITE_AUTH_STORAGE_KEY ?? 'sb-auth-v1';

export const supabase: SupabaseClient = createClient(URL, KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
    storageKey: STORAGE_KEY,
  },
});

// Expose only during local/dev debugging
if (import.meta.env.DEV) {
  // @ts-ignore
  window.supabase = supabase;
}

// Optional: quick helper to fix “Invalid Refresh Token” without nuking everything
export async function clearLocalAuth() {
  try {
    await supabase.auth.signOut({ scope: 'local' });
  } finally {
    localStorage.removeItem(STORAGE_KEY);
  }
}

