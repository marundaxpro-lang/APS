
import React, { useState, useEffect, useRef, useMemo } from 'react';
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
const CARD_BG_HERO = '#1E1E1E';
const CARD_BORDER = 'rgba(255,255,255,0.06)';
const TEXT_PRIMARY = '#F5F5F5';
const TEXT_SECONDARY = '#888';
const TEXT_MUTED = 'rgba(255,255,255,0.3)';
const SCREEN_BG = '#0A0A0A';

// ─── Types ────────────────────────────────────────────────────────────────────

type PriorityCategory = 'Training' | 'Nutrition' | 'Recovery' | 'Habits';
type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

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
  timeOfDay: TimeOfDay[];
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

const STREAK = 14;
const COMPLETED_DAYS = 4;
const WEEKLY_GOAL_DAYS = 7;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTimeOfDay(): TimeOfDay {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'night';
}

function getTimeOfDayLabel(tod: TimeOfDay): string {
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

// ─── Hero Priority Card ───────────────────────────────────────────────────────

function HeroPriorityCard({ item, onToggle, onPress }: { item: PriorityItem; onToggle: () => void; onPress: () => void }) {
  return (
    <AnimatedPressable style={heroStyles.card} onPress={onPress}>
      <Text style={heroStyles.nextUpLabel}>NEXT UP</Text>
      <View style={heroStyles.row}>
        <View style={heroStyles.content}>
          <Text style={heroStyles.title} numberOfLines={2}>{item.title}</Text>
          <Text style={heroStyles.subtitle} numberOfLines={1}>{item.subtitle}</Text>
        </View>
        <AnimatedPressable
          onPress={(e) => { e.stopPropagation?.(); onToggle(); }}
          style={heroStyles.checkHit}
          accessibilityLabel="Mark complete"
        >
          <IconSymbol
            ios_icon_name="circle"
            android_material_icon_name="radio-button-unchecked"
            size={24}
            color="rgba(255,255,255,0.25)"
          />
        </AnimatedPressable>
      </View>
    </AnimatedPressable>
  );
}

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

// ─── Secondary Priority Card ──────────────────────────────────────────────────

function SecondaryPriorityCard({ item, onToggle, onPress }: { item: PriorityItem; onToggle: () => void; onPress: () => void }) {
  const dotColor = CATEGORY_DOTS[item.category];

  return (
    <View style={scStyles.card}>
      <View style={[scStyles.categoryDot, { backgroundColor: dotColor }]} />
      <AnimatedPressable style={scStyles.content} onPress={onPress}>
        <Text style={scStyles.title} numberOfLines={1}>{item.title}</Text>
        <Text style={scStyles.subtitle} numberOfLines={1}>{item.subtitle}</Text>
      </AnimatedPressable>
      <AnimatedPressable onPress={onToggle} style={scStyles.checkHit} accessibilityLabel="Mark complete">
        <IconSymbol
          ios_icon_name="circle"
          android_material_icon_name="radio-button-unchecked"
          size={22}
          color="rgba(255,255,255,0.25)"
        />
      </AnimatedPressable>
    </View>
  );
}

const scStyles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD_BG, borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: CARD_BORDER, gap: 12 },
  categoryDot: { width: 4, height: 32, borderRadius: 2 },
  content: { flex: 1, gap: 4 },
  title: { fontSize: 15, fontWeight: '600', color: TEXT_PRIMARY },
  subtitle: { fontSize: 13, color: TEXT_SECONDARY },
  checkHit: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
});

// ─── Completed Priority Card ──────────────────────────────────────────────────

function CompletedPriorityCard({ item }: { item: PriorityItem }) {
  return (
    <View style={cpStyles.card}>
      <View style={cpStyles.inner}>
        <Text style={cpStyles.completedLabel}>COMPLETED</Text>
        <Text style={cpStyles.title} numberOfLines={1}>{item.title}</Text>
      </View>
      <IconSymbol
        ios_icon_name="checkmark.circle.fill"
        android_material_icon_name="check-circle"
        size={20}
        color={TEAL}
      />
    </View>
  );
}

const cpStyles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)', gap: 12, opacity: 0.5 },
  inner: { flex: 1, gap: 3 },
  completedLabel: { fontSize: 10, fontWeight: '600', color: '#444', letterSpacing: 1.2, textTransform: 'uppercase' },
  title: { fontSize: 14, fontWeight: '500', color: '#555', textDecorationLine: 'line-through' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function MomentumScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [priorities, setPriorities] = useState<PriorityItem[]>(INITIAL_PRIORITIES);
  const [habits, setHabits] = useState<HabitItem[]>(ALL_HABITS);
  const [showPresetsModal, setShowPresetsModal] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<TimerPreset>(TIMER_PRESETS[3]);
  const [secondsLeft, setSecondsLeft] = useState((TIMER_PRESETS[3].minutes ?? 20) * 60);
  const [totalSeconds, setTotalSeconds] = useState((TIMER_PRESETS[3].minutes ?? 20) * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isSignedIn = !!user;

  // Derived priority state
  const incompletePriorities = priorities.filter((p) => !p.completed);
  const completedPriorities = priorities.filter((p) => p.completed);
  const heroPriority = incompletePriorities[0] ?? null;
  const secondaryPriorities = incompletePriorities.slice(1);
  const hasPriorities = priorities.length > 0;
  const allComplete = incompletePriorities.length === 0 && priorities.length > 0;

  // Header derived values
  const incompleteCount = incompletePriorities.length;
  const totalCount = priorities.length;
  const completedCount = completedPriorities.length;
  const completionFraction = totalCount > 0 ? completedCount / totalCount : 0;
  const completionPercent = Math.round(completionFraction * 100);
  const completionPercentStr = `${completionPercent}%`;
  const streakStr = String(STREAK);

  // Header text
  const headerHeadline = allComplete ? 'All done. Strong execution.' : `${incompleteCount} ${incompleteCount === 1 ? 'priority' : 'priorities'} left today.`;
  const headerContext = allComplete ? `Day ${STREAK} streak. Consistency compounds.` : 'Keep the streak alive. Stay locked in.';

  // Weekly consistency
  const weeklyProgressFraction = COMPLETED_DAYS / WEEKLY_GOAL_DAYS;
  const weeklyCompletedStr = String(COMPLETED_DAYS);
  const weeklyGoalStr = String(WEEKLY_GOAL_DAYS);

  // Time-of-day habits
  const currentTimeOfDay = useMemo(() => getTimeOfDay(), []);
  const todLabel = getTimeOfDayLabel(currentTimeOfDay);
  const filteredHabits = habits.filter((h) => h.timeOfDay.includes(currentTimeOfDay));
  const allHabitsDone = filteredHabits.length > 0 && filteredHabits.every((h) => h.completed);

  // Focus session prompt
  const focusPromptSubtitle = allComplete
    ? 'All priorities complete. Use this time for recovery or reflection.'
    : heroPriority
    ? `Start a session for: ${heroPriority.title}`
    : 'No priorities remaining.';

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

  return (
    <View style={s.container}>
      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── Section 1: Momentum Header ── */}
        <View style={s.header}>
          <Text style={s.headerHeadline}>{headerHeadline}</Text>
          <Text style={s.headerContext}>{headerContext}</Text>

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

        {/* ── Section 2: Today's Priorities ── */}
        <View style={s.section}>
          <Text style={s.sectionHeader}>TODAY'S PRIORITIES</Text>
          {hasPriorities ? (
            <>
              {/* Hero card — first incomplete */}
              {heroPriority && (
                <AnimatedListItem index={0}>
                  <HeroPriorityCard
                    item={heroPriority}
                    onToggle={() => togglePriority(heroPriority.id)}
                    onPress={() => handlePriorityPress(heroPriority)}
                  />
                </AnimatedListItem>
              )}

              {/* Secondary incomplete cards */}
              {secondaryPriorities.map((item, index) => (
                <AnimatedListItem key={item.id} index={index + 1}>
                  <SecondaryPriorityCard
                    item={item}
                    onToggle={() => togglePriority(item.id)}
                    onPress={() => handlePriorityPress(item)}
                  />
                </AnimatedListItem>
              ))}

              {/* Completed cards */}
              {completedPriorities.map((item, index) => (
                <AnimatedListItem key={item.id} index={incompletePriorities.length + index}>
                  <CompletedPriorityCard item={item} />
                </AnimatedListItem>
              ))}
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

          {/* 7-day dot row */}
          <View style={s.weekRow}>
            {WEEK_DAYS.map((day, i) => (
              <WeekDayDot key={i} day={day} />
            ))}
          </View>

          {/* Single summary line */}
          <View style={s.weekSummaryRow}>
            <Text style={s.weekSummaryText}>
              <Text style={s.weekSummaryHighlight}>{weeklyCompletedStr}</Text>
              <Text style={s.weekSummaryText}> of </Text>
              <Text style={s.weekSummaryHighlight}>{weeklyGoalStr}</Text>
              <Text style={s.weekSummaryText}> days complete · 🔥 </Text>
              <Text style={s.weekSummaryHighlight}>{streakStr}</Text>
              <Text style={s.weekSummaryText}>-day streak</Text>
            </Text>
          </View>

          {/* Slim weekly progress bar */}
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
  headerHeadline: { fontSize: 30, fontWeight: '800', color: TEXT_PRIMARY, letterSpacing: -0.5, marginBottom: 6 },
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
