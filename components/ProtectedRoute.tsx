/**
 * Protected Route Component
 *
 * Ensures a user is authenticated before allowing access to a screen.
 * Redirects to /auth using replace (not push) so there is no swipe-back bypass.
 * Shows a full-screen dark loading indicator while auth state is being resolved.
 *
 * Usage:
 * ```tsx
 * <ProtectedRoute>
 *   <ProfileScreen />
 * </ProtectedRoute>
 * ```
 */

import React, { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
  loadingComponent?: React.ReactNode;
}

export function ProtectedRoute({
  children,
  redirectTo = "/auth",
  loadingComponent,
}: ProtectedRouteProps) {
  const { user, authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      console.log('[ProtectedRoute] No authenticated user — redirecting to', redirectTo);
      // Use replace so the user cannot swipe back to the protected screen
      router.replace(redirectTo as any);
    }
  }, [user, authLoading, router, redirectTo]);

  // Show loading state while auth is being resolved
  if (authLoading) {
    return loadingComponent || (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  // Not authenticated — will redirect via useEffect; render nothing in the meantime
  if (!user) {
    return null;
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    // Dark background matches the app theme — no white flash
    backgroundColor: "#0a0a0a",
  },
});
