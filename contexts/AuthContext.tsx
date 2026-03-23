import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { isOnboardingComplete } from '@/utils/onboardingStorage';

interface User {
  id: string;
  email: string;
  name?: string;
  image?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  authLoading: boolean;
  isPremium: boolean;
  onboardingCompleted: boolean | null;
  setOnboardingCompleted: (value: boolean) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name?: string) => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  fetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function mapSupabaseUser(supabaseUser: SupabaseUser): User {
  return {
    id: supabaseUser.id,
    email: supabaseUser.email ?? '',
    name: supabaseUser.user_metadata?.full_name ?? supabaseUser.user_metadata?.name,
    image: supabaseUser.user_metadata?.avatar_url,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);

  useEffect(() => {
    // Load initial session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      console.log('[AuthContext] Initial session loaded:', s ? 'authenticated' : 'no session');
      setSession(s);
      if (s?.user) {
        setUser(mapSupabaseUser(s.user));
        isOnboardingComplete().then(setOnboardingCompleted);
      } else {
        setUser(null);
        setOnboardingCompleted(null);
      }
      setLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      console.log('[AuthContext] Auth state changed:', _event);
      setSession(s);
      if (s?.user) {
        setUser(mapSupabaseUser(s.user));
        isOnboardingComplete().then(setOnboardingCompleted);
      } else {
        setUser(null);
        setOnboardingCompleted(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchUser = async () => {
    try {
      setLoading(true);
      const { data: { session: s } } = await supabase.auth.getSession();
      console.log('[AuthContext] fetchUser:', s ? 'session found' : 'no session');
      setSession(s);
      if (s?.user) {
        setUser(mapSupabaseUser(s.user));
        const done = await isOnboardingComplete();
        setOnboardingCompleted(done);
      } else {
        setUser(null);
        setOnboardingCompleted(null);
      }
    } catch (error) {
      console.error('[AuthContext] Failed to fetch user:', error);
      setUser(null);
      setOnboardingCompleted(null);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    console.log('[AuthContext] signInWithPassword:', email);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error('[AuthContext] signIn error:', error.message);
      throw new Error(error.message);
    }
    console.log('[AuthContext] signIn successful');
  };

  const signUp = async (email: string, password: string) => {
    console.log('[AuthContext] signUp:', email);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      console.error('[AuthContext] signUp error:', error.message);
      throw new Error(error.message);
    }
    console.log('[AuthContext] signUp successful');
  };

  const signInWithEmail = async (email: string, password: string) => {
    await signIn(email, password);
  };

  const signUpWithEmail = async (email: string, password: string, name?: string) => {
    console.log('[AuthContext] signUpWithEmail:', email, 'name:', name);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });
    if (error) {
      console.error('[AuthContext] signUpWithEmail error:', error.message);
      throw new Error(error.message);
    }
    console.log('[AuthContext] signUpWithEmail successful');
  };

  const signInWithGoogle = async () => {
    console.log('[AuthContext] signInWithGoogle');
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
    if (error) {
      console.error('[AuthContext] Google OAuth error:', error.message);
      throw new Error(error.message);
    }
  };

  const signInWithApple = async () => {
    console.log('[AuthContext] signInWithApple');
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'apple' });
    if (error) {
      console.error('[AuthContext] Apple OAuth error:', error.message);
      throw new Error(error.message);
    }
  };

  const signOut = async () => {
    console.log('[AuthContext] signOut');
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('[AuthContext] signOut error:', error.message);
      }
    } finally {
      setUser(null);
      setSession(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        authLoading: loading,
        isPremium: false,
        onboardingCompleted,
        setOnboardingCompleted: (value: boolean) => setOnboardingCompleted(value),
        signIn,
        signUp,
        signInWithEmail,
        signUpWithEmail,
        signInWithApple,
        signInWithGoogle,
        signOut,
        fetchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
