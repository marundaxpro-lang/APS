
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native';
import React, { useState, useEffect, useCallback } from 'react';
import { colors } from '@/styles/commonStyles';
import { useRouter } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/contexts/AuthContext';
import { getTodaysWorkout } from '@/data/workouts';
import { authenticatedGet } from '@/utils/api';

export default function TrainingScreen() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [hasProfile, setHasProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [todaysWorkout, setTodaysWorkout] = useState<any>(null);

  const checkProfile = useCallback(async () => {
    try {
      const profile = await AsyncStorage.getItem('fitnessProfile');
      if (!profile && user) {
        router.replace('/onboarding');
      } else {
        setHasProfile(true);
        const workout = getTodaysWorkout();
        setTodaysWorkout(workout);
      }
    } catch (error) {
      console.error('Error checking profile:', error);
    } finally {
      setLoading(false);
    }
  }, [user, router]);

  useEffect(() => {
    if (!authLoading) {
      checkProfile();
    }
  }, [authLoading, checkProfile]);

  if (authLoading || loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Training screen content */}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
