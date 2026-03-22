import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Platform } from "react-native";
import * as Linking from "expo-linking";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { authClient, setBearerToken, clearAuthTokens } from "@/lib/auth";

interface User {
  id: string;
  email: string;
  name?: string;
  image?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  authLoading: boolean;
  isPremium: boolean;
  onboardingCompleted: boolean | null;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name?: string) => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithGitHub: () => Promise<void>;
  signOut: () => Promise<void>;
  fetchUser: () => Promise<void>;
  setOnboardingCompleted: (value: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const BACKEND_URL = "https://6n56k42q4ee7wx23tvj24hjhn64k9a89.app.specular.dev";

function openOAuthPopup(provider: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (Platform.OS !== "web") {
      reject(new Error("OAuth popup is only available on web"));
      return;
    }

    console.log(`[OAuth] Opening popup for provider: ${provider}`);

    // @ts-expect-error - window is available on web
    const popupUrl = `${window.location.origin}/auth-popup?provider=${provider}`;
    const width = 500;
    const height = 600;
    // @ts-expect-error - window is available on web
    const left = window.screenX + (window.outerWidth - width) / 2;
    // @ts-expect-error - window is available on web
    const top = window.screenY + (window.outerHeight - height) / 2;

    // @ts-expect-error - window is available on web
    const popup = window.open(
      popupUrl,
      "oauth-popup",
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`
    );

    if (!popup) {
      console.error("[OAuth] Failed to open popup - popups may be blocked");
      reject(new Error("Failed to open popup. Please allow popups."));
      return;
    }

    console.log("[OAuth] Popup opened, waiting for response...");

    const handleMessage = (event: MessageEvent) => {
      console.log("[OAuth] Received message:", event.data);
      if (event.data?.type === "oauth-success" && event.data?.token) {
        console.log("[OAuth] Success! Token received");
        // @ts-expect-error - window is available on web
        window.removeEventListener("message", handleMessage);
        clearInterval(checkClosed);
        resolve(event.data.token);
      } else if (event.data?.type === "oauth-error") {
        console.error("[OAuth] Error received:", event.data.error);
        // @ts-expect-error - window is available on web
        window.removeEventListener("message", handleMessage);
        clearInterval(checkClosed);
        reject(new Error(event.data.error || "OAuth failed"));
      }
    };

    // @ts-expect-error - window is available on web
    window.addEventListener("message", handleMessage);

    const checkClosed = setInterval(() => {
      if (popup.closed) {
        console.log("[OAuth] Popup was closed by user");
        clearInterval(checkClosed);
        // @ts-expect-error - window is available on web
        window.removeEventListener("message", handleMessage);
        reject(new Error("Authentication cancelled"));
      }
    }, 500);
  });
}

async function checkOnboardingStatus(userId: string): Promise<boolean> {
  console.log("[AuthContext] Checking onboarding status for user:", userId);
  try {
    // Check user-scoped key first (set after login), fall back to legacy key only
    // if it was written by the same user (verified by userId match in stored data).
    const userScopedKey = `fitnessProfile_${userId}`;
    const userProfile = await AsyncStorage.getItem(userScopedKey);
    if (userProfile) return true;

    // Legacy key: only trust it if it contains a userId field matching this user.
    const legacyProfile = await AsyncStorage.getItem("fitnessProfile");
    if (legacyProfile) {
      try {
        const parsed = JSON.parse(legacyProfile);
        if (parsed?.userId && parsed.userId === userId) return true;
        // Belongs to a different user — do not use it.
        console.log("[AuthContext] Legacy fitnessProfile belongs to a different user, ignoring");
        return false;
      } catch {
        // Unparseable legacy data — ignore it.
        return false;
      }
    }
    return false;
  } catch {
    return false;
  }
}

/** Clears all user-specific cached data from AsyncStorage without wiping app-wide config. */
async function clearUserScopedCache() {
  console.log("[AuthContext] Clearing user-scoped cache from AsyncStorage");
  try {
    const keys = await AsyncStorage.getAllKeys();
    const userDataKeys = keys.filter((k) =>
      k.startsWith("fitnessProfile") ||
      k.startsWith("signupName") ||
      k.startsWith("isGuestUser") ||
      k.startsWith("aps_") ||
      k.startsWith("better-auth.")
    );
    if (userDataKeys.length > 0) {
      await AsyncStorage.multiRemove(userDataKeys);
      console.log("[AuthContext] Cleared user-scoped keys:", userDataKeys);
    }
  } catch (e) {
    console.error("[AuthContext] Failed to clear user-scoped cache:", e);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [onboardingCompleted, setOnboardingCompletedState] = useState<boolean | null>(null);

  useEffect(() => {
    fetchUser();

    const subscription = Linking.addEventListener("url", () => {
      console.log("[AuthContext] Deep link received, refreshing user session");
      fetchUser();
    });

    const intervalId = setInterval(() => {
      fetchUser();
    }, 5 * 60 * 1000);

    return () => {
      subscription.remove();
      clearInterval(intervalId);
    };
  }, []);

  const setOnboardingCompleted = (value: boolean) => {
    console.log("[AuthContext] setOnboardingCompleted:", value);
    setOnboardingCompletedState(value);
  };

  const fetchUser = async () => {
    console.log("[AuthContext] Fetching user session");
    try {
      setLoading(true);
      const session = await authClient.getSession();
      console.log("[AuthContext] Session data:", session?.data?.user ? "User found" : "No user");

      if (session?.data?.user) {
        const userData = session.data.user as User;
        setUser(userData);
        console.log("[AuthContext] User set:", userData.email, "id:", userData.id);

        if (session.data.session?.token) {
          await setBearerToken(session.data.session.token);
        }

        const onboarded = await checkOnboardingStatus(userData.id);
        setOnboardingCompletedState(onboarded);
        console.log("[AuthContext] Onboarding completed:", onboarded);

        // Fetch premium status
        try {
          const { authenticatedGet } = await import("@/utils/api");
          const subscriptionStatus = await authenticatedGet<{ isPremium: boolean }>(
            "/api/payments/subscription-status"
          );
          setIsPremium(subscriptionStatus.isPremium || false);
          console.log("[AuthContext] Premium status:", subscriptionStatus.isPremium);
        } catch {
          console.log("[AuthContext] Could not fetch premium status, defaulting to false");
          setIsPremium(false);
        }
      } else {
        console.log("[AuthContext] No session found, clearing user state");
        setUser(null);
        setIsPremium(false);
        setOnboardingCompletedState(null);
        await clearAuthTokens();
      }
    } catch (error) {
      console.error("[AuthContext] Failed to fetch user:", error);
      setUser(null);
      setIsPremium(false);
      setOnboardingCompletedState(null);
    } finally {
      setLoading(false);
      console.log("[AuthContext] Fetch user complete");
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    console.log("[AuthContext] Starting email sign in for:", email);

    // Clear any existing session before attempting a new login so a previously
    // cached session from a different account cannot bleed into the new one.
    console.log("[AuthContext] Clearing previous session before new login");
    try {
      await authClient.signOut();
    } catch (e) {
      console.log("[AuthContext] Pre-login signOut skipped (no active session):", e);
    }
    await clearAuthTokens();
    await clearUserScopedCache();
    setUser(null);
    setIsPremium(false);
    setOnboardingCompletedState(null);

    console.log("[AuthContext] Previous session cleared, proceeding with email sign in");
    const result = await authClient.signIn.email({ email, password });
    if (result?.error) {
      throw new Error(result.error.message || "Sign in failed");
    }
    console.log("[AuthContext] Email sign in successful, fetching fresh user data from server");
    await fetchUser();
  };

  const signUpWithEmail = async (email: string, password: string, name?: string) => {
    console.log("[AuthContext] Starting email signup for:", email);

    // Clear any existing session before creating a new account.
    console.log("[AuthContext] Clearing previous session before signup");
    try {
      await authClient.signOut();
    } catch (e) {
      console.log("[AuthContext] Pre-signup signOut skipped (no active session):", e);
    }
    await clearAuthTokens();
    await clearUserScopedCache();
    setUser(null);
    setIsPremium(false);
    setOnboardingCompletedState(null);

    const result = await authClient.signUp.email({ email, password, name: name || "" });
    if (result?.error) {
      throw new Error(result.error.message || "Sign up failed");
    }
    if (name && name.trim()) {
      await AsyncStorage.setItem("signupName", name.trim());
      console.log("[AuthContext] Stored signup name for onboarding:", name.trim());
    }
    await fetchUser();
    console.log("[AuthContext] User fetched after signup");
  };

  const signInWithSocial = async (provider: "google" | "apple" | "github") => {
    console.log("[AuthContext] Starting social sign in, provider:", provider, "platform:", Platform.OS);
    if (Platform.OS === "web") {
      console.log("[AuthContext] Opening OAuth popup for:", provider);
      const token = await openOAuthPopup(provider);
      console.log("[AuthContext] Token received from popup, storing...");
      await setBearerToken(token);
      await fetchUser();
      console.log("[AuthContext] Social sign in complete");
    } else {
      console.log("[AuthContext] Starting native OAuth flow for:", provider);
      const { error } = await authClient.signIn.social({
        provider,
        callbackURL: "aps://auth-callback",
      });
      if (error) {
        throw new Error(error.message || "Social sign in failed");
      }
      await fetchUser();
      console.log("[AuthContext] Native social sign in complete");
    }
  };

  const signInWithGoogle = () => signInWithSocial("google");

  const signInWithApple = async () => {
    console.log("[AuthContext] Starting Apple sign in, platform:", Platform.OS);
    if (Platform.OS === "ios") {
      // Native Apple Sign In on iOS — shows the system Face ID / password modal
      const AppleAuthentication = require("expo-apple-authentication");
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) {
        throw new Error("No identity token received from Apple");
      }
      const { error } = await authClient.signIn.social({
        provider: "apple",
        idToken: credential.identityToken,
      });
      if (error) {
        throw new Error(error.message || "Apple sign in failed");
      }
      await fetchUser();
      console.log("[AuthContext] Apple sign in complete");
    } else {
      await signInWithSocial("apple");
    }
  };

  const signInWithGitHub = () => signInWithSocial("github");

  const signOut = async () => {
    console.log("[AuthContext] Starting sign out process");
    try {
      await authClient.signOut();
      console.log("[AuthContext] Backend sign out successful");
    } catch (error) {
      console.error("[AuthContext] Sign out failed:", error);
    } finally {
      console.log("[AuthContext] Clearing local user state and storage");
      setUser(null);
      setIsPremium(false);
      setOnboardingCompletedState(null);
      await clearAuthTokens();
      await clearUserScopedCache();
      console.log("[AuthContext] Sign out complete");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        authLoading: loading,
        isPremium,
        onboardingCompleted,
        signInWithEmail,
        signUpWithEmail,
        signInWithApple,
        signInWithGoogle,
        signInWithGitHub,
        signOut,
        fetchUser,
        setOnboardingCompleted,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
