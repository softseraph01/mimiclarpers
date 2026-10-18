import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, supabaseConfigured } from '../lib/supabase';

type Profile = { id: string; display_name: string };

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  authReady: boolean;
  profileLoading: boolean;
  authNotice: string;
  signIn(email: string, password: string): Promise<void>;
  signUp(email: string, password: string, displayName: string, returnTo: string): Promise<{ requiresConfirmation: boolean }>;
  signOut(): Promise<void>;
  updateDisplayName(displayName: string): Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(!supabaseConfigured);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [authNotice, setAuthNotice] = useState('');

  useEffect(() => {
    if (!supabase) return;
    let mounted = true;

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) setAuthNotice('We could not restore the saved sign-in. Please sign in again.');
      setSession(data.session);
      setAuthReady(true);
    }).catch(() => {
      if (!mounted) return;
      setAuthNotice('We could not restore the saved sign-in. Check your connection and sign in again.');
      setSession(null);
      setAuthReady(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      setAuthReady(true);
      setAuthNotice('');
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let active = true;
    if (!supabase || !session?.user) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }

    setProfileLoading(true);
    void (async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, display_name')
          .eq('id', session.user.id)
          .maybeSingle();
        if (!active) return;
        setProfile(data ?? null);
        if (error) setAuthNotice('Your account is signed in, but its profile could not be loaded.');
        setProfileLoading(false);
      } catch {
        if (!active) return;
        setProfile(null);
        setAuthNotice('Your account is signed in, but its profile could not be loaded. Check your connection.');
        setProfileLoading(false);
      }
    })();

    return () => { active = false; };
  }, [session?.user?.id]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) throw new Error('Supabase is not configured for this build.');
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw error;
  }, []);

  const signUp = useCallback(async (email: string, password: string, displayName: string, returnTo: string) => {
    if (!supabase) throw new Error('Supabase is not configured for this build.');
    // Keep the callback origin/path stable so it can be allow-listed exactly in
    // Supabase Auth URL Configuration. The requested destination is safe UI
    // state, not a second callback URL.
    const redirectUrl = new URL('/auth', window.location.origin);
    redirectUrl.searchParams.set('next', returnTo);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { display_name: displayName.trim() },
        emailRedirectTo: redirectUrl.toString(),
      },
    });
    if (error) throw error;
    return { requiresConfirmation: !data.session };
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) throw new Error('Supabase is not configured for this build.');
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  const updateDisplayName = useCallback(async (displayName: string) => {
    if (!supabase || !session?.user) throw new Error('Sign in to update your profile.');
    const trimmed = displayName.trim();
    if (trimmed.length < 2 || trimmed.length > 48) throw new Error('Display name must be 2–48 characters.');
    const { data, error } = await supabase
      .from('profiles')
      .update({ display_name: trimmed })
      .eq('id', session.user.id)
      .select('id, display_name')
      .single();
    if (error) throw error;
    setProfile(data);
  }, [session?.user]);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    user: session?.user ?? null,
    profile,
    authReady,
    profileLoading,
    authNotice,
    signIn,
    signUp,
    signOut,
    updateDisplayName,
  }), [session, profile, authReady, profileLoading, authNotice, signIn, signUp, signOut, updateDisplayName]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider.');
  return context;
}
