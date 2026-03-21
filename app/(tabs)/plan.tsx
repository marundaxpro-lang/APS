
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Modal,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Calendar from 'expo-calendar';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { generateWorkoutSplit } from '@/data/workouts';
import ParticleBackground from '@/components/ParticleBackground';
import { FitnessProfile, WorkoutDay } from '@/types/fitness';
import { useRouter } from 'expo-router';
import { authenticatedGet, getBearerToken } from '@/utils/api';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const FULL_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function PlanScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<FitnessProfile | null>(null);
  const [workoutSplit, setWorkoutSplit] = useState<WorkoutDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showRegenerateModal, setShowRegenerateModal] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showWorkoutModal, setShowWorkoutModal] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutDay | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [caloricGoal, setCaloricGoal] = useState<number | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    console.log('[Plan] Loading profile...');
    try {
      try {
        const token = await getBearerToken();
        if (!token) {
          console.log('[Plan] No auth token, skipping backend profile fetch');
          throw new Error('no_token');
        }
        const backendProfile = await authenticatedGet('/api/fitness-profile');
        
        if (backendProfile) {
          console.log('[Plan] Raw backend profile:', backendProfile);
          
          const mappedProfile: FitnessProfile = {
            ...backendProfile,
            trainingDays: backendProfile.trainingFrequency || backendProfile.trainingDays || 3,
            equipmentType: backendProfile.equipmentType || 'gym',
            focusAreas: backendProfile.focusAreas || [],
            gender: backendProfile.gender || 'male',
            weight: backendProfile.weight || 70,
            height: backendProfile.height || 175,
            age: backendProfile.age || 25,
            caloricGoal: backendProfile.caloricGoal,
          };
          
          console.log('[Plan] Mapped profile:', mappedProfile);
          setProfile(mappedProfile);
          setCaloricGoal(mappedProfile.caloricGoal || null);
          await AsyncStorage.setItem('fitnessProfile', JSON.stringify(mappedProfile));
          
          const split = generateWorkoutSplit(mappedProfile);
          console.log('[Plan] Generated split:', split);
          setWorkoutSplit(split);
          return;
        }
      } catch (error) {
        console.log('[Plan] Could not load profile from backend, using local storage');
      }
      
      const stored = await AsyncStorage.getItem('fitnessProfile');
      if (stored) {
        const profileData = JSON.parse(stored);
        console.log('[Plan] Loaded profile from local storage:', profileData);
        setProfile(profileData);
        setCaloricGoal(profileData.caloricGoal || null);
        const split = generateWorkoutSplit(profileData);
        console.log('[Plan] Generated split:', split);
        setWorkoutSplit(split);
      }
    } catch (error) {
      console.error('[Plan] Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const regenerateWeek = async () => {
    console.log('[Plan] User tapped Regenerate Week');
    if (!profile) return;
    
    const newSplit = generateWorkoutSplit(profile);
    setWorkoutSplit(newSplit);
    
    setShowRegenerateModal(true);
  };

  const syncToAppleCalendar = async () => {
    console.log('[Plan] User tapped Sync to Apple Calendar');
    setSyncing(true);
    
    try {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      
      if (status !== 'granted') {
        setShowPermissionModal(true);
        setSyncing(false);
        return;
      }

      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      const defaultCalendar = calendars.find(cal => cal.allowsModifications) || calendars[0];
      
      if (!defaultCalendar) {
        setErrorMessage('No writable calendar found on your device.');
        setShowErrorModal(true);
        setSyncing(false);
        return;
      }

      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      
      let eventsCreated = 0;
      
      for (const workout of workoutSplit) {
        const eventDate = new Date(startOfWeek);
        eventDate.setDate(startOfWeek.getDate() + workout.dayIndex);
        eventDate.setHours(9, 0, 0, 0);
        
        const endDate = new Date(eventDate);
        endDate.setHours(10, 0, 0, 0);
        
        const eventDetails = {
          title: `🏋️ ${workout.name}`,
          startDate: eventDate,
          endDate: endDate,
          notes: `Exercises:\n${workout.exercises.map(e => `• ${e.name} - ${e.sets}×${e.reps}`).join('\n')}`,
          alarms: [{ relativeOffset: -30 }],
        };
        
        await Calendar.createEventAsync(defaultCalendar.id, eventDetails);
        eventsCreated++;
      }
      
      console.log('[Plan] Created', eventsCreated, 'calendar events');
      setShowSuccessModal(true);
      
    } catch (error) {
      console.error('[Plan] Error syncing to calendar:', error);
      setErrorMessage('Failed to sync workouts to calendar. Please try again.');
      setShowErrorModal(true);
    } finally {
      setSyncing(false);
    }
  };

  const getDayWorkout = (dayIndex: number): WorkoutDay | null => {
    return workoutSplit.find(day => day.dayIndex === dayIndex) || null;
  };

  const getFocusMuscles = (workout: WorkoutDay): string => {
    const muscles = new Set<string>();
    workout.exercises.forEach(ex => {
      if (ex.muscleGroups) {
        ex.muscleGroups.forEach(m => muscles.add(m));
      }
    });
    return Array.from(muscles).slice(0, 3).join(', ');
  };

  const handleWorkoutPress = async (workout: WorkoutDay) => {
    console.log('[Plan] User tapped workout:', workout.name);
    setSelectedWorkout(workout);
    setShowWorkoutModal(true);
  };

  const handleStartWorkout = async () => {
    console.log('[Plan] User tapped Start Workout from modal');
    if (selectedWorkout) {
      try {
        await AsyncStorage.setItem('selectedWorkout', JSON.stringify(selectedWorkout));
        console.log('[Plan] Selected workout saved to AsyncStorage');
        setShowWorkoutModal(false);
        router.push('/workout-session');
      } catch (error) {
        console.error('[Plan] Error saving selected workout:', error);
      }
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ParticleBackground />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const proteinGoal = caloricGoal ? Math.round((caloricGoal * 0.30) / 4) : 0;
  const carbsGoal = caloricGoal ? Math.round((caloricGoal * 0.45) / 4) : 0;
  const fatGoal = caloricGoal ? Math.round((caloricGoal * 0.25) / 9) : 0;

  return (
    <View style={styles.container}>
      <ParticleBackground />
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Weekly Plan</Text>
            <Text style={styles.subtitle}>Your training & nutrition goals</Text>
          </View>
        </View>

        {/* Caloric Plan Card */}
        {caloricGoal && (
          <View style={styles.caloricCard}>
            <View style={styles.caloricHeader}>
              <IconSymbol 
                ios_icon_name="flame.fill" 
                android_material_icon_name="local-fire-department" 
                size={24} 
                color={colors.primary} 
              />
              <Text style={styles.caloricTitle}>Daily Nutrition Goals</Text>
            </View>
            
            <View style={styles.caloricMain}>
              <View style={styles.caloricMainItem}>
                <Text style={styles.caloricMainValue}>{caloricGoal}</Text>
                <Text style={styles.caloricMainLabel}>Calories</Text>
              </View>
            </View>

            <View style={styles.macrosRow}>
              <View style={styles.macroItem}>
                <Text style={styles.macroValue}>{proteinGoal}g</Text>
                <Text style={styles.macroLabel}>Protein</Text>
              </View>
              <View style={styles.macroDivider} />
              <View style={styles.macroItem}>
                <Text style={styles.macroValue}>{carbsGoal}g</Text>
                <Text style={styles.macroLabel}>Carbs</Text>
              </View>
              <View style={styles.macroDivider} />
              <View style={styles.macroItem}>
                <Text style={styles.macroValue}>{fatGoal}g</Text>
                <Text style={styles.macroLabel}>Fat</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.viewNutritionButton}
              onPress={() => {
                console.log('[Plan] User tapped View Nutrition');
                router.push('/(tabs)/nutrition');
              }}
            >
              <Text style={styles.viewNutritionText}>Track Today&apos;s Meals</Text>
              <IconSymbol 
                ios_icon_name="chevron.right" 
                android_material_icon_name="chevron-right" 
                size={16} 
                color={colors.primary} 
              />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={regenerateWeek}
          >
            <IconSymbol 
              ios_icon_name="arrow.clockwise" 
              android_material_icon_name="refresh" 
              size={18} 
              color={colors.primary} 
            />
            <Text style={styles.actionButtonText}>Regenerate</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.syncButton]}
            onPress={syncToAppleCalendar}
            disabled={syncing}
          >
            {syncing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <IconSymbol 
                  ios_icon_name="calendar.badge.plus" 
                  android_material_icon_name="event" 
                  size={18} 
                  color="#fff" 
                />
                <Text style={styles.syncButtonText}>Sync to Calendar</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Training Schedule</Text>

        <View style={styles.weekGrid}>
          {DAYS.map((day, index) => {
            const workout = getDayWorkout(index);
            const isToday = index === new Date().getDay();

            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dayCard,
                  isToday && styles.todayCard,
                  !workout && styles.restDayCard,
                ]}
                onPress={() => workout && handleWorkoutPress(workout)}
                disabled={!workout}
              >
                <View style={styles.dayHeader}>
                  <Text style={[
                    styles.dayLabel,
                    isToday && styles.todayLabel,
                  ]}>
                    {day}
                  </Text>
                  {isToday && (
                    <View style={styles.todayBadge}>
                      <Text style={styles.todayBadgeText}>Today</Text>
                    </View>
                  )}
                </View>

                {workout ? (
                  <>
                    <Text style={styles.workoutName}>{workout.name}</Text>
                    <View style={styles.workoutMeta}>
                      <View style={styles.metaRow}>
                        <IconSymbol 
                          ios_icon_name="clock" 
                          android_material_icon_name="access-time" 
                          size={14} 
                          color={colors.textSecondary} 
                        />
                        <Text style={styles.metaText}>~60 min</Text>
                      </View>
                      <View style={styles.metaRow}>
                        <IconSymbol 
                          ios_icon_name="figure.strengthtraining.traditional" 
                          android_material_icon_name="fitness-center" 
                          size={14} 
                          color={colors.textSecondary} 
                        />
                        <Text style={styles.metaText}>{workout.exercises.length} exercises</Text>
                      </View>
                    </View>
                    <Text style={styles.focusMuscles} numberOfLines={1}>
                      {getFocusMuscles(workout)}
                    </Text>
                    <View style={styles.tapHint}>
                      <Text style={styles.tapHintText}>Tap to view & start</Text>
                    </View>
                  </>
                ) : (
                  <>
                    <View style={styles.restIcon}>
                      <IconSymbol 
                        ios_icon_name="bed.double.fill" 
                        android_material_icon_name="hotel" 
                        size={32} 
                        color={colors.textSecondary} 
                      />
                    </View>
                    <Text style={styles.restText}>Rest Day</Text>
                    <Text style={styles.restSubtext}>Recovery & regeneration</Text>
                  </>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.infoCard}>
          <IconSymbol 
            ios_icon_name="info.circle.fill" 
            android_material_icon_name="info" 
            size={24} 
            color={colors.primary} 
          />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Training Tips</Text>
            <Text style={styles.infoText}>
              • Tap any workout day to view exercises and start{'\n'}
              • Sync your plan to Apple Calendar for reminders{'\n'}
              • Rest days are crucial for muscle recovery{'\n'}
              • Adjust your plan as needed based on how you feel
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Workout Detail Modal */}
      <Modal
        visible={showWorkoutModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowWorkoutModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalDay}>{selectedWorkout?.day}</Text>
              <Text style={styles.modalTitle}>{selectedWorkout?.name}</Text>
            </View>
            <TouchableOpacity onPress={() => setShowWorkoutModal(false)}>
              <IconSymbol 
                ios_icon_name="xmark.circle.fill" 
                android_material_icon_name="close" 
                size={32} 
                color={colors.text} 
              />
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.modalScrollView}
            contentContainerStyle={styles.modalContent}
            showsVerticalScrollIndicator={false}
          >
            <TouchableOpacity
              style={styles.startWorkoutButton}
              onPress={handleStartWorkout}
            >
              <IconSymbol 
                ios_icon_name="play.fill" 
                android_material_icon_name="play-arrow" 
                size={24} 
                color="#fff" 
              />
              <Text style={styles.startWorkoutButtonText}>Start This Workout</Text>
            </TouchableOpacity>

            <Text style={styles.exercisesTitle}>Exercises ({selectedWorkout?.exercises.length})</Text>

            {selectedWorkout?.exercises.map((exercise, index) => (
              <View key={exercise.id} style={styles.exerciseCard}>
                <View style={styles.exerciseNumber}>
                  <Text style={styles.exerciseNumberText}>{index + 1}</Text>
                </View>
                <View style={styles.exerciseInfo}>
                  <Text style={styles.exerciseName}>{exercise.name}</Text>
                  <Text style={styles.exerciseMeta}>
                    {exercise.sets} sets × {exercise.reps} reps
                  </Text>
                  {exercise.muscleGroups && exercise.muscleGroups.length > 0 && (
                    <Text style={styles.exerciseMuscles}>
                      {exercise.muscleGroups.join(', ')}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.successModal}>
            <View style={styles.successIcon}>
              <IconSymbol 
                ios_icon_name="checkmark.circle.fill" 
                android_material_icon_name="check-circle" 
                size={64} 
                color={colors.primary} 
              />
            </View>
            <Text style={styles.successTitle}>Synced Successfully!</Text>
            <Text style={styles.successMessage}>
              Your workouts have been added to your calendar with 30-minute reminders.
            </Text>
            <TouchableOpacity
              style={styles.successButton}
              onPress={() => setShowSuccessModal(false)}
            >
              <Text style={styles.successButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Regenerate Success Modal */}
      <Modal
        visible={showRegenerateModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRegenerateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.successModal}>
            <View style={styles.successIcon}>
              <IconSymbol 
                ios_icon_name="checkmark.circle.fill" 
                android_material_icon_name="check-circle" 
                size={64} 
                color={colors.primary} 
              />
            </View>
            <Text style={styles.successTitle}>Plan Regenerated!</Text>
            <Text style={styles.successMessage}>
              Your weekly training plan has been updated with new exercises.
            </Text>
            <TouchableOpacity
              style={styles.successButton}
              onPress={() => setShowRegenerateModal(false)}
            >
              <Text style={styles.successButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Permission Modal */}
      <Modal
        visible={showPermissionModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPermissionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.successModal}>
            <View style={styles.successIcon}>
              <IconSymbol 
                ios_icon_name="exclamationmark.triangle.fill" 
                android_material_icon_name="warning" 
                size={64} 
                color="#FFA500" 
              />
            </View>
            <Text style={styles.successTitle}>Permission Required</Text>
            <Text style={styles.successMessage}>
              Calendar access is needed to sync your workouts. Please enable it in Settings.
            </Text>
            <TouchableOpacity
              style={styles.successButton}
              onPress={() => setShowPermissionModal(false)}
            >
              <Text style={styles.successButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Error Modal */}
      <Modal
        visible={showErrorModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowErrorModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.successModal}>
            <View style={styles.successIcon}>
              <IconSymbol 
                ios_icon_name="xmark.circle.fill" 
                android_material_icon_name="error" 
                size={64} 
                color="#FF4444" 
              />
            </View>
            <Text style={styles.successTitle}>Error</Text>
            <Text style={styles.successMessage}>
              {errorMessage}
            </Text>
            <TouchableOpacity
              style={styles.successButton}
              onPress={() => setShowErrorModal(false)}
            >
              <Text style={styles.successButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  caloricCard: {
    backgroundColor: 'rgba(69, 155, 155, 0.15)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  caloricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  caloricTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  caloricMain: {
    alignItems: 'center',
    marginBottom: 20,
  },
  caloricMainItem: {
    alignItems: 'center',
  },
  caloricMainValue: {
    fontSize: 48,
    fontWeight: '800',
    color: colors.primary,
  },
  caloricMainLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  macrosRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  macroItem: {
    flex: 1,
    alignItems: 'center',
  },
  macroValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  macroLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  macroDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(69, 155, 155, 0.3)',
    marginHorizontal: 8,
  },
  viewNutritionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
  },
  viewNutritionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(69, 155, 155, 0.15)',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  syncButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  syncButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  weekGrid: {
    gap: 12,
    marginBottom: 24,
  },
  dayCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  todayCard: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: 'rgba(69, 155, 155, 0.1)',
  },
  restDayCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dayLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  todayLabel: {
    color: colors.primary,
  },
  todayBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  todayBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  workoutName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  workoutMeta: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  focusMuscles: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
    marginBottom: 8,
  },
  tapHint: {
    backgroundColor: 'rgba(69, 155, 155, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  tapHintText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  restIcon: {
    alignSelf: 'center',
    marginVertical: 8,
  },
  restText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 4,
  },
  restSubtext: {
    fontSize: 12,
    color: colors.grey,
    textAlign: 'center',
  },
  infoCard: {
    flexDirection: 'row',
    gap: 16,
    backgroundColor: 'rgba(69, 155, 155, 0.1)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(69, 155, 155, 0.3)',
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'android' ? 48 : 60,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  modalDay: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
  },
  modalScrollView: {
    flex: 1,
  },
  modalContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  startWorkoutButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 18,
    borderRadius: 16,
    marginBottom: 32,
  },
  startWorkoutButtonText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
  exercisesTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  exerciseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 12,
  },
  exerciseNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(69, 155, 155, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseNumberText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  exerciseMeta: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  exerciseMuscles: {
    fontSize: 12,
    color: colors.grey,
    textTransform: 'capitalize',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  successModal: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  successIcon: {
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  successButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    width: '100%',
  },
  successButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
});
