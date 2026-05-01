import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authClient } from '@/lib/auth';
import { isOnboardingComplete } from '@/utils/onboardingStorage';

interface User {
  id: string;
  email: string;
  name?: string;
  image?: string;
}

interface AuthContextType {
  user: User | null;
  session: unknown | null;
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

/**
 * Clear all local app data. Called on logout and before a new login
 * to prevent data bleeding between accounts.
 */
async function clearAllLocalData(userId?: string): Promise<void> {
  console.log('[AuthContext] Clearing local data for user:', userId ?? 'all');
  try {
    const allKeys = await AsyncStorage.getAllKeys();
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
  const [session, setSession] = useState<unknown | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);

  const applySession = async (sessionData: { user: { id: string; email: string; name?: string; image?: string } } | null) => {
    if (sessionData?.user) {
      const u: User = {
        id: sessionData.user.id,
        email: sessionData.user.email ?? '',
        name: sessionData.user.name,
        image: sessionData.user.image,
      };
      setUser(u);
      setSession(sessionData);
      const done = await isOnboardingComplete();
      setOnboardingCompleted(done);
    } else {
      setUser(null);
      setSession(null);
      setOnboardingCompleted(null);
    }
  };

  useEffect(() => {
    const restoreSession = async () => {
      try {
        console.log('[AuthContext] Restoring session via Better Auth...');
        const { data, error } = await authClient.getSession();
        if (error) {
          console.warn('[AuthContext] Session restore error:', error.message);
          setUser(null);
          setSession(null);
          setOnboardingCompleted(null);
          return;
        }
        console.log('[AuthContext] Session restored:', data?.user ? `uid=${data.user.id}` : 'no session');
        await applySession(data as any);
      } catch (err) {
        console.error('[AuthContext] Unexpected error during session restore:', err);
        setUser(null);
        setSession(null);
        setOnboardingCompleted(null);
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, []);

  const fetchUser = async () => {
    try {
      setLoading(true);
      console.log('[AuthContext] fetchUser: refreshing session...');
      const { data, error } = await authClient.getSession();
      if (error) {
        console.warn('[AuthContext] fetchUser session error:', error.message);
        setUser(null);
        setSession(null);
        setOnboardingCompleted(null);
        return;
      }
      console.log('[AuthContext] fetchUser:', data?.user ? `uid=${data.user.id}` : 'no session');
      await applySession(data as any);
    } catch (error) {
      console.error('[AuthContext] Failed to fetch user:', error);
      setUser(null);
      setSession(null);
      setOnboardingCompleted(null);
    } finally {
      setLoading(false);
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    console.log('[AuthContext] signInWithEmail:', email);
    try {
      const { data, error } = await authClient.signIn.email({ email, password });
      if (error) {
        console.error('[AuthContext] signInWithEmail error:', error.message);
        const msg = (error.message ?? '').toLowerCase();
        if (msg.includes('invalid') || msg.includes('credentials') || msg.includes('password') || msg.includes('not found')) {
          throw new Error('Incorrect email or password. Please try again.');
        }
        if (msg.includes('verified') || msg.includes('verification')) {
          throw new Error('Please verify your email before signing in. Check your inbox.');
        }
        throw new Error(error.message || 'Sign in failed. Please check your credentials.');
      }
      console.log('[AuthContext] signInWithEmail successful, uid:', (data as any)?.user?.id);
      await applySession(data as any);
    } catch (err: any) {
      if (err.message) throw err;
      console.error('[AuthContext] signInWithEmail network error:', err);
      throw new Error('Unable to connect. Please check your connection and try again.');
    }
  };

  const signUpWithEmail = async (email: string, password: string, name?: string) => {
    console.log('[AuthContext] signUpWithEmail:', email, 'name:', name);
    try {
      const { data, error } = await authClient.signUp.email({
        email,
        password,
        name: name ?? '',
      });
      if (error) {
        console.error('[AuthContext] signUpWithEmail error:', error.message);
        const msg = error.message ?? '';
        if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('exists')) {
          throw new Error('An account with this email already exists. Try signing in instead.');
        }
        throw new Error(msg || 'Sign up failed. Please try again.');
      }
      console.log('[AuthContext] signUpWithEmail successful, uid:', (data as any)?.user?.id);
      // Store name for onboarding pre-fill
      if (name) {
        await AsyncStorage.setItem('signupName', name);
      }
      // Explicitly refresh session to ensure token is stored
      await fetchUser();
    } catch (err: any) {
      if (err.message) throw err;
      console.error('[AuthContext] signUpWithEmail network error:', err);
      throw new Error('Unable to connect. Please check your connection and try again.');
    }
  };

  const signIn = signInWithEmail;
  const signUp = async (email: string, password: string) => signUpWithEmail(email, password);

  const signInWithGoogle = async () => {
    console.log('[AuthContext] signInWithGoogle');
    try {
      const { error } = await authClient.signIn.social({
        provider: 'google',
        callbackURL: 'aps://auth-callback',
      });
      if (error) {
        console.error('[AuthContext] Google OAuth error:', error.message);
        throw new Error(error.message || 'Google sign in failed.');
      }
      await fetchUser();
    } catch (err: any) {
      if (err.message) throw err;
      throw new Error('Unable to connect. Please check your connection and try again.');
    }
  };

  const signInWithApple = async () => {
    console.log('[AuthContext] signInWithApple');
    try {
      const { error } = await authClient.signIn.social({
        provider: 'apple',
        callbackURL: 'aps://auth-callback',
      });
      if (error) {
        console.error('[AuthContext] Apple OAuth error:', error.message);
        throw new Error(error.message || 'Apple sign in failed.');
      }
      await fetchUser();
    } catch (err: any) {
      if (err.message) throw err;
      throw new Error('Unable to connect. Please check your connection and try again.');
    }
  };

  const signOut = async () => {
    if (!user) {
      console.log('[AuthContext] signOut skipped — no authenticated user');
      return;
    }
    console.log('[AuthContext] signOut for user:', user.id);
    try {
      await clearAllLocalData(user.id);
      const { error } = await authClient.signOut();
      if (error) {
        console.error('[AuthContext] signOut error:', error.message);
      } else {
        console.log('[AuthContext] signOut successful');
      }
    } catch (err) {
      console.error('[AuthContext] signOut unexpected error:', err);
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
