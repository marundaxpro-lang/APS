
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { authClient, storeWebBearerToken } from "@/lib/auth";

interface User {
  id: string;
  email: string;
  name?: string;
  image?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  authLoading: boolean; // Alias for loading for compatibility
  isPremium: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithGitHub: () => Promise<void>;
  signOut: () => Promise<void>;
  fetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    fetchUser();
  }, []);

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
        
        // Fetch premium status
        try {
          const apiModule = await import('@/utils/api');
          const subscriptionStatus = await apiModule.authenticatedGet<{ isPremium: boolean }>('/api/payments/subscription-status');
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
      }
    } catch (error) {
      console.error("[AuthContext] Failed to fetch user:", error);
      setUser(null);
      setIsPremium(false);
    } finally {
      setLoading(false);
      console.log("[AuthContext] Fetch user complete");
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    console.log("[AuthContext] Starting email sign in for:", email);
    try {
      // Clear any existing data first
      setUser(null);
      setIsPremium(false);
      
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
      // Clear any existing data first
      setUser(null);
      setIsPremium(false);
      
      // Use the custom signup endpoint that sends welcome emails
      const apiModule = await import('@/utils/api');
      const result = await apiModule.apiPost('/api/auth/signup/email-with-welcome', {
        email,
        password,
        name,
      });
      console.log("[AuthContext] Signup successful with welcome email, result:", result);
      
      // Store the token if provided
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
      // Clear any existing data first
      setUser(null);
      setIsPremium(false);
      
      if (Platform.OS === "web") {
        console.log("[AuthContext] Opening Google OAuth popup");
        const token = await openOAuthPopup("google");
        console.log("[AuthContext] Received token from popup, storing...");
        storeWebBearerToken(token);
        console.log("[AuthContext] Token stored, fetching user...");
        await fetchUser();
        console.log("[AuthContext] Google sign in complete - welcome email sent by backend for new users");
      } else {
        console.log("[AuthContext] Starting native Google OAuth flow");
        await authClient.signIn.social({
          provider: "google",
          callbackURL: "/profile",
        });
        console.log("[AuthContext] Native OAuth initiated, fetching user...");
        await fetchUser();
        console.log("[AuthContext] Google sign in complete - welcome email sent by backend for new users");
      }
    } catch (error) {
      console.error("[AuthContext] Google sign in failed:", error);
      throw error;
    }
  };

  const signInWithApple = async () => {
    console.log("[AuthContext] Starting Apple sign in, platform:", Platform.OS);
    try {
      // Clear any existing data first
      setUser(null);
      setIsPremium(false);
      
      if (Platform.OS === "web") {
        console.log("[AuthContext] Opening Apple OAuth popup");
        const token = await openOAuthPopup("apple");
        storeWebBearerToken(token);
        await fetchUser();
        console.log("[AuthContext] Apple sign in complete - welcome email sent by backend for new users");
      } else {
        console.log("[AuthContext] Starting native Apple OAuth flow");
        await authClient.signIn.social({
          provider: "apple",
          callbackURL: "/profile",
        });
        await fetchUser();
        console.log("[AuthContext] Apple sign in complete - welcome email sent by backend for new users");
      }
    } catch (error) {
      console.error("[AuthContext] Apple sign in failed:", error);
      throw error;
    }
  };

  const signInWithGitHub = async () => {
    console.log("[AuthContext] Starting GitHub sign in, platform:", Platform.OS);
    try {
      // Clear any existing data first
      setUser(null);
      setIsPremium(false);
      
      if (Platform.OS === "web") {
        console.log("[AuthContext] Opening GitHub OAuth popup");
        const token = await openOAuthPopup("github");
        storeWebBearerToken(token);
        await fetchUser();
        console.log("[AuthContext] GitHub sign in complete");
      } else {
        console.log("[AuthContext] Starting native GitHub OAuth flow");
        await authClient.signIn.social({
          provider: "github",
          callbackURL: "/profile",
        });
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
      // Clear user state immediately in finally block for better UX
      await authClient.signOut();
      console.log("[AuthContext] Backend sign out successful");
    } catch (error) {
      console.error("[AuthContext] Sign out failed:", error);
      // Still clear local state even if server signout fails
    } finally {
      console.log("[AuthContext] Clearing local user state and storage");
      setUser(null);
      setIsPremium(false);
      
      // Clear bearer token from storage
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
      
      // Clear all AsyncStorage data to prevent data leakage between accounts
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
        authLoading: loading, // Alias for compatibility
        isPremium,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        signInWithApple,
        signInWithGitHub,
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
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
