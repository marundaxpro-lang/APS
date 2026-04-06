import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { isOnboardingComplete } from '@/utils/onboardingStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

/**
 * Clear all local app data. Called on logout and before a new login
 * to prevent data bleeding between accounts.
 */
async function clearAllLocalData(userId?: string): Promise<void> {
  console.log('[AuthContext] Clearing local data for user:', userId ?? 'all');
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    // Remove all app-specific keys. Keep nothing between sessions.
    const appKeys = allKeys.filter(k =>
      k.startsWith('apex_') ||
      k.startsWith('adherence_') ||
      k.startsWith('fitnessProfile') ||
      k.startsWith('hasCompletedOnboarding') ||
      k.startsWith('caloricGoal') ||
      k.startsWith('weeklyWorkouts') ||
      k.startsWith('guest_mode') ||
      k.startsWith('isGuestUser') ||
      k.startsWith('guestName') ||
      k.startsWith('onboarding_') ||
      k.startsWith('coach_') ||
      k.startsWith('student_mode') ||
      k.startsWith('travel_mode') ||
      k.startsWith('active_pack') ||
      k.startsWith('momentum_') ||
      k.startsWith('next_action_') ||
      k.startsWith('signupName') ||
      k.startsWith('userName') ||
      k.startsWith('userMotivation') ||
      k.startsWith('onboardingJustCompleted') ||
      k.startsWith('language_selection_done')
    );
    if (appKeys.length > 0) {
      await AsyncStorage.multiRemove(appKeys);
      console.log('[AuthContext] Cleared', appKeys.length, 'local storage keys');
    }
  } catch (e) {
    console.error('[AuthContext] Error clearing local data:', e);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);

  useEffect(() => {
    // Load initial session — wrapped in try/catch so a corrupt/expired token
    // never leaves the app in a stuck loading state.
    const restoreSession = async () => {
      try {
        console.log('[AuthContext] Restoring session...');
        const { data: { session: s }, error } = await supabase.auth.getSession();

        if (error) {
          console.warn('[AuthContext] Session restore error:', error.message);
          // Token is invalid/expired — clear it so the user is sent to /auth
          await supabase.auth.signOut().catch(() => {});
          setUser(null);
          setSession(null);
          setOnboardingCompleted(null);
          setLoading(false);
          return;
        }

        console.log('[AuthContext] Initial session loaded:', s ? `authenticated uid=${s.user.id}` : 'no session');
        setSession(s);

        if (s?.user) {
          setUser(mapSupabaseUser(s.user));
          const done = await isOnboardingComplete();
          setOnboardingCompleted(done);
        } else {
          setUser(null);
          setOnboardingCompleted(null);
        }
      } catch (err) {
        // Unexpected error — fail cleanly, never leave user on a blank screen
        console.error('[AuthContext] Unexpected error during session restore:', err);
        setUser(null);
        setSession(null);
        setOnboardingCompleted(null);
      } finally {
        setLoading(false);
      }
    };

    restoreSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      console.log('[AuthContext] Auth state changed:', _event, s ? `uid=${s.user.id}` : 'no session');
      setSession(s);
      if (s?.user) {
        setUser(mapSupabaseUser(s.user));
        isOnboardingComplete().then(setOnboardingCompleted);
      } else {
        setUser(null);
        setOnboardingCompleted(null);
      }
      // Only set loading false here if we're past the initial restore
      // (the restoreSession finally block handles the initial case)
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchUser = async () => {
    try {
      setLoading(true);
      const { data: { session: s }, error } = await supabase.auth.getSession();
      if (error) {
        console.warn('[AuthContext] fetchUser session error:', error.message);
        setUser(null);
        setSession(null);
        setOnboardingCompleted(null);
        return;
      }
      console.log('[AuthContext] fetchUser:', s ? `session found uid=${s.user.id}` : 'no session');
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
      setSession(null);
      setOnboardingCompleted(null);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    console.log('[AuthContext] signInWithPassword:', email);
    // Clear any existing session/data before logging in a new user
    const { data: { session: existingSession } } = await supabase.auth.getSession();
    if (existingSession) {
      console.log('[AuthContext] Existing session found — signing out first to enforce single account');
      await supabase.auth.signOut();
      await clearAllLocalData(existingSession.user.id);
    }
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
    // Clear any existing session/data before creating a new account
    const { data: { session: existingSession } } = await supabase.auth.getSession();
    if (existingSession) {
      console.log('[AuthContext] Existing session found — signing out first before sign up');
      await supabase.auth.signOut();
      await clearAllLocalData(existingSession.user.id);
    }
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
    // Guard: only call signOut if there is an active authenticated session
    if (!user) {
      console.log('[AuthContext] signOut skipped — no authenticated user');
      return;
    }
    console.log('[AuthContext] signOut for user:', user.id);
    try {
      // Clear local data first so it's gone even if signOut errors
      await clearAllLocalData(user.id);
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('[AuthContext] signOut error:', error.message);
      } else {
        console.log('[AuthContext] signOut successful');
      }
    } finally {
      setUser(null);
      setSession(null);
      setOnboardingCompleted(null);
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
