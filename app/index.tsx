
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/contexts/AuthContext';
import { colors } from '@/styles/commonStyles';

export default function IndexScreen() {
  const router = useRouter();
  const { user, authLoading } = useAuth();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkInitialRoute = async () => {
      console.log('[IndexScreen] Checking initial route - always show auth first for new users');
      
      try {
        // Wait for auth to load
        if (authLoading) {
          console.log('[IndexScreen] Auth still loading, waiting...');
          return;
        }

        // Check if user has completed onboarding
        const hasProfile = await AsyncStorage.getItem('fitnessProfile');
        const isGuest = await AsyncStorage.getItem('isGuestUser');

        console.log('[IndexScreen] User:', user ? 'authenticated' : 'not authenticated');
        console.log('[IndexScreen] Has profile:', hasProfile ? 'yes' : 'no');
        console.log('[IndexScreen] Is guest:', isGuest);

        // If user is authenticated AND has completed onboarding, go to home
        if ((user || isGuest === 'true') && hasProfile) {
          console.log('[IndexScreen] User authenticated with profile, redirecting to home');
          router.replace('/(tabs)/(home)');
        } else if (user || isGuest === 'true') {
          // User is authenticated or guest but hasn't completed onboarding
          console.log('[IndexScreen] User authenticated without profile, redirecting to onboarding');
          router.replace('/onboarding');
        } else {
          // No user and no guest mode, show auth screen (this is the default for new users)
          console.log('[IndexScreen] No authentication, redirecting to auth screen');
          router.replace('/auth');
        }
      } catch (error) {
        console.error('[IndexScreen] Error checking initial route:', error);
        router.replace('/auth');
      } finally {
        setChecking(false);
      }
    };

    checkInitialRoute();
  }, [authLoading, user, router]);

  if (checking || authLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});
