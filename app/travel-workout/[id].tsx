
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  Animated,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Clock,
  Dumbbell,
  ChevronLeft,
  CheckCircle,
  Info,
  Zap,
  RotateCcw,
} from 'lucide-react-native';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import {
  TRAVEL_WORKOUTS,
  TravelWorkout,
  TravelExercise,
  STORAGE_KEY_COMPLETED_WORKOUTS,
} from '@/utils/travelModeEngine';

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg: '#0A0D1A',
  surface: '#12162A',
  card: '#1A1E2E',
  primary: '#6C63FF',
  travel: '#0EA5E9',
  travelMuted: 'rgba(14,165,233,0.12)',
  travelBorder: 'rgba(14,165,233,0.25)',
  text: '#E8EAF6',
  textSecondary: '#8B9CC8',
  textTertiary: '#4A5580',
  border: 'rgba(108,99,255,0.15)',
  success: '#34D399',
  successMuted: 'rgba(52,211,153,0.12)',
  warning: '#FBBF24',
  warningMuted: 'rgba(251,191,36,0.12)',
  danger: '#F87171',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function AnimatedItem({ index, children }: { index: number; children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(14)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 350, delay: index * 60, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 350, delay: index * 60, useNativeDriver: true }),
    ]).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <Animated.View style={{ opacity, transform: [{ translateY }] }}>{children}</Animated.View>;
}

function IntensityBadge({ intensity }: { intensity: 'low' | 'medium' | 'high' }) {
  const colorMap = { low: C.success, medium: C.warning, high: C.danger };
  const bgMap = { low: C.successMuted, medium: C.warningMuted, high: 'rgba(248,113,113,0.12)' };
  const labelMap = { low: 'Low', medium: 'Medium', high: 'High' };
  return (
    <View style={[styles.badge, { backgroundColor: bgMap[intensity] }]}>
      <Text style={[styles.badgeText, { color: colorMap[intensity] }]}>{labelMap[intensity]}</Text>
    </View>
  );
}

function TypeBadge({ type }: { type: TravelWorkout['type'] }) {
  const labelMap: Record<TravelWorkout['type'], string> = {
    hotel_room: 'Hotel Room',
    hotel_gym: 'Hotel Gym',
    bodyweight_outdoor: 'Outdoor',
    quick_circuit: 'Circuit',
  };
  return (
    <View style={styles.typeBadge}>
      <Text style={styles.typeBadgeText}>{labelMap[type]}</Text>
    </View>
  );
}

function ExerciseCard({ exercise, index }: { exercise: TravelExercise; index: number }) {
  const setsRepsText = exercise.sets > 1 ? `${exercise.sets} sets × ${exercise.reps}` : exercise.reps;
  const restText = exercise.restSeconds > 0 ? `${exercise.restSeconds}s rest` : 'No rest';

  return (
    <AnimatedItem index={index}>
      <View style={styles.exerciseCard}>
        <View style={styles.exerciseHeader}>
          <View style={styles.exerciseIndexCircle}>
            <Text style={styles.exerciseIndex}>{index + 1}</Text>
          </View>
          <View style={styles.exerciseInfo}>
            <Text style={styles.exerciseName}>{exercise.name}</Text>
            <View style={styles.exerciseMeta}>
              <View style={styles.exerciseMetaItem}>
                <Zap size={12} color={C.travel} />
                <Text style={styles.exerciseMetaText}>{setsRepsText}</Text>
              </View>
              {exercise.restSeconds > 0 && (
                <View style={styles.exerciseMetaItem}>
                  <RotateCcw size={12} color={C.textTertiary} />
                  <Text style={styles.exerciseMetaTextMuted}>{restText}</Text>
                </View>
              )}
            </View>
          </View>
        </View>
        <View style={styles.tipBox}>
          <Info size={13} color={C.travel} />
          <Text style={styles.tipText}>{exercise.tip}</Text>
        </View>
      </View>
    </AnimatedItem>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function TravelWorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const workout = TRAVEL_WORKOUTS.find(w => w.id === id) ?? null;

  const [completed, setCompleted] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!workout) return;
    console.log('[TravelWorkout] Loaded workout detail:', workout.id, workout.title);
    checkIfCompleted();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workout?.id]);

  const checkIfCompleted = async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY_COMPLETED_WORKOUTS);
      if (raw) {
        const data: Record<string, string[]> = JSON.parse(raw);
        const today = new Date().toDateString();
        const todayCompleted = data[today] || [];
        if (workout && todayCompleted.includes(workout.id)) {
          setCompleted(true);
        }
      }
    } catch (e) {
      console.error('[TravelWorkout] Error checking completion:', e);
    }
  };

  const handleStartWorkout = async () => {
    if (!workout) return;
    console.log('[TravelWorkout] User tapped Start workout:', workout.id);
    setStarting(true);
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY_COMPLETED_WORKOUTS);
      const data: Record<string, string[]> = raw ? JSON.parse(raw) : {};
      const today = new Date().toDateString();
      const todayCompleted = data[today] || [];
      if (!todayCompleted.includes(workout.id)) {
        data[today] = [...todayCompleted, workout.id];
        await AsyncStorage.setItem(STORAGE_KEY_COMPLETED_WORKOUTS, JSON.stringify(data));
      }
      setCompleted(true);
      console.log('[TravelWorkout] Workout marked as completed:', workout.id);
    } catch (e) {
      console.error('[TravelWorkout] Error marking workout complete:', e);
    } finally {
      setStarting(false);
    }
  };

  if (!workout) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Workout', headerTransparent: true, headerTintColor: C.text }} />
        <View style={styles.notFoundContainer}>
          <Dumbbell size={40} color={C.textTertiary} />
          <Text style={styles.notFoundTitle}>Workout not found</Text>
          <AnimatedPressable style={styles.backButton} onPress={() => router.back()}>
            <ChevronLeft size={16} color={C.travel} />
            <Text style={styles.backButtonText}>Go back</Text>
          </AnimatedPressable>
        </View>
      </View>
    );
  }

  const equipmentText = workout.equipment.join(' · ');
  const focusLabelMap: Record<string, string> = {
    upper: 'Upper Body', lower: 'Lower Body', full_body: 'Full Body', cardio: 'Cardio', recovery: 'Recovery',
  };
  const focusLabel = focusLabelMap[workout.focus] || workout.focus;
  const buttonLabel = completed ? 'Completed today' : starting ? 'Saving...' : 'Start workout';

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: workout.title,
          headerTransparent: true,
          headerTintColor: C.text,
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
        }}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        {/* ── Header card ── */}
        <AnimatedItem index={0}>
          <View style={styles.headerCard}>
            <View style={styles.headerBadges}>
              <TypeBadge type={workout.type} />
              <IntensityBadge intensity={workout.intensity} />
            </View>
            <Text style={styles.workoutTitle}>{workout.title}</Text>
            <Text style={styles.workoutFocus}>{focusLabel}</Text>

            <View style={styles.headerMeta}>
              <View style={styles.headerMetaItem}>
                <Clock size={16} color={C.travel} />
                <Text style={styles.headerMetaValue}>{workout.durationMinutes}</Text>
                <Text style={styles.headerMetaLabel}>min</Text>
              </View>
              <View style={styles.headerMetaDivider} />
              <View style={styles.headerMetaItem}>
                <Dumbbell size={16} color={C.travel} />
                <Text style={styles.headerMetaValue}>{workout.exercises.length}</Text>
                <Text style={styles.headerMetaLabel}>exercises</Text>
              </View>
            </View>

            <View style={styles.equipmentRow}>
              {workout.equipment.map((eq, i) => (
                <View key={i} style={styles.equipmentChip}>
                  <Text style={styles.equipmentChipText}>{eq}</Text>
                </View>
              ))}
            </View>
          </View>
        </AnimatedItem>

        {/* ── Exercise list ── */}
        <AnimatedItem index={1}>
          <Text style={styles.sectionTitle}>Exercises</Text>
        </AnimatedItem>

        {workout.exercises.map((exercise, i) => (
          <ExerciseCard key={i} exercise={exercise} index={i + 2} />
        ))}

        {/* ── Bottom spacer for button ── */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── Sticky start button ── */}
      <View style={styles.stickyFooter}>
        <AnimatedPressable
          style={[styles.startButton, completed && styles.startButtonCompleted, starting && styles.startButtonDisabled]}
          onPress={handleStartWorkout}
          disabled={completed || starting}
        >
          {completed ? (
            <>
              <CheckCircle size={20} color={C.success} />
              <Text style={[styles.startButtonText, styles.startButtonTextCompleted]}>{buttonLabel}</Text>
            </>
          ) : (
            <>
              <Zap size={20} color="#fff" />
              <Text style={styles.startButtonText}>{buttonLabel}</Text>
            </>
          )}
        </AnimatedPressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 16,
    paddingTop: Platform.OS === 'ios' ? 100 : 80,
  },
  notFoundContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  notFoundTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: C.textSecondary,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: C.travel,
  },
  // Header card
  headerCard: {
    backgroundColor: C.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.travelBorder,
    padding: 20,
    gap: 12,
    shadowColor: C.travel,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 5,
  },
  headerBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  workoutTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.5,
  },
  workoutFocus: {
    fontSize: 14,
    color: C.textSecondary,
    fontWeight: '500',
    marginTop: -4,
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    paddingTop: 4,
  },
  headerMetaItem: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
  },
  headerMetaValue: {
    fontSize: 24,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.3,
  },
  headerMetaLabel: {
    fontSize: 13,
    color: C.textSecondary,
    fontWeight: '500',
  },
  headerMetaDivider: {
    width: 1,
    height: 28,
    backgroundColor: C.border,
  },
  equipmentRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  equipmentChip: {
    backgroundColor: C.travelMuted,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: C.travelBorder,
  },
  equipmentChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: C.travel,
  },
  // Badges
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  typeBadge: {
    backgroundColor: 'rgba(108,99,255,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: C.primary,
    letterSpacing: 0.3,
  },
  // Section
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: C.text,
    letterSpacing: -0.3,
  },
  // Exercise card
  exerciseCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    gap: 12,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  exerciseIndexCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: C.travelMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.travelBorder,
  },
  exerciseIndex: {
    fontSize: 13,
    fontWeight: '800',
    color: C.travel,
  },
  exerciseInfo: {
    flex: 1,
    gap: 6,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '700',
    color: C.text,
    letterSpacing: -0.1,
  },
  exerciseMeta: {
    flexDirection: 'row',
    gap: 14,
    flexWrap: 'wrap',
  },
  exerciseMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  exerciseMetaText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.travel,
  },
  exerciseMetaTextMuted: {
    fontSize: 13,
    fontWeight: '500',
    color: C.textTertiary,
  },
  tipBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: C.travelMuted,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: C.travelBorder,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: C.textSecondary,
    lineHeight: 18,
    fontWeight: '500',
  },
  // Sticky footer
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
    paddingTop: 12,
    backgroundColor: C.bg,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  startButton: {
    backgroundColor: C.travel,
    borderRadius: 16,
    paddingVertical: 17,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: C.travel,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  startButtonCompleted: {
    backgroundColor: C.successMuted,
    shadowColor: C.success,
    shadowOpacity: 0.2,
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.3)',
  },
  startButtonDisabled: {
    opacity: 0.6,
  },
  startButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.1,
  },
  startButtonTextCompleted: {
    color: C.success,
  },
});
