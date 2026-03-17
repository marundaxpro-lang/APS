
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { IconSymbol } from '@/components/IconSymbol';
import {
  generateWeeklyPlan,
  compressWorkout,
  AdaptiveWorkoutDay,
  AdaptiveExercise,
  CompressedWorkout,
  GoalType,
  EquipmentMode,
  ExperienceLevel,
} from '@/utils/adaptiveWorkoutEngine';

const TEAL = '#00D4AA';
const BG = '#0A0A0A';
const CARD = '#161616';
const CARD_BORDER = 'rgba(255,255,255,0.06)';
const TIME_OPTIONS = [15, 25, 35, 45];

function mapGoal(raw: string | undefined): GoalType {
  if (raw === 'strength') return 'strength';
  if (raw === 'muscle' || raw === 'muscleGain' || raw === 'hypertrophy') return 'hypertrophy';
  if (raw === 'weight-loss' || raw === 'weightLoss' || raw === 'fat_loss') return 'fat_loss';
  if (raw === 'endurance') return 'endurance';
  return 'maintenance';
}
function mapEquipment(raw: string | undefined): EquipmentMode {
  if (raw === 'home') return 'home';
  if (raw === 'minimal') return 'minimal';
  return 'full_gym';
}
function mapExperience(raw: string | undefined): ExperienceLevel {
  if (raw === 'beginner') return 'beginner';
  if (raw === 'advanced') return 'advanced';
  return 'intermediate';
}

export default function WorkoutDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [workout, setWorkout] = useState<AdaptiveWorkoutDay | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [selectedTime, setSelectedTime] = useState(35);
  const [compressed, setCompressed] = useState<CompressedWorkout | null>(null);

  useEffect(() => {
    loadWorkout();
  }, [id]);

  const loadWorkout = async () => {
    console.log('[WorkoutDetail] Loading workout for id:', id);
    try {
      const raw = await AsyncStorage.getItem('fitnessProfile');
      const profile = raw ? JSON.parse(raw) : {};
      const g = mapGoal(profile.goal);
      const exp = mapExperience(profile.experienceLevel);
      const eq = mapEquipment(profile.equipmentType);
      const week = generateWeeklyPlan(g, exp, eq);
      const found = week.find(d => d.id === id) ?? week.find(d => !d.isRestDay) ?? null;
      setWorkout(found);
    } catch (e) {
      console.error('[WorkoutDetail] Error loading workout:', e);
    } finally {
      setLoading(false);
    }
  };

  const openTimeModal = () => {
    console.log('[WorkoutDetail] User opened compress modal');
    if (workout) {
      setCompressed(compressWorkout(workout, selectedTime));
    }
    setShowTimeModal(true);
  };

  const handleStartSession = () => {
    if (!workout) return;
    console.log('[WorkoutDetail] User tapped Start Session:', workout.name);
    const legacyWorkout = {
      name: workout.name,
      exercises: workout.exercises.map(ex => ({
        id: ex.id,
        name: ex.name,
        sets: ex.sets,
        reps: ex.reps,
        muscleGroups: [ex.muscleGroup],
        equipment: ex.equipment,
        instructions: [`Perform ${ex.sets} sets of ${ex.reps}`, `Rest ${ex.restSeconds}s between sets`],
      })),
      dayIndex: workout.dayOfWeek,
    };
    AsyncStorage.setItem('selectedWorkout', JSON.stringify(legacyWorkout)).then(() => {
      router.push('/workout-session');
    });
  };

  const handleStartCompressed = () => {
    if (!compressed) return;
    console.log('[WorkoutDetail] User starting compressed session:', compressed.mode);
    setShowTimeModal(false);
    const legacyWorkout = {
      name: compressed.workout.name + ' (Compressed)',
      exercises: compressed.workout.exercises.map(ex => ({
        id: ex.id,
        name: ex.name,
        sets: ex.sets,
        reps: ex.reps,
        muscleGroups: [ex.muscleGroup],
        equipment: ex.equipment,
        instructions: [`Perform ${ex.sets} sets of ${ex.reps}`, `Rest ${ex.restSeconds}s between sets`],
      })),
      dayIndex: compressed.workout.dayOfWeek,
    };
    AsyncStorage.setItem('selectedWorkout', JSON.stringify(legacyWorkout)).then(() => {
      router.push('/workout-session');
    });
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Stack.Screen options={{ title: 'Workout', headerStyle: { backgroundColor: BG }, headerTintColor: '#fff', headerShadowVisible: false }} />
        <ActivityIndicator size="large" color={TEAL} />
      </View>
    );
  }

  if (!workout) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Stack.Screen options={{ title: 'Workout', headerStyle: { backgroundColor: BG }, headerTintColor: '#fff', headerShadowVisible: false }} />
        <Text style={{ color: '#888', fontSize: 16 }}>Workout not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const restText = (ex: AdaptiveExercise) =>
    ex.restSeconds >= 60 ? `${Math.round(ex.restSeconds / 60)}m` : `${ex.restSeconds}s`;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: workout.name,
          headerStyle: { backgroundColor: BG },
          headerTintColor: '#fff',
          headerShadowVisible: false,
        }}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>{workout.exercises.length} exercises</Text>
          </View>
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>{workout.estimatedDuration} min</Text>
          </View>
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>{workout.muscleGroups.join(', ')}</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.startBtn} onPress={handleStartSession} activeOpacity={0.7}>
            <IconSymbol ios_icon_name="play.fill" android_material_icon_name="play-arrow" size={18} color="#000" />
            <Text style={styles.startBtnText}>Start Session</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.compressBtn} onPress={openTimeModal} activeOpacity={0.7}>
            <IconSymbol ios_icon_name="clock" android_material_icon_name="schedule" size={16} color={TEAL} />
            <Text style={styles.compressBtnText}>Compress</Text>
          </TouchableOpacity>
        </View>

        {/* Exercise List */}
        <View style={styles.exerciseCard}>
          <Text style={styles.sectionHeader}>EXERCISES</Text>
          {workout.exercises.map((ex, idx) => (
            <View key={ex.id} style={[styles.exerciseRow, idx === workout.exercises.length - 1 && { borderBottomWidth: 0 }]}>
              <View style={styles.exerciseNum}>
                <Text style={styles.exerciseNumText}>{idx + 1}</Text>
              </View>
              <View style={styles.exerciseInfo}>
                <Text style={styles.exerciseName}>{ex.name}</Text>
                <View style={styles.exerciseMeta}>
                  <Text style={styles.exerciseMetaText}>{ex.sets} sets</Text>
                  <Text style={styles.exerciseMetaDot}>·</Text>
                  <Text style={styles.exerciseMetaText}>{ex.reps} reps</Text>
                  <Text style={styles.exerciseMetaDot}>·</Text>
                  <Text style={styles.exerciseMetaText}>{restText(ex)} rest</Text>
                </View>
                <Text style={[styles.muscleTag, ex.isPrimary && { color: TEAL }]}>
                  {ex.muscleGroup}
                  {ex.isPrimary ? ' · Primary' : ''}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Compress Modal */}
      <Modal visible={showTimeModal} transparent animationType="slide" onRequestClose={() => setShowTimeModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Short on Time?</Text>
              <TouchableOpacity onPress={() => setShowTimeModal(false)} activeOpacity={0.7}>
                <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={22} color="#888" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>How many minutes do you have?</Text>
            <View style={styles.timeOptions}>
              {TIME_OPTIONS.map(t => (
                <TouchableOpacity
                  key={t}
                  style={[styles.timeOption, selectedTime === t && styles.timeOptionSelected]}
                  onPress={() => {
                    console.log('[WorkoutDetail] User selected time:', t, 'min');
                    setSelectedTime(t);
                    if (workout) setCompressed(compressWorkout(workout, t));
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.timeOptionText, selectedTime === t && styles.timeOptionTextSelected]}>
                    {t} min
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {compressed && (
              <View style={styles.compressPreview}>
                <Text style={styles.compressMode}>{compressed.mode.toUpperCase()} MODE</Text>
                <Text style={styles.compressExplanation}>{compressed.explanation}</Text>
              </View>
            )}
            <TouchableOpacity style={styles.modalPrimaryBtn} onPress={handleStartCompressed} activeOpacity={0.7}>
              <Text style={styles.modalPrimaryBtnText}>Start Compressed Session</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },
  header: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 16 },
  headerBadge: {
    backgroundColor: 'rgba(0,212,170,0.12)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  headerBadgeText: { fontSize: 12, color: TEAL, fontWeight: '600', textTransform: 'capitalize' },
  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  startBtn: {
    flex: 1,
    backgroundColor: TEAL,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  startBtnText: { fontSize: 15, fontWeight: '700', color: '#000' },
  compressBtn: {
    borderWidth: 1,
    borderColor: TEAL,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  compressBtnText: { fontSize: 14, fontWeight: '600', color: TEAL },
  exerciseCard: {
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    padding: 16,
  },
  sectionHeader: {
    fontSize: 11,
    letterSpacing: 1.5,
    color: TEAL,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: CARD_BORDER,
  },
  exerciseNum: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,212,170,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseNumText: { fontSize: 13, fontWeight: '700', color: TEAL },
  exerciseInfo: { flex: 1 },
  exerciseName: { fontSize: 14, fontWeight: '600', color: '#fff', marginBottom: 3 },
  exerciseMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  exerciseMetaText: { fontSize: 12, color: '#888' },
  exerciseMetaDot: { fontSize: 12, color: '#444' },
  muscleTag: { fontSize: 11, color: '#555', fontWeight: '600', textTransform: 'capitalize' },
  backBtn: {
    marginTop: 16,
    backgroundColor: TEAL,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  backBtnText: { fontSize: 14, fontWeight: '600', color: '#000' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#111',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    borderTopWidth: 1,
    borderColor: CARD_BORDER,
  },
  modalHandle: { width: 36, height: 4, backgroundColor: '#333', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  modalSubtitle: { fontSize: 14, color: '#888', marginBottom: 16 },
  timeOptions: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  timeOption: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#333', alignItems: 'center' },
  timeOptionSelected: { borderColor: TEAL, backgroundColor: 'rgba(0,212,170,0.1)' },
  timeOptionText: { fontSize: 14, fontWeight: '600', color: '#888' },
  timeOptionTextSelected: { color: TEAL },
  compressPreview: {
    backgroundColor: CARD,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    padding: 14,
    marginBottom: 16,
    gap: 6,
  },
  compressMode: { fontSize: 10, fontWeight: '700', color: TEAL, letterSpacing: 1 },
  compressExplanation: { fontSize: 13, color: '#aaa', lineHeight: 18 },
  modalPrimaryBtn: { backgroundColor: TEAL, borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  modalPrimaryBtnText: { fontSize: 16, fontWeight: '700', color: '#000' },
});
