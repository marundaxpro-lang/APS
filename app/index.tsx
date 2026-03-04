
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
      console.log('[IndexScreen] Starting initial route check');
      
      try {
        // Wait for auth to finish loading
        if (authLoading) {
          console.log('[IndexScreen] Auth still loading, waiting...');
          return;
        }

        // Check if user has completed onboarding
        const hasProfile = await AsyncStorage.getItem('fitnessProfile');
        const isGuest = await AsyncStorage.getItem('isGuestUser');

        console.log('[IndexScreen] Auth state:', {
          hasUser: !!user,
          isGuest: isGuest === 'true',
          hasProfile: !!hasProfile,
        });

        // Priority 1: If user is authenticated AND has completed onboarding, go to home
        if ((user || isGuest === 'true') && hasProfile) {
          console.log('[IndexScreen] ✅ User authenticated with profile → redirecting to home');
          router.replace('/(tabs)/(home)');
        } 
        // Priority 2: User is authenticated or guest but hasn't completed onboarding
        else if (user || isGuest === 'true') {
          console.log('[IndexScreen] ✅ User authenticated without profile → redirecting to onboarding');
          router.replace('/onboarding');
        } 
        // Priority 3: No user and no guest mode → show auth screen (default for new users)
        else {
          console.log('[IndexScreen] ✅ No authentication → redirecting to auth screen (first time user)');
          router.replace('/auth');
        }
      } catch (error) {
        console.error('[IndexScreen] ❌ Error checking initial route:', error);
        // On error, default to auth screen (safe fallback)
        router.replace('/auth');
      } finally {
        setChecking(false);
      }
    };

    checkInitialRoute();
  }, [authLoading, user, router]);

  // Show loading spinner while checking auth state
  if (checking || authLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // This should never render, but just in case
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
