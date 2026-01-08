
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { FitnessProfile, WorkoutDay } from '@/types/fitness';
import { getTodaysWorkout } from '@/data/workouts';
import ParticleBackground from '@/components/ParticleBackground';

export default function TrainingScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<FitnessProfile | null>(null);
  const [todaysWorkout, setTodaysWorkout] = useState<WorkoutDay | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const stored = await AsyncStorage.getItem('fitnessProfile');
      if (stored) {
        const profileData = JSON.parse(stored);
        setProfile(profileData);
        const workout = getTodaysWorkout(profileData);
        setTodaysWorkout(workout);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const startWorkout = () => {
    router.push('/workout-session');
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ParticleBackground />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!profile || !todaysWorkout) {
    return (
      <View style={styles.container}>
        <ParticleBackground />
        <View style={styles.emptyContainer}>
          <IconSymbol 
            ios_icon_name="dumbbell" 
            android_material_icon_name="fitness-center" 
            size={64} 
            color={colors.textSecondary} 
          />
          <Text style={styles.emptyText}>No workout plan found</Text>
          <Text style={styles.emptySubtext}>Complete onboarding to get started</Text>
          <TouchableOpacity style={styles.button} onPress={() => router.push('/onboarding')}>
            <Text style={styles.buttonText}>Go to Onboarding</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ParticleBackground />
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.subtitle}>{todaysWorkout.day}</Text>
          <Text style={styles.title}>Today&apos;s Workout</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconContainer}>
              <IconSymbol 
                ios_icon_name="dumbbell.fill" 
                android_material_icon_name="fitness-center" 
                size={28} 
                color={colors.primary} 
              />
            </View>
            <View style={styles.headerInfo}>
              <Text style={styles.workoutType}>{todaysWorkout.name}</Text>
              <Text style={styles.workoutMeta}>
                {todaysWorkout.exercises.length} exercises • ~45 min
              </Text>
            </View>
          </View>

          <View style={styles.exerciseList}>
            {todaysWorkout.exercises.map((exercise, index) => (
              <View key={exercise.id} style={styles.exerciseItem}>
                <View style={styles.exerciseNumber}>
                  <Text style={styles.exerciseNumberText}>{index + 1}</Text>
                </View>
                <View style={styles.exerciseDetails}>
                  <Text style={styles.exerciseName}>{exercise.name}</Text>
                  <Text style={styles.exerciseInfo}>
                    {exercise.sets} sets × {exercise.reps}
                  </Text>
                  <View style={styles.exerciseTags}>
                    <View style={styles.tag}>
                      <Text style={styles.tagText}>{exercise.muscleGroup}</Text>
                    </View>
                    <View style={styles.tag}>
                      <Text style={styles.tagText}>{exercise.difficulty}</Text>
                    </View>
                  </View>
                </View>
                {exercise.videoUrl && (
                  <TouchableOpacity style={styles.videoButton}>
                    <IconSymbol 
                      ios_icon_name="play.circle.fill" 
                      android_material_icon_name="play-circle-filled" 
                      size={32} 
                      color={colors.primary} 
                    />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.startButton} onPress={startWorkout}>
            <IconSymbol 
              ios_icon_name="play.fill" 
              android_material_icon_name="play-arrow" 
              size={24} 
              color="#fff" 
            />
            <Text style={styles.startButtonText}>Start Workout</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>Your Training Plan</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <IconSymbol 
                ios_icon_name="calendar" 
                android_material_icon_name="calendar-today" 
                size={24} 
                color={colors.primary} 
              />
              <Text style={styles.statValue}>{profile.trainingDays}x</Text>
              <Text style={styles.statLabel}>per week</Text>
            </View>
            <View style={styles.statItem}>
              <IconSymbol 
                ios_icon_name="target" 
                android_material_icon_name="track-changes" 
                size={24} 
                color="#f59e0b" 
              />
              <Text style={styles.statValue}>{profile.goal}</Text>
              <Text style={styles.statLabel}>goal</Text>
            </View>
            <View style={styles.statItem}>
              <IconSymbol 
                ios_icon_name="dumbbell" 
                android_material_icon_name="fitness-center" 
                size={24} 
                color="#8b5cf6" 
              />
              <Text style={styles.statValue}>{profile.equipment}</Text>
              <Text style={styles.statLabel}>equipment</Text>
            </View>
          </View>
        </View>

        <View style={styles.tipsCard}>
          <View style={styles.tipsHeader}>
            <IconSymbol 
              ios_icon_name="lightbulb.fill" 
              android_material_icon_name="lightbulb" 
              size={24} 
              color="#fbbf24" 
            />
            <Text style={styles.tipsTitle}>Training Tips</Text>
          </View>
          <View style={styles.tipsList}>
            <View style={styles.tipItem}>
              <Text style={styles.tipBullet}>•</Text>
              <Text style={styles.tipText}>Warm up for 5-10 minutes before starting</Text>
            </View>
            <View style={styles.tipItem}>
              <Text style={styles.tipBullet}>•</Text>
              <Text style={styles.tipText}>Focus on proper form over heavy weight</Text>
            </View>
            <View style={styles.tipItem}>
              <Text style={styles.tipBullet}>•</Text>
              <Text style={styles.tipText}>Rest 60-90 seconds between sets</Text>
            </View>
            <View style={styles.tipItem}>
              <Text style={styles.tipBullet}>•</Text>
              <Text style={styles.tipText}>Stay hydrated throughout your workout</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingTop: Platform.OS === 'android' ? 48 : 60,
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: 28,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.text,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 16,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(69, 155, 155, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  workoutType: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  workoutMeta: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  exerciseList: {
    gap: 16,
    marginBottom: 24,
  },
  exerciseItem: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  exerciseNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exerciseNumberText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },
  exerciseDetails: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  exerciseInfo: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  exerciseTags: {
    flexDirection: 'row',
    gap: 8,
  },
  tag: {
    backgroundColor: 'rgba(69, 155, 155, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
    textTransform: 'capitalize',
  },
  videoButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  statsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 20,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    gap: 8,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    textTransform: 'capitalize',
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  tipsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  tipsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  tipsList: {
    gap: 12,
  },
  tipItem: {
    flexDirection: 'row',
    gap: 12,
  },
  tipBullet: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '700',
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 16,
    paddingHorizontal: 32,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
