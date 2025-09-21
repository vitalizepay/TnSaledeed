// src/contexts/UserContext.tsx
import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { AuthError, User as SupabaseUser } from '@supabase/supabase-js';

interface User {
  id: string;
  email: string;
  isAdmin: boolean;
}

interface UserContextType {
  user: User | null;
  trials: number | null;
  login: (email: string, pass: string) => Promise<{ error: AuthError | null }>;
  signup: (email: string, pass: string) => Promise<{ error: AuthError | null }>;
  logout: () => Promise<void>;
  useTrial: () => Promise<void>;
  sendPasswordResetEmail: (email: string) => Promise<{ error: AuthError | null }>;
  updatePassword: (password: string) => Promise<{ error: AuthError | null }>;
  loading: boolean;
  fatalError: string | null;
  clearSiteDataAndReload: () => void;
}

export const UserContext = createContext<UserContextType>({
  user: null,
  trials: null,
  login: async () => ({ error: null }),
  signup: async () => ({ error: null }),
  logout: async () => {},
  useTrial: async () => {},
  sendPasswordResetEmail: async () => ({ error: null }),
  updatePassword: async () => ({ error: null }),
  loading: true,
  fatalError: null,
  clearSiteDataAndReload: () => {},
});

/* ---------- Session heartbeat config ---------- */
const HEARTBEAT_MS = 30_000;

function deviceLabel() {
  const ua = navigator.userAgent || '';
  const plat = navigator.platform || '';
  let device = 'Desktop';
  if (/Android/i.test(ua)) device = 'Android';
  else if (/iPhone|iPad|iPod/i.test(ua)) device = 'iOS';
  else if (/Macintosh/i.test(ua)) device = 'Mac';
  else if (/Windows/i.test(ua)) device = 'Windows';
  return { device, platform: plat, userAgent: ua };
}

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [trials, setTrials] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [fatalError, setFatalError] = useState<string | null>(null);

  // heartbeat refs
  const heartbeatTimer = useRef<number | null>(null);
  const sessionKeyRef = useRef<string | null>(null);
  const visHandlerRef = useRef<(() => void) | null>(null);

  const clearSiteDataAndReload = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      document.cookie.split(';').forEach((cookie) => {
        const name = cookie.split('=')[0]?.trim();
        if (name) document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
      });
    } finally {
      window.location.reload();
    }
  };

  /* ---------- Profile loading ---------- */
  const fetchUserProfile = useCallback(async (supabaseUser: SupabaseUser) => {
    const { data, error, status } = await supabase
      .from('profiles')
      .select('trial_count,is_admin')
      .eq('id', supabaseUser.id)
      .maybeSingle();

    if (error && status !== 406) {
      console.warn('profiles read failed:', error);
      setFatalError('Could not load your profile right now.');
      return;
    }

    let row = data;

    if (!row) {
      const { data: inserted, error: upErr } = await supabase
        .from('profiles')
        .upsert({
          id: supabaseUser.id,
          email: supabaseUser.email,
          trial_count: 15, // default trials
          is_admin: false,
        })
        .select('trial_count,is_admin')
        .single();

      if (upErr) {
        console.warn('profiles upsert failed:', upErr);
        setFatalError('Could not create your profile. Try again.');
        return;
      }
      row = inserted;
    }

    const isAdmin = !!row.is_admin;
    setUser({ id: supabaseUser.id, email: supabaseUser.email!, isAdmin });
    setTrials(isAdmin ? null : row.trial_count);
    setFatalError(null);
  }, []);

  /* ---------- Heartbeat (per-tab) ---------- */
  const stopHeartbeat = useCallback(async () => {
    if (heartbeatTimer.current) {
      window.clearInterval(heartbeatTimer.current);
      heartbeatTimer.current = null;
    }
    if (visHandlerRef.current) {
      document.removeEventListener('visibilitychange', visHandlerRef.current as EventListener);
      visHandlerRef.current = null;
    }

    const key = sessionKeyRef.current;
    if (key) {
      sessionKeyRef.current = null;
      // mark session ended (fire-and-forget)
      supabase
        .from('user_sessions')
        .update({ ended_at: new Date().toISOString(), last_seen: new Date().toISOString() })
        .eq('session_key', key)
        .then(() => void 0)
        .catch(() => void 0);
    }
  }, []);

  const startHeartbeat = useCallback(
    async (u: SupabaseUser) => {
      await stopHeartbeat();
      const sessionKey = crypto.randomUUID();
      sessionKeyRef.current = sessionKey;

      const meta = deviceLabel();

      // Create/refresh the row via RPC (bypasses RLS for INSERT)
      const { error: rpcErr } = await supabase.rpc('start_user_session', {
        _session_key: sessionKey,
        _email: u.email, // ok if your table has email; function can ignore otherwise
        _user_agent: meta.userAgent,
        _device: meta.device,
        _platform: meta.platform,
      });
      if (rpcErr) {
        console.warn('start_user_session RPC failed:', rpcErr);
      }

      const tick = async () => {
        const key = sessionKeyRef.current;
        if (!key) return;
        await supabase
          .from('user_sessions')
          .update({ last_seen: new Date().toISOString() })
          .eq('session_key', key);
      };

      await tick();
      heartbeatTimer.current = window.setInterval(() => {
        tick().catch((e) => console.warn('heartbeat failed', e));
      }, HEARTBEAT_MS) as unknown as number;

      // When the tab is hidden, stamp an end time (uses auth'd client)
      const onVis = () => {
        if (document.hidden) {
          const key = sessionKeyRef.current;
          if (!key) return;
          supabase
            .from('user_sessions')
            .update({
              last_seen: new Date().toISOString(),
              ended_at: new Date().toISOString(),
            })
            .eq('session_key', key)
            .then(() => void 0)
            .catch(() => void 0);
        }
      };
      visHandlerRef.current = onVis;
      document.addEventListener('visibilitychange', onVis);
    },
    [stopHeartbeat]
  );

  /* ---------- Boot + auth change ---------- */
  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        const sessUser = data.session?.user;

        if (!sessUser) {
          setUser(null);
          setTrials(null);
          await stopHeartbeat();
          return;
        }

        setUser((prev) => prev ?? { id: sessUser.id, email: sessUser.email!, isAdmin: false });
        fetchUserProfile(sessUser);
        startHeartbeat(sessUser);
      } catch (e) {
        console.warn('getSession failed:', e);
        setFatalError('Could not restore session. Please log in.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user;
      if (u) {
        setUser((prev) => prev ?? { id: u.id, email: u.email!, isAdmin: false });
        fetchUserProfile(u);
        startHeartbeat(u);
      } else {
        setUser(null);
        setTrials(null);
        stopHeartbeat();
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
      stopHeartbeat();
    };
  }, [fetchUserProfile, startHeartbeat, stopHeartbeat]);

  /* ---------- Public API ---------- */
  const login = async (email: string, pass: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    return { error };
  };

  const signup = async (email: string, pass: string) => {
    const { error } = await supabase.auth.signUp({ email, password: pass });
    return { error };
  };

  const logout = async () => {
    await stopHeartbeat();
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Error logging out:', error);
    setUser(null);
    setTrials(null);
  };

  const useTrial = async () => {
    if (user && !user.isAdmin && trials !== null && trials > 0) {
      const prev = trials,
        next = prev - 1;
      setTrials(next);
      const { error } = await supabase.from('profiles').update({ trial_count: next }).eq('id', user.id);
      if (error) {
        console.error('Error updating trial count:', error);
        setTrials(prev);
      }
    }
  };

  const sendPasswordResetEmail = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}#type=recovery`,
    });
    return { error };
  };

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    return { error };
  };

  return (
    <UserContext.Provider
      value={{
        user,
        trials,
        login,
        signup,
        logout,
        useTrial,
        sendPasswordResetEmail,
        updatePassword,
        loading,
        fatalError,
        clearSiteDataAndReload,
      }}
    >
      {children}
      {loading && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            background: 'rgba(255,255,255,0.6)',
            pointerEvents: 'none',
          }}
        >
          Initializing…
        </div>
      )}
    </UserContext.Provider>
  );
};
