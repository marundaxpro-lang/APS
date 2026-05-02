import React, { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import { authClient } from '@/lib/auth';
import { clearOnboarding, isOnboardingComplete, setOnboardingComplete } from '@/utils/onboardingStorage';

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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isAuthCallbackUrl(url: string): boolean {
  return url.includes('auth-callback') || url.includes('auth?') || url.includes('onboarding');
}

async function clearAllLocalData(userId?: string): Promise<void> {
  console.log('[AuthContext] Clearing local data for user:', userId ?? 'all');
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const appKeys = allKeys.filter(k =>
      k.startsWith('apex_') ||
      k.startsWith('adherence_') ||
      k === 'fitnessProfile' ||
      k === 'hasCompletedOnboarding' ||
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
  const [onboardingCompleted, setOnboardingCompletedState] = useState<boolean | null>(null);

  const applySession = useCallback(async (sessionData: any, options?: { forceOnboardingIncomplete?: boolean }) => {
    if (!sessionData?.user) {
      setUser(null);
      setSession(null);
      setOnboardingCompletedState(null);
      return false;
    }

    const u: User = {
      id: sessionData.user.id,
      email: sessionData.user.email ?? '',
      name: sessionData.user.name,
      image: sessionData.user.image,
    };

    setUser(u);
    setSession(sessionData);

    if (options?.forceOnboardingIncomplete) {
      await clearOnboarding(u.id);
      setOnboardingCompletedState(false);
      return true;
    }

    const done = await isOnboardingComplete(u.id);
    setOnboardingCompletedState(done);
    return true;
  }, []);

  const refreshSession = useCallback(async (options?: { forceOnboardingIncomplete?: boolean }) => {
    const { data, error } = await authClient.getSession();
    if (error) {
      console.warn('[AuthContext] Session refresh error:', error.message);
      await applySession(null);
      return false;
    }
    return applySession(data as any, options);
  }, [applySession]);

  const waitForSession = useCallback(async (options?: { forceOnboardingIncomplete?: boolean }) => {
    for (let attempt = 1; attempt <= 20; attempt++) {
      const hasSession = await refreshSession(options);
      if (hasSession) {
        console.log('[AuthContext] Session available after OAuth, attempt:', attempt);
        return true;
      }
      await sleep(500);
    }
    console.warn('[AuthContext] OAuth completed, but no session was stored');
    return false;
  }, [refreshSession]);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        console.log('[AuthContext] Restoring session via Better Auth...');
        await refreshSession();
      } catch (err) {
        console.error('[AuthContext] Unexpected error during session restore:', err);
        await applySession(null);
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, [applySession, refreshSession]);

  useEffect(() => {
    const handleAuthCallback = async (url: string) => {
      if (!isAuthCallbackUrl(url)) return;
      console.log('[AuthContext] Auth callback received:', url);
      setLoading(true);
      try {
        await waitForSession();
      } finally {
        setLoading(false);
      }
    };

    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleAuthCallback(url).catch((error) => {
        console.error('[AuthContext] Auth callback handling failed:', error);
        setLoading(false);
      });
    });

    Linking.getInitialURL()
      .then((url) => {
        if (url) return handleAuthCallback(url);
      })
      .catch((error) => console.warn('[AuthContext] Could not read initial URL:', error));

    return () => subscription.remove();
  }, [waitForSession]);

  const fetchUser = async () => {
    try {
      setLoading(true);
      console.log('[AuthContext] fetchUser: refreshing session...');
      await refreshSession();
    } catch (error) {
      console.error('[AuthContext] Failed to fetch user:', error);
      await applySession(null);
    } finally {
      setLoading(false);
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    console.log('[AuthContext] signInWithEmail:', email);
    try {
      const { data, error } = await authClient.signIn.email({ email, password });
      if (error) {
        const msg = (error.message ?? '').toLowerCase();
        if (msg.includes('invalid') || msg.includes('credentials') || msg.includes('password') || msg.includes('not found')) {
          throw new Error('Incorrect email or password. Please try again.');
        }
        if (msg.includes('verified') || msg.includes('verification')) {
          throw new Error('Please verify your email before signing in. Check your inbox.');
        }
        throw new Error(error.message || 'Sign in failed. Please check your credentials.');
      }
      await applySession(data as any);
    } catch (err: any) {
      if (err.message) throw err;
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
        const msg = error.message ?? '';
        if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('exists')) {
          throw new Error('An account with this email already exists. Try signing in instead.');
        }
        throw new Error(msg || 'Sign up failed. Please try again.');
      }
      if (name) await AsyncStorage.setItem('signupName', name);
      await applySession(data as any, { forceOnboardingIncomplete: true });
    } catch (err: any) {
      if (err.message) throw err;
      throw new Error('Unable to connect. Please check your connection and try again.');
    }
  };

  const signIn = signInWithEmail;
  const signUp = async (email: string, password: string) => signUpWithEmail(email, password);

  const signInWithGoogle = async () => {
    console.log('[AuthContext] signInWithGoogle');
    setLoading(true);
    try {
      const { error } = await authClient.signIn.social({
        provider: 'google',
        callbackURL: '/auth-callback',
        newUserCallbackURL: '/onboarding',
      });
      if (error) throw new Error(error.message || 'Google sign in failed.');
      const ok = await waitForSession();
      if (!ok) throw new Error('Google sign in did not complete. Please try again.');
    } catch (err: any) {
      if (err.message) throw err;
      throw new Error('Unable to connect. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const signInWithApple = async () => {
    console.log('[AuthContext] signInWithApple');
    setLoading(true);
    try {
      const { error } = await authClient.signIn.social({
        provider: 'apple',
        callbackURL: '/auth-callback',
        newUserCallbackURL: '/onboarding',
      });
      if (error) throw new Error(error.message || 'Apple sign in failed.');
      const ok = await waitForSession();
      if (!ok) throw new Error('Apple sign in did not complete. Please try again.');
    } catch (err: any) {
      if (err?.code === 'ERR_REQUEST_CANCELED' || err?.code === 'ERR_CANCELED') return;
      if (err.message) throw err;
      throw new Error('Unable to connect. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    if (!user) return;
    try {
      await clearAllLocalData(user.id);
      const { error } = await authClient.signOut();
      if (error) console.error('[AuthContext] signOut error:', error.message);
    } catch (err) {
      console.error('[AuthContext] signOut unexpected error:', err);
    } finally {
      setUser(null);
      setSession(null);
      setOnboardingCompletedState(null);
    }
  };

  const persistOnboardingCompleted = (value: boolean) => {
    setOnboardingCompletedState(value);
    if (!user?.id) return;

    const task = value ? setOnboardingComplete(user.id) : clearOnboarding(user.id);
    task.catch((error) => {
      console.warn('[AuthContext] Could not persist onboarding state:', error);
    });
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
        setOnboardingCompleted: persistOnboardingCompleted,
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
  if (context === undefined) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
