
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Animated,
  LayoutAnimation,
  UIManager,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { IconSymbol } from '@/components/IconSymbol';
import { PackCard } from '@/components/PackCard';
import { PROGRAM_PACKS } from '@/data/programPacks';
import { colors } from '@/styles/commonStyles';
import {
  generateWeeklyPlan,
  compressWorkout,
  substituteEquipment,
  handleMissedWorkout,
  getAdaptiveRecommendation,
  getSubstitutesForExercise,
  getTravelModeWeek,
  getEquipmentModeLabel,
  EQUIPMENT_PROFILES,
  AdaptiveWorkoutDay,
  AdaptiveExercise,
  EquipmentMode,
  GoalType,
  ExperienceLevel,
  CompressedWorkout,
  MissedWorkoutResolution,
  AdaptiveContext,
} from '@/utils/adaptiveWorkoutEngine';
import { STORAGE_KEYS } from '@/utils/momentumEngine';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const TEAL = '#00D4AA';
const ORANGE = '#FF6B35';
const AMBER = '#F59E0B';
const BG = '#0A0A0A';
const CARD = '#161616';
const CARD_BORDER = 'rgba(255,255,255,0.06)';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const TIME_OPTIONS = [15, 25, 35, 45];

const EQUIPMENT_MODES: { mode: EquipmentMode; icon_ios: string; icon_android: string }[] = [
  { mode: 'full_gym', icon_ios: 'dumbbell.fill', icon_android: 'fitness-center' },
  { mode: 'home', icon_ios: 'house.fill', icon_android: 'home' },
  { mode: 'minimal', icon_ios: 'minus.circle.fill', icon_android: 'remove-circle' },
  { mode: 'travel', icon_ios: 'airplane', icon_android: 'flight' },
  { mode: 'bodyweight', icon_ios: 'figure.walk', icon_android: 'directions-walk' },
];

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
  if (raw === 'travel') return 'travel';
  if (raw === 'bodyweight') return 'bodyweight';
  return 'full_gym';
}

function mapExperience(raw: string | undefined): ExperienceLevel {
  if (raw === 'beginner') return 'beginner';
  if (raw === 'advanced') return 'advanced';
  return 'intermediate';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  return <Text style={styles.sectionHeader}>{label}</Text>;
}

function PillButton({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: string;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.pill, active && styles.pillActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <IconSymbol
        ios_icon_name={icon}
        android_material_icon_name={icon}
        size={14}
        color={active ? BG : TEAL}
      />
      <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Equipment Mode Card ──────────────────────────────────────────────────────

function EquipmentModeCard({
  mode,
  icon_ios,
  icon_android,
  selected,
  onPress,
}: {
  mode: EquipmentMode;
  icon_ios: string;
  icon_android: string;
  selected: boolean;
  onPress: () => void;
}) {
  const label = getEquipmentModeLabel(mode);
  return (
    <TouchableOpacity
      style={[styles.equipCard, selected && styles.equipCardSelected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <IconSymbol
        ios_icon_name={icon_ios}
        android_material_icon_name={icon_android}
        size={20}
        color={selected ? TEAL : '#666'}
      />
      <Text style={[styles.equipCardLabel, selected && styles.equipCardLabelSelected]} numberOfLines={2}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Exercise Row ─────────────────────────────────────────────────────────────

function ExerciseRow({
  exercise,
  onSwap,
  swapOpen,
  isSubstituted,
  equipmentMode,
  onSelectSubstitute,
}: {
  exercise: AdaptiveExercise;
  onSwap: () => void;
  swapOpen: boolean;
  isSubstituted: boolean;
  equipmentMode: EquipmentMode;
  onSelectSubstitute: (name: string) => void;
}) {
  const nameColor = isSubstituted ? TEAL : '#fff';
  const restText = exercise.restSeconds >= 60
    ? `${Math.round(exercise.restSeconds / 60)}m rest`
    : `${exercise.restSeconds}s rest`;

  const substitutes = getSubstitutesForExercise(exercise.name, equipmentMode);
  const dropdownOptions = substitutes.length > 0 ? substitutes : exercise.alternatives;

  return (
    <View>
      <View style={styles.exerciseRow}>
        <View style={[styles.primaryDot, { backgroundColor: exercise.isPrimary ? TEAL : 'transparent', borderColor: exercise.isPrimary ? TEAL : '#444' }]} />
        <View style={styles.exerciseInfo}>
          <Text style={[styles.exerciseName, { color: nameColor }]}>{exercise.name}</Text>
          {isSubstituted && (
            <Text style={styles.substitutedBadge}>substituted</Text>
          )}
          <View style={styles.exerciseMeta}>
            <Text style={styles.exerciseMetaText}>
              {exercise.sets}×{exercise.reps}
            </Text>
            <Text style={styles.exerciseMetaDot}>·</Text>
            <Text style={styles.exerciseMetaText}>{restText}</Text>
            <Text style={styles.exerciseMetaDot}>·</Text>
            <Text style={[styles.muscleTag, { color: exercise.isPrimary ? TEAL : '#888' }]}>{exercise.muscleGroup}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.swapBtn} onPress={onSwap} activeOpacity={0.7}>
          <Text style={styles.swapIcon}>⇄</Text>
        </TouchableOpacity>
      </View>
      {swapOpen && dropdownOptions.length > 0 && (
        <View style={styles.swapDropdown}>
          {dropdownOptions.map((alt, i) => (
            <TouchableOpacity
              key={i}
              style={styles.swapOption}
              onPress={() => {
                console.log('[TrainingPlan] User selected substitute:', exercise.name, '→', alt);
                onSelectSubstitute(alt);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.swapOptionText}>{alt}</Text>
              <IconSymbol ios_icon_name="checkmark" android_material_icon_name="check" size={12} color={TEAL} />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function TrainingPlanScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [week, setWeek] = useState<AdaptiveWorkoutDay[]>([]);
  const [baseWeek, setBaseWeek] = useState<AdaptiveWorkoutDay[]>([]);
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [goal, setGoal] = useState<GoalType>('hypertrophy');
  const [experience, setExperience] = useState<ExperienceLevel>('intermediate');
  const [equipment, setEquipment] = useState<EquipmentMode>('full_gym');
  const [openSwapId, setOpenSwapId] = useState<string | null>(null);
  // Per-exercise locked substitutes: exerciseId → custom name
  const [lockedSubs, setLockedSubs] = useState<Record<string, string>>({});

  // Modals
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [showMissedModal, setShowMissedModal] = useState(false);
  const [selectedTime, setSelectedTime] = useState(35);
  const [compressed, setCompressed] = useState<CompressedWorkout | null>(null);
  const [missedResolution, setMissedResolution] = useState<MissedWorkoutResolution | null>(null);

  const travelBannerAnim = useRef(new Animated.Value(0)).current;

  const isTravelActive = equipment !== 'full_gym';
  const substitutedCount = week.reduce((acc, day) => {
    if (day.isRestDay) return acc;
    return acc + day.exercises.filter(ex => ex.alternatives && ex.alternatives.length > 0 && equipment !== 'full_gym').length;
  }, 0);

  useEffect(() => {
    loadPlan();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadPlan = async () => {
    console.log('[TrainingPlan] Loading plan from storage');
    try {
      const [raw, savedMode] = await Promise.all([
        AsyncStorage.getItem('fitnessProfile'),
        AsyncStorage.getItem(STORAGE_KEYS.EQUIPMENT_MODE),
      ]);

      let g: GoalType = 'hypertrophy';
      let exp: ExperienceLevel = 'intermediate';
      let eq: EquipmentMode = 'full_gym';

      if (raw) {
        const profile = JSON.parse(raw);
        g = mapGoal(profile.goal);
        exp = mapExperience(profile.experienceLevel);
        eq = mapEquipment(profile.equipmentType);
      }

      // Saved equipment mode overrides profile
      if (savedMode && ['full_gym', 'home', 'minimal', 'travel', 'bodyweight'].includes(savedMode)) {
        eq = savedMode as EquipmentMode;
      }

      setGoal(g);
      setExperience(exp);
      setEquipment(eq);

      const basePlan = generateWeeklyPlan(g, exp, 'full_gym');
      setBaseWeek(basePlan);

      const plan = eq === 'full_gym'
        ? basePlan
        : generateWeeklyPlan(g, exp, eq);
      setWeek(plan);

      const todayDow = new Date().getDay();
      const todayDay = plan.find(d => d.dayOfWeek === todayDow && !d.isRestDay);
      if (todayDay) setSelectedDayId(todayDay.id);
      else if (plan.length > 0) setSelectedDayId(plan.find(d => !d.isRestDay)?.id ?? null);

      if (eq !== 'full_gym') {
        Animated.timing(travelBannerAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      }
    } catch (e) {
      console.error('[TrainingPlan] Error loading plan:', e);
    } finally {
      setLoading(false);
    }
  };

  const selectEquipmentMode = useCallback(async (mode: EquipmentMode) => {
    console.log('[TrainingPlan] User selected equipment mode:', mode);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setEquipment(mode);
    setLockedSubs({});
    setOpenSwapId(null);

    await AsyncStorage.setItem(STORAGE_KEYS.EQUIPMENT_MODE, mode);

    if (mode === 'full_gym') {
      const plan = generateWeeklyPlan(goal, experience, 'full_gym');
      setBaseWeek(plan);
      setWeek(plan);
      Animated.timing(travelBannerAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    } else {
      const plan = generateWeeklyPlan(goal, experience, mode);
      setBaseWeek(generateWeeklyPlan(goal, experience, 'full_gym'));
      setWeek(plan);
      Animated.timing(travelBannerAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    }

    const todayDow = new Date().getDay();
    const newPlan = generateWeeklyPlan(goal, experience, mode);
    const todayDay = newPlan.find(d => d.dayOfWeek === todayDow && !d.isRestDay);
    if (todayDay) setSelectedDayId(todayDay.id);
  }, [goal, experience, travelBannerAnim]);

  const deactivateTravel = useCallback(() => {
    console.log('[TrainingPlan] User exited Travel Mode');
    selectEquipmentMode('full_gym');
  }, [selectEquipmentMode]);

  const openTimeModal = () => {
    console.log('[TrainingPlan] User opened Short on Time modal');
    setShowTimeModal(true);
    updateCompressed(selectedTime);
  };

  const updateCompressed = (mins: number) => {
    const day = week.find(d => d.id === selectedDayId);
    if (day && !day.isRestDay) {
      const result = compressWorkout(day, mins);
      setCompressed(result);
    }
  };

  const openMissedModal = () => {
    console.log('[TrainingPlan] User opened Missed a Session modal');
    const day = week.find(d => d.id === selectedDayId);
    if (!day) return;
    const remaining = week.filter(d => d.dayOfWeek > day.dayOfWeek && !d.isRestDay);
    const ctx: AdaptiveContext = {
      missedWorkouts: [day.id],
      equipmentMode: equipment,
      goal,
      experience,
      weeklyAdherence: 0.7,
      consecutiveMissed: 1,
    };
    const resolution = handleMissedWorkout(day, remaining, ctx);
    setMissedResolution(resolution);
    setShowMissedModal(true);
  };

  const handleStartSession = (dayId?: string) => {
    const id = dayId ?? selectedDayId;
    const day = week.find(d => d.id === id);
    if (!day || day.isRestDay) return;
    console.log('[TrainingPlan] User tapped Start Session for:', day.name);
    const legacyWorkout = {
      name: day.name,
      exercises: day.exercises.map(ex => ({
        id: ex.id,
        name: lockedSubs[ex.id] ?? ex.name,
        sets: ex.sets,
        reps: ex.reps,
        muscleGroups: [ex.muscleGroup],
        equipment: ex.equipment,
        instructions: [`Perform ${ex.sets} sets of ${ex.reps}`, `Rest ${ex.restSeconds}s between sets`],
      })),
      dayIndex: day.dayOfWeek,
    };
    AsyncStorage.setItem('selectedWorkout', JSON.stringify(legacyWorkout)).then(() => {
      router.push('/workout-session');
    });
  };

  const handleStartCompressed = () => {
    if (!compressed) return;
    console.log('[TrainingPlan] User starting compressed session:', compressed.mode);
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

  const handleLockSubstitute = (exerciseId: string, newName: string) => {
    setLockedSubs(prev => ({ ...prev, [exerciseId]: newName }));
    setOpenSwapId(null);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  };

  const selectedDay = week.find(d => d.id === selectedDayId) ?? null;
  const totalWorkouts = week.filter(d => !d.isRestDay).length;
  const completedWorkouts = week.filter(d => d.status === 'completed').length;
  const goalLabel = goal.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
  const expLabel = experience.charAt(0).toUpperCase() + experience.slice(1);
  const equipLabel = getEquipmentModeLabel(equipment);

  // Count substituted exercises in selected day
  const selectedDaySubCount = selectedDay
    ? selectedDay.exercises.filter(ex => equipment !== 'full_gym' && getSubstitutesForExercise(ex.name, equipment).length > 0).length
    : 0;

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Stack.Screen options={{ title: 'Training', headerStyle: { backgroundColor: BG }, headerTintColor: '#fff', headerShadowVisible: false }} />
        <ActivityIndicator size="large" color={TEAL} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Training',
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
        {/* ── Travel Mode Banner ── */}
        {isTravelActive && (
          <Animated.View style={[styles.travelBanner, { opacity: travelBannerAnim }]}>
            <View style={styles.travelBannerLeft}>
              <Text style={styles.travelBannerTitle}>
                {equipment === 'travel' || equipment === 'bodyweight' ? 'Travel Mode' : `${equipLabel} Mode`}
              </Text>
              <Text style={styles.travelBannerSubtitle}>
                {equipment === 'travel' || equipment === 'bodyweight'
                  ? 'Programme adapted. Bodyweight and band alternatives loaded.'
                  : `Programme adapted for ${equipLabel}. Equipment-matched exercises loaded.`}
              </Text>
            </View>
            <TouchableOpacity onPress={deactivateTravel} activeOpacity={0.7}>
              <Text style={styles.travelBannerExit}>Exit</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* ── Plan Summary Card ── */}
        <View style={styles.summaryCard}>
          <SectionHeader label="PROGRAMME" />
          <View style={styles.summaryRow}>
            <View style={styles.summaryBadge}>
              <Text style={styles.summaryBadgeText}>{goalLabel}</Text>
            </View>
            <View style={styles.summaryBadge}>
              <Text style={styles.summaryBadgeText}>{expLabel}</Text>
            </View>
            <View style={styles.summaryBadge}>
              <Text style={styles.summaryBadgeText}>{equipLabel}</Text>
            </View>
          </View>
          <View style={styles.summaryStats}>
            <View style={styles.summaryStat}>
              <Text style={styles.summaryStatValue}>{totalWorkouts}</Text>
              <Text style={styles.summaryStatLabel}>Sessions</Text>
            </View>
            <View style={styles.summaryStatDivider} />
            <View style={styles.summaryStat}>
              <Text style={styles.summaryStatValue}>{completedWorkouts}</Text>
              <Text style={styles.summaryStatLabel}>Done</Text>
            </View>
            <View style={styles.summaryStatDivider} />
            <View style={styles.summaryStat}>
              <Text style={styles.summaryStatValue}>
                {selectedDay ? `${selectedDay.estimatedDuration}m` : '—'}
              </Text>
              <Text style={styles.summaryStatLabel}>Duration</Text>
            </View>
          </View>
        </View>

        {/* ── Equipment Mode Selector ── */}
        <View style={styles.equipSection}>
          <SectionHeader label="EQUIPMENT" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.equipRow}>
            {EQUIPMENT_MODES.map(({ mode, icon_ios, icon_android }) => (
              <EquipmentModeCard
                key={mode}
                mode={mode}
                icon_ios={icon_ios}
                icon_android={icon_android}
                selected={equipment === mode}
                onPress={() => selectEquipmentMode(mode)}
              />
            ))}
          </ScrollView>
          {isTravelActive && (
            <View style={styles.substitutionBanner}>
              <IconSymbol ios_icon_name="arrow.2.squarepath" android_material_icon_name="swap-horiz" size={13} color={TEAL} />
              <Text style={styles.substitutionBannerText}>
                {selectedDaySubCount} exercise{selectedDaySubCount !== 1 ? 's' : ''} substituted for {equipLabel}.
              </Text>
            </View>
          )}
        </View>

        {/* ── Adaptive Controls ── */}
        <View style={styles.adaptiveRow}>
          <PillButton
            label="Short on Time"
            icon="clock"
            onPress={openTimeModal}
          />
          <PillButton
            label="Missed Session"
            icon="exclamationmark.circle"
            onPress={openMissedModal}
          />
        </View>

        {/* ── Weekly Calendar Strip ── */}
        <View style={styles.calendarSection}>
          <SectionHeader label="THIS WEEK" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.calendarStrip}>
            {week.map(day => {
              const isSelected = day.id === selectedDayId;
              const isToday = day.dayOfWeek === new Date().getDay();
              const dotColor = day.status === 'completed' ? TEAL : day.status === 'missed' ? ORANGE : 'transparent';
              const dotBorder = day.status === 'scheduled' && !day.isRestDay ? '#444' : 'transparent';

              return (
                <TouchableOpacity
                  key={day.id}
                  style={[
                    styles.calendarDay,
                    isSelected && styles.calendarDaySelected,
                    isToday && !isSelected && styles.calendarDayToday,
                  ]}
                  onPress={() => {
                    console.log('[TrainingPlan] User selected day:', DAY_LABELS[day.dayOfWeek], day.name);
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setSelectedDayId(day.id);
                    setOpenSwapId(null);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.calendarDayLabel, isSelected && styles.calendarDayLabelSelected]}>
                    {DAY_LABELS[day.dayOfWeek]}
                  </Text>
                  <Text style={[styles.calendarDayName, isSelected && styles.calendarDayNameSelected]} numberOfLines={1}>
                    {day.isRestDay ? 'Rest' : day.name.split(' ')[0]}
                  </Text>
                  <View style={[styles.calendarDot, { backgroundColor: dotColor, borderColor: dotBorder, borderWidth: dotBorder !== 'transparent' ? 1 : 0 }]} />
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ── Selected Day Detail ── */}
        {selectedDay && (
          <View style={styles.dayDetail}>
            <View style={styles.dayDetailHeader}>
              <View>
                <Text style={styles.dayDetailName}>{selectedDay.name}</Text>
                <Text style={styles.dayDetailMeta}>
                  {selectedDay.isRestDay
                    ? 'Recovery'
                    : `${selectedDay.exercises.length} exercises · ${selectedDay.estimatedDuration} min`}
                </Text>
              </View>
              {!selectedDay.isRestDay && (
                <TouchableOpacity
                  style={styles.compressBtn}
                  onPress={openTimeModal}
                  activeOpacity={0.7}
                >
                  <IconSymbol ios_icon_name="clock" android_material_icon_name="schedule" size={14} color={TEAL} />
                  <Text style={styles.compressBtnText}>Compress</Text>
                </TouchableOpacity>
              )}
            </View>

            {selectedDay.isRestDay ? (
              <View style={styles.restDayCard}>
                <IconSymbol ios_icon_name="bed.double.fill" android_material_icon_name="hotel" size={32} color="#444" />
                <Text style={styles.restDayText}>Rest</Text>
                <Text style={styles.restDaySubtext}>Recovery is part of the programme. Prioritise sleep and mobility.</Text>
              </View>
            ) : (
              <View style={styles.exerciseList}>
                <SectionHeader label="EXERCISES" />
                {selectedDay.exercises.map(ex => {
                  const displayName = lockedSubs[ex.id] ?? ex.name;
                  const displayEx = { ...ex, name: displayName };
                  const isSubstituted = equipment !== 'full_gym' && getSubstitutesForExercise(ex.name, equipment).length > 0;
                  return (
                    <ExerciseRow
                      key={ex.id}
                      exercise={displayEx}
                      swapOpen={openSwapId === ex.id}
                      isSubstituted={isSubstituted && !lockedSubs[ex.id]}
                      equipmentMode={equipment}
                      onSwap={() => {
                        console.log('[TrainingPlan] User tapped swap for:', ex.name);
                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                        setOpenSwapId(prev => prev === ex.id ? null : ex.id);
                      }}
                      onSelectSubstitute={(name) => handleLockSubstitute(ex.id, name)}
                    />
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* ── Program Packs ── */}
        <View style={styles.packsSection}>
          <View style={styles.packsSectionHeader}>
            <Text style={styles.packsSectionTitle}>Programmes</Text>
            <TouchableOpacity
              onPress={() => {
                console.log('[TrainingPlan] User tapped Browse all program packs');
                router.push('/program-packs' as any);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.packsBrowseLink}>Browse →</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.packsScrollContent}
          >
            {PROGRAM_PACKS.map(pack => (
              <PackCard key={pack.id} pack={pack} width={200} height={240} />
            ))}
          </ScrollView>
        </View>

        {/* ── Spacer for Start Button ── */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── Start Session Button ── */}
      {selectedDay && !selectedDay.isRestDay && (
        <View style={styles.startButtonContainer}>
          <TouchableOpacity
            style={styles.startButton}
            onPress={() => handleStartSession()}
            activeOpacity={0.7}
          >
            <IconSymbol ios_icon_name="play.fill" android_material_icon_name="play-arrow" size={20} color="#000" />
            <Text style={styles.startButtonText}>Begin Session</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Short on Time Modal ── */}
      <Modal visible={showTimeModal} transparent animationType="slide" onRequestClose={() => setShowTimeModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Short on time?</Text>
              <TouchableOpacity onPress={() => setShowTimeModal(false)} activeOpacity={0.7}>
                <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={22} color="#888" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>Available time:</Text>

            <View style={styles.timeOptions}>
              {TIME_OPTIONS.map(t => (
                <TouchableOpacity
                  key={t}
                  style={[styles.timeOption, selectedTime === t && styles.timeOptionSelected]}
                  onPress={() => {
                    console.log('[TrainingPlan] User selected time:', t, 'min');
                    setSelectedTime(t);
                    updateCompressed(t);
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
                <View style={styles.compressModeBadge}>
                  <Text style={styles.compressModeBadgeText}>{compressed.mode.toUpperCase()} MODE</Text>
                </View>
                <Text style={styles.compressExplanation}>{compressed.explanation}</Text>

                {compressed.keptExercises.length > 0 && (
                  <View style={styles.compressSection}>
                    <Text style={styles.compressSectionLabel}>KEEPING</Text>
                    {compressed.keptExercises.map((name, i) => (
                      <View key={i} style={styles.compressItem}>
                        <View style={[styles.compressItemDot, { backgroundColor: TEAL }]} />
                        <Text style={styles.compressItemText}>{name}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {compressed.cutExercises.length > 0 && (
                  <View style={styles.compressSection}>
                    <Text style={styles.compressSectionLabel}>REMOVING</Text>
                    {compressed.cutExercises.map((name, i) => (
                      <View key={i} style={styles.compressItem}>
                        <View style={[styles.compressItemDot, { backgroundColor: '#444' }]} />
                        <Text style={[styles.compressItemText, { color: '#555', textDecorationLine: 'line-through' }]}>{name}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            <TouchableOpacity style={styles.modalPrimaryBtn} onPress={handleStartCompressed} activeOpacity={0.7}>
              <Text style={styles.modalPrimaryBtnText}>Begin Compressed Session</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Missed Session Modal ── */}
      <Modal visible={showMissedModal} transparent animationType="slide" onRequestClose={() => setShowMissedModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Missed a Session?</Text>
              <TouchableOpacity onPress={() => setShowMissedModal(false)} activeOpacity={0.7}>
                <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={22} color="#888" />
              </TouchableOpacity>
            </View>

            <View style={styles.missedSupportCard}>
              <Text style={styles.missedSupportText}>
                {missedResolution?.supportMessage ?? "Here's how we adjust your programme."}
              </Text>
            </View>

            {selectedDay && !selectedDay.isRestDay && (
              <View style={styles.missedSessionInfo}>
                <Text style={styles.missedSessionLabel}>MISSED</Text>
                <Text style={styles.missedSessionName}>{selectedDay.name}</Text>
                <Text style={styles.missedSessionMeta}>{selectedDay.exercises.length} exercises · {selectedDay.estimatedDuration} min</Text>
              </View>
            )}

            {missedResolution && (
              <View style={styles.missedRecommendation}>
                <View style={styles.missedRecommendationBadge}>
                  <Text style={styles.missedRecommendationBadgeText}>
                    {missedResolution.action.replace('_', ' ').toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.missedRecommendationText}>{missedResolution.explanation}</Text>
              </View>
            )}

            <View style={styles.missedActions}>
              <TouchableOpacity
                style={styles.missedAcceptBtn}
                onPress={() => {
                  console.log('[TrainingPlan] User accepted missed workout recommendation:', missedResolution?.action);
                  setShowMissedModal(false);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.missedAcceptBtnText}>Apply</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.missedSkipBtn}
                onPress={() => {
                  console.log('[TrainingPlan] User chose to skip missed workout');
                  setShowMissedModal(false);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.missedSkipBtnText}>Skip</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  sectionHeader: {
    fontSize: 11,
    letterSpacing: 1.5,
    color: TEAL,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  // Travel Banner
  travelBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(245,158,11,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.3)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  travelBannerLeft: {
    flex: 1,
    gap: 3,
  },
  travelBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: AMBER,
  },
  travelBannerSubtitle: {
    fontSize: 12,
    color: 'rgba(245,158,11,0.7)',
    lineHeight: 17,
  },
  travelBannerExit: {
    fontSize: 12,
    color: TEAL,
    fontWeight: '700',
  },
  // Equipment Mode Selector
  equipSection: {
    marginBottom: 16,
  },
  equipRow: {
    gap: 8,
    paddingRight: 4,
  },
  equipCard: {
    width: 80,
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    paddingVertical: 12,
    paddingHorizontal: 8,
    gap: 6,
  },
  equipCardSelected: {
    borderColor: TEAL,
    backgroundColor: 'rgba(0,212,170,0.1)',
  },
  equipCardLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
    lineHeight: 13,
  },
  equipCardLabelSelected: {
    color: TEAL,
  },
  substitutionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    backgroundColor: 'rgba(0,212,170,0.08)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,212,170,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  substitutionBannerText: {
    fontSize: 12,
    color: TEAL,
    fontWeight: '500',
    flex: 1,
  },
  // Summary Card
  summaryCard: {
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    padding: 16,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  summaryBadge: {
    backgroundColor: 'rgba(0,212,170,0.12)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  summaryBadgeText: {
    fontSize: 12,
    color: TEAL,
    fontWeight: '600',
  },
  summaryStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryStat: {
    flex: 1,
    alignItems: 'center',
  },
  summaryStatValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
  },
  summaryStatLabel: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },
  summaryStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: CARD_BORDER,
  },
  // Adaptive Controls
  adaptiveRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: TEAL,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  pillActive: {
    backgroundColor: TEAL,
  },
  pillText: {
    fontSize: 12,
    color: TEAL,
    fontWeight: '600',
  },
  pillTextActive: {
    color: BG,
  },
  // Calendar
  calendarSection: {
    marginBottom: 20,
  },
  calendarStrip: {
    gap: 8,
    paddingRight: 4,
  },
  calendarDay: {
    width: 64,
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    paddingVertical: 10,
    paddingHorizontal: 6,
    gap: 4,
  },
  calendarDaySelected: {
    borderColor: TEAL,
    backgroundColor: 'rgba(0,212,170,0.1)',
  },
  calendarDayToday: {
    borderColor: 'rgba(0,212,170,0.4)',
  },
  calendarDayLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#888',
  },
  calendarDayLabelSelected: {
    color: TEAL,
  },
  calendarDayName: {
    fontSize: 10,
    color: '#555',
    textAlign: 'center',
  },
  calendarDayNameSelected: {
    color: '#fff',
  },
  calendarDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 2,
  },
  // Day Detail
  dayDetail: {
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    padding: 16,
    marginBottom: 16,
  },
  dayDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  dayDetailName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  dayDetailMeta: {
    fontSize: 13,
    color: '#888',
  },
  compressBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: TEAL,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  compressBtnText: {
    fontSize: 12,
    color: TEAL,
    fontWeight: '600',
  },
  restDayCard: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  restDayText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#555',
  },
  restDaySubtext: {
    fontSize: 13,
    color: '#444',
    textAlign: 'center',
  },
  exerciseList: {
    gap: 0,
  },
  // Exercise Row
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: CARD_BORDER,
    gap: 10,
  },
  primaryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  substitutedBadge: {
    fontSize: 10,
    color: TEAL,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 2,
    opacity: 0.7,
  },
  exerciseMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  exerciseMetaText: {
    fontSize: 12,
    color: '#888',
  },
  exerciseMetaDot: {
    fontSize: 12,
    color: '#444',
  },
  muscleTag: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  swapBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(0,212,170,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swapIcon: {
    fontSize: 16,
    color: TEAL,
  },
  swapDropdown: {
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    marginLeft: 18,
    marginBottom: 4,
    overflow: 'hidden',
  },
  swapOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: CARD_BORDER,
  },
  swapOptionText: {
    fontSize: 13,
    color: '#ccc',
    fontWeight: '500',
  },
  // Start Button
  startButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    backgroundColor: BG,
    borderTopWidth: 1,
    borderTopColor: CARD_BORDER,
  },
  startButton: {
    backgroundColor: TEAL,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  startButtonText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#000',
    letterSpacing: -0.2,
  },
  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#111',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    borderTopWidth: 1,
    borderColor: CARD_BORDER,
    maxHeight: '90%',
  },
  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#888',
    marginBottom: 16,
  },
  // Time Modal
  timeOptions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  timeOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
  },
  timeOptionSelected: {
    borderColor: TEAL,
    backgroundColor: 'rgba(0,212,170,0.1)',
  },
  timeOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
  },
  timeOptionTextSelected: {
    color: TEAL,
  },
  compressPreview: {
    backgroundColor: CARD,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    padding: 14,
    marginBottom: 16,
    gap: 10,
  },
  compressModeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,212,170,0.15)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  compressModeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: TEAL,
    letterSpacing: 1,
  },
  compressExplanation: {
    fontSize: 13,
    color: '#aaa',
    lineHeight: 18,
  },
  compressSection: {
    gap: 6,
  },
  compressSectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#555',
    letterSpacing: 1,
  },
  compressItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compressItemDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  compressItemText: {
    fontSize: 13,
    color: '#ccc',
  },
  modalPrimaryBtn: {
    backgroundColor: TEAL,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  modalPrimaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  // Missed Modal
  missedSupportCard: {
    backgroundColor: 'rgba(0,212,170,0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,212,170,0.2)',
    padding: 14,
    marginBottom: 16,
  },
  missedSupportText: {
    fontSize: 14,
    color: TEAL,
    fontWeight: '500',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  missedSessionInfo: {
    marginBottom: 16,
  },
  missedSessionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#555',
    letterSpacing: 1,
    marginBottom: 4,
  },
  missedSessionName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
  },
  missedSessionMeta: {
    fontSize: 13,
    color: '#888',
  },
  missedRecommendation: {
    backgroundColor: CARD,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    padding: 14,
    marginBottom: 20,
    gap: 8,
  },
  missedRecommendationBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,107,53,0.15)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  missedRecommendationBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: ORANGE,
    letterSpacing: 1,
  },
  missedRecommendationText: {
    fontSize: 13,
    color: '#aaa',
    lineHeight: 19,
  },
  missedActions: {
    gap: 10,
  },
  missedAcceptBtn: {
    backgroundColor: TEAL,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  missedAcceptBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  missedSkipBtn: {
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  missedSkipBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#888',
  },
  // Program Packs
  packsSection: {
    marginBottom: 16,
  },
  packsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  packsSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.2,
  },
  packsBrowseLink: {
    fontSize: 13,
    fontWeight: '600',
    color: TEAL,
  },
  packsScrollContent: {
    gap: 12,
    paddingRight: 4,
  },
});
