import { useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from './firebase';
import { setCloudUid, pullFromCloud, pushAllToCloud } from './cloudSync';
import { db } from './db';
import AnimatedBg from './components/AnimatedBg';

export function useAuth() {
  const [user,        setUser]        = useState(undefined);
  const [syncing,     setSyncing]     = useState(false);
  const [syncVersion, setSyncVersion] = useState(0);

  const doSync = useCallback(async (uid) => {
    if (!uid) return;
    setSyncing(true);
    try {
      const { getDocs, collection } = await import('firebase/firestore');
      const { db2 } = await import('./firebase');

      // Check cloud vs local
      const [cloudSnap, localCount] = await Promise.all([
        getDocs(collection(db2, `users/${uid}/invoices`)),
        db.invoices.count(),
      ]);

      if (cloudSnap.size === 0 && localCount > 0) {
        // Cloud empty but local has data → first time upload
        await pushAllToCloud(db);
      }

      // Always pull latest from cloud → overwrites local with freshest data
      await pullFromCloud(db);

    } catch(e) {
      console.warn('Sync error:', e);
    }
    setSyncing(false);
    setSyncVersion(v => v + 1);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setCloudUid(u.uid);
        setUser(u);
        await doSync(u.uid);
      } else {
        setCloudUid(null);
        setUser(null);
      }
    });
    return unsub;
  }, [doSync]);

  // Auto-sync when user switches back to the app/tab
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && auth.currentUser) {
        doSync(auth.currentUser.uid);
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [doSync]);

  const signIn       = () => signInWithPopup(auth, googleProvider);
  const signOutUser  = () => signOut(auth);
  const manualSync   = () => auth.currentUser && doSync(auth.currentUser.uid);

  return { user, syncing, syncVersion, signIn, signOut: signOutUser, manualSync };
}

/* ── Login screen ─────────────────────────────────────────────── */
export function LoginScreen({ onSignIn }) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const handleSignIn = async () => {
    setLoading(true); setError('');
    try { await onSignIn(); }
    catch(e) { setError('Sign-in failed. Try again.'); }
    finally  { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{zIndex:10}}>
      <AnimatedBg/>
      <div className="relative z-10 w-full max-w-sm mx-4">
        <div className="rounded-3xl p-8 text-center"
          style={{
            background:'rgba(255,255,255,0.93)',
            backdropFilter:'blur(24px)',
            boxShadow:'0 8px 40px rgba(99,102,241,0.15)',
            border:'1px solid rgba(255,255,255,0.95)',
          }}>
          <div className="w-20 h-20 rounded-2xl mx-auto mb-4 overflow-hidden shadow-lg">
            <img src="/logo.svg" alt="Evolve" className="w-full h-full object-contain bg-black"/>
          </div>
          <h1 className="font-black text-2xl tracking-[0.15em] text-gray-800 mb-1">EVOLVE</h1>
          <p className="text-gray-400 text-sm mb-6">Supplement Store · Billing & Inventory</p>

          <div className="bg-indigo-50 rounded-2xl p-4 mb-6 text-left">
            <p className="text-xs font-bold text-indigo-700 mb-1">☁️ Cloud Sync Active</p>
            <p className="text-xs text-indigo-600">Sign in once — access all bills from any phone or laptop forever. 100% free on Google.</p>
          </div>

          <button onClick={handleSignIn} disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-bold text-gray-700 transition-all active:scale-95 disabled:opacity-60"
            style={{background:'#fff', border:'1.5px solid #e5e7eb', boxShadow:'0 2px 10px rgba(0,0,0,0.08)'}}>
            {loading ? <span className="text-sm">Signing in…</span> : (
              <>
                <svg width="22" height="22" viewBox="0 0 48 48">
                  <path fill="#4285F4" d="M44.5 20H24v8.5h11.7C34.2 33.6 29.8 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 5.1 29.6 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21c10.6 0 20-7.7 20-21 0-1.3-.2-2.7-.5-4z"/>
                  <path fill="#34A853" d="M6.3 14.7l7 5.1C15.2 16.1 19.2 13 24 13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 5.1 29.6 3 24 3c-7.7 0-14.4 4.6-17.7 11.7z"/>
                  <path fill="#FBBC05" d="M24 45c5.5 0 10.4-1.9 14.3-5l-6.6-5.4C29.8 36.4 27 37 24 37c-5.8 0-10.7-3.9-12.4-9.3l-7 5.4C8 40.3 15.4 45 24 45z"/>
                  <path fill="#EA4335" d="M44.5 20H24v8.5h11.7c-.8 2.3-2.3 4.3-4.3 5.6l6.6 5.4c3.9-3.6 6-9 6-15.5 0-1.3-.2-2.7-.5-4z"/>
                </svg>
                <span className="font-bold">Sign in with Google</span>
              </>
            )}
          </button>
          {error && <p className="text-red-500 text-xs mt-3">{error}</p>}
          <p className="text-gray-300 text-xs mt-5">Only you can access your data.</p>
        </div>
      </div>
    </div>
  );
}

export function SyncingOverlay() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4"
      style={{background:'rgba(255,255,255,0.95)', backdropFilter:'blur(8px)'}}>
      <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"/>
      <p className="font-bold text-indigo-700 text-xl">Syncing your data…</p>
      <p className="text-gray-400 text-sm">Getting latest bills from cloud</p>
    </div>
  );
}
