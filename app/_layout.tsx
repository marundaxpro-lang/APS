
import "react-native-reanimated";
import React, { useEffect, useState } from "react";
import { useFonts } from "expo-font";
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useColorScheme } from "react-native";
import {
  DarkTheme,
  DefaultTheme,
  Theme,
  ThemeProvider,
} from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { I18nextProvider } from "react-i18next";
import { WidgetProvider } from "@/contexts/WidgetContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import Modal from "@/components/ui/Modal";
import i18n, { initI18n } from "@/lib/i18n";

// Native-only imports — guarded for web
let SystemBars: React.ComponentType<{ style?: string }> = () => null;
let useNetworkState: () => { isConnected?: boolean | null; isInternetReachable?: boolean | null } = () => ({});
if (Platform.OS !== 'web') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  SystemBars = require('react-native-edge-to-edge').SystemBars;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  useNetworkState = require('expo-network').useNetworkState;
}

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: "(tabs)", // Ensure any route can link back to `/`
};

/**
 * Single navigation guard — the ONLY place that redirects to /auth.
 * Rules:
 *   1. Auth still loading → do nothing (show whatever is already rendered)
 *   2. No authenticated user → redirect to /auth
 *   3. User exists → let the app render normally
 *   4. NEVER redirects to /paywall — paywall is opened explicitly by the user
 * Guest mode is intentionally NOT supported — all users must authenticate.
 */
function AuthGuard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      console.log('[AuthGuard] No authenticated user — redirecting to /auth');
      router.replace("/auth");
    }
  }, [user, authLoading, router]);

  return null;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const networkState = useNetworkState();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });
  const [showOfflineModal, setShowOfflineModal] = useState(false);
  const [i18nReady, setI18nReady] = useState(false);

  useEffect(() => {
    if (loaded) {
      initI18n().then(() => {
        setI18nReady(true);
        SplashScreen.hideAsync();
      });
    }
  }, [loaded]);

  React.useEffect(() => {
    if (
      !networkState.isConnected &&
      networkState.isInternetReachable === false
    ) {
      setShowOfflineModal(true);
    }
  }, [networkState.isConnected, networkState.isInternetReachable]);

  if (!loaded || !i18nReady) {
    return null;
  }

  const CustomDefaultTheme: Theme = {
    ...DefaultTheme,
    dark: false,
    colors: {
      primary: "rgb(0, 122, 255)", // System Blue
      background: "rgb(242, 242, 247)", // Light mode background
      card: "rgb(255, 255, 255)", // White cards/surfaces
      text: "rgb(0, 0, 0)", // Black text for light mode
      border: "rgb(216, 216, 220)", // Light gray for separators/borders
      notification: "rgb(255, 59, 48)", // System Red
    },
  };

  const CustomDarkTheme: Theme = {
    ...DarkTheme,
    colors: {
      primary: "rgb(10, 132, 255)", // System Blue (Dark Mode)
      background: "rgb(1, 1, 1)", // True black background for OLED displays
      card: "rgb(28, 28, 30)", // Dark card/surface color
      text: "rgb(255, 255, 255)", // White text for dark mode
      border: "rgb(44, 44, 46)", // Dark gray for separators/borders
      notification: "rgb(255, 69, 58)", // System Red (Dark Mode)
    },
  };
  
  return (
    <I18nextProvider i18n={i18n}>
      <StatusBar style="auto" animated />
      <SettingsProvider>
      <ThemeProvider
        value={colorScheme === "dark" ? CustomDarkTheme : CustomDefaultTheme}
      >
        <AuthProvider>
        <SubscriptionProvider>
          <AuthGuard />
          <WidgetProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <Stack>
                {/* Auth and onboarding screens */}
                <Stack.Screen name="auth" options={{ headerShown: false }} />
                <Stack.Screen name="language-select" options={{ headerShown: false }} />
                <Stack.Screen name="onboarding" options={{ headerShown: false }} />
                
                {/* Main app with tabs */}
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="workout-session" options={{ headerShown: false }} />
                <Stack.Screen name="training-plan" options={{ headerShown: true }} />
                <Stack.Screen name="workout-detail/[id]" options={{ headerShown: true }} />
                <Stack.Screen name="nutrition" options={{ headerShown: false }} />
                <Stack.Screen name="ai-coach" options={{ headerShown: false }} />
                <Stack.Screen name="coach-insights" options={{ headerShown: false }} />
                <Stack.Screen name="streak-detail" options={{ title: 'Your Streak', headerBackTitle: 'Back' }} />
                <Stack.Screen name="weekly-adherence-detail" options={{ headerShown: false }} />
                <Stack.Screen name="habits" options={{ title: 'My Habits', headerBackTitle: 'Back' }} />
                <Stack.Screen name="program-packs" options={{ headerShown: true }} />
                <Stack.Screen name="pack-detail/[id]" options={{ headerShown: true }} />
                <Stack.Screen name="travel-mode" options={{ headerShown: true }} />
                <Stack.Screen name="travel-workout/[id]" options={{ headerShown: true }} />
                <Stack.Screen name="student-mode" options={{ headerShown: true }} />
                <Stack.Screen name="student-workout/[id]" options={{ headerShown: true }} />
                <Stack.Screen name="settings" options={{ headerShown: true, title: 'Settings' }} />

                {/* Modal Demo Screens */}
                <Stack.Screen
                  name="modal"
                  options={{
                    presentation: "modal",
                    title: "Standard Modal",
                  }}
                />
                <Stack.Screen
                  name="formsheet"
                  options={{
                    presentation: "formSheet",
                    title: "Form Sheet Modal",
                    sheetGrabberVisible: true,
                    sheetAllowedDetents: [0.5, 0.8, 1.0],
                    sheetCornerRadius: 20,
                  }}
                />
                <Stack.Screen
                  name="transparent-modal"
                  options={{
                    presentation: "transparentModal",
                    headerShown: false,
                  }}
                />
              </Stack>
              <SystemBars style={"auto"} />
            </GestureHandlerRootView>
          </WidgetProvider>
        </SubscriptionProvider>
        </AuthProvider>
      </ThemeProvider>
      </SettingsProvider>

      <Modal
        visible={showOfflineModal}
        onClose={() => setShowOfflineModal(false)}
        type="warning"
        title="🔌 You are offline"
        message="You can keep using the app! Your changes will be saved locally and synced when you are back online."
        confirmText="OK"
      />
    </I18nextProvider>
  );
}
