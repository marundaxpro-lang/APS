
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { useAuth } from '@/contexts/AuthContext';
import { AppTour, shouldShowTour } from '@/components/AppTour';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Bell,
  Flame,
  Clock,
  Dumbbell,
  Zap,
  ChevronRight,
  BarChart2,
  CheckCircle,
  Moon,
  Heart,
  Sparkles,
  Droplets,
  Footprints,
  Layers,
  Apple,
  CheckSquare,
} from 'lucide-react-native';

const C = {
  bg: '#0A0A0F',
  surface: '#13131A',
  surface2: '#1C1C26',
  surface3: '#16161F',
  teal: '#00D4AA',
  tealMuted: 'rgba(0,212,170,0.09)',
  tealBorder: 'rgba(0,212,170,0.12)',
  amber: '#F59E0B',
  amberMuted: 'rgba(245,158,11,0.12)',
  blue: '#4A9EFF',
  blueMuted: 'rgba(74,158,255,0.12)',
  text: '#F0F0F5',
  textSecondary: '#8A8A9A',
  textTertiary: '#4A4A5A',
  border: 'rgba(255,255,255,0.06)',
  divider: 'rgba(255,255,255,0.05)',
  green: '#22C55E',
};

const homeData = {
  streakDays: 7,
  weeklyWorkouts: { done: 4, total: 5 },
  habitsToday: { completed: 3, total: 4 },
  todayWorkout: {
    title: 'Upper Body Power',
    duration: 52,
    exerciseCount: 8,
    intensity: 'Intense',
    calories: 420,
  },
  nutritionToday: { proteinTarget: 180, proteinLogged: 138 },
  waterToday: { targetLitres: 2.5, loggedLitres: 1.7 },
  coachInsight: {
    title: 'Increase rest between sets',
    reason: 'Your heart rate data shows incomplete recovery. Adding 15–20s rest will improve output on your next session.',
  },
  upcomingDays: [
    { label: 'Tomorrow', name: 'Push Day', duration: 45, isRest: false, type: 'strength' },
    { label: 'Wed', name: 'Cardio', duration: 30, isRest: false, type: 'cardio' },
    { label: 'Thu', name: 'Recovery', duration: 0, isRest: true, type: 'rest' },
    { label: 'Fri', name: 'Leg Day', duration: 55, isRest: false, type: 'strength' },
  ],
  programs: [
    { id: '1', title: 'Strength Builder', subtitle: '12-week progressive overload program', weeks: 12, level: 'Intermediate' },
    { id: '2', title: 'Fat Loss Accelerator', subtitle: 'High-intensity fat burning protocol', weeks: 8, level: 'Beginner' },
    { id: '3', title: 'Muscle Hypertrophy', subtitle: 'Volume-focused muscle building', weeks: 10, level: 'Advanced' },
  ],
};

function getGreeting(hour: number): string {
  if (hour >= 5 && hour < 12) return 'Good morning,';
  if (hour >= 12 && hour < 17) return 'Good afternoon,';
  if (hour >= 17 && hour < 21) return 'Good evening,';
  return 'Late session,';
}

function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

function FadeSection({ index, children }: { index: number; children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 350, delay: index * 80, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 350, delay: index * 80, useNativeDriver: true }),
    ]).start();
  }, []);
  return <Animated.View style={{ opacity, transform: [{ translateY }] }}>{children}</Animated.View>;
}

function StatChip({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <View style={styles.statChip}>
      {icon}
      <Text style={styles.statChipText}>{value}</Text>
    </View>
  );
}

function SectionHeader({ title, badge, onSeeAll }: { title: string; badge?: string; onSeeAll?: () => void }) {
  return (
    <View style={styles.sectionHeaderRow}>
      <Text style={styles.sectionHeaderText}>{title}</Text>
      {badge !== undefined && (
        <View style={styles.sectionBadge}>
          <Text style={styles.sectionBadgeText}>{badge}</Text>
        </View>
      )}
      {onSeeAll && (
        <AnimatedPressable scaleValue={0.94} onPress={onSeeAll} style={styles.seeAllBtn}>
          <Text style={styles.seeAllText}>See all</Text>
          <ChevronRight size={13} color={C.teal} strokeWidth={2} />
        </AnimatedPressable>
      )}
    </View>
  );
}

function UpcomingCard({ day, onPress }: { day: (typeof homeData.upcomingDays)[0]; onPress: () => void }) {
  const isRest = day.isRest;
  const iconColor = isRest ? C.textTertiary : day.type === 'cardio' ? C.blue : C.teal;
  const SessionIcon = isRest ? Moon : day.type === 'cardio' ? Heart : Dumbbell;
  const durationText = isRest ? 'Recovery' : `${day.duration} min`;
  return (
    <AnimatedPressable scaleValue={0.97} onPress={onPress} style={styles.upcomingCard}>
      <Text style={styles.upcomingDayLabel}>{day.label}</Text>
      <SessionIcon size={22} color={iconColor} strokeWidth={2} />
      <Text style={[styles.upcomingSessionName, isRest && { color: C.textSecondary }]} numberOfLines={1}>{day.name}</Text>
      <Text style={styles.upcomingDuration}>{durationText}</Text>
    </AnimatedPressable>
  );
}

function ProgramCarouselCard({ program, onPress, cardWidth }: { program: (typeof homeData.programs)[0]; onPress: () => void; cardWidth: number }) {
  return (
    <AnimatedPressable scaleValue={0.98} onPress={onPress} style={[styles.programCard, { width: cardWidth }]}>
      <View style={styles.programGlow} pointerEvents="none" />
      <View style={styles.programTopRow}>
        <View style={styles.programIconCircle}>
          <Layers size={22} color={C.teal} strokeWidth={2} />
        </View>
        <View style={styles.programLevelBadge}>
          <Text style={styles.programLevelText}>{program.level}</Text>
        </View>
      </View>
      <Text style={styles.programTitle}>{program.title}</Text>
      <Text style={styles.programSubtitle} numberOfLines={2}>{program.subtitle}</Text>
      <View style={styles.programFooter}>
        <View style={styles.programStatChip}>
          <Text style={styles.programStatText}>{program.weeks} weeks</Text>
        </View>
        <AnimatedPressable scaleValue={0.95} onPress={onPress} style={styles.programStartBtn}>
          <Text style={styles.programStartBtnText}>View Program</Text>
          <ChevronRight size={13} color="#000" strokeWidth={2.5} />
        </AnimatedPressable>
      </View>
    </AnimatedPressable>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const CARD_WIDTH = SCREEN_WIDTH - 40;
  const [showTour, setShowTour] = useState(false);

  const now = new Date();
  const hour = now.getHours();
  const displayName = user?.name ? user.name.split(' ')[0] : 'Athlete';
  const initials = user?.name ? getInitials(user.name) : 'A';
  const greetingPrefix = getGreeting(hour);

  const { todayWorkout, nutritionToday, waterToday, coachInsight } = homeData;
  const proteinLeft = nutritionToday.proteinTarget - nutritionToday.proteinLogged;
  const waterLeft = waterToday.targetLitres - waterToday.loggedLitres;
  const waterLeftText = waterLeft.toFixed(1) + 'L left';
  const proteinLeftText = proteinLeft + 'g left';
  const streakNum = String(homeData.streakDays);
  const weeklyText = `${homeData.weeklyWorkouts.done}/${homeData.weeklyWorkouts.total}`;
  const habitsText = `${homeData.habitsToday.completed}/${homeData.habitsToday.total}`;
  const durationText = `${todayWorkout.duration} min`;
  const exercisesText = `${todayWorkout.exerciseCount} exercises`;
  const caloriesText = `${todayWorkout.calories} kcal`;
  const stillToDoCountStr = '3';

  useEffect(() => {
    const checkTour = async () => {
      const onboardingDone = await AsyncStorage.getItem('fitnessProfile');
      if (!onboardingDone) return;
      const show = await shouldShowTour();
      if (show) setShowTour(true);
    };
    checkTour();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 20, paddingBottom: 120 }]}
      >
        <FadeSection index={0}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerGreeting}>{greetingPrefix}</Text>
              <Text style={styles.headerName}>{displayName}</Text>
              <Text style={styles.headerSubtitle}>Ready to train?</Text>
            </View>
            <View style={styles.headerRight}>
              <AnimatedPressable scaleValue={0.9} onPress={() => { console.log('[Home] User tapped notification bell → navigating to /notifications'); router.push('/notifications'); }} style={styles.headerIconBtn} accessibilityLabel="Notifications">
                <Bell size={22} color={C.teal} strokeWidth={2} />
              </AnimatedPressable>
              <AnimatedPressable scaleValue={0.94} onPress={() => { console.log('[Home] User tapped avatar → navigating to profile tab'); router.push('/(tabs)/profile'); }} style={styles.avatarCircle} accessibilityLabel="Profile">
                <Text style={styles.avatarInitials}>{initials}</Text>
              </AnimatedPressable>
            </View>
          </View>
        </FadeSection>

        <FadeSection index={1}>
          <View style={styles.heroCard}>
            <View style={styles.heroGlow} pointerEvents="none" />
            <View style={styles.heroTopRow}>
              <Text style={styles.heroLabel}>TODAY'S WORKOUT</Text>
              <View style={styles.intensityChip}>
                <Flame size={11} color={C.amber} strokeWidth={2} />
                <Text style={styles.intensityChipText}>{todayWorkout.intensity}</Text>
              </View>
            </View>
            <Text style={styles.heroTitle}>{todayWorkout.title}</Text>
            <View style={styles.heroStatsRow}>
              <StatChip icon={<Clock size={13} color={C.textSecondary} strokeWidth={2} />} value={durationText} />
              <StatChip icon={<Dumbbell size={13} color={C.textSecondary} strokeWidth={2} />} value={exercisesText} />
              <StatChip icon={<Zap size={13} color={C.textSecondary} strokeWidth={2} />} value={caloriesText} />
            </View>
            <AnimatedPressable scaleValue={0.97} onPress={() => { console.log('[Home] User tapped Start Workout button → navigating to /workout-detail/1'); router.push('/workout-detail/1'); }} style={styles.heroButton}>
              <Text style={styles.heroButtonText}>Start Workout →</Text>
            </AnimatedPressable>
          </View>
        </FadeSection>

        <FadeSection index={2}>
          <SectionHeader title="Programs" onSeeAll={() => { console.log('[Home] User tapped See all programs → navigating to /program-packs'); router.push('/program-packs'); }} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} pagingEnabled snapToInterval={CARD_WIDTH + 12} decelerationRate="fast" contentContainerStyle={styles.programsScroll}>
            {homeData.programs.map((program) => (
              <ProgramCarouselCard key={program.id} program={program} cardWidth={CARD_WIDTH} onPress={() => { console.log('[Home] User tapped program card:', program.title); router.push('/program-packs'); }} />
            ))}
          </ScrollView>
        </FadeSection>

        <FadeSection index={3}>
          <SectionHeader title="Still to do" badge={stillToDoCountStr} />
          <View style={styles.taskCard}>
            <AnimatedPressable scaleValue={0.98} onPress={() => { console.log('[Home] User tapped "Hit protein goal" task → navigating to /nutrition'); router.push('/nutrition'); }}>
              <View style={styles.taskRow}>
                <View style={[styles.taskIconCircle, { backgroundColor: C.tealMuted }]}><Zap size={16} color={C.teal} strokeWidth={2} /></View>
                <View style={styles.taskTextGroup}><Text style={styles.taskTitle}>Nutrition</Text><Text style={styles.taskSubtitle}>Hit protein goal</Text></View>
                <Text style={[styles.taskMetric, { color: C.teal }]}>{proteinLeftText}</Text>
                <ChevronRight size={14} color={C.textTertiary} strokeWidth={2} />
              </View>
            </AnimatedPressable>
            <View style={styles.taskDivider} />
            <AnimatedPressable scaleValue={0.98} onPress={() => { console.log('[Home] User tapped "Drink water" task → navigating to /nutrition'); router.push('/nutrition'); }}>
              <View style={styles.taskRow}>
                <View style={[styles.taskIconCircle, { backgroundColor: C.blueMuted }]}><Droplets size={16} color={C.blue} strokeWidth={2} /></View>
                <View style={styles.taskTextGroup}><Text style={styles.taskTitle}>Hydration</Text><Text style={styles.taskSubtitle}>Drink water</Text></View>
                <Text style={[styles.taskMetric, { color: C.blue }]}>{waterLeftText}</Text>
                <ChevronRight size={14} color={C.textTertiary} strokeWidth={2} />
              </View>
            </AnimatedPressable>
            <View style={styles.taskDivider} />
            <AnimatedPressable scaleValue={0.98} onPress={() => { console.log('[Home] User tapped "Evening stretch" task → navigating to /habits'); router.push('/habits'); }}>
              <View style={styles.taskRow}>
                <View style={[styles.taskIconCircle, { backgroundColor: C.amberMuted }]}><Footprints size={16} color={C.amber} strokeWidth={2} /></View>
                <View style={styles.taskTextGroup}><Text style={styles.taskTitle}>Mobility</Text><Text style={styles.taskSubtitle}>Evening stretch</Text></View>
                <Text style={[styles.taskMetric, { color: C.amber }]}>10 min</Text>
                <ChevronRight size={14} color={C.textTertiary} strokeWidth={2} />
              </View>
            </AnimatedPressable>
          </View>
        </FadeSection>

        <FadeSection index={4}>
          <View style={styles.progressRow}>
            <AnimatedPressable scaleValue={0.97} onPress={() => { console.log('[Home] User tapped streak stat card → navigating to /streak-detail'); router.push('/streak-detail'); }} style={styles.statCard}>
              <Flame size={20} color={C.teal} strokeWidth={2} />
              <Text style={styles.statCardNumber}>{streakNum}</Text>
              <Text style={styles.statCardLabel}>day streak</Text>
            </AnimatedPressable>
            <AnimatedPressable scaleValue={0.97} onPress={() => { console.log('[Home] User tapped weekly stat card → navigating to /weekly-adherence-detail'); router.push('/weekly-adherence-detail'); }} style={styles.statCard}>
              <BarChart2 size={20} color={C.teal} strokeWidth={2} />
              <Text style={styles.statCardNumber}>{weeklyText}</Text>
              <Text style={styles.statCardLabel}>workouts</Text>
            </AnimatedPressable>
            <AnimatedPressable scaleValue={0.97} onPress={() => { console.log('[Home] User tapped habits stat card → navigating to /habits'); router.push('/habits'); }} style={styles.statCard}>
              <CheckCircle size={20} color={C.teal} strokeWidth={2} />
              <Text style={styles.statCardNumber}>{habitsText}</Text>
              <Text style={styles.statCardLabel}>habits done</Text>
            </AnimatedPressable>
          </View>
        </FadeSection>

        <FadeSection index={5}>
          <SectionHeader title="Coming up" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.upcomingScroll}>
            {homeData.upcomingDays.map((day, i) => (
              <UpcomingCard key={i} day={day} onPress={() => { console.log(`[Home] User tapped upcoming day "${day.label}" → navigating to /training-plan`); router.push('/training-plan'); }} />
            ))}
          </ScrollView>
        </FadeSection>

        <FadeSection index={6}>
          <AnimatedPressable scaleValue={0.98} onPress={() => { console.log('[Home] User tapped coach insight card → navigating to /coach-insights'); router.push('/coach-insights'); }} style={styles.insightCard}>
            <View style={styles.insightTopRow}>
              <Sparkles size={14} color={C.teal} strokeWidth={2} />
              <Text style={styles.insightLabel}>COACH INSIGHT</Text>
            </View>
            <Text style={styles.insightTitle}>{coachInsight.title}</Text>
            <Text style={styles.insightReason} numberOfLines={2}>{coachInsight.reason}</Text>
            <Text style={styles.insightLink}>See full analysis →</Text>
          </AnimatedPressable>
        </FadeSection>

        <FadeSection index={7}>
          <SectionHeader title="Quick Links" />
          <View style={styles.quickLinksRow}>
            <AnimatedPressable scaleValue={0.94} onPress={() => { console.log('[Home] User tapped Quick Link: Programs → navigating to /program-packs'); router.push('/program-packs'); }} style={styles.quickLinkBtn}>
              <Layers size={22} color={C.teal} strokeWidth={2} />
              <Text style={styles.quickLinkLabel}>Programs</Text>
            </AnimatedPressable>
            <AnimatedPressable scaleValue={0.94} onPress={() => { console.log('[Home] User tapped Quick Link: Nutrition → navigating to /nutrition'); router.push('/nutrition'); }} style={styles.quickLinkBtn}>
              <Apple size={22} color={C.teal} strokeWidth={2} />
              <Text style={styles.quickLinkLabel}>Nutrition</Text>
            </AnimatedPressable>
            <AnimatedPressable scaleValue={0.94} onPress={() => { console.log('[Home] User tapped Quick Link: AI Coach → navigating to /ai-coach'); router.push('/ai-coach'); }} style={styles.quickLinkBtn}>
              <Sparkles size={22} color={C.teal} strokeWidth={2} />
              <Text style={styles.quickLinkLabel}>AI Coach</Text>
            </AnimatedPressable>
            <AnimatedPressable scaleValue={0.94} onPress={() => { console.log('[Home] User tapped Quick Link: Habits → navigating to /habits'); router.push('/habits'); }} style={styles.quickLinkBtn}>
              <CheckSquare size={22} color={C.teal} strokeWidth={2} />
              <Text style={styles.quickLinkLabel}>Habits</Text>
            </AnimatedPressable>
          </View>
        </FadeSection>
      </ScrollView>

      <AppTour visible={showTour} onComplete={() => { console.log('[Home] App tour completed'); setShowTour(false); }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, gap: 20 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  headerLeft: { flex: 1, paddingRight: 12 },
  headerGreeting: { fontSize: 13, fontWeight: '500', color: C.textSecondary, marginBottom: 2 },
  headerName: { fontSize: 28, fontWeight: '800', color: C.text, letterSpacing: -0.5, lineHeight: 34 },
  headerSubtitle: { fontSize: 14, fontWeight: '500', color: C.textSecondary, marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 4 },
  headerIconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  avatarCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,212,170,0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(0,212,170,0.3)' },
  avatarInitials: { fontSize: 15, fontWeight: '700', color: C.teal, letterSpacing: 0.5 },
  heroCard: { backgroundColor: C.surface, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: C.border, overflow: 'hidden', position: 'relative', width: '100%' },
  heroGlow: { position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(0,212,170,0.07)' },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  heroLabel: { fontSize: 11, fontWeight: '700', color: C.teal, letterSpacing: 1.5, textTransform: 'uppercase' },
  intensityChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.amberMuted, borderRadius: 20, paddingHorizontal: 9, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)' },
  intensityChipText: { fontSize: 11, fontWeight: '600', color: C.amber },
  heroTitle: { fontSize: 26, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5, marginBottom: 14, lineHeight: 32 },
  heroStatsRow: { flexDirection: 'row', gap: 8, marginBottom: 18 },
  statChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.surface2, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: C.border },
  statChipText: { fontSize: 12, fontWeight: '500', color: C.textSecondary },
  heroButton: { backgroundColor: C.teal, borderRadius: 12, height: 48, alignItems: 'center', justifyContent: 'center' },
  heroButtonText: { fontSize: 15, fontWeight: '600', color: '#000000', letterSpacing: 0.2 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, width: '100%' },
  sectionHeaderText: { fontSize: 17, fontWeight: '600', color: C.text, flex: 1 },
  sectionBadge: { backgroundColor: C.tealMuted, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: C.tealBorder },
  sectionBadgeText: { fontSize: 12, fontWeight: '700', color: C.teal },
  seeAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  seeAllText: { fontSize: 13, fontWeight: '600', color: C.teal },
  programsScroll: { gap: 12, paddingRight: 4 },
  programCard: { width: CARD_WIDTH, backgroundColor: C.surface, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: C.tealBorder, overflow: 'hidden', position: 'relative', minHeight: 180, justifyContent: 'space-between' },
  programGlow: { position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(0,212,170,0.06)' },
  programTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  programIconCircle: { width: 44, height: 44, borderRadius: 12, backgroundColor: C.tealMuted, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.tealBorder },
  programLevelBadge: { backgroundColor: C.surface2, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: C.border },
  programLevelText: { fontSize: 11, fontWeight: '600', color: C.textSecondary },
  programTitle: { fontSize: 22, fontWeight: '800', color: C.text, letterSpacing: -0.4, marginBottom: 6, lineHeight: 28 },
  programSubtitle: { fontSize: 14, color: C.textSecondary, lineHeight: 20, marginBottom: 16, flex: 1 },
  programFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  programStatChip: { backgroundColor: C.surface2, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: C.border },
  programStatText: { fontSize: 12, fontWeight: '500', color: C.textSecondary },
  programStartBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.teal, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  programStartBtnText: { fontSize: 13, fontWeight: '700', color: '#000000' },
  taskCard: { backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.border, overflow: 'hidden', width: '100%' },
  taskRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  taskDivider: { height: 1, backgroundColor: C.divider, marginHorizontal: 16 },
  taskIconCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  taskTextGroup: { flex: 1, gap: 2 },
  taskTitle: { fontSize: 15, fontWeight: '500', color: C.text },
  taskSubtitle: { fontSize: 12, fontWeight: '400', color: C.textSecondary },
  taskMetric: { fontSize: 13, fontWeight: '600', marginRight: 2 },
  progressRow: { flexDirection: 'row', gap: 10, width: '100%' },
  statCard: { flex: 1, backgroundColor: C.surface, borderRadius: 14, padding: 14, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: C.tealBorder },
  statCardNumber: { fontSize: 28, fontWeight: '800', color: C.text, letterSpacing: -0.5, lineHeight: 32 },
  statCardLabel: { fontSize: 11, fontWeight: '500', color: C.textSecondary, textAlign: 'center' },
  upcomingScroll: { gap: 10, paddingRight: 4 },
  upcomingCard: { width: 120, height: 110, backgroundColor: C.surface, borderRadius: 14, padding: 14, justifyContent: 'space-between', borderWidth: 1, borderColor: C.border },
  upcomingDayLabel: { fontSize: 12, fontWeight: '500', color: C.textSecondary },
  upcomingSessionName: { fontSize: 14, fontWeight: '600', color: C.text, lineHeight: 18 },
  upcomingDuration: { fontSize: 12, fontWeight: '400', color: C.textSecondary },
  quickLinksRow: { flexDirection: 'row', gap: 10, width: '100%' },
  quickLinkBtn: { flex: 1, backgroundColor: C.surface, borderRadius: 14, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1, borderColor: C.tealBorder },
  quickLinkLabel: { fontSize: 11, fontWeight: '600', color: C.textSecondary, textAlign: 'center' },
  insightCard: { backgroundColor: C.surface3, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.border, borderLeftWidth: 3, borderLeftColor: C.teal, width: '100%' },
  insightTopRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  insightLabel: { fontSize: 10, fontWeight: '700', color: C.teal, letterSpacing: 1.2, textTransform: 'uppercase' },
  insightTitle: { fontSize: 16, fontWeight: '600', color: C.text, marginBottom: 6 },
  insightReason: { fontSize: 13, color: C.textSecondary, lineHeight: 19, marginBottom: 12 },
  insightLink: { fontSize: 13, fontWeight: '500', color: C.teal },
});
