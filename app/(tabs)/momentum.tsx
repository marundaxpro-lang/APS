
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  Animated,
  LayoutAnimation,
  UIManager,
  Modal,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { useAuth } from '@/contexts/AuthContext';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TEAL = '#00D4AA';
const TEAL_DIM = 'rgba(0,212,170,0.12)';
const TEAL_GLOW = 'rgba(0,212,170,0.22)';
const TEAL_BORDER = 'rgba(0,212,170,0.3)';
const CARD_BG = '#161616';
const CARD_BG_ALT = '#1A1A1A';
const CARD_BORDER = 'rgba(255,255,255,0.06)';
const TEXT_PRIMARY = '#F5F5F5';
const TEXT_SECONDARY = '#888';
const TEXT_MUTED = 'rgba(255,255,255,0.3)';
const SCREEN_BG = '#0A0A0A';

// ─── Types ────────────────────────────────────────────────────────────────────

type PriorityCategory = 'Training' | 'Nutrition' | 'Recovery' | 'Habits';

interface PriorityItem {
  id: string;
  title: string;
  subtitle: string;
  category: PriorityCategory;
  navigateTo?: '/(tabs)/training' | '/(tabs)/nutrition';
  completed: boolean;
}

interface WeekDay {
  label: string;
  fullLabel: string;
  status: 'full' | 'partial' | 'missed' | 'today';
  isToday: boolean;
}

interface TimerPreset {
  id: string;
  name: string;
  minutes: number | null;
  description: string;
  contextLine: string;
}

interface HabitItem {
  id: string;
  icon_ios: string;
  icon_android: string;
  name: string;
  completed: boolean;
}

// ─── Category dot colors ──────────────────────────────────────────────────────

const CATEGORY_DOTS: Record<PriorityCategory, string> = {
  Training: TEAL,
  Nutrition: '#f59e0b',
  Recovery: '#a78bfa',
  Habits: '#60a5fa',
};

// ─── Static data ──────────────────────────────────────────────────────────────

const TIMER_PRESETS: TimerPreset[] = [
  { id: 'quick-reset', name: 'Quick Reset', minutes: 5, description: 'Clear your head. Reset between tasks.', contextLine: 'Clearing the slate.' },
  { id: 'recovery-reset', name: 'Recovery Reset', minutes: 10, description: 'Active rest. Let your system rebuild.', contextLine: 'System rebuilding.' },
  { id: 'wind-down', name: 'Wind Down', minutes: 15, description: 'Decompress. Prepare your body for recovery.', contextLine: 'Preparing for recovery.' },
  { id: 'meal-prep', name: 'Meal Prep Focus', minutes: 20, description: 'Prep with intention. Fuel your performance.', contextLine: 'Fueling performance.' },
  { id: 'study-sprint', name: 'Study Sprint', minutes: 25, description: 'Lock in. Execute without distraction.', contextLine: 'Locked in.' },
  { id: 'deep-work', name: 'Deep Work Block', minutes: 50, description: 'Full immersion. Your best output.', contextLine: 'Full immersion. Executing.' },
  { id: 'custom', name: 'Custom Session', minutes: null, description: 'Set your own duration. Own your time.', contextLine: 'Your session. Your rules.' },
];

const INITIAL_PRIORITIES: PriorityItem[] = [
  { id: '1', title: 'Complete upper body session', subtitle: 'Push day · 45 min · 6 exercises', category: 'Training', navigateTo: '/(tabs)/training', completed: false },
  { id: '2', title: 'Hit protein target', subtitle: '160g goal · 42g logged so far', category: 'Nutrition', navigateTo: '/(tabs)/nutrition', completed: false },
  { id: '3', title: '10 min mobility work', subtitle: 'Hip flexors + thoracic spine', category: 'Recovery', completed: false },
  { id: '4', title: 'Log meals before 8pm', subtitle: 'Dinner + evening snack pending', category: 'Nutrition', navigateTo: '/(tabs)/nutrition', completed: true },
  { id: '5', title: 'Evening wind-down routine', subtitle: 'No screens 1hr before bed', category: 'Habits', completed: false },
];

const WEEK_DAYS: WeekDay[] = [
  { label: 'M', fullLabel: 'Mon', status: 'full', isToday: false },
  { label: 'T', fullLabel: 'Tue', status: 'full', isToday: false },
  { label: 'W', fullLabel: 'Wed', status: 'full', isToday: false },
  { label: 'T', fullLabel: 'Thu', status: 'partial', isToday: false },
  { label: 'F', fullLabel: 'Fri', status: 'today', isToday: true },
  { label: 'S', fullLabel: 'Sat', status: 'missed', isToday: false },
  { label: 'S', fullLabel: 'Sun', status: 'missed', isToday: false },
];

const INITIAL_HABITS: HabitItem[] = [
  { id: 'h1', icon_ios: 'drop.fill', icon_android: 'water-drop', name: 'Morning hydration', completed: true },
  { id: 'h2', icon_ios: 'figure.flexibility', icon_android: 'self-improvement', name: 'Evening stretch', completed: false },
  { id: 'h3', icon_ios: 'moon.fill', icon_android: 'bedtime', name: 'No screens 1hr before bed', completed: false },
  { id: 'h4', icon_ios: 'fork.knife', icon_android: 'restaurant', name: 'Meal prep logged', completed: true },
];

const STREAK = 14;
const WEEKLY_ADHERENCE = 71;
const SESSIONS_THIS_WEEK = 3;
const WEEKLY_GOAL_DAYS = 7;
const COMPLETED_DAYS = 4;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function getTodayDate(): string {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

// ─── Animated list item ───────────────────────────────────────────────────────

function AnimatedListItem({ index, children }: { index: number; children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(14)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 350, delay: index * 55, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 350, delay: index * 55, useNativeDriver: true }),
    ]).start();
  }, [index, opacity, translateY]);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

// ─── Progress Arc ─────────────────────────────────────────────────────────────

function ProgressArc({ progress, size = 180 }: { progress: number; size?: number }) {
  const animatedProgress = useRef(new Animated.Value(progress)).current;

  useEffect(() => {
    Animated.timing(animatedProgress, { toValue: progress, duration: 600, useNativeDriver: false }).start();
  }, [progress, animatedProgress]);

  const strokeWidth = 6;
  const leftRotation = animatedProgress.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['0deg', '180deg', '180deg'] });
  const rightRotation = animatedProgress.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['0deg', '0deg', '180deg'] });
  const leftOpacity = animatedProgress.interpolate({ inputRange: [0, 0.01, 1], outputRange: [0, 1, 1] });
  const half = size / 2;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: strokeWidth, borderColor: TEAL_DIM }} />
      <View style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, overflow: 'hidden' }}>
        <Animated.View style={{ position: 'absolute', width: half, height: size, left: half, overflow: 'hidden', transformOrigin: 'left center', transform: [{ rotate: rightRotation }] }}>
          <View style={{ position: 'absolute', width: size, height: size, right: 0, borderRadius: size / 2, borderWidth: strokeWidth, borderColor: TEAL }} />
        </Animated.View>
      </View>
      <View style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, overflow: 'hidden' }}>
        <Animated.View style={{ position: 'absolute', width: half, height: size, left: 0, overflow: 'hidden', transformOrigin: 'right center', transform: [{ rotate: leftRotation }], opacity: leftOpacity }}>
          <View style={{ position: 'absolute', width: size, height: size, left: 0, borderRadius: size / 2, borderWidth: strokeWidth, borderColor: TEAL }} />
        </Animated.View>
      </View>
    </View>
  );
}

// ─── Timer Presets Modal ──────────────────────────────────────────────────────

function TimerPresetsModal({ visible, selectedId, onSelect, onClose }: {
  visible: boolean;
  selectedId: string | null;
  onSelect: (preset: TimerPreset) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={modalStyles.overlay} onPress={onClose}>
        <Pressable style={modalStyles.sheet} onPress={() => {}}>
          <View style={modalStyles.handle} />
          <View style={modalStyles.header}>
            <View>
              <Text style={modalStyles.headerTitle}>Start a Session</Text>
              <Text style={modalStyles.headerSubtitle}>Choose your focus mode</Text>
            </View>
            <AnimatedPressable onPress={onClose} style={modalStyles.closeBtn}>
              <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={16} color={TEXT_MUTED} />
            </AnimatedPressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={modalStyles.list}>
            {TIMER_PRESETS.map((preset) => {
              const isSelected = selectedId === preset.id;
              const durationLabel = preset.minutes ? `${preset.minutes} min` : 'Custom';
              return (
                <AnimatedPressable
                  key={preset.id}
                  style={[modalStyles.presetCard, isSelected && modalStyles.presetCardSelected]}
                  onPress={() => {
                    console.log('[Momentum] User selected timer preset:', preset.name, preset.minutes ? `${preset.minutes}min` : 'custom');
                    onSelect(preset);
                  }}
                >
                  <View style={modalStyles.presetLeft}>
                    <Text style={modalStyles.presetName}>{preset.name}</Text>
                    <Text style={modalStyles.presetDesc}>{preset.description}</Text>
                  </View>
                  <View style={modalStyles.presetRight}>
                    <Text style={[modalStyles.presetDuration, isSelected && { color: TEAL }]}>{durationLabel}</Text>
                    {isSelected && <View style={modalStyles.selectedDot} />}
                  </View>
                </AnimatedPressable>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#111', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: Platform.OS === 'ios' ? 40 : 24, borderTopWidth: 1, borderColor: CARD_BORDER, maxHeight: '85%' },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.18)', alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 16, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: CARD_BORDER },
  headerTitle: { fontSize: 22, fontWeight: '700', color: TEXT_PRIMARY, letterSpacing: -0.3, marginBottom: 3 },
  headerSubtitle: { fontSize: 13, color: TEXT_MUTED },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.07)', alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  list: { paddingHorizontal: 20, paddingTop: 16, gap: 10, paddingBottom: 8 },
  presetCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: CARD_BORDER },
  presetCardSelected: { backgroundColor: TEAL_GLOW, borderColor: TEAL },
  presetLeft: { flex: 1, marginRight: 12 },
  presetName: { fontSize: 15, fontWeight: '600', color: TEXT_PRIMARY, marginBottom: 4 },
  presetDesc: { fontSize: 12, color: TEXT_MUTED, lineHeight: 17 },
  presetRight: { alignItems: 'flex-end', gap: 6 },
  presetDuration: { fontSize: 15, fontWeight: '700', color: TEXT_SECONDARY, letterSpacing: -0.2 },
  selectedDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: TEAL },
});

// ─── Active Timer Card ────────────────────────────────────────────────────────

function ActiveTimerCard({ preset, secondsLeft, totalSeconds, isRunning, sessionCount, onBegin, onHold, onEnd }: {
  preset: TimerPreset;
  secondsLeft: number;
  totalSeconds: number;
  isRunning: boolean;
  sessionCount: number;
  onBegin: () => void;
  onHold: () => void;
  onEnd: () => void;
}) {
  const progress = totalSeconds > 0 ? 1 - secondsLeft / totalSeconds : 0;
  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const minsStr = String(mins).padStart(2, '0');
  const secsStr = String(secs).padStart(2, '0');
  const sessionLabel = sessionCount === 0 ? 'First session today — build the streak.' : `Session ${sessionCount} of today`;
  const isCustom = preset.id === 'custom';

  return (
    <View style={timerStyles.card}>
      <View style={timerStyles.accentBar} />
      <View style={timerStyles.inner}>
        <View style={timerStyles.sessionHeader}>
          <Text style={timerStyles.sessionName}>{preset.name}</Text>
          <Text style={timerStyles.contextLine}>{preset.contextLine}</Text>
        </View>
        <View style={timerStyles.arcWrapper}>
          <ProgressArc progress={progress} size={180} />
          <View style={timerStyles.countdownOverlay}>
            <View style={timerStyles.countdownRow}>
              <Text style={timerStyles.countdownMins}>{minsStr}</Text>
              <Text style={timerStyles.countdownColon}>:</Text>
              <Text style={timerStyles.countdownSecs}>{secsStr}</Text>
            </View>
            {isCustom && <Text style={timerStyles.customLabel}>custom</Text>}
          </View>
        </View>
        <View style={timerStyles.actions}>
          {!isRunning ? (
            <AnimatedPressable style={timerStyles.btnPrimary} onPress={() => { console.log('[Momentum] User pressed Begin Session:', preset.name); onBegin(); }}>
              <IconSymbol ios_icon_name="play.fill" android_material_icon_name="play-arrow" size={16} color="#fff" />
              <Text style={timerStyles.btnPrimaryText}>Begin Session</Text>
            </AnimatedPressable>
          ) : (
            <AnimatedPressable style={timerStyles.btnSecondary} onPress={() => { console.log('[Momentum] User pressed Hold:', preset.name); onHold(); }}>
              <IconSymbol ios_icon_name="pause.fill" android_material_icon_name="pause" size={16} color={TEAL} />
              <Text style={timerStyles.btnSecondaryText}>Hold</Text>
            </AnimatedPressable>
          )}
          <AnimatedPressable style={timerStyles.btnGhost} onPress={() => { console.log('[Momentum] User pressed End Session:', preset.name); onEnd(); }}>
            <Text style={timerStyles.btnGhostText}>End Session</Text>
          </AnimatedPressable>
        </View>
        <View style={timerStyles.sessionFooter}>
          <IconSymbol ios_icon_name="flame.fill" android_material_icon_name="local-fire-department" size={13} color={sessionCount > 0 ? '#f59e0b' : TEXT_MUTED} />
          <Text style={timerStyles.sessionCountText}>{sessionLabel}</Text>
        </View>
      </View>
    </View>
  );
}

const timerStyles = StyleSheet.create({
  card: { flexDirection: 'row', backgroundColor: CARD_BG, borderRadius: 18, borderWidth: 1, borderColor: CARD_BORDER, overflow: 'hidden', marginBottom: 4 },
  accentBar: { width: 3, backgroundColor: TEAL },
  inner: { flex: 1, padding: 20, alignItems: 'center', gap: 16 },
  sessionHeader: { alignItems: 'center', gap: 4 },
  sessionName: { fontSize: 11, fontWeight: '700', color: TEAL, letterSpacing: 1.5, textTransform: 'uppercase' },
  contextLine: { fontSize: 13, color: TEXT_MUTED, fontStyle: 'italic' },
  arcWrapper: { width: 180, height: 180, alignItems: 'center', justifyContent: 'center' },
  countdownOverlay: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  countdownRow: { flexDirection: 'row', alignItems: 'flex-end' },
  countdownMins: { fontSize: 52, fontWeight: '800', color: TEXT_PRIMARY, letterSpacing: -2, lineHeight: 58 },
  countdownColon: { fontSize: 40, fontWeight: '800', color: TEXT_MUTED, marginBottom: 4, lineHeight: 52 },
  countdownSecs: { fontSize: 52, fontWeight: '800', color: TEXT_PRIMARY, letterSpacing: -2, lineHeight: 58 },
  customLabel: { fontSize: 11, color: TEXT_MUTED, letterSpacing: 0.5, marginTop: 2 },
  actions: { width: '100%', gap: 10 },
  btnPrimary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: TEAL, borderRadius: 14, paddingVertical: 14 },
  btnPrimaryText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  btnSecondary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: TEAL_DIM, borderRadius: 14, paddingVertical: 14, borderWidth: 1, borderColor: TEAL_BORDER },
  btnSecondaryText: { fontSize: 15, fontWeight: '700', color: TEAL },
  btnGhost: { alignItems: 'center', justifyContent: 'center', paddingVertical: 10 },
  btnGhostText: { fontSize: 14, color: TEXT_MUTED, fontWeight: '500' },
  sessionFooter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sessionCountText: { fontSize: 12, color: TEXT_MUTED },
});

// ─── Empty State ──────────────────────────────────────────────────────────────

function MomentumEmptyState({ isSignedIn, onSyncPress, onTrainingPress, onNutritionPress }: {
  isSignedIn: boolean;
  onSyncPress: () => void;
  onTrainingPress: () => void;
  onNutritionPress: () => void;
}) {
  if (isSignedIn) {
    return (
      <View style={emptyStyles.container}>
        <View style={emptyStyles.iconCircle}>
          <IconSymbol ios_icon_name="checkmark.circle" android_material_icon_name="check-circle-outline" size={32} color={TEAL} />
        </View>
        <Text style={emptyStyles.headline}>No priorities set for today.</Text>
        <Text style={emptyStyles.body}>Your execution plan updates based on your training and nutrition activity. Complete a workout or log a meal to generate today's priorities.</Text>
        <View style={emptyStyles.ctaRow}>
          <AnimatedPressable style={emptyStyles.ctaBtn} onPress={() => { console.log('[Momentum] Empty state: User tapped Go to Training'); onTrainingPress(); }}>
            <Text style={emptyStyles.ctaBtnText}>Go to Training</Text>
          </AnimatedPressable>
          <AnimatedPressable style={emptyStyles.ctaBtn} onPress={() => { console.log('[Momentum] Empty state: User tapped Log a Meal'); onNutritionPress(); }}>
            <Text style={emptyStyles.ctaBtnText}>Log a Meal</Text>
          </AnimatedPressable>
        </View>
      </View>
    );
  }
  return (
    <View style={emptyStyles.container}>
      <View style={emptyStyles.iconCircle}>
        <IconSymbol ios_icon_name="bolt.fill" android_material_icon_name="bolt" size={32} color={TEAL} />
      </View>
      <Text style={emptyStyles.headline}>Your daily priorities will appear here.</Text>
      <Text style={emptyStyles.body}>Apex generates your daily execution plan from your training schedule, nutrition targets, and recovery status. Sign in to sync your priorities across devices.</Text>
      <AnimatedPressable style={emptyStyles.ctaPrimary} onPress={() => { console.log('[Momentum] Empty state: User tapped Sync My Plan'); onSyncPress(); }}>
        <IconSymbol ios_icon_name="arrow.triangle.2.circlepath" android_material_icon_name="sync" size={16} color="#fff" />
        <Text style={emptyStyles.ctaPrimaryText}>Sync My Plan</Text>
      </AnimatedPressable>
    </View>
  );
}

const emptyStyles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 8 },
  iconCircle: { width: 72, height: 72, borderRadius: 22, backgroundColor: TEAL_DIM, alignItems: 'center', justifyContent: 'center', marginBottom: 20, borderWidth: 1, borderColor: TEAL_BORDER },
  headline: { fontSize: 17, fontWeight: '700', color: TEXT_PRIMARY, textAlign: 'center', marginBottom: 12, letterSpacing: -0.2 },
  body: { fontSize: 14, color: TEXT_MUTED, textAlign: 'center', lineHeight: 21, marginBottom: 24, maxWidth: 320 },
  ctaPrimary: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: TEAL, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 28 },
  ctaPrimaryText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  ctaRow: { flexDirection: 'row', gap: 10 },
  ctaBtn: { flex: 1, alignItems: 'center', backgroundColor: TEAL_DIM, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 16, borderWidth: 1, borderColor: TEAL_BORDER },
  ctaBtnText: { fontSize: 14, fontWeight: '600', color: TEAL },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function MomentumScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [priorities, setPriorities] = useState<PriorityItem[]>(INITIAL_PRIORITIES);
  const [habits, setHabits] = useState<HabitItem[]>(INITIAL_HABITS);
  const [showPresetsModal, setShowPresetsModal] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<TimerPreset>(TIMER_PRESETS[3]);
  const [secondsLeft, setSecondsLeft] = useState((TIMER_PRESETS[3].minutes ?? 20) * 60);
  const [totalSeconds, setTotalSeconds] = useState((TIMER_PRESETS[3].minutes ?? 20) * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isSignedIn = !!user;
  const userName = user?.name ? user.name.split(' ')[0] : null;
  const greeting = getGreeting();
  const todayDate = getTodayDate();
  const completedCount = priorities.filter((p) => p.completed).length;
  const totalCount = priorities.length;
  const hasPriorities = priorities.length > 0;
  const sortedPriorities = [...priorities.filter((p) => !p.completed), ...priorities.filter((p) => p.completed)];
  const weeklyAdherenceStr = `${WEEKLY_ADHERENCE}%`;
  const streakStr = String(STREAK);
  const progressFraction = COMPLETED_DAYS / WEEKLY_GOAL_DAYS;
  const progressPercent = Math.round(progressFraction * 100);
  const progressPercentStr = `${progressPercent}%`;

  // Timer tick
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setIsRunning(false);
            setSessionCount((c) => c + 1);
            console.log('[Momentum] Timer completed:', selectedPreset.name);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRunning, selectedPreset.name]);

  function handleSelectPreset(preset: TimerPreset) {
    const mins = preset.minutes ?? 25;
    const secs = mins * 60;
    setSelectedPreset(preset);
    setSecondsLeft(secs);
    setTotalSeconds(secs);
    setIsRunning(false);
    setShowPresetsModal(false);
  }

  function handleBeginSession() {
    if (secondsLeft === 0) {
      const mins = selectedPreset.minutes ?? 25;
      setSecondsLeft(mins * 60);
      setTotalSeconds(mins * 60);
    }
    setIsRunning(true);
  }

  function handleHold() { setIsRunning(false); }

  function handleEndSession() {
    console.log('[Momentum] Session ended early:', selectedPreset.name);
    setIsRunning(false);
    const mins = selectedPreset.minutes ?? 25;
    setSecondsLeft(mins * 60);
    setTotalSeconds(mins * 60);
  }

  function togglePriority(id: string) {
    console.log('[Momentum] User toggled priority item:', id);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setPriorities((prev) => prev.map((p) => (p.id === id ? { ...p, completed: !p.completed } : p)));
  }

  function toggleHabit(id: string) {
    console.log('[Momentum] User toggled habit:', id);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setHabits((prev) => prev.map((h) => (h.id === id ? { ...h, completed: !h.completed } : h)));
  }

  function handlePriorityPress(item: PriorityItem) {
    console.log('[Momentum] User tapped priority item:', item.title, '→', item.navigateTo ?? 'no nav');
    if (item.navigateTo) router.push(item.navigateTo as never);
  }

  const greetingLine = userName ? `${greeting}, ${userName}.` : `${greeting}.`;
  const contextLine = STREAK > 0 ? `Day ${STREAK} of your current streak.` : `${SESSIONS_THIS_WEEK} sessions completed this week.`;

  return (
    <View style={s.container}>
      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── Section 1: Daily Header ── */}
        <View style={s.header}>
          <Text style={s.greeting}>{greetingLine}</Text>
          <Text style={s.dateText}>{todayDate}</Text>
          <Text style={s.contextText}>{contextLine}</Text>

          {/* Micro-stat pills */}
          <View style={s.pillRow}>
            <MicroPill icon_ios="figure.strengthtraining.traditional" icon_android="fitness-center" label="Workout" value="✓" valueColor={TEAL} />
            <MicroPill icon_ios="fork.knife" icon_android="restaurant" label="Nutrition" value="78%" valueColor={TEXT_PRIMARY} />
            <MicroPill icon_ios="moon.fill" icon_android="bedtime" label="Sleep" value="7h" valueColor={TEXT_PRIMARY} />
            <MicroPill icon_ios="flame.fill" icon_android="local-fire-department" label="Streak" value={`🔥${STREAK}`} valueColor="#f59e0b" />
          </View>
        </View>

        {/* ── Section 2: Today's Priorities ── */}
        <View style={s.section}>
          <Text style={s.sectionHeader}>TODAY'S PRIORITIES</Text>
          {hasPriorities ? (
            <>
              {sortedPriorities.map((item, index) => (
                <AnimatedListItem key={item.id} index={index}>
                  <PriorityCard
                    item={item}
                    onToggle={() => togglePriority(item.id)}
                    onPress={() => handlePriorityPress(item)}
                  />
                </AnimatedListItem>
              ))}
              <View style={s.priorityFooter}>
                <Text style={s.priorityFooterText}>
                  {completedCount === totalCount ? 'All priorities complete — outstanding execution.' : `${completedCount} of ${totalCount} completed`}
                </Text>
              </View>
            </>
          ) : (
            <MomentumEmptyState
              isSignedIn={isSignedIn}
              onSyncPress={() => router.push('/auth' as never)}
              onTrainingPress={() => router.push('/(tabs)/training' as never)}
              onNutritionPress={() => router.push('/(tabs)/nutrition' as never)}
            />
          )}
        </View>

        {/* ── Section 3: Focus Session ── */}
        <View style={s.section}>
          <View style={s.sectionHeaderRow}>
            <Text style={s.sectionHeader}>FOCUS SESSION</Text>
            <AnimatedPressable
              style={s.changeBtn}
              onPress={() => { console.log('[Momentum] User opened timer presets modal'); setShowPresetsModal(true); }}
            >
              <IconSymbol ios_icon_name="slider.horizontal.3" android_material_icon_name="tune" size={14} color={TEAL} />
              <Text style={s.changeBtnText}>Change</Text>
            </AnimatedPressable>
          </View>
          <ActiveTimerCard
            preset={selectedPreset}
            secondsLeft={secondsLeft}
            totalSeconds={totalSeconds}
            isRunning={isRunning}
            sessionCount={sessionCount}
            onBegin={handleBeginSession}
            onHold={handleHold}
            onEnd={handleEndSession}
          />
        </View>

        {/* ── Section 4: Consistency Layer ── */}
        <View style={s.section}>
          <Text style={s.sectionHeader}>THIS WEEK</Text>

          {/* 7-day streak row */}
          <View style={s.weekRow}>
            {WEEK_DAYS.map((day, i) => (
              <WeekDayDot key={i} day={day} />
            ))}
          </View>

          {/* Stat cards */}
          <View style={s.weekStatRow}>
            <View style={s.weekStatCard}>
              <Text style={s.weekStatValue}>{weeklyAdherenceStr}</Text>
              <Text style={s.weekStatLabel}>of your plan completed</Text>
            </View>
            <View style={s.weekStatCard}>
              <Text style={s.weekStatValue}>{streakStr}</Text>
              <Text style={s.weekStatLabel}>consecutive days</Text>
            </View>
          </View>

          {/* Weekly progress bar */}
          <View style={s.progressBarContainer}>
            <View style={s.progressBarHeader}>
              <Text style={s.progressBarLabel}>Weekly goal</Text>
              <Text style={s.progressBarValue}>{COMPLETED_DAYS}/{WEEKLY_GOAL_DAYS} days · {progressPercentStr}</Text>
            </View>
            <View style={s.progressBarTrack}>
              <View style={[s.progressBarFill, { width: progressPercentStr }]} />
            </View>
          </View>
        </View>

        {/* ── Section 5: Daily Habits ── */}
        <View style={s.section}>
          <Text style={s.sectionHeader}>DAILY HABITS</Text>
          <View style={s.habitsCard}>
            {habits.map((habit, index) => (
              <AnimatedListItem key={habit.id} index={index}>
                <HabitRow habit={habit} onToggle={() => toggleHabit(habit.id)} isLast={index === habits.length - 1} />
              </AnimatedListItem>
            ))}
          </View>
        </View>

      </ScrollView>

      <TimerPresetsModal
        visible={showPresetsModal}
        selectedId={selectedPreset.id}
        onSelect={handleSelectPreset}
        onClose={() => { console.log('[Momentum] User closed timer presets modal'); setShowPresetsModal(false); }}
      />
    </View>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MicroPill({ icon_ios, icon_android, label, value, valueColor }: {
  icon_ios: string;
  icon_android: string;
  label: string;
  value: string;
  valueColor: string;
}) {
  return (
    <View style={pillStyles.pill}>
      <IconSymbol ios_icon_name={icon_ios} android_material_icon_name={icon_android} size={13} color={TEAL} />
      <Text style={pillStyles.label}>{label}</Text>
      <Text style={[pillStyles.value, { color: valueColor }]}>{value}</Text>
    </View>
  );
}

const pillStyles = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: CARD_BG, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderColor: CARD_BORDER },
  label: { fontSize: 11, color: TEXT_SECONDARY, fontWeight: '500' },
  value: { fontSize: 12, fontWeight: '700' },
});

function PriorityCard({ item, onToggle, onPress }: { item: PriorityItem; onToggle: () => void; onPress: () => void }) {
  const dotColor = CATEGORY_DOTS[item.category];
  const isCompleted = item.completed;

  return (
    <View style={[pcStyles.card, isCompleted && pcStyles.cardDone]}>
      {/* Category dot */}
      <View style={[pcStyles.categoryDot, { backgroundColor: dotColor }]} />

      {/* Content */}
      <AnimatedPressable style={pcStyles.content} onPress={onPress}>
        <Text style={[pcStyles.title, isCompleted && pcStyles.titleDone]} numberOfLines={1}>{item.title}</Text>
        <Text style={[pcStyles.subtitle, isCompleted && pcStyles.subtitleDone]} numberOfLines={1}>{item.subtitle}</Text>
      </AnimatedPressable>

      {/* Checkbox */}
      <AnimatedPressable onPress={onToggle} style={pcStyles.checkHit} accessibilityLabel={isCompleted ? 'Mark incomplete' : 'Mark complete'}>
        <IconSymbol
          ios_icon_name={isCompleted ? 'checkmark.circle.fill' : 'circle'}
          android_material_icon_name={isCompleted ? 'check-circle' : 'radio-button-unchecked'}
          size={22}
          color={isCompleted ? TEAL : 'rgba(255,255,255,0.25)'}
        />
      </AnimatedPressable>
    </View>
  );
}

const pcStyles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD_BG, borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: CARD_BORDER, gap: 12 },
  cardDone: { opacity: 0.45 },
  categoryDot: { width: 4, height: 36, borderRadius: 2 },
  content: { flex: 1, gap: 4 },
  title: { fontSize: 15, fontWeight: '600', color: TEXT_PRIMARY },
  titleDone: { textDecorationLine: 'line-through', color: TEXT_SECONDARY },
  subtitle: { fontSize: 13, color: TEXT_SECONDARY },
  subtitleDone: { color: TEXT_MUTED },
  checkHit: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
});

function WeekDayDot({ day }: { day: WeekDay }) {
  const isFull = day.status === 'full';
  const isPartial = day.status === 'partial';
  const isToday = day.isToday;
  const dotBg = isFull ? TEAL : isPartial ? TEAL_DIM : 'rgba(255,255,255,0.05)';
  const dotBorder = isFull ? TEAL : isPartial ? TEAL_BORDER : 'rgba(255,255,255,0.1)';

  return (
    <View style={wdStyles.col}>
      <View style={[wdStyles.dot, { backgroundColor: dotBg, borderColor: dotBorder }, isToday && wdStyles.dotToday]} />
      <Text style={[wdStyles.label, isToday && wdStyles.labelToday]}>{day.fullLabel}</Text>
    </View>
  );
}

const wdStyles = StyleSheet.create({
  col: { alignItems: 'center', gap: 8, flex: 1 },
  dot: { width: 30, height: 30, borderRadius: 10, borderWidth: 1.5 },
  dotToday: { borderColor: TEAL, borderWidth: 2, backgroundColor: TEAL_DIM, shadowColor: TEAL, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 6, elevation: 4 },
  label: { fontSize: 11, fontWeight: '600', color: TEXT_SECONDARY },
  labelToday: { color: TEAL },
});

function HabitRow({ habit, onToggle, isLast }: { habit: HabitItem; onToggle: () => void; isLast: boolean }) {
  return (
    <AnimatedPressable
      style={[hrStyles.row, !isLast && hrStyles.rowBorder]}
      onPress={() => { console.log('[Momentum] User tapped habit row:', habit.name); onToggle(); }}
    >
      <View style={hrStyles.iconWrap}>
        <IconSymbol ios_icon_name={habit.icon_ios} android_material_icon_name={habit.icon_android} size={18} color={habit.completed ? TEAL : TEXT_SECONDARY} />
      </View>
      <Text style={[hrStyles.name, habit.completed && hrStyles.nameDone]}>{habit.name}</Text>
      <View style={[hrStyles.check, habit.completed && hrStyles.checkDone]}>
        {habit.completed && <IconSymbol ios_icon_name="checkmark" android_material_icon_name="check" size={13} color="#fff" />}
      </View>
    </AnimatedPressable>
  );
}

const hrStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, gap: 12 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: CARD_BORDER },
  iconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
  name: { flex: 1, fontSize: 15, fontWeight: '500', color: TEXT_PRIMARY },
  nameDone: { color: TEXT_SECONDARY, textDecorationLine: 'line-through' },
  check: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  checkDone: { backgroundColor: TEAL, borderColor: TEAL },
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: SCREEN_BG },
  scroll: { flex: 1 },
  scrollContent: { paddingTop: Platform.OS === 'android' ? 52 : 64, paddingHorizontal: 20, paddingBottom: 120 },

  // Header
  header: { marginBottom: 32 },
  greeting: { fontSize: 30, fontWeight: '800', color: TEXT_PRIMARY, letterSpacing: -0.5, marginBottom: 4 },
  dateText: { fontSize: 14, color: TEXT_SECONDARY, marginBottom: 2 },
  contextText: { fontSize: 14, color: TEXT_SECONDARY, marginBottom: 16 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

  // Section
  section: { marginBottom: 32 },
  sectionHeader: { fontSize: 11, fontWeight: '600', color: TEAL, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 14 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  changeBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: TEAL_DIM, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: TEAL_BORDER },
  changeBtnText: { fontSize: 12, fontWeight: '600', color: TEAL },

  // Priority footer
  priorityFooter: { paddingTop: 4, paddingBottom: 4 },
  priorityFooterText: { fontSize: 13, color: TEXT_MUTED, textAlign: 'center' },

  // Week row
  weekRow: { flexDirection: 'row', backgroundColor: CARD_BG, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: CARD_BORDER, marginBottom: 12 },

  // Week stat cards
  weekStatRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  weekStatCard: { flex: 1, backgroundColor: CARD_BG, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: CARD_BORDER, alignItems: 'center' },
  weekStatValue: { fontSize: 28, fontWeight: '800', color: TEAL, letterSpacing: -0.5, marginBottom: 4 },
  weekStatLabel: { fontSize: 12, color: TEXT_SECONDARY, textAlign: 'center' },

  // Progress bar
  progressBarContainer: { backgroundColor: CARD_BG, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: CARD_BORDER },
  progressBarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  progressBarLabel: { fontSize: 13, fontWeight: '600', color: TEXT_PRIMARY },
  progressBarValue: { fontSize: 13, color: TEXT_SECONDARY },
  progressBarTrack: { height: 6, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: 6, backgroundColor: TEAL, borderRadius: 3 },

  // Habits card
  habitsCard: { backgroundColor: CARD_BG, borderRadius: 16, borderWidth: 1, borderColor: CARD_BORDER, overflow: 'hidden' },
});
