
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
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    console.log('[Plan] Loading profile...');
    try {
      try {
        const { authenticatedGet } = await import('@/utils/api');
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
          };
          
          console.log('[Plan] Mapped profile:', mappedProfile);
          setProfile(mappedProfile);
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

  const swapDays = (dayIndex1: number, dayIndex2: number) => {
    console.log('[Plan] User swapped days:', dayIndex1, dayIndex2);
    const newSplit = [...workoutSplit];
    const workout1 = newSplit.find(w => w.dayIndex === dayIndex1);
    const workout2 = newSplit.find(w => w.dayIndex === dayIndex2);
    
    if (workout1 && workout2) {
      workout1.dayIndex = dayIndex2;
      workout2.dayIndex = dayIndex1;
      
      const temp = workout1.day;
      workout1.day = workout2.day;
      workout2.day = temp;
      
      setWorkoutSplit(newSplit.sort((a, b) => a.dayIndex - b.dayIndex));
    }
  };

  const markRestDay = (dayIndex: number) => {
    console.log('[Plan] User marked day as rest:', dayIndex);
    const newSplit = workoutSplit.filter(w => w.dayIndex !== dayIndex);
    setWorkoutSplit(newSplit);
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

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ParticleBackground />
        <ActivityIndicator size="large" color={colors.primary} />
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
          <View>
            <Text style={styles.title}>Weekly Training Plan</Text>
            <Text style={styles.subtitle}>Your personalized workout schedule</Text>
          </View>
        </View>

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

        <View style={styles.weekGrid}>
          {DAYS.map((day, index) => {
            const workout = getDayWorkout(index);
            const isToday = index === new Date().getDay();

            return (
              <View
                key={index}
                style={[
                  styles.dayCard,
                  isToday && styles.todayCard,
                  !workout && styles.restDayCard,
                ]}
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
              </View>
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
              • Sync your plan to Apple Calendar for reminders{'\n'}
              • Rest days are crucial for muscle recovery{'\n'}
              • Adjust your plan as needed based on how you feel
            </Text>
          </View>
        </View>
      </ScrollView>

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
