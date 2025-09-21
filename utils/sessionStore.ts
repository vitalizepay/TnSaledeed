// utils/sessionStore.ts
import { supabase } from '../lib/supabaseClient';

const STORAGE_KEY = 'tnsd-session-key';

function getOrCreateSessionKey(): string {
  let key = localStorage.getItem(STORAGE_KEY);
  if (!key) {
    key = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, key);
  }
  return key;
}

export async function upsertSessionRow() {
  const { data } = await supabase.auth.getUser();
  const user = data?.user;
  if (!user) return;

  const session_key = getOrCreateSessionKey();

  const payload = {
    session_key,
    user_id: user.id,
    device: navigator.platform,
    user_agent: navigator.userAgent,
    last_seen: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('user_sessions')
    .upsert(payload, { onConflict: 'session_key' });

  if (error) throw error;
}

export async function heartbeat() {
  const session_key = localStorage.getItem(STORAGE_KEY);
  if (!session_key) return;

  const { error } = await supabase
    .from('user_sessions')
    .update({ last_seen: new Date().toISOString() })
    .eq('session_key', session_key);

  if (error) throw error;
}
