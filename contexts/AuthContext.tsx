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

async function checkOnboardingStatus(): Promise<boolean> {
  console.log("[AuthContext] Checking onboarding status");
  try {
    const localProfile = await AsyncStorage.getItem("fitnessProfile");
    return !!localProfile;
  } catch {
    return false;
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
        console.log("[AuthContext] User set:", userData.email);

        if (session.data.session?.token) {
          await setBearerToken(session.data.session.token);
        }

        const onboarded = await checkOnboardingStatus();
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
    await authClient.signIn.email({ email, password });
    console.log("[AuthContext] Email sign in successful, fetching user data");
    await fetchUser();
  };

  const signUpWithEmail = async (email: string, password: string, name?: string) => {
    console.log("[AuthContext] Starting email signup for:", email);
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

      try {
        const keys = await AsyncStorage.getAllKeys();
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
