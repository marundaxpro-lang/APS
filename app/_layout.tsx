
import "react-native-reanimated";
import React, { useEffect, useState } from "react";
import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { Platform, View, ActivityIndicator } from "react-native";
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
import AsyncStorage from "@react-native-async-storage/async-storage";

async function runAuthResetIfNeeded(): Promise<void> {
  try {
    const done = await AsyncStorage.getItem("auth_reset_v3");
    if (done === "done") return;
    console.log("[Layout] Running one-time auth storage reset (auth_reset_v3)");
    await AsyncStorage.multiRemove([
      "better-auth_session",
      "better-auth_token",
      "auth_token",
      "session_token",
      "guest_mode",
      "isGuestUser",
      "guestName",
      "signupName",
      "userName",
      "userMotivation",
      "onboardingJustCompleted",
      "language_selection_done",
      "auth_reset_v2",
    ]);
    await AsyncStorage.setItem("auth_reset_v3", "done");
    console.log("[Layout] Auth storage reset complete");
  } catch (e) {
    console.warn("[Layout] Auth storage reset failed (non-fatal):", e);
  }
}

let SystemBars: React.ComponentType<{ style?: string }> = () => null;
let useNetworkState: () => { isConnected?: boolean | null; isInternetReachable?: boolean | null } = () => ({});
if (Platform.OS !== 'web') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  SystemBars = require('react-native-edge-to-edge').SystemBars;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  useNetworkState = require('expo-network').useNetworkState;
}

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

function AuthLoadingScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a0a', justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#ffffff" />
    </View>
  );
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading, onboardingCompleted } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (authLoading) return;

    const current = segments[0];
    const inAuth = current === 'auth';
    const inOnboarding = current === 'onboarding';
    const inLanguageSelect = current === 'language-select';
    const inIndex = current === undefined || current === 'index';

    if (!user) {
      if (!inAuth && !inLanguageSelect) {
        console.log('[AuthGuard] No authenticated user -> /auth');
        router.replace('/auth');
      }
      return;
    }

    if (onboardingCompleted === null) {
      console.log('[AuthGuard] Waiting for onboarding state');
      return;
    }

    if (!onboardingCompleted) {
      if (!inOnboarding) {
        console.log('[AuthGuard] Authenticated user needs onboarding -> /onboarding');
        router.replace('/onboarding');
      }
      return;
    }

    if (inAuth || inOnboarding || inLanguageSelect || inIndex) {
      console.log('[AuthGuard] Authenticated and onboarded -> /(tabs)/(home)');
      router.replace('/(tabs)/(home)');
    }
  }, [user, authLoading, onboardingCompleted, segments, router]);

  if (authLoading || (user && onboardingCompleted === null)) {
    return <AuthLoadingScreen />;
  }

  return <>{children}</>;
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
      runAuthResetIfNeeded().finally(() => {
        initI18n().then(() => {
          setI18nReady(true);
          SplashScreen.hideAsync();
        });
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
      primary: "rgb(0, 122, 255)",
      background: "rgb(242, 242, 247)",
      card: "rgb(255, 255, 255)",
      text: "rgb(0, 0, 0)",
      border: "rgb(216, 216, 220)",
      notification: "rgb(255, 59, 48)",
    },
  };

  const CustomDarkTheme: Theme = {
    ...DarkTheme,
    colors: {
      primary: "rgb(10, 132, 255)",
      background: "rgb(1, 1, 1)",
      card: "rgb(28, 28, 30)",
      text: "rgb(255, 255, 255)",
      border: "rgb(44, 44, 46)",
      notification: "rgb(255, 69, 58)",
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
              <WidgetProvider>
                <GestureHandlerRootView style={{ flex: 1 }}>
                  <AuthGuard>
                    <Stack>
                      <Stack.Screen
                        name="auth"
                        options={{ headerShown: false, gestureEnabled: false }}
                      />
                      <Stack.Screen
                        name="language-select"
                        options={{ headerShown: false, gestureEnabled: false }}
                      />
                      <Stack.Screen
                        name="onboarding"
                        options={{ headerShown: false, gestureEnabled: false }}
                      />

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
                  </AuthGuard>
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
        title="You are offline"
        message="You can keep using the app. Your changes will be saved locally and synced when you are back online."
        confirmText="OK"
      />
    </I18nextProvider>
  );
}
