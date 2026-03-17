
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import {
  Flame,
  ChevronRight,
  Check,
  X,
  Layers,
  Apple,
  Zap,
  CheckSquare,
  Moon,
  Plane,
  BookOpen,
  BarChart2,
} from 'lucide-react-native';

// ─── Color tokens ─────────────────────────────────────────────────────────────
const C = {
  bg: '#0A0D1A',
  surface: '#12162A',
  card: '#1A1E2E',
  cardDeep: '#252A3D',
  teal: '#0D9488',
  tealLight: '#2DD4BF',
  tealMuted: 'rgba(13,148,136,0.12)',
  amber: '#F59E0B',
  amberMuted: 'rgba(245,158,11,0.12)',
  blue: '#3B82F6',
  violet: '#8B5CF6',
  red: '#EF4444',
  green: '#22C55E',
  text: '#E8EAF6',
  textSecondary: '#8B9CC8',
  textTertiary: '#4A5580',
  border: 'rgba(255,255,255,0.06)',
  divider: 'rgba(255,255,255,0.04)',
};

// ─── Mock data ────────────────────────────────────────────────────────────────
const homeData = {
  userName: 'Alex',
  streakDays: 9,
  workoutDoneToday: false,
  todayWorkout: {
    title: 'Lower Body Power',
    duration: 45,
    exerciseCount: 6,
    intensity: 'High' as const,
    dayNumber: 4,
    totalDays: 28,
  },
  nutritionToday: { proteinTarget: 180, proteinLogged: 112, calorieTarget: 2400, caloriesLogged: 1680 },
  waterToday: { targetLitres: 2.5, loggedLitres: 1.4 },
  weekScore: 74,
  weekDays: [
    { day: 'M', score: 90 },
    { day: 'T', score: 75 },
    { day: 'W', score: 60 },
    { day: 'T', score: 85 },
    { day: 'F', score: 0 },
    { day: 'S', score: 0 },
    { day: 'S', score: 0 },
  ],
  todayDayIndex: 4,
  habitsToday: { completed: 4, total: 5 },
  upcomingDays: [
    { label: 'Tomorrow', workout: 'Upper Body', duration: 50, isRest: false },
    { label: 'Sat', workout: 'Rest Day', duration: 0, isRest: true },
    { label: 'Sun', workout: 'Cardio', duration: 30, isRest: false },
  ],
  coachInsight: {
    id: '1',
    title: 'Intensity reduced for today',
    shortReason: 'Your sleep average dropped to 5.4h this week — recovery takes priority.',
    impact: 'caution' as const,
  },
  travelModeActive: false,
  travelDestination: '',
  studentModeActive: false,
  studentExamName: '',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getGreeting(hour: number, name: string): string {
  if (hour >= 5 && hour < 12) return `Good morning, ${name}`;
  if (hour >= 12 && hour < 17) return `Good afternoon, ${name}`;
  if (hour >= 17 && hour < 21) return `Good evening, ${name}`;
  return `Late session, ${name}`;
}

function getContextLine(hour: number, workoutDone: boolean): string {
  const proteinGap = homeData.nutritionToday.proteinTarget - homeData.nutritionToday.proteinLogged;
  const nutritionBehind = proteinGap > 20;
  if (hour >= 5 && hour < 12 && !workoutDone) {
    return `Leg day is waiting. You've trained 3 days straight.`;
  }
  if (hour >= 12 && hour < 17 && workoutDone) {
    return `Workout done ✓ — focus on your protein target now.`;
  }
  if (hour >= 17 && workoutDone && !nutritionBehind) {
    return `Everything's done today. Rest well.`;
  }
  if (hour >= 17 && !workoutDone) {
    return `Still time for a short session tonight.`;
  }
  return `Let's make today count.`;
}

// ─── Staggered section wrapper ────────────────────────────────────────────────
function FadeSection({ index, children }: { index: number; children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 350, delay: index * 60, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 350, delay: index * 60, useNativeDriver: true }),
    ]).start();
  }, []);
  return <Animated.View style={{ opacity, transform: [{ translateY }] }}>{children}</Animated.View>;
}

// ─── Chip ─────────────────────────────────────────────────────────────────────
function Chip({ label }: { label: string }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipText}>{label}</Text>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [insightDismissed, setInsightDismissed] = useState(false);

  const now = new Date();
  const hour = now.getHours();
  const { workoutDoneToday, todayWorkout, nutritionToday, coachInsight } = homeData;

  const greeting = getGreeting(hour, homeData.userName);
  const contextLine = getContextLine(hour, workoutDoneToday);

  // Hero card type
  const proteinGap = nutritionToday.proteinTarget - nutritionToday.proteinLogged;
  const nutritionBehind = proteinGap > 20;
  const heroType = !workoutDoneToday ? 'workout' : nutritionBehind ? 'nutrition' : 'tomorrow';

  // Remaining tasks (max 3)
  const allTasks = [
    !workoutDoneToday && { id: 'workout', label: 'Lower Body Power', detail: '45 min', color: C.teal, route: '/workout-detail/1' },
    nutritionBehind && { id: 'protein', label: 'Hit protein target', detail: `${proteinGap}g left`, color: C.amber, route: '/nutrition' },
    homeData.waterToday.loggedLitres < homeData.waterToday.targetLitres && {
      id: 'water', label: 'Hit water target',
      detail: `${(homeData.waterToday.targetLitres - homeData.waterToday.loggedLitres).toFixed(1)}L left`,
      color: C.blue, route: '/nutrition',
    },
    hour >= 17 && { id: 'stretch', label: 'Evening stretch', detail: '10 min', color: C.violet, route: '/habits' },
    hour >= 19 && { id: 'log-meals', label: "Log tomorrow's meals", detail: 'Plan ahead', color: C.textSecondary, route: '/nutrition' },
  ].filter(Boolean) as Array<{ id: string; label: string; detail: string; color: string; route: string }>;

  const remainingTasks = allTasks.slice(0, 3);
  const allDone = remainingTasks.length === 0;

  // Insight accent color
  const insightAccent = coachInsight.impact === 'caution' ? C.amber : coachInsight.impact === 'positive' ? C.teal : C.red;

  const weekScoreText = `${homeData.weekScore}%`;
  const habitsText = `${homeData.habitsToday.completed}/${homeData.habitsToday.total}`;
  const streakText = `${homeData.streakDays} days`;

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ── Header ── */}
      <FadeSection index={0}>
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>{greeting}</Text>
            <Text style={styles.contextLine}>{contextLine}</Text>
          </View>
          <AnimatedPressable
            scaleValue={0.94}
            onPress={() => {
              console.log('[Home] User tapped streak widget → navigating to /streak-detail');
              router.push('/streak-detail');
            }}
            style={styles.streakWidget}
          >
            <Flame size={16} color={C.tealLight} strokeWidth={2} />
            <Text style={styles.streakWidgetText}>{homeData.streakDays}</Text>
          </AnimatedPressable>
        </View>
      </FadeSection>

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 }]}
      >
        {/* ── 2. Hero Action Card ── */}
        <FadeSection index={1}>
          {heroType === 'workout' && (
            <AnimatedPressable
              scaleValue={0.98}
              onPress={() => {
                console.log('[Home] User tapped hero workout card → navigating to workout-detail');
                router.push('/workout-detail/1');
              }}
              style={[styles.heroCard, { backgroundImage: 'linear-gradient(135deg, #0D9488 0%, #134E4A 50%, #0A0D1A 100%)' } as any]}
            >
              <View style={styles.heroTopRow}>
                <Text style={styles.heroLabel}>TODAY'S WORKOUT</Text>
                <View style={styles.heroDayBadge}>
                  <Text style={styles.heroDayBadgeText}>Day {todayWorkout.dayNumber} of {todayWorkout.totalDays}</Text>
                </View>
              </View>
              <Text style={styles.heroTitle}>{todayWorkout.title}</Text>
              <View style={styles.heroChipsRow}>
                <Chip label={`${todayWorkout.duration} min`} />
                <Chip label={`${todayWorkout.exerciseCount} exercises`} />
                <Chip label={todayWorkout.intensity} />
              </View>
              <AnimatedPressable
                scaleValue={0.97}
                onPress={() => {
                  console.log('[Home] User tapped Start workout button → navigating to workout-detail');
                  router.push('/workout-detail/1');
                }}
                style={styles.heroButton}
              >
                <Text style={styles.heroButtonText}>Start workout →</Text>
              </AnimatedPressable>
            </AnimatedPressable>
          )}

          {heroType === 'nutrition' && (
            <AnimatedPressable
              scaleValue={0.98}
              onPress={() => {
                console.log('[Home] User tapped hero nutrition card → navigating to /nutrition');
                router.push('/nutrition');
              }}
              style={[styles.heroCard, { backgroundImage: 'linear-gradient(135deg, #92400E 0%, #1C1917 100%)' } as any]}
            >
              <Text style={[styles.heroLabel, { color: C.amber }]}>NUTRITION FOCUS</Text>
              <Text style={styles.heroTitle}>{proteinGap}g protein remaining</Text>
              <Text style={styles.heroSubtitle}>You're on track for calories — just close the protein gap.</Text>
              <AnimatedPressable
                scaleValue={0.97}
                onPress={() => {
                  console.log('[Home] User tapped Log a meal button → navigating to /nutrition');
                  router.push('/nutrition');
                }}
                style={[styles.heroButton, { backgroundColor: C.amber }]}
              >
                <Text style={styles.heroButtonText}>Log a meal →</Text>
              </AnimatedPressable>
            </AnimatedPressable>
          )}

          {heroType === 'tomorrow' && (
            <AnimatedPressable
              scaleValue={0.98}
              onPress={() => {
                console.log('[Home] User tapped hero tomorrow card → navigating to /training-plan');
                router.push('/training-plan');
              }}
              style={[styles.heroCard, { backgroundImage: 'linear-gradient(135deg, #1E3A5F 0%, #0A0D1A 100%)' } as any]}
            >
              <Text style={[styles.heroLabel, { color: C.blue }]}>TOMORROW</Text>
              <Text style={styles.heroTitle}>Upper Body Strength</Text>
              <Text style={styles.heroSubtitle}>Rest well tonight — tomorrow is a heavy session.</Text>
            </AnimatedPressable>
          )}
        </FadeSection>

        {/* ── 3. Still to do ── */}
        <FadeSection index={2}>
          {allDone ? (
            <View style={styles.allDoneRow}>
              <Check size={16} color={C.green} strokeWidth={2.5} />
              <Text style={styles.allDoneText}>All done today 🎉</Text>
            </View>
          ) : (
            <View>
              <Text style={styles.sectionHeader}>Still to do</Text>
              <View style={styles.taskList}>
                {remainingTasks.map((task, i) => (
                  <AnimatedPressable
                    key={task.id}
                    onPress={() => {
                      console.log(`[Home] User tapped task "${task.label}" → navigating to ${task.route}`);
                      router.push(task.route as any);
                    }}
                  >
                    <View style={[styles.taskRow, i < remainingTasks.length - 1 && styles.taskRowDivider]}>
                      <View style={[styles.taskDot, { backgroundColor: task.color }]} />
                      <Text style={styles.taskLabel}>{task.label}</Text>
                      <Text style={styles.taskDetail}>{task.detail}</Text>
                      <ChevronRight size={14} color={C.textTertiary} strokeWidth={2} />
                    </View>
                  </AnimatedPressable>
                ))}
              </View>
            </View>
          )}
        </FadeSection>

        {/* ── 4. Week at a glance ── */}
        <FadeSection index={3}>
          <AnimatedPressable
            onPress={() => {
              console.log('[Home] User tapped week glance → navigating to /weekly-adherence-detail');
              router.push('/weekly-adherence-detail');
            }}
            style={styles.weekGlanceCard}
          >
            <View style={styles.weekGlanceLeft}>
              <Text style={styles.weekGlanceLabel}>Week</Text>
              <View style={styles.weekDots}>
                {homeData.weekDays.map((d, i) => {
                  const isToday = i === homeData.todayDayIndex;
                  const dotColor = d.score >= 70 ? C.teal : d.score > 0 ? C.amber : C.cardDeep;
                  return (
                    <View
                      key={i}
                      style={[
                        styles.weekDot,
                        { backgroundColor: dotColor },
                        isToday && styles.weekDotToday,
                      ]}
                    />
                  );
                })}
              </View>
            </View>
            <Text style={styles.weekScore}>{weekScoreText}</Text>
            <ChevronRight size={16} color={C.textTertiary} strokeWidth={2} />
          </AnimatedPressable>
        </FadeSection>

        {/* ── 5. Coming up ── */}
        <FadeSection index={4}>
          <Text style={styles.sectionHeader}>Coming up</Text>
          <View style={styles.upcomingRow}>
            {homeData.upcomingDays.map((day, i) => (
              <AnimatedPressable
                key={i}
                scaleValue={0.96}
                onPress={() => {
                  console.log(`[Home] User tapped upcoming day "${day.label}" → navigating to /training-plan`);
                  router.push('/training-plan');
                }}
                style={[styles.upcomingCard, i === 0 && styles.upcomingCardFirst]}
              >
                <Text style={styles.upcomingDayLabel}>{day.label}</Text>
                <Text style={styles.upcomingWorkoutName} numberOfLines={2}>{day.workout}</Text>
                <View style={styles.upcomingBottom}>
                  {day.isRest ? (
                    <Moon size={12} color={C.textTertiary} strokeWidth={2} />
                  ) : (
                    <View style={styles.upcomingDurationBadge}>
                      <Text style={styles.upcomingDurationText}>{day.duration} min</Text>
                    </View>
                  )}
                </View>
              </AnimatedPressable>
            ))}
          </View>
        </FadeSection>

        {/* ── 6. Momentum strip ── */}
        <FadeSection index={5}>
          <AnimatedPressable
            onPress={() => {
              console.log('[Home] User tapped momentum strip → navigating to /streak-detail');
              router.push('/streak-detail');
            }}
            style={styles.momentumCard}
          >
            <View style={styles.momentumStat}>
              <Flame size={18} color={C.tealLight} strokeWidth={2} />
              <Text style={styles.momentumValue}>{streakText}</Text>
              <Text style={styles.momentumLabel}>CURRENT STREAK</Text>
            </View>
            <View style={styles.momentumDivider} />
            <View style={styles.momentumStat}>
              <BarChart2 size={18} color={C.tealLight} strokeWidth={2} />
              <Text style={styles.momentumValue}>{weekScoreText}</Text>
              <Text style={styles.momentumLabel}>THIS WEEK</Text>
            </View>
            <View style={styles.momentumDivider} />
            <View style={styles.momentumStat}>
              <Check size={18} color={C.tealLight} strokeWidth={2} />
              <Text style={styles.momentumValue}>{habitsText}</Text>
              <Text style={styles.momentumLabel}>TODAY'S HABITS</Text>
            </View>
          </AnimatedPressable>
        </FadeSection>

        {/* ── 7. Coach insight ── */}
        {!insightDismissed && (
          <FadeSection index={6}>
            <View style={[styles.insightCard, { borderLeftColor: insightAccent }]}>
              <View style={styles.insightTopRow}>
                <Text style={[styles.insightLabel, { color: insightAccent }]}>COACH INSIGHT</Text>
                <AnimatedPressable
                  scaleValue={0.9}
                  onPress={() => {
                    console.log('[Home] User dismissed coach insight');
                    setInsightDismissed(true);
                  }}
                  style={styles.insightDismiss}
                >
                  <X size={16} color={C.textTertiary} strokeWidth={2} />
                </AnimatedPressable>
              </View>
              <Text style={styles.insightTitle}>{coachInsight.title}</Text>
              <Text style={styles.insightReason} numberOfLines={2}>{coachInsight.shortReason}</Text>
              <AnimatedPressable
                onPress={() => {
                  console.log('[Home] User tapped See all insights → navigating to /coach-insights');
                  router.push('/coach-insights');
                }}
              >
                <Text style={styles.insightLink}>See all insights →</Text>
              </AnimatedPressable>
            </View>
          </FadeSection>
        )}

        {/* ── 8. Active mode banners ── */}
        {(homeData.travelModeActive || homeData.studentModeActive) && (
          <FadeSection index={7}>
            <View style={styles.modeBannersContainer}>
              {homeData.travelModeActive && (
                <AnimatedPressable
                  onPress={() => {
                    console.log('[Home] User tapped Travel Mode banner → navigating to /travel-mode');
                    router.push('/travel-mode');
                  }}
                  style={[styles.modeBanner, { borderColor: `${C.teal}30` }]}
                >
                  <Plane size={14} color={C.teal} strokeWidth={2} />
                  <Text style={styles.modeBannerText}>Travel Mode</Text>
                  <Text style={styles.modeBannerDetail}>{homeData.travelDestination}</Text>
                  <ChevronRight size={14} color={C.teal} strokeWidth={2} />
                </AnimatedPressable>
              )}
              {homeData.studentModeActive && (
                <AnimatedPressable
                  onPress={() => {
                    console.log('[Home] User tapped Student Mode banner → navigating to /student-mode');
                    router.push('/student-mode');
                  }}
                  style={[styles.modeBanner, { borderColor: `${C.violet}30` }]}
                >
                  <BookOpen size={14} color={C.violet} strokeWidth={2} />
                  <Text style={styles.modeBannerText}>Student Mode</Text>
                  <Text style={styles.modeBannerDetail}>{homeData.studentExamName}</Text>
                  <ChevronRight size={14} color={C.violet} strokeWidth={2} />
                </AnimatedPressable>
              )}
            </View>
          </FadeSection>
        )}

        {/* ── 9. Quick links ── */}
        <FadeSection index={8}>
          <View style={styles.quickLinksRow}>
            <AnimatedPressable
              scaleValue={0.94}
              onPress={() => {
                console.log('[Home] User tapped Programs quick link → navigating to /program-packs');
                router.push('/program-packs');
              }}
              style={styles.quickLinkButton}
            >
              <Layers size={22} color={C.teal} strokeWidth={2} />
              <Text style={styles.quickLinkLabel}>Programs</Text>
            </AnimatedPressable>

            <AnimatedPressable
              scaleValue={0.94}
              onPress={() => {
                console.log('[Home] User tapped Nutrition quick link → navigating to /nutrition');
                router.push('/nutrition');
              }}
              style={styles.quickLinkButton}
            >
              <Apple size={22} color={C.teal} strokeWidth={2} />
              <Text style={styles.quickLinkLabel}>Nutrition</Text>
            </AnimatedPressable>

            <AnimatedPressable
              scaleValue={0.94}
              onPress={() => {
                console.log('[Home] User tapped AI Coach quick link → navigating to /ai-coach');
                router.push('/ai-coach');
              }}
              style={styles.quickLinkButton}
            >
              <Zap size={22} color={C.teal} strokeWidth={2} />
              <Text style={styles.quickLinkLabel}>AI Coach</Text>
            </AnimatedPressable>

            <AnimatedPressable
              scaleValue={0.94}
              onPress={() => {
                console.log('[Home] User tapped Habits quick link → navigating to /habits');
                router.push('/habits');
              }}
              style={styles.quickLinkButton}
            >
              <CheckSquare size={22} color={C.teal} strokeWidth={2} />
              <Text style={styles.quickLinkLabel}>Habits</Text>
            </AnimatedPressable>
          </View>
        </FadeSection>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 20,
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerLeft: {
    flex: 1,
    paddingRight: 12,
  },
  greeting: {
    fontSize: 26,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  contextLine: {
    fontSize: 13,
    color: C.textSecondary,
    lineHeight: 18,
  },
  streakWidget: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: C.tealMuted,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: `${C.teal}30`,
    borderCurve: 'continuous',
  },
  streakWidgetText: {
    fontSize: 15,
    fontWeight: '700',
    color: C.tealLight,
  },
  // Hero card
  heroCard: {
    borderRadius: 20,
    padding: 20,
    minHeight: 160,
    justifyContent: 'space-between',
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  heroLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: C.tealLight,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  heroDayBadge: {
    backgroundColor: C.tealMuted,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderCurve: 'continuous',
  },
  heroDayBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: C.tealLight,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  heroSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.65)',
    lineHeight: 20,
    marginBottom: 16,
  },
  heroChipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderCurve: 'continuous',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  heroButton: {
    backgroundColor: C.teal,
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderCurve: 'continuous',
  },
  heroButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Tasks
  sectionHeader: {
    fontSize: 17,
    fontWeight: '600',
    color: C.text,
    marginBottom: 12,
  },
  taskList: {
    backgroundColor: C.card,
    borderRadius: 16,
    overflow: 'hidden',
    borderCurve: 'continuous',
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  taskRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: C.divider,
  },
  taskDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  taskLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: C.text,
  },
  taskDetail: {
    fontSize: 13,
    color: C.textSecondary,
    marginRight: 4,
  },
  allDoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(34,197,94,0.08)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.2)',
    borderCurve: 'continuous',
  },
  allDoneText: {
    fontSize: 15,
    fontWeight: '600',
    color: C.green,
  },
  // Week glance
  weekGlanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderCurve: 'continuous',
  },
  weekGlanceLeft: {
    flex: 1,
    gap: 6,
  },
  weekGlanceLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: C.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  weekDots: {
    flexDirection: 'row',
    gap: 5,
  },
  weekDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  weekDotToday: {
    borderWidth: 2,
    borderColor: C.tealLight,
  },
  weekScore: {
    fontSize: 18,
    fontWeight: '700',
    color: C.text,
  },
  // Upcoming
  upcomingRow: {
    flexDirection: 'row',
    gap: 10,
  },
  upcomingCard: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 12,
    minHeight: 88,
    justifyContent: 'space-between',
    borderCurve: 'continuous',
  },
  upcomingCardFirst: {
    borderLeftWidth: 3,
    borderLeftColor: C.teal,
  },
  upcomingDayLabel: {
    fontSize: 13,
    color: C.textSecondary,
    marginBottom: 4,
  },
  upcomingWorkoutName: {
    fontSize: 14,
    fontWeight: '600',
    color: C.text,
    lineHeight: 19,
    flex: 1,
  },
  upcomingBottom: {
    marginTop: 6,
  },
  upcomingDurationBadge: {
    backgroundColor: C.tealMuted,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    borderCurve: 'continuous',
  },
  upcomingDurationText: {
    fontSize: 11,
    fontWeight: '600',
    color: C.tealLight,
  },
  // Momentum
  momentumCard: {
    flexDirection: 'row',
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderCurve: 'continuous',
  },
  momentumStat: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  momentumDivider: {
    width: 1,
    height: 36,
    backgroundColor: C.border,
  },
  momentumValue: {
    fontSize: 20,
    fontWeight: '700',
    color: C.text,
    letterSpacing: -0.3,
  },
  momentumLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: C.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  // Insight
  insightCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 3,
    borderCurve: 'continuous',
  },
  insightTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  insightLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  insightDismiss: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -12,
    marginTop: -12,
  },
  insightTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: C.text,
    marginBottom: 6,
  },
  insightReason: {
    fontSize: 13,
    color: C.textSecondary,
    lineHeight: 19,
    marginBottom: 10,
  },
  insightLink: {
    fontSize: 13,
    fontWeight: '600',
    color: C.tealLight,
    textAlign: 'right',
  },
  // Mode banners
  modeBannersContainer: {
    gap: 8,
  },
  modeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 48,
    backgroundColor: C.card,
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderCurve: 'continuous',
  },
  modeBannerText: {
    fontSize: 14,
    fontWeight: '600',
    color: C.text,
  },
  modeBannerDetail: {
    flex: 1,
    fontSize: 13,
    color: C.textSecondary,
  },
  // Quick links
  quickLinksRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  quickLinkButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: C.card,
    borderRadius: 12,
    paddingVertical: 12,
    borderCurve: 'continuous',
  },
  quickLinkLabel: {
    fontSize: 11,
    color: C.textSecondary,
    fontWeight: '500',
  },
});
