import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { authClient } from '@/lib/auth';
import { isOnboardingComplete } from '@/utils/onboardingStorage';

// Ensures the web browser closes correctly after an OAuth redirect
WebBrowser.maybeCompleteAuthSession();

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

  const applySession = async (sessionData: any) => {
    if (!sessionData?.user) return;
    
    const u: User = {
      id: sessionData.user.id,
      email: sessionData.user.email ?? '',
      name: sessionData.user.name,
      image: sessionData.user.image,
    };
    setUser(u);
    setSession(sessionData);

    // FIX: If the account was created in the last 60 seconds, it's a new signup
    const createdAt = (sessionData.user as any).createdAt;
    const isNewSignup = createdAt && new Date(createdAt).getTime() > Date.now() - 60000;

    if (isNewSignup) {
      console.log('[AuthContext] New account detected — forcing onboarding');
      setOnboardingCompleted(false);
    } else {
      const done = await isOnboardingComplete();
      setOnboardingCompleted(done);
    }
  };

  useEffect(() => {
    const restoreSession = async () => {
      try {
        console.log('[AuthContext] Restoring session via Better Auth...');
        const { data, error } = await authClient.getSession();
        if (error) {
          setUser(null);
          setSession(null);
          setOnboardingCompleted(null);
          return;
        }
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

  // Listen for deep links after OAuth (e.g. aps://auth-callback)
  useEffect(() => {
    const subscription = Linking.addEventListener('url', async ({ url }) => {
      if (url.includes('auth-callback') || url.includes('auth?')) {
        setLoading(true); 

        let attempts = 0;
        const maxAttempts = 15;

        const pollForSession = async () => {
          attempts++;
          try {
            const { data } = await authClient.getSession();
            if (data?.user) {
              await applySession(data as any);
              setLoading(false); 
              return; 
            }
          } catch (e) {
            console.warn('[AuthContext] Poll error:', e);
          }

          if (attempts < maxAttempts) {
            setTimeout(pollForSession, 500);
          } else {
            setLoading(false); 
            console.warn('[AuthContext] Max attempts reached');
          }
        };

        setTimeout(pollForSession, 300);
      }
    });
    return () => subscription.remove();
  }, []);

  const fetchUser = async () => {
    try {
      setLoading(true);
      const { data, error } = await authClient.getSession();
      if (!error) await applySession(data as any);
    } catch (error) {
      console.error('[AuthContext] Failed to fetch user:', error);
    } finally {
      setLoading(false);
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      const { data, error } = await authClient.signIn.email({ email, password });
      if (error) throw new Error(error.message || 'Sign in failed.');
      await applySession(data as any);
    } catch (err: any) {
      throw err;
    }
  };

  const signUpWithEmail = async (email: string, password: string, name?: string) => {
    try {
      const { data, error } = await authClient.signUp.email({ email, password, name: name ?? '' });
      if (error) throw new Error(error.message || 'Sign up failed.');
      if (name) await AsyncStorage.setItem('signupName', name);
      await applySession(data as any);
    } catch (err: any) {
      throw err;
    }
  };

  const signIn = signInWithEmail;
  const signUp = async (email: string, password: string) => signUpWithEmail(email, password);

  const signInWithGoogle = async () => {
    console.log('[AuthContext] signInWithGoogle');
    try {
      await clearAllLocalData(); 
      setOnboardingCompleted(false);

      // Dynamically generate the correct redirect URI for Expo Go or Production
      const redirectUri = makeRedirectUri({
        scheme: 'aps',
        path: 'auth-callback'
      });
      
      console.log('[AuthContext] Using Redirect URI:', redirectUri);

      const { data, error } = await authClient.signIn.social({
        provider: 'google',
        callbackURL: redirectUri,
      });

      if (error) {
        console.error('[AuthContext] Google OAuth error:', error.message);
        throw new Error(error.message || 'Google sign in failed.');
      }

      // Explicitly open the browser using expo-web-browser
      if (data?.url) {
        await WebBrowser.openAuthSessionAsync(data.url, redirectUri);
      }
    } catch (err: any) {
      if (err.message) throw err;
      console.error('[AuthContext] signInWithGoogle network error:', err);
      throw new Error('Unable to connect. Please check your connection and try again.');
    }
  };

  const signInWithApple = async () => {
    console.log('[AuthContext] signInWithApple');
    try {
      await clearAllLocalData();
      setOnboardingCompleted(false);

      if (Platform.OS === 'ios') {
        const credential = await AppleAuthentication.signInAsync({
          requestedScopes: [
            AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
            AppleAuthentication.AppleAuthenticationScope.EMAIL,
          ],
        });

        const { data, error } = await authClient.signIn.social({
          provider: 'apple',
          idToken: {
            token: credential.identityToken!,
            nonce: credential.authorizationCode ?? undefined,
          },
        } as any);

        if (error) throw new Error(error.message || 'Apple sign in failed.');
        await applySession(data as any);
      } else {
        const redirectUri = makeRedirectUri({
          scheme: 'aps',
          path: 'auth-callback'
        });

        const { data, error } = await authClient.signIn.social({
          provider: 'apple',
          callbackURL: redirectUri,
        });
        
        if (error) throw new Error(error.message || 'Apple sign in failed.');
        
        if (data?.url) {
          await WebBrowser.openAuthSessionAsync(data.url, redirectUri);
        }
      }
    } catch (err: any) {
      if (err.code === 'ERR_REQUEST_CANCELED' || err.code === 'ERR_CANCELED') return;
      throw err;
    }
  };

  const signOut = async () => {
    if (!user) return;
    try {
      await clearAllLocalData(user.id);
      await authClient.signOut();
    } catch (err) {
      console.error('[AuthContext] signOut error:', err);
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
  if (context === undefined) throw new Error('useAuth must be used within AuthProvider');
  return context;
}