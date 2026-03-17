
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
import { colors } from '@/styles/commonStyles';
import {
  generateWeeklyPlan,
  compressWorkout,
  substituteEquipment,
  handleMissedWorkout,
  getAdaptiveRecommendation,
  AdaptiveWorkoutDay,
  AdaptiveExercise,
  EquipmentMode,
  GoalType,
  ExperienceLevel,
  CompressedWorkout,
  MissedWorkoutResolution,
  AdaptiveContext,
} from '@/utils/adaptiveWorkoutEngine';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const TEAL = '#00D4AA';
const ORANGE = '#FF6B35';
const BG = '#0A0A0A';
const CARD = '#161616';
const CARD_BORDER = 'rgba(255,255,255,0.06)';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
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

function ExerciseRow({
  exercise,
  onSwap,
  swapOpen,
}: {
  exercise: AdaptiveExercise;
  onSwap: () => void;
  swapOpen: boolean;
}) {
  const muscleColor = exercise.isPrimary ? TEAL : '#888';
  const restText = exercise.restSeconds >= 60
    ? `${Math.round(exercise.restSeconds / 60)}m rest`
    : `${exercise.restSeconds}s rest`;

  return (
    <View>
      <View style={styles.exerciseRow}>
        <View style={[styles.primaryDot, { backgroundColor: exercise.isPrimary ? TEAL : 'transparent', borderColor: exercise.isPrimary ? TEAL : '#444' }]} />
        <View style={styles.exerciseInfo}>
          <Text style={styles.exerciseName}>{exercise.name}</Text>
          <View style={styles.exerciseMeta}>
            <Text style={styles.exerciseMetaText}>
              {exercise.sets}×{exercise.reps}
            </Text>
            <Text style={styles.exerciseMetaDot}>·</Text>
            <Text style={styles.exerciseMetaText}>{restText}</Text>
            <Text style={styles.exerciseMetaDot}>·</Text>
            <Text style={[styles.muscleTag, { color: muscleColor }]}>{exercise.muscleGroup}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.swapBtn} onPress={onSwap} activeOpacity={0.7}>
          <Text style={styles.swapIcon}>⇄</Text>
        </TouchableOpacity>
      </View>
      {swapOpen && exercise.alternatives.length > 0 && (
        <View style={styles.swapDropdown}>
          {exercise.alternatives.map((alt, i) => (
            <TouchableOpacity
              key={i}
              style={styles.swapOption}
              onPress={() => {
                console.log('[TrainingPlan] User swapped exercise:', exercise.name, '→', alt);
                onSwap();
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
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [goal, setGoal] = useState<GoalType>('hypertrophy');
  const [experience, setExperience] = useState<ExperienceLevel>('intermediate');
  const [equipment, setEquipment] = useState<EquipmentMode>('full_gym');
  const [travelMode, setTravelMode] = useState(false);
  const [openSwapId, setOpenSwapId] = useState<string | null>(null);

  // Modals
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [showMissedModal, setShowMissedModal] = useState(false);
  const [selectedTime, setSelectedTime] = useState(35);
  const [compressed, setCompressed] = useState<CompressedWorkout | null>(null);
  const [missedResolution, setMissedResolution] = useState<MissedWorkoutResolution | null>(null);

  const travelBannerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadPlan();
  }, []);

  const loadPlan = async () => {
    console.log('[TrainingPlan] Loading plan from storage');
    try {
      const raw = await AsyncStorage.getItem('fitnessProfile');
      if (raw) {
        const profile = JSON.parse(raw);
        const g = mapGoal(profile.goal);
        const exp = mapExperience(profile.experienceLevel);
        const eq = mapEquipment(profile.equipmentType);
        setGoal(g);
        setExperience(exp);
        setEquipment(eq);
        const plan = generateWeeklyPlan(g, exp, eq);
        setWeek(plan);
        // Default select today's workout
        const todayDow = new Date().getDay();
        const todayDay = plan.find(d => d.dayOfWeek === todayDow && !d.isRestDay);
        if (todayDay) setSelectedDayId(todayDay.id);
        else if (plan.length > 0) setSelectedDayId(plan.find(d => !d.isRestDay)?.id ?? null);
      } else {
        const plan = generateWeeklyPlan('hypertrophy', 'intermediate', 'full_gym');
        setWeek(plan);
        setSelectedDayId(plan.find(d => !d.isRestDay)?.id ?? null);
      }
    } catch (e) {
      console.error('[TrainingPlan] Error loading plan:', e);
    } finally {
      setLoading(false);
    }
  };

  const activateTravel = useCallback(() => {
    console.log('[TrainingPlan] User activated Travel Mode');
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const newEquip: EquipmentMode = 'travel';
    setEquipment(newEquip);
    setTravelMode(true);
    const newWeek = week.map(day => day.isRestDay ? day : substituteEquipment(day, newEquip));
    setWeek(newWeek);
    Animated.sequence([
      Animated.timing(travelBannerAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [week, travelBannerAnim]);

  const deactivateTravel = useCallback(() => {
    console.log('[TrainingPlan] User deactivated Travel Mode');
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setTravelMode(false);
    const eq = mapEquipment(undefined);
    setEquipment(eq);
    const plan = generateWeeklyPlan(goal, experience, eq);
    setWeek(plan);
    Animated.timing(travelBannerAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
  }, [goal, experience, travelBannerAnim]);

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
    // Convert to legacy format for workout-session
    const legacyWorkout = {
      name: day.name,
      exercises: day.exercises.map(ex => ({
        id: ex.id,
        name: ex.name,
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

  const selectedDay = week.find(d => d.id === selectedDayId) ?? null;
  const totalWorkouts = week.filter(d => !d.isRestDay).length;
  const completedWorkouts = week.filter(d => d.status === 'completed').length;
  const goalLabel = goal.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
  const expLabel = experience.charAt(0).toUpperCase() + experience.slice(1);
  const equipLabel = equipment.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Stack.Screen options={{ title: 'Training Plan', headerStyle: { backgroundColor: BG }, headerTintColor: '#fff', headerShadowVisible: false }} />
        <ActivityIndicator size="large" color={TEAL} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Training Plan',
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
        {travelMode && (
          <Animated.View style={[styles.travelBanner, { opacity: travelBannerAnim }]}>
            <IconSymbol ios_icon_name="airplane" android_material_icon_name="flight" size={16} color={TEAL} />
            <Text style={styles.travelBannerText}>Travel Mode Active — Bodyweight plan loaded.</Text>
            <TouchableOpacity onPress={deactivateTravel} activeOpacity={0.7}>
              <Text style={styles.travelBannerDismiss}>Dismiss</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* ── Plan Summary Card ── */}
        <View style={styles.summaryCard}>
          <SectionHeader label="YOUR PLAN" />
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
              <Text style={styles.summaryStatLabel}>Sessions/week</Text>
            </View>
            <View style={styles.summaryStatDivider} />
            <View style={styles.summaryStat}>
              <Text style={styles.summaryStatValue}>{completedWorkouts}</Text>
              <Text style={styles.summaryStatLabel}>Completed</Text>
            </View>
            <View style={styles.summaryStatDivider} />
            <View style={styles.summaryStat}>
              <Text style={styles.summaryStatValue}>
                {selectedDay ? `${selectedDay.estimatedDuration}m` : '—'}
              </Text>
              <Text style={styles.summaryStatLabel}>Est. Duration</Text>
            </View>
          </View>
        </View>

        {/* ── Adaptive Controls ── */}
        <View style={styles.adaptiveRow}>
          <PillButton
            label="Travel Mode"
            icon="airplane"
            active={travelMode}
            onPress={travelMode ? deactivateTravel : activateTravel}
          />
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
                    ? 'Recovery & Mobility'
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
                <Text style={styles.restDayText}>Rest & Recovery</Text>
                <Text style={styles.restDaySubtext}>Mobility, hydration, and sleep are training too.</Text>
              </View>
            ) : (
              <View style={styles.exerciseList}>
                <SectionHeader label="EXERCISES" />
                {selectedDay.exercises.map(ex => (
                  <ExerciseRow
                    key={ex.id}
                    exercise={ex}
                    swapOpen={openSwapId === ex.id}
                    onSwap={() => {
                      console.log('[TrainingPlan] User tapped swap for:', ex.name);
                      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                      setOpenSwapId(prev => prev === ex.id ? null : ex.id);
                    }}
                  />
                ))}
              </View>
            )}
          </View>
        )}

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
            <Text style={styles.startButtonText}>Start Session</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Short on Time Modal ── */}
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
                    <Text style={styles.compressSectionLabel}>CUTTING</Text>
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
              <Text style={styles.modalPrimaryBtnText}>Start Compressed Session</Text>
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
                {missedResolution?.supportMessage ?? "Life happens. Here's how we keep you on track."}
              </Text>
            </View>

            {selectedDay && !selectedDay.isRestDay && (
              <View style={styles.missedSessionInfo}>
                <Text style={styles.missedSessionLabel}>MISSED SESSION</Text>
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
                <Text style={styles.missedAcceptBtnText}>Accept Recommendation</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.missedSkipBtn}
                onPress={() => {
                  console.log('[TrainingPlan] User chose to skip missed workout');
                  setShowMissedModal(false);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.missedSkipBtnText}>Skip It</Text>
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
    gap: 8,
    backgroundColor: 'rgba(0,212,170,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0,212,170,0.3)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  travelBannerText: {
    flex: 1,
    fontSize: 13,
    color: TEAL,
    fontWeight: '600',
  },
  travelBannerDismiss: {
    fontSize: 12,
    color: '#888',
    fontWeight: '600',
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
    color: '#fff',
    marginBottom: 3,
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
});
