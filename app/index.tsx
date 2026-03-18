
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { colors } from '@/styles/commonStyles';

export default function IndexScreen() {
  const router = useRouter();
  const { user, authLoading, onboardingCompleted } = useAuth();
  const [navigated, setNavigated] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (navigated) return;

    console.log('[IndexScreen] Auth resolved:', {
      hasUser: !!user,
      onboardingCompleted,
    });

    if (!user) {
      console.log('[IndexScreen] No user → redirecting to /auth');
      setNavigated(true);
      router.replace('/auth');
      return;
    }

    // onboardingCompleted is null while still being checked — wait
    if (onboardingCompleted === null) {
      console.log('[IndexScreen] Waiting for onboarding status check...');
      return;
    }

    if (onboardingCompleted === true) {
      console.log('[IndexScreen] Onboarding complete → redirecting to home');
      setNavigated(true);
      router.replace('/(tabs)/(home)');
    } else {
      console.log('[IndexScreen] Onboarding not complete → redirecting to /onboarding');
      setNavigated(true);
      router.replace('/onboarding');
    }
  }, [authLoading, user, onboardingCompleted, navigated, router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});
