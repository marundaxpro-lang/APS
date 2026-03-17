
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { useAuth } from '@/contexts/AuthContext';
import {
  useMomentumStore,
  generateDailyPriorities,
  calculateWeeklyAdherence,
  getMomentumScore,
  getMomentumLabel,
  getStreakMessage,
  detectComebackState,
  generateComebackPlan,
  getComebackDailyPriorities,
  ComebackState,
  ComebackPlan,
  Priority,
  DayContext,
  DayRecord,
  CATEGORY_COLORS,
  STORAGE_KEYS,
} from '@/utils/momentumEngine';
import {
  getNextBestAction,
  getCurrentTimeOfDay,
  NextBestAction,
  UserDayContext,
} from '@/utils/nextBestAction';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TEAL = '#00D4AA';
const TEAL_DIM = 'rgba(0,212,170,0.12)';
const TEAL_GLOW = 'rgba(0,212,170,0.22)';
const TEAL_BORDER = 'rgba(0,212,170,0.3)';
const CARD_BG = '#161616';
const CARD_BG_HERO = '#1E1E1E';
const CARD_BORDER = 'rgba(255,255,255,0.06)';
const TEXT_PRIMARY = '#F5F5F5';
const TEXT_SECONDARY = '#888';
const TEXT_MUTED = 'rgba(255,255,255,0.3)';
const SCREEN_BG = '#0A0A0A';

// ─── Types ────────────────────────────────────────────────────────────────────

type PriorityCategory = 'Training' | 'Nutrition' | 'Recovery' | 'Habits';

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
  timeOfDay: ('morning' | 'afternoon' | 'evening' | 'night')[];
  completed: boolean;
}

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

const ALL_HABITS: HabitItem[] = [
  { id: 'h-morn-1', icon_ios: 'drop.fill', icon_android: 'water-drop', name: 'Morning hydration', timeOfDay: ['morning'], completed: false },
  { id: 'h-morn-2', icon_ios: 'pills.fill', icon_android: 'medication', name: 'Take supplements', timeOfDay: ['morning'], completed: false },
  { id: 'h-morn-3', icon_ios: 'list.bullet.clipboard', icon_android: 'assignment', name: "Review today's plan", timeOfDay: ['morning'], completed: false },
  { id: 'h-aft-1', icon_ios: 'figure.walk', icon_android: 'directions-walk', name: 'Midday movement', timeOfDay: ['afternoon'], completed: false },
  { id: 'h-aft-2', icon_ios: 'fork.knife', icon_android: 'restaurant', name: 'Log lunch', timeOfDay: ['afternoon'], completed: false },
  { id: 'h-aft-3', icon_ios: 'drop.fill', icon_android: 'water-drop', name: 'Avoid afternoon crash — stay hydrated', timeOfDay: ['afternoon'], completed: false },
  { id: 'h-eve-1', icon_ios: 'fork.knife', icon_android: 'restaurant', name: 'Log dinner', timeOfDay: ['evening'], completed: false },
  { id: 'h-eve-2', icon_ios: 'figure.flexibility', icon_android: 'self-improvement', name: 'Evening stretch', timeOfDay: ['evening'], completed: false },
  { id: 'h-eve-3', icon_ios: 'bag.fill', icon_android: 'kitchen', name: "Prep tomorrow's meals", timeOfDay: ['evening'], completed: false },
  { id: 'h-night-1', icon_ios: 'iphone.slash', icon_android: 'no-cell', name: 'No screens 1hr before bed', timeOfDay: ['night'], completed: false },
  { id: 'h-night-2', icon_ios: 'moon.fill', icon_android: 'bedtime', name: 'Wind-down routine', timeOfDay: ['night'], completed: false },
  { id: 'h-night-3', icon_ios: 'star.fill', icon_android: 'star', name: "Rate today's execution", timeOfDay: ['night'], completed: false },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTimeOfDayLabel(tod: string): string {
  if (tod === 'morning') return 'Morning';
  if (tod === 'afternoon') return 'Afternoon';
  if (tod === 'evening') return 'Evening';
  return 'Night';
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

// ─── Animated Progress Bar ────────────────────────────────────────────────────

function AnimatedProgressBar({ fraction }: { fraction: number }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, { toValue: fraction, duration: 700, useNativeDriver: false }).start();
  }, [fraction, anim]);

  return (
    <View style={pbStyles.track}>
      <Animated.View
        style={[
          pbStyles.fill,
          { width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
        ]}
      />
    </View>
  );
}

const pbStyles = StyleSheet.create({
  track: { height: 4, backgroundColor: '#222', borderRadius: 2, overflow: 'hidden' },
  fill: { height: 4, backgroundColor: TEAL, borderRadius: 2 },
});

// heroStyles defined below — used by EnginePriorityCard

const heroStyles = StyleSheet.create({
  card: {
    backgroundColor: CARD_BG_HERO,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: TEAL,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: CARD_BORDER,
    borderRightColor: CARD_BORDER,
    borderBottomColor: CARD_BORDER,
    padding: 18,
    marginBottom: 10,
  },
  nextUpLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: TEAL,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  content: { flex: 1, gap: 5 },
  title: { fontSize: 18, fontWeight: '700', color: TEXT_PRIMARY, letterSpacing: -0.2 },
  subtitle: { fontSize: 13, color: TEXT_SECONDARY },
  checkHit: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
});

// scStyles used by EnginePriorityCard below

const scStyles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD_BG, borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: CARD_BORDER, gap: 12 },
  categoryDot: { width: 4, height: 32, borderRadius: 2 },
  content: { flex: 1, gap: 4 },
  title: { fontSize: 15, fontWeight: '600', color: TEXT_PRIMARY },
  subtitle: { fontSize: 13, color: TEXT_SECONDARY },
  checkHit: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
});

// cpStyles used by EnginePriorityCard below

const cpStyles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)', gap: 12, opacity: 0.5 },
  inner: { flex: 1, gap: 3 },
  completedLabel: { fontSize: 10, fontWeight: '600', color: '#444', letterSpacing: 1.2, textTransform: 'uppercase' },
  title: { fontSize: 14, fontWeight: '500', color: '#555', textDecorationLine: 'line-through' },
});

// ─── Next Best Action Card ────────────────────────────────────────────────────

function NextBestActionCard({ action, onPress }: { action: NextBestAction; onPress: () => void }) {
  return (
    <View style={[nbaStyles.card, { borderLeftColor: action.color }]}>
      <Text style={nbaStyles.nextUpLabel}>NEXT UP</Text>
      <Text style={nbaStyles.title}>{action.title}</Text>
      <Text style={nbaStyles.subtitle}>{action.subtitle}</Text>
      <Text style={nbaStyles.reasoning}>{action.reasoning}</Text>
      <TouchableOpacity
        style={[nbaStyles.ctaBtn, { backgroundColor: action.color }]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <Text style={nbaStyles.ctaBtnText}>{action.ctaLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

const nbaStyles = StyleSheet.create({
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: CARD_BORDER,
    borderRightColor: CARD_BORDER,
    borderBottomColor: CARD_BORDER,
    padding: 18,
    marginBottom: 16,
    gap: 6,
  },
  nextUpLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: TEAL,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    color: TEXT_PRIMARY,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    color: TEXT_SECONDARY,
  },
  reasoning: {
    fontSize: 12,
    color: TEXT_MUTED,
    fontStyle: 'italic',
    lineHeight: 17,
    marginTop: 2,
  },
  ctaBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  ctaBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
  },
});

// ─── Engine Priority Card (replaces old HeroPriorityCard for engine priorities) ──

function EnginePriorityCard({ priority, onComplete, onPress }: {
  priority: Priority;
  onComplete: () => void;
  onPress: () => void;
}) {
  const isCompleted = priority.isCompleted;
  if (isCompleted) {
    return (
      <View style={cpStyles.card}>
        <View style={cpStyles.inner}>
          <Text style={cpStyles.completedLabel}>COMPLETED</Text>
          <Text style={cpStyles.title} numberOfLines={1}>{priority.title}</Text>
        </View>
        <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check-circle" size={20} color={TEAL} />
      </View>
    );
  }

  if (priority.isHero) {
    return (
      <AnimatedPressable style={heroStyles.card} onPress={onPress}>
        <Text style={heroStyles.nextUpLabel}>HERO PRIORITY</Text>
        <View style={heroStyles.row}>
          <View style={heroStyles.content}>
            <Text style={heroStyles.title} numberOfLines={2}>{priority.title}</Text>
            <Text style={heroStyles.subtitle} numberOfLines={1}>{priority.subtitle}</Text>
          </View>
          <AnimatedPressable
            onPress={(e) => { e.stopPropagation?.(); onComplete(); }}
            style={heroStyles.checkHit}
            accessibilityLabel="Mark complete"
          >
            <IconSymbol ios_icon_name="circle" android_material_icon_name="radio-button-unchecked" size={24} color="rgba(255,255,255,0.25)" />
          </AnimatedPressable>
        </View>
      </AnimatedPressable>
    );
  }

  return (
    <View style={scStyles.card}>
      <View style={[scStyles.categoryDot, { backgroundColor: priority.color }]} />
      <AnimatedPressable style={scStyles.content} onPress={onPress}>
        <Text style={scStyles.title} numberOfLines={1}>{priority.title}</Text>
        <Text style={scStyles.subtitle} numberOfLines={1}>{priority.subtitle}</Text>
      </AnimatedPressable>
      <AnimatedPressable onPress={onComplete} style={scStyles.checkHit} accessibilityLabel="Mark complete">
        <IconSymbol ios_icon_name="circle" android_material_icon_name="radio-button-unchecked" size={22} color="rgba(255,255,255,0.25)" />
      </AnimatedPressable>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

// ─── Comeback Mode Banner ─────────────────────────────────────────────────────

const ORANGE = '#FF8C42';
const ORANGE_DIM = 'rgba(255,140,66,0.08)';
const ORANGE_BORDER = 'rgba(255,140,66,0.2)';

function ComebackBanner({ plan, state, onStartSession, onDismiss }: {
  plan: ComebackPlan;
  state: ComebackState;
  onStartSession: () => void;
  onDismiss: () => void;
}) {
  const weekTargetStr = String(plan.weekTarget);
  const durationStr = String(plan.lightWorkoutDuration);
  const proteinStr = String(plan.proteinTarget);

  return (
    <View style={cbStyles.card}>
      <View style={cbStyles.accentBar} />
      <View style={cbStyles.inner}>
        <View style={cbStyles.topRow}>
          <View style={cbStyles.badge}>
            <Text style={cbStyles.badgeText}>COMEBACK MODE</Text>
          </View>
        </View>
        <Text style={cbStyles.headline}>{plan.headline}</Text>
        <Text style={cbStyles.subtext}>{plan.subtext}</Text>
        <View style={cbStyles.chipsRow}>
          <View style={cbStyles.chip}>
            <Text style={cbStyles.chipValue}>{weekTargetStr}</Text>
            <Text style={cbStyles.chipLabel}> day target</Text>
          </View>
          <View style={cbStyles.chip}>
            <Text style={cbStyles.chipValue}>~{durationStr}</Text>
            <Text style={cbStyles.chipLabel}> min session</Text>
          </View>
          <View style={cbStyles.chip}>
            <Text style={cbStyles.chipValue}>{proteinStr}g</Text>
            <Text style={cbStyles.chipLabel}> protein</Text>
          </View>
        </View>
        <AnimatedPressable style={cbStyles.startBtn} onPress={() => { console.log('[Momentum] User pressed Start Comeback Session'); onStartSession(); }}>
          <Text style={cbStyles.startBtnText}>Start Comeback Session</Text>
        </AnimatedPressable>
        <TouchableOpacity onPress={() => { console.log('[Momentum] User dismissed comeback banner'); onDismiss(); }} style={cbStyles.dismissBtn}>
          <Text style={cbStyles.dismissText}>Dismiss for today</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const cbStyles = StyleSheet.create({
  card: { flexDirection: 'row', backgroundColor: ORANGE_DIM, borderRadius: 16, borderWidth: 1, borderColor: ORANGE_BORDER, overflow: 'hidden', marginBottom: 20 },
  accentBar: { width: 4, backgroundColor: ORANGE },
  inner: { flex: 1, padding: 18, gap: 10 },
  topRow: { flexDirection: 'row', alignItems: 'center' },
  badge: { backgroundColor: 'rgba(255,140,66,0.18)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: ORANGE_BORDER },
  badgeText: { fontSize: 11, fontWeight: '600', color: ORANGE, letterSpacing: 1, textTransform: 'uppercase' },
  headline: { fontSize: 22, fontWeight: '700', color: '#F5F5F5', letterSpacing: -0.3 },
  subtext: { fontSize: 14, color: '#888', lineHeight: 20 },
  chipsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { flexDirection: 'row', alignItems: 'baseline', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  chipValue: { fontSize: 13, fontWeight: '700', color: '#00D4AA' },
  chipLabel: { fontSize: 12, color: '#888' },
  startBtn: { backgroundColor: '#00D4AA', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  startBtnText: { fontSize: 15, fontWeight: '700', color: '#000' },
  dismissBtn: { alignItems: 'center', paddingVertical: 6 },
  dismissText: { fontSize: 13, color: 'rgba(255,255,255,0.3)' },
});

// ─── Nutrition Quick-Action Card ──────────────────────────────────────────────

function NutritionQuickCard({ proteinLogged, proteinTarget, onPress }: {
  proteinLogged: number;
  proteinTarget: number;
  onPress: () => void;
}) {
  const fraction = proteinTarget > 0 ? Math.min(1, proteinLogged / proteinTarget) : 0;
  const loggedStr = String(Math.round(proteinLogged));
  const targetStr = String(Math.round(proteinTarget));
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, { toValue: fraction, duration: 700, useNativeDriver: false }).start();
  }, [fraction, anim]);

  return (
    <AnimatedPressable style={nqStyles.card} onPress={() => { console.log('[Momentum] User tapped Nutrition quick-action card'); onPress(); }}>
      <View style={nqStyles.topRow}>
        <Text style={nqStyles.label}>NUTRITION</Text>
        <Text style={nqStyles.cta}>Log Meal →</Text>
      </View>
      <View style={nqStyles.proteinRow}>
        <Text style={nqStyles.logged}>{loggedStr}g</Text>
        <Text style={nqStyles.sep}> / </Text>
        <Text style={nqStyles.target}>{targetStr}g protein</Text>
      </View>
      <View style={nqStyles.track}>
        <Animated.View style={[nqStyles.fill, { width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
      </View>
    </AnimatedPressable>
  );
}

const nqStyles = StyleSheet.create({
  card: { backgroundColor: '#161616', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', marginBottom: 16 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  label: { fontSize: 11, fontWeight: '600', color: '#FF8C42', letterSpacing: 1.5, textTransform: 'uppercase' },
  cta: { fontSize: 13, fontWeight: '600', color: '#00D4AA' },
  proteinRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 10 },
  logged: { fontSize: 22, fontWeight: '700', color: '#F5F5F5' },
  sep: { fontSize: 14, color: 'rgba(255,255,255,0.3)' },
  target: { fontSize: 14, color: '#888' },
  track: { height: 6, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, backgroundColor: '#00D4AA', borderRadius: 3 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function MomentumScreen() {
  const router = useRouter();
  const { user } = useAuth();

  // ── Momentum store (AsyncStorage-backed) ──
  const { loaded, streakData, completionDates, completedPriorityIds, completePriority } = useMomentumStore();

  // ── Comeback state ──
  const [comebackState, setComebackState] = useState<ComebackState>({ isActive: false, daysMissed: 0, lastActiveDate: '', phase: 'reentry' });
  const [comebackDismissed, setComebackDismissed] = useState(false);

  // Detect comeback state once completionDates are loaded
  useEffect(() => {
    if (!loaded) return;
    const state = detectComebackState(completionDates);
    setComebackState(state);
    console.log('[Momentum] Comeback state:', state.isActive ? `ACTIVE phase=${state.phase} daysMissed=${state.daysMissed}` : 'inactive');
  }, [loaded, completionDates]);

  // Check if comeback banner was dismissed today
  useEffect(() => {
    async function checkDismissed() {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.COMEBACK_DISMISSED).catch(() => null);
      if (raw) {
        const today = new Date().toISOString().split('T')[0];
        setComebackDismissed(raw === today);
      }
    }
    checkDismissed();
  }, []);

  const handleDismissComeback = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0];
    await AsyncStorage.setItem(STORAGE_KEYS.COMEBACK_DISMISSED, today);
    setComebackDismissed(true);
  }, []);

  // Comeback plan (memoized)
  const comebackPlan = useMemo<ComebackPlan | null>(() => {
    if (!comebackState.isActive) return null;
    return generateComebackPlan(comebackState, 160, 4);
  }, [comebackState]);

  const showComebackBanner = comebackState.isActive && !comebackDismissed && comebackPlan !== null;

  // Comeback priorities override normal priorities when active
  const comebackPriorities = useMemo<Priority[]>(() => {
    if (!comebackPlan) return [];
    return getComebackDailyPriorities(comebackPlan);
  }, [comebackPlan]);

  // ── Timer state ──
  const [habits, setHabits] = useState<HabitItem[]>(ALL_HABITS);
  const [showPresetsModal, setShowPresetsModal] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<TimerPreset>(TIMER_PRESETS[3]);
  const [secondsLeft, setSecondsLeft] = useState((TIMER_PRESETS[3].minutes ?? 20) * 60);
  const [totalSeconds, setTotalSeconds] = useState((TIMER_PRESETS[3].minutes ?? 20) * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isSignedIn = !!user;
  const hour = new Date().getHours();
  const currentTimeOfDay = useMemo(() => getCurrentTimeOfDay(hour), [hour]);
  const todLabel = getTimeOfDayLabel(currentTimeOfDay);

  // ── Build day context for engines ──
  const dayContext: DayContext = useMemo(() => ({
    date: new Date().toISOString().split('T')[0],
    timeOfDay: currentTimeOfDay,
    workoutScheduled: 'Upper Body Push',
    workoutCompleted: false,
    proteinTarget: 160,
    proteinLogged: 42,
    caloriesTarget: 2400,
    caloriesLogged: 800,
    mealsLogged: 1,
    sleepHours: 7,
    currentStreak: streakData.currentStreak,
    weeklyAdherence: 0.6,
    missedWorkoutsThisWeek: 0,
    completedPriorityIds,
  }), [currentTimeOfDay, streakData.currentStreak, completedPriorityIds]);

  const userDayContext: UserDayContext = useMemo(() => ({
    timeOfDay: currentTimeOfDay,
    hour,
    hasWorkoutToday: true,
    workoutCompleted: false,
    workoutName: 'Upper Body Push',
    proteinTarget: 160,
    proteinLogged: 42,
    caloriesTarget: 2400,
    caloriesLogged: 800,
    mealsLogged: 1,
    totalMealsTarget: 4,
    lastSleepHours: 7,
    currentStreak: streakData.currentStreak,
    weeklyAdherence: 0.6,
    missedWorkoutsThisWeek: 0,
    prioritiesCompleted: completedPriorityIds.length,
    totalPriorities: 5,
  }), [currentTimeOfDay, hour, streakData.currentStreak, completedPriorityIds.length]);

  // ── Derived from engines ──
  const priorities = useMemo(() => generateDailyPriorities(dayContext), [dayContext]);
  const nextAction = useMemo(() => getNextBestAction(userDayContext), [userDayContext]);

  const weekData: DayRecord[] = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (6 - i));
      const dateStr = d.toISOString().split('T')[0];
      const completed = completionDates.includes(dateStr);
      return {
        date: dateStr,
        workoutCompleted: completed,
        mealsLogged: completed ? 3 : 0,
        totalMealsTarget: 4,
        habitsCompleted: completed ? 2 : 0,
        totalHabits: 3,
      };
    });
  }, [completionDates]);

  const adherence = useMemo(() => calculateWeeklyAdherence(weekData), [weekData]);
  const momentumScore = useMemo(() => getMomentumScore(adherence, streakData.currentStreak), [adherence, streakData.currentStreak]);
  const momentumLabel = getMomentumLabel(momentumScore);
  const streakMessage = getStreakMessage(streakData.currentStreak);

  // ── Priority derived state ──
  const incompletePriorities = priorities.filter(p => !p.isCompleted);
  const completedPrioritiesArr = priorities.filter(p => p.isCompleted);
  const heroPriority = priorities.find(p => p.isHero && !p.isCompleted) ?? null;
  const secondaryPriorities = incompletePriorities.filter(p => !p.isHero && p.rank <= 4);
  const habitPriorities = incompletePriorities.filter(p => p.category === 'habit' && p.rank >= 5);
  const hasPriorities = priorities.length > 0;
  const allComplete = incompletePriorities.length === 0 && priorities.length > 0;

  // ── Header derived ──
  const incompleteCount = incompletePriorities.length;
  const completedCount = completedPrioritiesArr.length;
  const totalCount = priorities.length;
  const completionFraction = totalCount > 0 ? completedCount / totalCount : 0;
  const completionPercent = Math.round(completionFraction * 100);
  const completionPercentStr = `${completionPercent}%`;
  const streakStr = String(streakData.currentStreak);
  const momentumScoreStr = String(momentumScore);

  const headerHeadline = allComplete ? 'All done. Strong execution.' : `${incompleteCount} ${incompleteCount === 1 ? 'priority' : 'priorities'} left today.`;

  // ── Weekly dot row ──
  const weekDayDots: WeekDay[] = useMemo(() => {
    const today = new Date();
    const todayDow = today.getDay();
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (6 - i));
      const dateStr = d.toISOString().split('T')[0];
      const isToday = d.getDay() === todayDow && d.toDateString() === today.toDateString();
      const completed = completionDates.includes(dateStr);
      return {
        label: dayNames[d.getDay()][0],
        fullLabel: dayNames[d.getDay()],
        status: isToday ? 'today' : completed ? 'full' : 'missed',
        isToday,
      } as WeekDay;
    });
  }, [completionDates]);

  const weeklyCompletedStr = String(adherence.completedDays);
  const weeklyGoalStr = String(7);
  const weeklyProgressFraction = adherence.completedDays / 7;

  // ── Habits ──
  const filteredHabits = habits.filter(h => h.timeOfDay.includes(currentTimeOfDay));
  const allHabitsDone = filteredHabits.length > 0 && filteredHabits.every(h => h.completed);

  // ── Focus prompt ──
  const focusPromptSubtitle = allComplete
    ? 'All priorities complete. Use this time for recovery or reflection.'
    : heroPriority
    ? `Start a session for: ${heroPriority.title}`
    : 'No priorities remaining.';

  // ── Timer tick ──
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setSecondsLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setIsRunning(false);
            setSessionCount(c => c + 1);
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
    console.log('[Momentum] User pressed Begin Session:', selectedPreset.name);
    if (secondsLeft === 0) {
      const mins = selectedPreset.minutes ?? 25;
      setSecondsLeft(mins * 60);
      setTotalSeconds(mins * 60);
    }
    setIsRunning(true);
  }

  function handleHold() {
    console.log('[Momentum] User pressed Hold:', selectedPreset.name);
    setIsRunning(false);
  }

  function handleEndSession() {
    console.log('[Momentum] Session ended early:', selectedPreset.name);
    setIsRunning(false);
    const mins = selectedPreset.minutes ?? 25;
    setSecondsLeft(mins * 60);
    setTotalSeconds(mins * 60);
  }

  const handleCompletePriority = useCallback((priority: Priority) => {
    console.log('[Momentum] User completed priority:', priority.id, priority.title);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    completePriority(priority.id, priority.isHero);
  }, [completePriority]);

  function handlePriorityPress(priority: Priority) {
    console.log('[Momentum] User tapped priority:', priority.title, '→', priority.ctaRoute ?? 'no nav');
    if (priority.ctaRoute) router.push(priority.ctaRoute as never);
  }

  function handleNextActionPress() {
    console.log('[Momentum] User tapped Next Best Action CTA:', nextAction.ctaLabel, '→', nextAction.ctaRoute);
    router.push(nextAction.ctaRoute as never);
  }

  function toggleHabit(id: string) {
    console.log('[Momentum] User toggled habit:', id);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setHabits(prev => prev.map(h => h.id === id ? { ...h, completed: !h.completed } : h));
  }

  // ── Derived display values for comeback streak ──
  const displayStreak = showComebackBanner ? 0 : streakData.currentStreak;
  const displayStreakStr = String(displayStreak);
  const displayStreakMessage = showComebackBanner && comebackPlan
    ? comebackPlan.streakResetMessage
    : streakMessage;

  // ── Active priorities (comeback overrides normal) ──
  const activePriorities = showComebackBanner ? comebackPriorities : priorities;
  const activeIncompletePriorities = activePriorities.filter(p => !p.isCompleted);
  const activeCompletedPriorities = activePriorities.filter(p => p.isCompleted);
  const activeHeroPriority = activePriorities.find(p => p.isHero && !p.isCompleted) ?? null;
  const activeSecondaryPriorities = activeIncompletePriorities.filter(p => !p.isHero && p.rank <= 4);
  const activeHasPriorities = activePriorities.length > 0;
  const activeAllComplete = activeIncompletePriorities.length === 0 && activePriorities.length > 0;

  return (
    <View style={s.container}>
      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── Section 1: Momentum Header ── */}
        {showComebackBanner && comebackPlan ? (
          <ComebackBanner
            plan={comebackPlan}
            state={comebackState}
            onStartSession={() => { console.log('[Momentum] Comeback session started'); router.push('/training-plan' as never); }}
            onDismiss={handleDismissComeback}
          />
        ) : (
          <View style={s.header}>
            <View style={s.headerTopRow}>
              <Text style={s.headerHeadline}>{headerHeadline}</Text>
              <View style={s.momentumPill}>
                <Text style={s.momentumPillScore}>{momentumScoreStr}</Text>
                <Text style={s.momentumPillDot}> · </Text>
                <Text style={s.momentumPillLabel}>{momentumLabel}</Text>
              </View>
            </View>
            <Text style={s.headerContext}>{streakMessage}</Text>

            {/* Slim completion bar */}
            <View style={s.completionBarRow}>
              <View style={s.completionBarLeft}>
                <Text style={s.flameEmoji}>🔥</Text>
                <Text style={s.streakCount}>{streakStr}</Text>
              </View>
              <View style={s.completionBarTrackWrap}>
                <AnimatedProgressBar fraction={completionFraction} />
              </View>
              <Text style={s.completionPercent}>{completionPercentStr}</Text>
              <Text style={s.completionLabel}> complete</Text>
            </View>
          </View>
        )}

        {/* Comeback streak display */}
        {showComebackBanner && comebackPlan && (
          <View style={s.comebackStreakRow}>
            <Text style={s.comebackStreakNum}>{displayStreakStr}</Text>
            <Text style={s.comebackStreakBadge}> 🔄 Rebuilding</Text>
            <Text style={s.comebackStreakMsg}>{displayStreakMessage}</Text>
          </View>
        )}

        {/* ── Nutrition Quick-Action Card ── */}
        <NutritionQuickCard
          proteinLogged={dayContext.proteinLogged}
          proteinTarget={dayContext.proteinTarget}
          onPress={() => router.push('/nutrition' as never)}
        />

        {/* ── Next Best Action ── */}
        {!showComebackBanner && (
          <NextBestActionCard action={nextAction} onPress={handleNextActionPress} />
        )}

        {/* ── Section 2: Today's Priorities ── */}
        <View style={s.section}>
          <Text style={s.sectionHeader}>TODAY'S PRIORITIES</Text>
          {showComebackBanner && (
            <Text style={s.comebackSimplifiedLabel}>Simplified for your comeback</Text>
          )}
          {activeHasPriorities ? (
            <>
              {activeHeroPriority && (
                <AnimatedListItem index={0}>
                  <EnginePriorityCard
                    priority={activeHeroPriority}
                    onComplete={() => handleCompletePriority(activeHeroPriority)}
                    onPress={() => handlePriorityPress(activeHeroPriority)}
                  />
                </AnimatedListItem>
              )}

              {activeSecondaryPriorities.map((p, index) => (
                <AnimatedListItem key={p.id} index={index + 1}>
                  <EnginePriorityCard
                    priority={p}
                    onComplete={() => handleCompletePriority(p)}
                    onPress={() => handlePriorityPress(p)}
                  />
                </AnimatedListItem>
              ))}

              {activeCompletedPriorities.map((p, index) => (
                <AnimatedListItem key={p.id} index={activeIncompletePriorities.length + index}>
                  <EnginePriorityCard
                    priority={p}
                    onComplete={() => {}}
                    onPress={() => {}}
                  />
                </AnimatedListItem>
              ))}
            </>
          ) : (
            <MomentumEmptyState
              isSignedIn={isSignedIn}
              onSyncPress={() => router.push('/auth' as never)}
              onTrainingPress={() => router.push('/(tabs)/training' as never)}
              onNutritionPress={() => router.push('/nutrition' as never)}
            />
          )}
        </View>

        {/* ── Section 3: Execution Timer ── */}
        <View style={s.section}>
          <View style={s.sectionHeaderRow}>
            <Text style={s.sectionHeader}>EXECUTION TIMER</Text>
            <AnimatedPressable
              style={s.changeBtn}
              onPress={() => { console.log('[Momentum] User opened timer presets modal'); setShowPresetsModal(true); }}
            >
              <IconSymbol ios_icon_name="slider.horizontal.3" android_material_icon_name="tune" size={14} color={TEAL} />
              <Text style={s.changeBtnText}>Change</Text>
            </AnimatedPressable>
          </View>

          {isRunning || secondsLeft < (selectedPreset.minutes ?? 25) * 60 ? (
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
          ) : (
            <View style={s.focusPromptCard}>
              <View style={s.focusPromptAccent} />
              <View style={s.focusPromptInner}>
                <Text style={s.focusPromptTitle}>Ready to execute?</Text>
                <Text style={[s.focusPromptSubtitle, !allComplete && { color: TEAL }]} numberOfLines={2}>
                  {focusPromptSubtitle}
                </Text>
                <AnimatedPressable
                  style={s.focusBeginBtn}
                  onPress={() => { console.log('[Momentum] User pressed Begin Session from prompt card'); handleBeginSession(); }}
                >
                  <IconSymbol ios_icon_name="play.fill" android_material_icon_name="play-arrow" size={15} color="#fff" />
                  <Text style={s.focusBeginBtnText}>Begin Session</Text>
                </AnimatedPressable>
              </View>
            </View>
          )}
        </View>

        {/* ── Section 4: Weekly Consistency ── */}
        <View style={s.section}>
          <Text style={s.sectionHeader}>THIS WEEK</Text>

          <View style={s.weekRow}>
            {weekDayDots.map((day, i) => (
              <WeekDayDot key={i} day={day} />
            ))}
          </View>

          <View style={s.weekSummaryRow}>
            <Text style={s.weekSummaryText}>
              <Text style={s.weekSummaryHighlight}>{weeklyCompletedStr}</Text>
              <Text style={s.weekSummaryText}> of </Text>
              <Text style={s.weekSummaryHighlight}>{weeklyGoalStr}</Text>
              <Text style={s.weekSummaryText}> days · 🔥 </Text>
              <Text style={s.weekSummaryHighlight}>{streakStr}</Text>
              <Text style={s.weekSummaryText}> day streak · </Text>
              <Text style={s.weekSummaryHighlight}>{momentumScoreStr}</Text>
              <Text style={s.weekSummaryText}> Momentum</Text>
            </Text>
          </View>

          <AnimatedProgressBar fraction={weeklyProgressFraction} />
        </View>

        {/* ── Section 5: Right Now (Habits) ── */}
        <View style={s.section}>
          <View style={s.sectionHeaderRow}>
            <Text style={s.sectionHeader}>RIGHT NOW</Text>
            <Text style={s.todLabel}>{todLabel}</Text>
          </View>

          {allHabitsDone ? (
            <View style={s.habitsAllDone}>
              <Text style={s.habitsAllDoneText}>All set for now. Check back later.</Text>
            </View>
          ) : (
            <View style={s.habitsCard}>
              {filteredHabits.map((habit, index) => (
                <AnimatedListItem key={habit.id} index={index}>
                  <HabitRow
                    habit={habit}
                    onToggle={() => toggleHabit(habit.id)}
                    isLast={index === filteredHabits.length - 1}
                  />
                </AnimatedListItem>
              ))}
            </View>
          )}
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
    <View style={[hrStyles.row, !isLast && hrStyles.rowBorder]}>
      <View style={hrStyles.iconWrap}>
        <IconSymbol ios_icon_name={habit.icon_ios} android_material_icon_name={habit.icon_android} size={18} color={habit.completed ? TEAL : TEXT_SECONDARY} />
      </View>
      <Text style={[hrStyles.name, habit.completed && hrStyles.nameDone]}>{habit.name}</Text>
      <AnimatedPressable
        onPress={() => { console.log('[Momentum] User tapped habit:', habit.name); onToggle(); }}
        style={hrStyles.checkHit}
        accessibilityLabel={habit.completed ? 'Mark incomplete' : 'Mark complete'}
      >
        <View style={[hrStyles.check, habit.completed && hrStyles.checkDone]}>
          {habit.completed && <IconSymbol ios_icon_name="checkmark" android_material_icon_name="check" size={13} color="#fff" />}
        </View>
      </AnimatedPressable>
    </View>
  );
}

const hrStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, gap: 12 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: CARD_BORDER },
  iconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
  name: { flex: 1, fontSize: 15, fontWeight: '500', color: TEXT_PRIMARY },
  nameDone: { color: TEXT_SECONDARY, textDecorationLine: 'line-through' },
  checkHit: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
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
  headerTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 },
  headerHeadline: { fontSize: 28, fontWeight: '800', color: TEXT_PRIMARY, letterSpacing: -0.5, flex: 1, marginRight: 10 },
  momentumPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,212,170,0.15)', borderWidth: 1, borderColor: '#00D4AA', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, marginTop: 4 },
  momentumPillScore: { fontSize: 13, fontWeight: '800', color: TEAL },
  momentumPillDot: { fontSize: 12, color: TEAL, opacity: 0.6 },
  momentumPillLabel: { fontSize: 12, fontWeight: '600', color: TEAL },
  headerContext: { fontSize: 14, color: TEAL, marginBottom: 20 },

  // Completion bar
  completionBarRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  completionBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  flameEmoji: { fontSize: 14 },
  streakCount: { fontSize: 13, fontWeight: '700', color: '#f59e0b' },
  completionBarTrackWrap: { flex: 1 },
  completionPercent: { fontSize: 12, fontWeight: '700', color: TEAL },
  completionLabel: { fontSize: 12, color: TEXT_SECONDARY },

  // Section
  section: { marginBottom: 32 },
  sectionHeader: { fontSize: 11, fontWeight: '600', color: TEAL, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 14 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  changeBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: TEAL_DIM, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: TEAL_BORDER },
  changeBtnText: { fontSize: 12, fontWeight: '600', color: TEAL },

  // Comeback streak row
  comebackStreakRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, paddingHorizontal: 4 },
  comebackStreakNum: { fontSize: 28, fontWeight: '800', color: '#F5F5F5', letterSpacing: -0.5 },
  comebackStreakBadge: { fontSize: 14, color: '#FF8C42', fontWeight: '600' },
  comebackStreakMsg: { fontSize: 12, color: 'rgba(255,255,255,0.3)', marginLeft: 8, flex: 1 },
  comebackSimplifiedLabel: { fontSize: 12, color: 'rgba(255,255,255,0.3)', fontStyle: 'italic', marginBottom: 10 },

  // Focus prompt card
  focusPromptCard: { flexDirection: 'row', backgroundColor: CARD_BG, borderRadius: 18, borderWidth: 1, borderColor: CARD_BORDER, overflow: 'hidden' },
  focusPromptAccent: { width: 3, backgroundColor: TEAL },
  focusPromptInner: { flex: 1, padding: 20, gap: 8 },
  focusPromptTitle: { fontSize: 17, fontWeight: '700', color: TEXT_PRIMARY, letterSpacing: -0.2 },
  focusPromptSubtitle: { fontSize: 14, color: TEXT_SECONDARY, lineHeight: 20 },
  focusBeginBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: TEAL, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 20, alignSelf: 'flex-start', marginTop: 4 },
  focusBeginBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  // Week row
  weekRow: { flexDirection: 'row', backgroundColor: CARD_BG, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: CARD_BORDER, marginBottom: 12 },

  // Week summary
  weekSummaryRow: { marginBottom: 10 },
  weekSummaryText: { fontSize: 13, color: TEXT_SECONDARY },
  weekSummaryHighlight: { fontSize: 13, color: TEAL, fontWeight: '700' },

  // Habits
  todLabel: { fontSize: 11, fontWeight: '600', color: TEXT_SECONDARY, letterSpacing: 0.5 },
  habitsCard: { backgroundColor: CARD_BG, borderRadius: 16, borderWidth: 1, borderColor: CARD_BORDER, overflow: 'hidden' },
  habitsAllDone: { paddingVertical: 28, alignItems: 'center' },
  habitsAllDoneText: { fontSize: 14, color: TEXT_MUTED, textAlign: 'center' },
});
