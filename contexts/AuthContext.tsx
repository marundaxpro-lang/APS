
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Platform } from "react-native";
import { authClient, storeWebBearerToken } from "@/lib/auth";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
  onboardingCompleted: boolean | null; // null = not yet checked
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
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

    console.log(`[OAuth] Popup URL: ${popupUrl}`);

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

async function getBearerToken(): Promise<string | null> {
  try {
    if (Platform.OS === "web") {
      return localStorage.getItem("apex-fitness_bearer_token");
    } else {
      return await SecureStore.getItemAsync("apex-fitness_bearer_token");
    }
  } catch {
    return null;
  }
}

async function checkOnboardingStatus(): Promise<boolean> {
  console.log("[AuthContext] Checking onboarding status from GET /api/user/profile");
  try {
    const token = await getBearerToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const response = await fetch(`${BACKEND_URL}/api/user/profile`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const text = await response.text();
      console.warn("[AuthContext] Profile check failed:", response.status, text.slice(0, 100));
      // Fall back to local AsyncStorage check
      const localProfile = await AsyncStorage.getItem("fitnessProfile");
      return !!localProfile;
    }

    const data = await response.json();
    console.log("[AuthContext] Profile response, onboarding_completed:", data?.onboarding_completed);
    const completed = data?.onboarding_completed === true;

    // Sync local storage with server state
    if (completed && !await AsyncStorage.getItem("fitnessProfile")) {
      await AsyncStorage.setItem("fitnessProfile", JSON.stringify(data));
    }

    return completed;
  } catch (err) {
    console.warn("[AuthContext] Could not check onboarding status from API:", err);
    // Fall back to local check
    const localProfile = await AsyncStorage.getItem("fitnessProfile");
    return !!localProfile;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [onboardingCompleted, setOnboardingCompletedState] = useState<boolean | null>(null);

  useEffect(() => {
    fetchUser();
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
        console.log("[AuthContext] User set:", userData.email);

        // Check onboarding status from backend
        const onboarded = await checkOnboardingStatus();
        setOnboardingCompletedState(onboarded);
        console.log("[AuthContext] Onboarding completed:", onboarded);

        // Fetch premium status
        try {
          const { authenticatedGet } = await import('@/utils/api');
          const subscriptionStatus = await authenticatedGet<{ isPremium: boolean }>('/api/payments/subscription-status');
          setIsPremium(subscriptionStatus.isPremium || false);
          console.log('[AuthContext] Premium status:', subscriptionStatus.isPremium);
        } catch (error) {
          console.log('[AuthContext] Could not fetch premium status, defaulting to false');
          setIsPremium(false);
        }
      } else {
        console.log("[AuthContext] No session found, clearing user state");
        setUser(null);
        setIsPremium(false);
        setOnboardingCompletedState(null);
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
    try {
      setUser(null);
      setIsPremium(false);
      setOnboardingCompletedState(null);

      await authClient.signIn.email({ email, password });
      console.log("[AuthContext] Email sign in successful, fetching user data");
      await fetchUser();
      console.log("[AuthContext] Email sign in complete");
    } catch (error) {
      console.error("[AuthContext] Email sign in failed:", error);
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, password: string, name?: string) => {
    console.log("[AuthContext] Starting email signup for:", email);
    try {
      setUser(null);
      setIsPremium(false);
      setOnboardingCompletedState(null);

      const { apiPost } = await import('@/utils/api');
      const result = await apiPost('/api/auth/signup/email-with-welcome', {
        email,
        password,
        name,
      });
      console.log("[AuthContext] Signup successful with welcome email, result:", result);

      if (result.token) {
        if (Platform.OS === "web") {
          localStorage.setItem("apex-fitness_bearer_token", result.token);
        } else {
          await SecureStore.setItemAsync("apex-fitness_bearer_token", result.token);
        }
      }

      await fetchUser();
      console.log("[AuthContext] User fetched after signup");
    } catch (error) {
      console.error("[AuthContext] Email sign up failed:", error);
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    console.log("[AuthContext] Starting Google sign in, platform:", Platform.OS);
    try {
      setUser(null);
      setIsPremium(false);
      setOnboardingCompletedState(null);

      if (Platform.OS === "web") {
        console.log("[AuthContext] Opening Google OAuth popup");
        const token = await openOAuthPopup("google");
        console.log("[AuthContext] Received token from popup, storing...");
        storeWebBearerToken(token);
        console.log("[AuthContext] Token stored, fetching user...");
        await fetchUser();
        console.log("[AuthContext] Google sign in complete");
      } else {
        console.log("[AuthContext] Starting native Google OAuth flow");
        await authClient.signIn.social({ provider: "google", callbackURL: "/profile" });
        console.log("[AuthContext] Native OAuth initiated, fetching user...");
        await fetchUser();
        console.log("[AuthContext] Google sign in complete");
      }
    } catch (error) {
      console.error("[AuthContext] Google sign in failed:", error);
      throw error;
    }
  };

  const signInWithApple = async () => {
    console.log("[AuthContext] Starting Apple sign in, platform:", Platform.OS);
    try {
      setUser(null);
      setIsPremium(false);
      setOnboardingCompletedState(null);

      if (Platform.OS === "web") {
        console.log("[AuthContext] Opening Apple OAuth popup");
        const token = await openOAuthPopup("apple");
        storeWebBearerToken(token);
        await fetchUser();
        console.log("[AuthContext] Apple sign in complete");
      } else {
        console.log("[AuthContext] Starting native Apple OAuth flow");
        await authClient.signIn.social({ provider: "apple", callbackURL: "/profile" });
        await fetchUser();
        console.log("[AuthContext] Apple sign in complete");
      }
    } catch (error) {
      console.error("[AuthContext] Apple sign in failed:", error);
      throw error;
    }
  };

  const signInWithGitHub = async () => {
    console.log("[AuthContext] Starting GitHub sign in, platform:", Platform.OS);
    try {
      setUser(null);
      setIsPremium(false);
      setOnboardingCompletedState(null);

      if (Platform.OS === "web") {
        console.log("[AuthContext] Opening GitHub OAuth popup");
        const token = await openOAuthPopup("github");
        storeWebBearerToken(token);
        await fetchUser();
        console.log("[AuthContext] GitHub sign in complete");
      } else {
        console.log("[AuthContext] Starting native GitHub OAuth flow");
        await authClient.signIn.social({ provider: "github", callbackURL: "/profile" });
        await fetchUser();
        console.log("[AuthContext] GitHub sign in complete");
      }
    } catch (error) {
      console.error("[AuthContext] GitHub sign in failed:", error);
      throw error;
    }
  };

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

      if (Platform.OS === "web") {
        localStorage.removeItem("apex-fitness_bearer_token");
        console.log("[AuthContext] Cleared web bearer token");
      } else {
        try {
          await SecureStore.deleteItemAsync("apex-fitness_bearer_token");
          console.log("[AuthContext] Cleared native bearer token");
        } catch (e) {
          console.error("[AuthContext] Failed to clear secure store:", e);
        }
      }

      try {
        const keys = await AsyncStorage.getAllKeys();
        console.log("[AuthContext] Clearing AsyncStorage keys:", keys);
        await AsyncStorage.multiRemove(keys);
        console.log("[AuthContext] AsyncStorage cleared successfully");
      } catch (e) {
        console.error("[AuthContext] Failed to clear AsyncStorage:", e);
      }

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
        signInWithGoogle,
        signInWithApple,
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
