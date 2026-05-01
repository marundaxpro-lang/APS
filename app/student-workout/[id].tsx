
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
import {
  Clock,
  Dumbbell,
  ChevronLeft,
  CheckCircle,
  Brain,
  Zap,
  RotateCcw,
  Monitor,
} from 'lucide-react-native';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import {
  STUDENT_WORKOUTS,
  StudentWorkout,
  StudentExercise,
} from '@/utils/studentModeEngine';
import {
  markWorkoutCompleted,
  isWorkoutCompletedToday,
} from '@/utils/studentModeStore';

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg: '#0A0D1A',
  surface: '#12162A',
  card: '#1A1E2E',
  primary: '#6C63FF',
  student: '#8B5CF6',
  studentMuted: 'rgba(139,92,246,0.12)',
  studentBorder: 'rgba(139,92,246,0.25)',
  text: '#E8EAF6',
  textSecondary: '#8B9CC8',
  textTertiary: '#4A5580',
  border: 'rgba(108,99,255,0.15)',
  success: '#34D399',
  successMuted: 'rgba(52,211,153,0.12)',
  warning: '#FBBF24',
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

function EnergyBadge({ impact }: { impact: StudentWorkout['energyImpact'] }) {
  const colorMap = { energising: C.success, calming: '#38BDF8', neutral: C.textSecondary };
  const bgMap = { energising: C.successMuted, calming: 'rgba(56,189,248,0.12)', neutral: 'rgba(148,163,184,0.12)' };
  const labelMap = { energising: 'Energising', calming: 'Calming', neutral: 'Neutral' };
  return (
    <View style={[styles.badge, { backgroundColor: bgMap[impact] }]}>
      <Text style={[styles.badgeText, { color: colorMap[impact] }]}>{labelMap[impact]}</Text>
    </View>
  );
}

function BestTimeBadge({ time }: { time: StudentWorkout['bestTime'] }) {
  const labelMap = { morning: 'Morning', study_break: 'Study break', evening: 'Evening' };
  return (
    <View style={styles.timeBadge}>
      <Text style={styles.timeBadgeText}>{labelMap[time]}</Text>
    </View>
  );
}

function ExerciseCard({ exercise, index }: { exercise: StudentExercise; index: number }) {
  const setsRepsText = exercise.sets > 1 ? `${exercise.sets} sets × ${exercise.reps}` : exercise.reps;
  const restText = exercise.restSeconds > 0 ? `${exercise.restSeconds}s rest` : 'No rest';

  return (
    <AnimatedItem index={index}>
      <View style={styles.exerciseCard}>
        <View style={styles.exerciseHeader}>
          <View style={styles.exerciseIndexCircle}>
            <Text style={styles.exerciseIndex}>{index - 1}</Text>
          </View>
          <View style={styles.exerciseInfo}>
            <View style={styles.exerciseNameRow}>
              <Text style={styles.exerciseName}>{exercise.name}</Text>
              {exercise.deskFriendly && (
                <View style={styles.deskBadge}>
                  <Monitor size={10} color={C.student} />
                  <Text style={styles.deskBadgeText}>Desk</Text>
                </View>
              )}
            </View>
            <View style={styles.exerciseMeta}>
              <View style={styles.exerciseMetaItem}>
                <Zap size={12} color={C.student} />
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
      </View>
    </AnimatedItem>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function StudentWorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const workout = STUDENT_WORKOUTS.find(w => w.id === id) ?? null;

  const [completed, setCompleted] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!workout) return;
    console.log('[StudentWorkout] Loaded workout detail:', workout.id, workout.title);
    checkIfCompleted();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workout?.id]);

  const checkIfCompleted = async () => {
    if (!workout) return;
    const done = await isWorkoutCompletedToday(workout.id);
    setCompleted(done);
  };

  const handleStartWorkout = async () => {
    if (!workout) return;
    console.log('[StudentWorkout] User tapped Start workout:', workout.id);
    setSaving(true);
    try {
      await markWorkoutCompleted(workout.id);
      setCompleted(true);
      console.log('[StudentWorkout] Workout marked as completed:', workout.id);
    } catch (e) {
      console.error('[StudentWorkout] Error marking workout complete:', e);
    } finally {
      setSaving(false);
    }
  };

  if (!workout) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Workout', headerTransparent: true, headerTintColor: C.text }} />
        <View style={styles.notFoundContainer}>
          <Dumbbell size={40} color={C.textTertiary} />
          <Text style={styles.notFoundTitle}>Workout not found</Text>
          <AnimatedPressable style={styles.backButton} onPress={() => {
            console.log('[StudentWorkout] User tapped Go back');
            router.back();
          }}>
            <ChevronLeft size={16} color={C.student} />
            <Text style={styles.backButtonText}>Go back</Text>
          </AnimatedPressable>
        </View>
      </View>
    );
  }

  const buttonLabel = completed ? 'Completed today' : saving ? 'Saving...' : 'Start workout';
  const typeLabel = workout.type.replace(/_/g, ' ');

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
        {/* ── Cognitive boost callout ── */}
        <AnimatedItem index={0}>
          <View style={styles.cognitiveCallout}>
            <Brain size={18} color={C.student} />
            <Text style={styles.cognitiveCalloutText}>{workout.cognitiveBoost}</Text>
          </View>
        </AnimatedItem>

        {/* ── Header card ── */}
        <AnimatedItem index={1}>
          <View style={styles.headerCard}>
            <View style={styles.headerBadges}>
              <View style={styles.typeBadge}>
                <Text style={styles.typeBadgeText}>{typeLabel}</Text>
              </View>
              <EnergyBadge impact={workout.energyImpact} />
              <BestTimeBadge time={workout.bestTime} />
            </View>

            <Text style={styles.workoutTitle}>{workout.title}</Text>

            <View style={styles.headerMeta}>
              <View style={styles.headerMetaItem}>
                <Clock size={16} color={C.student} />
                <Text style={styles.headerMetaValue}>{workout.durationMinutes}</Text>
                <Text style={styles.headerMetaLabel}>min</Text>
              </View>
              <View style={styles.headerMetaDivider} />
              <View style={styles.headerMetaItem}>
                <Dumbbell size={16} color={C.student} />
                <Text style={styles.headerMetaValue}>{workout.exercises.length}</Text>
                <Text style={styles.headerMetaLabel}>exercises</Text>
              </View>
              <View style={styles.headerMetaDivider} />
              <View style={styles.headerMetaItem}>
                <Monitor size={16} color={C.student} />
                <Text style={styles.headerMetaValue}>
                  {workout.exercises.filter(e => e.deskFriendly).length}
                </Text>
                <Text style={styles.headerMetaLabel}>desk-ok</Text>
              </View>
            </View>
          </View>
        </AnimatedItem>

        {/* ── Exercise list ── */}
        <AnimatedItem index={2}>
          <Text style={styles.sectionTitle}>Exercises</Text>
        </AnimatedItem>

        {workout.exercises.map((exercise, i) => (
          <ExerciseCard key={i} exercise={exercise} index={i + 3} />
        ))}

        {/* ── Bottom spacer for sticky button ── */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── Sticky start button ── */}
      <View style={styles.stickyFooter}>
        <AnimatedPressable
          style={[
            styles.startButton,
            completed && styles.startButtonCompleted,
            saving && styles.startButtonDisabled,
          ]}
          onPress={handleStartWorkout}
          disabled={completed || saving}
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
    color: C.student,
  },
  // Cognitive callout
  cognitiveCallout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: C.studentMuted,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.studentBorder,
    padding: 14,
  },
  cognitiveCalloutText: {
    flex: 1,
    fontSize: 14,
    color: C.textSecondary,
    lineHeight: 20,
    fontStyle: 'italic',
    fontWeight: '500',
  },
  // Header card
  headerCard: {
    backgroundColor: C.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.studentBorder,
    padding: 20,
    gap: 12,
    shadowColor: C.student,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 5,
  },
  headerBadges: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  workoutTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.5,
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
    backgroundColor: C.studentMuted,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: C.student,
    letterSpacing: 0.3,
    textTransform: 'capitalize',
  },
  timeBadge: {
    backgroundColor: 'rgba(251,191,36,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  timeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: C.warning,
    letterSpacing: 0.3,
  },
  deskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: C.studentMuted,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  deskBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: C.student,
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
    backgroundColor: C.studentMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.studentBorder,
  },
  exerciseIndex: {
    fontSize: 13,
    fontWeight: '800',
    color: C.student,
  },
  exerciseInfo: {
    flex: 1,
    gap: 6,
  },
  exerciseNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
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
    color: C.student,
  },
  exerciseMetaTextMuted: {
    fontSize: 13,
    fontWeight: '500',
    color: C.textTertiary,
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
    backgroundColor: C.student,
    borderRadius: 16,
    paddingVertical: 17,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: C.student,
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
