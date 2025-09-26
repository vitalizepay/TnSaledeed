// src/components/AuthCallback.tsx
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!
);

export default function AuthCallback() {
  const [msg, setMsg] = useState('Signing you in…');

  useEffect(() => {
    (async () => {
      const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
      if (error) {
        setMsg('Link invalid or expired. Please try logging in again.');
        setTimeout(() => (window.location.href = '/'), 2000);
      } else {
        // If this was a password recovery flow, send them to Landing with the hash
        if (window.location.hash.includes('type=recovery')) {
          window.location.replace('/#type=recovery');
        } else {
          // otherwise go to your default app view
          window.location.replace('/#'); // keeps your hash-router happy
        }
      }
    })();
  }, []);

  return (
    <div style={{ height: '100vh', display: 'grid', placeItems: 'center', fontFamily: 'sans-serif' }}>
      <p>{msg}</p>
    </div>
  );
}
