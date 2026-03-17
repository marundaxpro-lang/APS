
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Platform,
  Animated,
  LayoutAnimation,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import {
  BookOpen,
  Brain,
  Clock,
  Zap,
  Moon,
  Apple,
  CheckCircle,
  ChevronRight,
  Coffee,
  Dumbbell,
  X,
  ChevronDown,
  ChevronUp,
  Calendar,
  BookMarked,
  Flame,
} from 'lucide-react-native';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import {
  STUDENT_WORKOUTS,
  STUDENT_NUTRITION,
  STUDY_BLOCKS,
  BRAIN_TIPS,
  StudentSession,
  StudentDayPriorities,
  StudentNutritionTemplate,
  StudyBlock,
  getRecommendedStudentWorkout,
  getDaysUntilEnd,
} from '@/utils/studentModeEngine';
import {
  getStudentSession,
  saveStudentSession,
  endStudentSession,
  getTodayPriorities,
  completePriority,
  markStudyBlockUsed,
  getUsedBlocksToday,
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
  }, []);
  return <Animated.View style={{ opacity, transform: [{ translateY }] }}>{children}</Animated.View>;
}

function StressLevelBadge({ level }: { level: StudentSession['stressLevel'] }) {
  const colorMap = { moderate: C.success, high: C.warning, extreme: C.danger };
  const bgMap = { moderate: C.successMuted, high: C.warningMuted, extreme: 'rgba(248,113,113,0.12)' };
  const labelMap = { moderate: 'Moderate', high: 'High', extreme: 'Extreme' };
  return (
    <View style={[styles.badge, { backgroundColor: bgMap[level] }]}>
      <Text style={[styles.badgeText, { color: colorMap[level] }]}>{labelMap[level]}</Text>
    </View>
  );
}

function CategoryIcon({ category }: { category: string }) {
  const size = 14;
  const icons: Record<string, React.ReactNode> = {
    workout: <Dumbbell size={size} color={C.student} />,
    nutrition: <Apple size={size} color={C.success} />,
    recovery: <Moon size={size} color="#A78BFA" />,
    study: <BookOpen size={size} color={C.warning} />,
    mindset: <Brain size={size} color="#38BDF8" />,
    sleep: <Moon size={size} color="#818CF8" />,
  };
  return <>{icons[category] || <Zap size={size} color={C.textSecondary} />}</>;
}

function TechniqueLabel({ technique }: { technique: StudyBlock['technique'] }) {
  const labelMap = { pomodoro: 'Pomodoro', deep_work: 'Deep Work', active_recall: 'Active Recall' };
  const colorMap = { pomodoro: C.warning, deep_work: C.student, active_recall: C.success };
  const bgMap = { pomodoro: C.warningMuted, deep_work: C.studentMuted, active_recall: C.successMuted };
  return (
    <View style={[styles.badge, { backgroundColor: bgMap[technique] }]}>
      <Text style={[styles.badgeText, { color: colorMap[technique] }]}>{labelMap[technique]}</Text>
    </View>
  );
}

const STRESS_OPTIONS: Array<{ value: StudentSession['stressLevel']; label: string }> = [
  { value: 'moderate', label: 'Moderate' },
  { value: 'high', label: 'High' },
  { value: 'extreme', label: 'Extreme' },
];

const STUDY_HOURS_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 4, label: '4h' },
  { value: 6, label: '6h' },
  { value: 8, label: '8h' },
  { value: 10, label: '10h+' },
];

const COST_LABELS: Record<StudentNutritionTemplate['costLevel'], string> = {
  very_low: '£',
  low: '££',
  medium: '£££',
};

const SCENARIO_LABELS: Record<StudentNutritionTemplate['scenario'], string> = {
  budget_meal: 'Budget',
  study_snack: 'Snack',
  exam_day: 'Exam Day',
  late_night: 'Late Night',
  quick_prep: 'Quick Prep',
};

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function StudentModeScreen() {
  const router = useRouter();

  const [session, setSession] = useState<StudentSession | null>(null);
  const [priorities, setPriorities] = useState<StudentDayPriorities['priorities']>([]);
  const [usedBlocks, setUsedBlocks] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [tipsExpanded, setTipsExpanded] = useState(false);
  const [saving, setSaving] = useState(false);

  // Setup form
  const [examName, setExamName] = useState('');
  const [stressLevel, setStressLevel] = useState<StudentSession['stressLevel']>('moderate');
  const [studyHours, setStudyHours] = useState(6);
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    console.log('[StudentMode] Loading session and priorities');
    try {
      const s = await getStudentSession();
      if (s) {
        setSession(s);
        const dayPriorities = await getTodayPriorities(s);
        setPriorities(dayPriorities.priorities);
        const used = await getUsedBlocksToday();
        setUsedBlocks(used);
        console.log('[StudentMode] Active session found:', s.examName, 'stress:', s.stressLevel);
      } else {
        console.log('[StudentMode] No active session');
      }
    } catch (e) {
      console.error('[StudentMode] Error loading data:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleStartSession = async () => {
    if (!examName.trim()) return;
    console.log('[StudentMode] User tapped Start student mode — exam:', examName, 'stress:', stressLevel, 'hours:', studyHours);
    setSaving(true);
    try {
      const newSession: StudentSession = {
        id: Date.now().toString(),
        startDate: new Date().toISOString(),
        endDate: endDate.trim() || null,
        examName: examName.trim(),
        stressLevel,
        isActive: true,
        studyHoursPerDay: studyHours,
      };
      await saveStudentSession(newSession);
      const dayPriorities = await getTodayPriorities(newSession);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setSession(newSession);
      setPriorities(dayPriorities.priorities);
      setUsedBlocks([]);
    } catch (e) {
      console.error('[StudentMode] Error starting session:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleEndSession = async () => {
    console.log('[StudentMode] User tapped End session');
    try {
      await endStudentSession();
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setSession(null);
      setPriorities([]);
      setUsedBlocks([]);
      setExamName('');
      setStressLevel('moderate');
      setStudyHours(6);
      setEndDate('');
    } catch (e) {
      console.error('[StudentMode] Error ending session:', e);
    }
  };

  const handleTogglePriority = async (id: string) => {
    console.log('[StudentMode] User toggled priority:', id);
    const updated = priorities.map(p => p.id === id ? { ...p, completed: !p.completed } : p);
    setPriorities(updated);
    await completePriority(id);
  };

  const handleWorkoutPress = (workoutId: string) => {
    console.log('[StudentMode] User tapped workout — navigating to student-workout:', workoutId);
    router.push(`/student-workout/${workoutId}` as any);
  };

  const handleStudyBlockPress = async (blockId: string) => {
    console.log('[StudentMode] User tapped study block:', blockId);
    if (!usedBlocks.includes(blockId)) {
      await markStudyBlockUsed(blockId);
      setUsedBlocks(prev => [...prev, blockId]);
    }
  };

  const handleTipsToggle = () => {
    console.log('[StudentMode] User toggled brain tips:', !tipsExpanded);
    setTipsExpanded(v => !v);
  };

  // Derived
  const recommendedWorkout = session ? getRecommendedStudentWorkout(session.stressLevel) : null;
  const daysUntilEnd = session ? getDaysUntilEnd(session) : null;
  const completedCount = priorities.filter(p => p.completed).length;
  const totalCount = priorities.length;
  const daysUntilEndText = daysUntilEnd !== null ? `${daysUntilEnd} day${daysUntilEnd === 1 ? '' : 's'} left` : 'Open-ended';

  if (loading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Student Mode', headerTransparent: true, headerTintColor: C.text, headerShadowVisible: false }} />
        <View style={styles.loadingContainer}>
          <BookOpen size={32} color={C.student} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Student Mode',
          headerTransparent: true,
          headerTintColor: C.text,
          headerShadowVisible: false,
        }}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        {/* ── Hero Banner ── */}
        <AnimatedItem index={0}>
          <View style={styles.heroBanner}>
            <View style={styles.heroLeft}>
              <View style={styles.heroIconCircle}>
                <BookOpen size={28} color="#fff" />
              </View>
              <View style={styles.heroText}>
                <Text style={styles.heroTitle}>Student Mode</Text>
                <Text style={styles.heroSubtitle}>
                  {session ? session.examName : 'Short workouts, smart nutrition, study support'}
                </Text>
              </View>
            </View>
            <View style={[styles.statusBadge, session ? styles.statusBadgeActive : styles.statusBadgeInactive]}>
              <Text style={styles.statusBadgeText}>{session ? 'Active' : 'Set up'}</Text>
            </View>
          </View>
        </AnimatedItem>

        {/* ── Active session card ── */}
        {session && (
          <AnimatedItem index={1}>
            <View style={styles.sessionCard}>
              <View style={styles.sessionCardHeader}>
                <View style={styles.sessionCardLeft}>
                  <BookMarked size={16} color={C.student} />
                  <Text style={styles.sessionExamName} numberOfLines={1}>{session.examName}</Text>
                </View>
                <AnimatedPressable onPress={handleEndSession} style={styles.endButton}>
                  <X size={14} color={C.danger} />
                  <Text style={styles.endButtonText}>End session</Text>
                </AnimatedPressable>
              </View>
              <View style={styles.sessionMeta}>
                <View style={styles.sessionMetaItem}>
                  <Calendar size={13} color={C.textTertiary} />
                  <Text style={styles.sessionMetaText}>{daysUntilEndText}</Text>
                </View>
                <View style={styles.sessionMetaDot} />
                <StressLevelBadge level={session.stressLevel} />
                <View style={styles.sessionMetaDot} />
                <View style={styles.sessionMetaItem}>
                  <Clock size={13} color={C.textTertiary} />
                  <Text style={styles.sessionMetaText}>{session.studyHoursPerDay}h/day</Text>
                </View>
              </View>
            </View>
          </AnimatedItem>
        )}

        {/* ── Setup card ── */}
        {!session && (
          <AnimatedItem index={1}>
            <View style={styles.setupCard}>
              <Text style={styles.setupTitle}>Start a session</Text>
              <Text style={styles.setupSubtitle}>Set your exam context for personalised workouts, nutrition, and daily priorities.</Text>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Exam / period name</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Finals week, MCAT prep"
                  placeholderTextColor={C.textTertiary}
                  value={examName}
                  onChangeText={setExamName}
                  autoCapitalize="words"
                  returnKeyType="next"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Stress level</Text>
                <View style={styles.segmentedControl}>
                  {STRESS_OPTIONS.map(opt => {
                    const isSelected = stressLevel === opt.value;
                    return (
                      <AnimatedPressable
                        key={opt.value}
                        style={[styles.segmentOption, isSelected && styles.segmentOptionSelected]}
                        onPress={() => {
                          console.log('[StudentMode] Stress level selected:', opt.value);
                          setStressLevel(opt.value);
                        }}
                      >
                        <Text style={[styles.segmentOptionText, isSelected && styles.segmentOptionTextSelected]}>
                          {opt.label}
                        </Text>
                      </AnimatedPressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Study hours per day</Text>
                <View style={styles.segmentedControl}>
                  {STUDY_HOURS_OPTIONS.map(opt => {
                    const isSelected = studyHours === opt.value;
                    return (
                      <AnimatedPressable
                        key={opt.value}
                        style={[styles.segmentOption, isSelected && styles.segmentOptionSelected]}
                        onPress={() => {
                          console.log('[StudentMode] Study hours selected:', opt.value);
                          setStudyHours(opt.value);
                        }}
                      >
                        <Text style={[styles.segmentOptionText, isSelected && styles.segmentOptionTextSelected]}>
                          {opt.label}
                        </Text>
                      </AnimatedPressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>End date (optional)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. 20 Jan 2025"
                  placeholderTextColor={C.textTertiary}
                  value={endDate}
                  onChangeText={setEndDate}
                  returnKeyType="done"
                />
              </View>

              <AnimatedPressable
                style={[styles.startButton, (!examName.trim() || saving) && styles.startButtonDisabled]}
                onPress={handleStartSession}
                disabled={!examName.trim() || saving}
              >
                <BookOpen size={18} color="#fff" />
                <Text style={styles.startButtonText}>
                  {saving ? 'Starting...' : 'Start student mode'}
                </Text>
              </AnimatedPressable>
            </View>
          </AnimatedItem>
        )}

        {/* ── Today's priorities ── */}
        {session && priorities.length > 0 && (
          <AnimatedItem index={2}>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Today's priorities</Text>
                <Text style={styles.sectionMeta}>{completedCount}/{totalCount} done</Text>
              </View>
              <View style={styles.prioritiesList}>
                {priorities.map(p => {
                  const isCompleted = p.completed;
                  return (
                    <AnimatedPressable
                      key={p.id}
                      style={[styles.priorityRow, isCompleted && styles.priorityRowCompleted]}
                      onPress={() => handleTogglePriority(p.id)}
                    >
                      <View style={[styles.priorityCheck, isCompleted && styles.priorityCheckDone]}>
                        {isCompleted && <CheckCircle size={16} color="#fff" />}
                      </View>
                      <View style={styles.priorityContent}>
                        <Text style={[styles.priorityTitle, isCompleted && styles.priorityTitleDone]} numberOfLines={2}>
                          {p.title}
                        </Text>
                        <Text style={styles.priorityTip} numberOfLines={1}>{p.tip}</Text>
                      </View>
                      <CategoryIcon category={p.category} />
                    </AnimatedPressable>
                  );
                })}
              </View>
            </View>
          </AnimatedItem>
        )}

        {/* ── Today's workout ── */}
        {session && recommendedWorkout && (
          <AnimatedItem index={3}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Today's workout</Text>
              <AnimatedPressable
                style={styles.featuredWorkoutCard}
                onPress={() => handleWorkoutPress(recommendedWorkout.id)}
              >
                <View style={styles.featuredWorkoutTop}>
                  <View style={styles.featuredWorkoutBadges}>
                    <View style={styles.typeBadge}>
                      <Text style={styles.typeBadgeText}>{recommendedWorkout.type.replace('_', ' ')}</Text>
                    </View>
                    <View style={[styles.badge, {
                      backgroundColor: recommendedWorkout.energyImpact === 'energising' ? C.successMuted :
                        recommendedWorkout.energyImpact === 'calming' ? 'rgba(56,189,248,0.12)' : 'rgba(148,163,184,0.12)',
                    }]}>
                      <Text style={[styles.badgeText, {
                        color: recommendedWorkout.energyImpact === 'energising' ? C.success :
                          recommendedWorkout.energyImpact === 'calming' ? '#38BDF8' : C.textSecondary,
                      }]}>
                        {recommendedWorkout.energyImpact}
                      </Text>
                    </View>
                  </View>
                  <ChevronRight size={20} color={C.student} />
                </View>

                <Text style={styles.featuredWorkoutTitle}>{recommendedWorkout.title}</Text>

                <View style={styles.featuredWorkoutMeta}>
                  <View style={styles.featuredWorkoutMetaItem}>
                    <Clock size={13} color={C.textSecondary} />
                    <Text style={styles.featuredWorkoutMetaText}>{recommendedWorkout.durationMinutes} min</Text>
                  </View>
                  <View style={styles.featuredWorkoutMetaItem}>
                    <Dumbbell size={13} color={C.textSecondary} />
                    <Text style={styles.featuredWorkoutMetaText}>{recommendedWorkout.exercises.length} exercises</Text>
                  </View>
                  <View style={styles.featuredWorkoutMetaItem}>
                    <Coffee size={13} color={C.textSecondary} />
                    <Text style={styles.featuredWorkoutMetaText}>{recommendedWorkout.bestTime.replace('_', ' ')}</Text>
                  </View>
                </View>

                <View style={styles.cognitiveBoostBox}>
                  <Brain size={13} color={C.student} />
                  <Text style={styles.cognitiveBoostText}>{recommendedWorkout.cognitiveBoost}</Text>
                </View>
              </AnimatedPressable>
            </View>
          </AnimatedItem>
        )}

        {/* ── Study block planner ── */}
        {session && (
          <AnimatedItem index={4}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Study block planner</Text>
              <View style={styles.studyBlocksList}>
                {STUDY_BLOCKS.map(block => {
                  const isUsed = usedBlocks.includes(block.id);
                  return (
                    <AnimatedPressable
                      key={block.id}
                      style={[styles.studyBlockCard, isUsed && styles.studyBlockCardUsed]}
                      onPress={() => handleStudyBlockPress(block.id)}
                    >
                      <View style={styles.studyBlockTop}>
                        <TechniqueLabel technique={block.technique} />
                        {isUsed && (
                          <View style={styles.usedBadge}>
                            <CheckCircle size={12} color={C.success} />
                            <Text style={styles.usedBadgeText}>Done today</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.studyBlockTitle}>{block.title}</Text>
                      <View style={styles.studyBlockMeta}>
                        <View style={styles.studyBlockMetaItem}>
                          <Clock size={12} color={C.textTertiary} />
                          <Text style={styles.studyBlockMetaText}>{block.durationMinutes} min</Text>
                        </View>
                      </View>
                      <View style={styles.studyBlockBreak}>
                        <Zap size={12} color={C.student} />
                        <Text style={styles.studyBlockBreakText}>{block.breakActivity}</Text>
                      </View>
                      {block.fitnessBreak && (
                        <View style={styles.studyBlockExercise}>
                          <Dumbbell size={11} color={C.textTertiary} />
                          <Text style={styles.studyBlockExerciseText}>
                            {block.fitnessBreak.name} — {block.fitnessBreak.sets}×{block.fitnessBreak.reps}
                          </Text>
                        </View>
                      )}
                      {!isUsed && (
                        <View style={styles.studyBlockCta}>
                          <Text style={styles.studyBlockCtaText}>Tap to start</Text>
                          <ChevronRight size={12} color={C.student} />
                        </View>
                      )}
                    </AnimatedPressable>
                  );
                })}
              </View>
            </View>
          </AnimatedItem>
        )}

        {/* ── Nutrition section ── */}
        <AnimatedItem index={5}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Student nutrition</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.nutritionScrollContent}
            >
              {STUDENT_NUTRITION.map(meal => (
                <View key={meal.id} style={styles.nutritionCard}>
                  <View style={styles.nutritionCardTop}>
                    <View style={styles.nutritionScenarioBadge}>
                      <Text style={styles.nutritionScenarioText}>{SCENARIO_LABELS[meal.scenario]}</Text>
                    </View>
                    <Text style={styles.nutritionCost}>{COST_LABELS[meal.costLevel]}</Text>
                  </View>
                  <Text style={styles.nutritionTitle}>{meal.title}</Text>
                  <View style={styles.nutritionStats}>
                    <View style={styles.nutritionStatItem}>
                      <Text style={styles.nutritionStatValue}>{meal.proteinGrams}g</Text>
                      <Text style={styles.nutritionStatLabel}>protein</Text>
                    </View>
                    <View style={styles.nutritionStatDivider} />
                    <View style={styles.nutritionStatItem}>
                      <Text style={styles.nutritionStatValue}>{meal.calories}</Text>
                      <Text style={styles.nutritionStatLabel}>kcal</Text>
                    </View>
                    <View style={styles.nutritionStatDivider} />
                    <View style={styles.nutritionStatItem}>
                      <Text style={styles.nutritionStatValue}>{meal.prepMinutes}m</Text>
                      <Text style={styles.nutritionStatLabel}>prep</Text>
                    </View>
                  </View>
                  <View style={styles.nutritionBrainBox}>
                    <Brain size={11} color={C.student} />
                    <Text style={styles.nutritionBrainText} numberOfLines={2}>{meal.brainBenefit}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </AnimatedItem>

        {/* ── All workouts ── */}
        <AnimatedItem index={6}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>All student workouts</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.workoutsScrollContent}
            >
              {STUDENT_WORKOUTS.map(workout => (
                <AnimatedPressable
                  key={workout.id}
                  style={styles.workoutCompactCard}
                  onPress={() => handleWorkoutPress(workout.id)}
                >
                  <View style={styles.workoutCompactTop}>
                    <View style={styles.typeBadge}>
                      <Text style={styles.typeBadgeText}>{workout.type.replace('_', ' ')}</Text>
                    </View>
                  </View>
                  <Text style={styles.workoutCompactTitle} numberOfLines={2}>{workout.title}</Text>
                  <View style={styles.workoutCompactMeta}>
                    <Clock size={11} color={C.textTertiary} />
                    <Text style={styles.workoutCompactMetaText}>{workout.durationMinutes} min</Text>
                  </View>
                  <View style={styles.workoutCompactMeta}>
                    <Dumbbell size={11} color={C.textTertiary} />
                    <Text style={styles.workoutCompactMetaText}>{workout.exercises.length} exercises</Text>
                  </View>
                  <View style={styles.workoutCompactFooter}>
                    <Text style={[styles.workoutCompactEnergy, {
                      color: workout.energyImpact === 'energising' ? C.success :
                        workout.energyImpact === 'calming' ? '#38BDF8' : C.textSecondary,
                    }]} numberOfLines={1}>{workout.energyImpact}</Text>
                    <ChevronRight size={12} color={C.student} />
                  </View>
                </AnimatedPressable>
              ))}
            </ScrollView>
          </View>
        </AnimatedItem>

        {/* ── Brain & body tips ── */}
        <AnimatedItem index={7}>
          <View style={styles.section}>
            <AnimatedPressable style={styles.tipsHeader} onPress={handleTipsToggle}>
              <View style={styles.tipsHeaderLeft}>
                <Flame size={18} color={C.student} />
                <Text style={styles.sectionTitle}>Brain & body tips</Text>
              </View>
              {tipsExpanded
                ? <ChevronUp size={18} color={C.textSecondary} />
                : <ChevronDown size={18} color={C.textSecondary} />
              }
            </AnimatedPressable>
            {tipsExpanded && (
              <View style={styles.tipsContent}>
                {BRAIN_TIPS.map((tip, i) => (
                  <View key={i} style={styles.tipRow}>
                    <View style={styles.tipNumber}>
                      <Text style={styles.tipNumberText}>{i + 1}</Text>
                    </View>
                    <Text style={styles.tipText}>{tip}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </AnimatedItem>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 120,
    gap: 24,
    paddingTop: Platform.OS === 'ios' ? 100 : 80,
  },
  // Hero
  heroBanner: {
    backgroundColor: C.student,
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 100,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    shadowColor: C.student,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  heroLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  heroIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroText: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.3,
    marginBottom: 3,
  },
  heroSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  statusBadgeInactive: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
  // Session card
  sessionCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.studentBorder,
    padding: 16,
    gap: 12,
  },
  sessionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sessionCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  sessionExamName: {
    fontSize: 17,
    fontWeight: '700',
    color: C.text,
    letterSpacing: -0.2,
    flex: 1,
  },
  endButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(248,113,113,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.2)',
  },
  endButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.danger,
  },
  sessionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  sessionMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  sessionMetaText: {
    fontSize: 12,
    color: C.textSecondary,
    fontWeight: '500',
  },
  sessionMetaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: C.textTertiary,
  },
  // Setup card
  setupCard: {
    backgroundColor: C.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    padding: 20,
    gap: 20,
  },
  setupTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: C.text,
    letterSpacing: -0.3,
  },
  setupSubtitle: {
    fontSize: 14,
    color: C.textSecondary,
    lineHeight: 20,
    marginTop: -12,
  },
  formGroup: {
    gap: 8,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: C.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  textInput: {
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: C.text,
    fontWeight: '500',
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 3,
    gap: 2,
  },
  segmentOption: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 10,
  },
  segmentOptionSelected: {
    backgroundColor: C.student,
  },
  segmentOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: C.textSecondary,
  },
  segmentOptionTextSelected: {
    color: '#fff',
  },
  startButton: {
    backgroundColor: C.student,
    borderRadius: 14,
    paddingVertical: 16,
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
  startButtonDisabled: {
    opacity: 0.5,
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.1,
  },
  // Section
  section: {
    gap: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: C.text,
    letterSpacing: -0.3,
  },
  sectionMeta: {
    fontSize: 13,
    fontWeight: '600',
    color: C.student,
  },
  // Priorities
  prioritiesList: {
    gap: 8,
  },
  priorityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
  },
  priorityRowCompleted: {
    opacity: 0.55,
  },
  priorityCheck: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: C.textTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  priorityCheckDone: {
    backgroundColor: C.student,
    borderColor: C.student,
  },
  priorityContent: {
    flex: 1,
    gap: 3,
  },
  priorityTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: C.text,
    lineHeight: 20,
  },
  priorityTitleDone: {
    textDecorationLine: 'line-through',
    color: C.textTertiary,
  },
  priorityTip: {
    fontSize: 12,
    color: C.textTertiary,
    lineHeight: 16,
  },
  // Featured workout
  featuredWorkoutCard: {
    backgroundColor: C.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.studentBorder,
    padding: 18,
    gap: 10,
    shadowColor: C.student,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  featuredWorkoutTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  featuredWorkoutBadges: {
    flexDirection: 'row',
    gap: 6,
  },
  featuredWorkoutTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.4,
  },
  featuredWorkoutMeta: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
  },
  featuredWorkoutMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  featuredWorkoutMetaText: {
    fontSize: 13,
    color: C.textSecondary,
    fontWeight: '500',
  },
  cognitiveBoostBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: C.studentMuted,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: C.studentBorder,
  },
  cognitiveBoostText: {
    flex: 1,
    fontSize: 12,
    color: C.textSecondary,
    lineHeight: 17,
    fontStyle: 'italic',
  },
  // Study blocks
  studyBlocksList: {
    gap: 10,
  },
  studyBlockCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    gap: 8,
  },
  studyBlockCardUsed: {
    opacity: 0.65,
    borderColor: C.studentBorder,
  },
  studyBlockTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  studyBlockTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: C.text,
    letterSpacing: -0.2,
  },
  studyBlockMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  studyBlockMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  studyBlockMetaText: {
    fontSize: 12,
    color: C.textTertiary,
    fontWeight: '500',
  },
  studyBlockBreak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  studyBlockBreakText: {
    fontSize: 13,
    color: C.student,
    fontWeight: '600',
  },
  studyBlockExercise: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  studyBlockExerciseText: {
    fontSize: 12,
    color: C.textTertiary,
    fontWeight: '500',
  },
  studyBlockCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  studyBlockCtaText: {
    fontSize: 12,
    color: C.student,
    fontWeight: '600',
  },
  usedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.successMuted,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  usedBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: C.success,
  },
  // Nutrition
  nutritionScrollContent: {
    gap: 12,
    paddingRight: 4,
  },
  nutritionCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    width: 200,
    gap: 10,
  },
  nutritionCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nutritionScenarioBadge: {
    backgroundColor: C.studentMuted,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  nutritionScenarioText: {
    fontSize: 11,
    fontWeight: '700',
    color: C.student,
    letterSpacing: 0.3,
  },
  nutritionCost: {
    fontSize: 13,
    fontWeight: '700',
    color: C.success,
  },
  nutritionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: C.text,
    letterSpacing: -0.1,
  },
  nutritionStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nutritionStatItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  nutritionStatValue: {
    fontSize: 16,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.2,
  },
  nutritionStatLabel: {
    fontSize: 10,
    color: C.textTertiary,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  nutritionStatDivider: {
    width: 1,
    height: 28,
    backgroundColor: C.border,
  },
  nutritionBrainBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: C.studentMuted,
    borderRadius: 8,
    padding: 8,
  },
  nutritionBrainText: {
    flex: 1,
    fontSize: 11,
    color: C.textSecondary,
    lineHeight: 15,
    fontStyle: 'italic',
  },
  // All workouts scroll
  workoutsScrollContent: {
    gap: 12,
    paddingRight: 4,
  },
  workoutCompactCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    width: 156,
    gap: 8,
  },
  workoutCompactTop: {
    flexDirection: 'row',
    gap: 5,
    flexWrap: 'wrap',
  },
  workoutCompactTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: C.text,
    lineHeight: 19,
  },
  workoutCompactMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  workoutCompactMetaText: {
    fontSize: 12,
    color: C.textTertiary,
    fontWeight: '500',
  },
  workoutCompactFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  workoutCompactEnergy: {
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
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
  // Tips
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
  },
  tipsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tipsContent: {
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    gap: 14,
  },
  tipRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  tipNumber: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: C.studentMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.studentBorder,
  },
  tipNumberText: {
    fontSize: 12,
    fontWeight: '800',
    color: C.student,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: C.textSecondary,
    lineHeight: 20,
    fontWeight: '500',
  },
});
