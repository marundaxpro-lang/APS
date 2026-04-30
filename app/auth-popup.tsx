import React, { useEffect } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { Platform } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { supabase } from "@/lib/supabase";

const VALID_PROVIDERS = ["apple", "google"];

export default function AuthPopupScreen() {
  const { provider } = useLocalSearchParams<{ provider: string }>();

  useEffect(() => {
    if (Platform.OS !== "web") return;

    if (!provider || !VALID_PROVIDERS.includes(provider)) {
      window.opener?.postMessage({ type: "oauth-error", error: "Invalid provider" }, "*");
      return;
    }

    console.log("[AuthPopup] Starting OAuth for provider:", provider);
    supabase.auth.signInWithOAuth({
      provider: provider as "apple" | "google",
      options: {
        redirectTo: `${window.location.origin}/auth-callback`,
      },
    });
  }, [provider]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#007AFF" />
      <Text style={styles.text}>Redirecting to sign in...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  text: {
    marginTop: 20,
    fontSize: 16,
    color: "#333",
  },
});
