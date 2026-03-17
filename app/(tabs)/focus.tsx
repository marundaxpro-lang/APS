
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

// ─── Types ────────────────────────────────────────────────────────────────────

type PriorityCategory = 'Workout' | 'Nutrition' | 'Recovery' | 'Habit';

interface PriorityItem {
  id: string;
  emoji: string;
  title: string;
  subtitle: string;
  category: PriorityCategory;
  navigateTo?: '/(tabs)/training' | '/(tabs)/nutrition';
  completed: boolean;
}

interface WeekDay {
  label: string;
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

// ─── Constants ────────────────────────────────────────────────────────────────

const TEAL = colors.primary;
const TEAL_DIM = 'rgba(69,155,155,0.15)';
const TEAL_GLOW = 'rgba(69,155,155,0.25)';

const BADGE_COLORS: Record<PriorityCategory, { bg: string; text: string }> = {
  Workout: { bg: TEAL_DIM, text: TEAL },
  Nutrition: { bg: 'rgba(245,158,11,0.15)', text: '#f59e0b' },
  Recovery: { bg: 'rgba(99,102,241,0.15)', text: '#818cf8' },
  Habit: { bg: 'rgba(34,197,94,0.15)', text: '#4ade80' },
};

const TIMER_PRESETS: TimerPreset[] = [
  {
    id: 'quick-reset',
    name: 'Quick Reset',
    minutes: 5,
    description: 'Clear your head. Reset between tasks.',
    contextLine: 'Clearing the slate.',
  },
  {
    id: 'recovery-reset',
    name: 'Recovery Reset',
    minutes: 10,
    description: 'Active rest. Let your system rebuild.',
    contextLine: 'System rebuilding.',
  },
  {
    id: 'wind-down',
    name: 'Wind Down',
    minutes: 15,
    description: 'Decompress. Prepare your body for recovery.',
    contextLine: 'Preparing for recovery.',
  },
  {
    id: 'meal-prep',
    name: 'Meal Prep Focus',
    minutes: 20,
    description: 'Prep with intention. Fuel your performance.',
    contextLine: 'Fueling performance.',
  },
  {
    id: 'study-sprint',
    name: 'Study Sprint',
    minutes: 25,
    description: 'Lock in. Execute without distraction.',
    contextLine: 'Locked in.',
  },
  {
    id: 'deep-work',
    name: 'Deep Work Block',
    minutes: 50,
    description: 'Full immersion. Your best output.',
    contextLine: 'Full immersion. Executing.',
  },
  {
    id: 'custom',
    name: 'Custom Session',
    minutes: null,
    description: 'Set your own duration. Own your time.',
    contextLine: 'Your session. Your rules.',
  },
];

const INITIAL_PRIORITIES: PriorityItem[] = [
  {
    id: '1',
    emoji: '🏋️',
    title: "Complete today's workout",
    subtitle: 'Upper body push · 45 min',
    category: 'Workout',
    navigateTo: '/(tabs)/training',
    completed: false,
  },
  {
    id: '2',
    emoji: '🥗',
    title: 'Log breakfast',
    subtitle: "You haven't logged a meal yet today",
    category: 'Nutrition',
    navigateTo: '/(tabs)/nutrition',
    completed: false,
  },
  {
    id: '3',
    emoji: '💧',
    title: 'Hit water target',
    subtitle: '2.5L goal · 0.8L logged',
    category: 'Habit',
    completed: false,
  },
  {
    id: '4',
    emoji: '🥩',
    title: 'Reach protein target',
    subtitle: '160g goal · 42g logged',
    category: 'Nutrition',
    navigateTo: '/(tabs)/nutrition',
    completed: false,
  },
  {
    id: '5',
    emoji: '😴',
    title: 'Wind down by 10pm',
    subtitle: "Sleep supports tomorrow's leg session",
    category: 'Recovery',
    completed: false,
  },
  {
    id: '6',
    emoji: '📋',
    title: "Review tomorrow's plan",
    subtitle: 'Leg day · 6 exercises',
    category: 'Habit',
    completed: false,
  },
];

const WEEK_DAYS: WeekDay[] = [
  { label: 'M', status: 'full', isToday: false },
  { label: 'T', status: 'full', isToday: false },
  { label: 'W', status: 'partial', isToday: false },
  { label: 'T', status: 'missed', isToday: false },
  { label: 'F', status: 'today', isToday: true },
  { label: 'S', status: 'missed', isToday: false },
  { label: 'S', status: 'missed', isToday: false },
];

const STREAK = 5;
const PLAN_DAY = 12;
const WEEKLY_ADHERENCE = '80%';
const NUTRITION_STREAK = '3 days';
const RECOVERY_SCORE = 'Good';

// ─── Animated list item ───────────────────────────────────────────────────────

function AnimatedListItem({ index, children }: { index: number; children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(14)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 350, delay: index * 60, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 350, delay: index * 60, useNativeDriver: true }),
    ]).start();
  }, [index, opacity, translateY]);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

// ─── Progress Arc (SVG-free, using border trick) ──────────────────────────────

function ProgressArc({ progress, size = 180 }: { progress: number; size?: number }) {
  const animatedProgress = useRef(new Animated.Value(progress)).current;

  useEffect(() => {
    Animated.timing(animatedProgress, {
      toValue: progress,
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, [progress, animatedProgress]);

  // Use rotation-based arc: two semicircles
  const strokeWidth = 6;
  const leftRotation = animatedProgress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['0deg', '180deg', '180deg'],
  });
  const rightRotation = animatedProgress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['0deg', '0deg', '180deg'],
  });
  const leftOpacity = animatedProgress.interpolate({
    inputRange: [0, 0.01, 1],
    outputRange: [0, 1, 1],
  });

  const half = size / 2;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Track ring */}
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: 'rgba(69,155,155,0.15)',
        }}
      />
      {/* Right half arc */}
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          overflow: 'hidden',
        }}
      >
        <Animated.View
          style={{
            position: 'absolute',
            width: half,
            height: size,
            left: half,
            overflow: 'hidden',
            transformOrigin: 'left center',
            transform: [{ rotate: rightRotation }],
          }}
        >
          <View
            style={{
              position: 'absolute',
              width: size,
              height: size,
              right: 0,
              borderRadius: size / 2,
              borderWidth: strokeWidth,
              borderColor: TEAL,
            }}
          />
        </Animated.View>
      </View>
      {/* Left half arc */}
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          overflow: 'hidden',
        }}
      >
        <Animated.View
          style={{
            position: 'absolute',
            width: half,
            height: size,
            left: 0,
            overflow: 'hidden',
            transformOrigin: 'right center',
            transform: [{ rotate: leftRotation }],
            opacity: leftOpacity,
          }}
        >
          <View
            style={{
              position: 'absolute',
              width: size,
              height: size,
              left: 0,
              borderRadius: size / 2,
              borderWidth: strokeWidth,
              borderColor: TEAL,
            }}
          />
        </Animated.View>
      </View>
    </View>
  );
}

// ─── Timer Presets Modal ──────────────────────────────────────────────────────

function TimerPresetsModal({
  visible,
  selectedId,
  onSelect,
  onClose,
}: {
  visible: boolean;
  selectedId: string | null;
  onSelect: (preset: TimerPreset) => void;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={timerModalStyles.overlay} onPress={onClose}>
        <Pressable style={timerModalStyles.sheet} onPress={() => {}}>
          {/* Handle */}
          <View style={timerModalStyles.handle} />

          {/* Header */}
          <View style={timerModalStyles.header}>
            <View>
              <Text style={timerModalStyles.headerTitle}>Start a Session</Text>
              <Text style={timerModalStyles.headerSubtitle}>Choose your focus mode</Text>
            </View>
            <AnimatedPressable onPress={onClose} style={timerModalStyles.closeBtn}>
              <IconSymbol
                ios_icon_name="xmark"
                android_material_icon_name="close"
                size={18}
                color="rgba(255,255,255,0.5)"
              />
            </AnimatedPressable>
          </View>

          {/* Presets */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={timerModalStyles.presetList}
          >
            {TIMER_PRESETS.map((preset) => {
              const isSelected = selectedId === preset.id;
              const durationLabel = preset.minutes ? `${preset.minutes} min` : 'Custom';
              return (
                <AnimatedPressable
                  key={preset.id}
                  style={[
                    timerModalStyles.presetCard,
                    isSelected && timerModalStyles.presetCardSelected,
                  ]}
                  onPress={() => {
                    console.log('[Focus] User selected timer preset:', preset.name, preset.minutes ? `${preset.minutes}min` : 'custom');
                    onSelect(preset);
                  }}
                >
                  <View style={timerModalStyles.presetLeft}>
                    <Text style={timerModalStyles.presetName}>{preset.name}</Text>
                    <Text style={timerModalStyles.presetDesc}>{preset.description}</Text>
                  </View>
                  <View style={timerModalStyles.presetRight}>
                    <Text style={timerModalStyles.presetDuration}>{durationLabel}</Text>
                    {isSelected && (
                      <View style={timerModalStyles.selectedDot} />
                    )}
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

const timerModalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#0d1012',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    maxHeight: '85%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.3,
    marginBottom: 3,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  presetList: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 10,
    paddingBottom: 8,
  },
  presetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  presetCardSelected: {
    backgroundColor: TEAL_GLOW,
    borderColor: TEAL,
    shadowColor: TEAL,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  presetLeft: {
    flex: 1,
    marginRight: 12,
  },
  presetName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  presetDesc: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    lineHeight: 17,
  },
  presetRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  presetDuration: {
    fontSize: 15,
    fontWeight: '700',
    color: TEAL,
    letterSpacing: -0.2,
  },
  selectedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: TEAL,
  },
});

// ─── Active Timer Card ────────────────────────────────────────────────────────

function ActiveTimerCard({
  preset,
  secondsLeft,
  totalSeconds,
  isRunning,
  sessionCount,
  onBegin,
  onHold,
  onEnd,
}: {
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

  const sessionLabel = sessionCount === 0
    ? 'First session today — build the streak.'
    : `Session ${sessionCount} of today`;

  const isCustom = preset.id === 'custom';

  return (
    <View style={timerCardStyles.card}>
      {/* Teal left accent bar */}
      <View style={timerCardStyles.accentBar} />

      <View style={timerCardStyles.inner}>
        {/* Session name + context */}
        <View style={timerCardStyles.sessionHeader}>
          <Text style={timerCardStyles.sessionName}>{preset.name}</Text>
          <Text style={timerCardStyles.contextLine}>{preset.contextLine}</Text>
        </View>

        {/* Progress arc + countdown */}
        <View style={timerCardStyles.arcWrapper}>
          <ProgressArc progress={progress} size={180} />
          <View style={timerCardStyles.countdownOverlay}>
            <View style={timerCardStyles.countdownRow}>
              <Text style={timerCardStyles.countdownMins}>{minsStr}</Text>
              <Text style={timerCardStyles.countdownColon}>:</Text>
              <Text style={timerCardStyles.countdownSecs}>{secsStr}</Text>
            </View>
            {isCustom && (
              <Text style={timerCardStyles.customLabel}>custom</Text>
            )}
          </View>
        </View>

        {/* Action buttons */}
        <View style={timerCardStyles.actions}>
          {!isRunning ? (
            <AnimatedPressable
              style={timerCardStyles.btnPrimary}
              onPress={() => {
                console.log('[Focus] User pressed Begin Session:', preset.name);
                onBegin();
              }}
            >
              <IconSymbol
                ios_icon_name="play.fill"
                android_material_icon_name="play-arrow"
                size={18}
                color="#fff"
              />
              <Text style={timerCardStyles.btnPrimaryText}>Begin Session</Text>
            </AnimatedPressable>
          ) : (
            <AnimatedPressable
              style={timerCardStyles.btnSecondary}
              onPress={() => {
                console.log('[Focus] User pressed Hold:', preset.name);
                onHold();
              }}
            >
              <IconSymbol
                ios_icon_name="pause.fill"
                android_material_icon_name="pause"
                size={18}
                color={TEAL}
              />
              <Text style={timerCardStyles.btnSecondaryText}>Hold</Text>
            </AnimatedPressable>
          )}
          <AnimatedPressable
            style={timerCardStyles.btnGhost}
            onPress={() => {
              console.log('[Focus] User pressed End Session:', preset.name);
              onEnd();
            }}
          >
            <Text style={timerCardStyles.btnGhostText}>End Session</Text>
          </AnimatedPressable>
        </View>

        {/* Session count */}
        <View style={timerCardStyles.sessionFooter}>
          <IconSymbol
            ios_icon_name="flame.fill"
            android_material_icon_name="local-fire-department"
            size={13}
            color={sessionCount > 0 ? '#f59e0b' : 'rgba(255,255,255,0.25)'}
          />
          <Text style={timerCardStyles.sessionCountText}>{sessionLabel}</Text>
        </View>
      </View>
    </View>
  );
}

const timerCardStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: 'hidden',
    marginBottom: 28,
  },
  accentBar: {
    width: 3,
    backgroundColor: TEAL,
  },
  inner: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    gap: 16,
  },
  sessionHeader: {
    alignItems: 'center',
    gap: 4,
  },
  sessionName: {
    fontSize: 13,
    fontWeight: '700',
    color: TEAL,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  contextLine: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.35)',
    fontStyle: 'italic',
  },
  arcWrapper: {
    width: 180,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownOverlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  countdownMins: {
    fontSize: 52,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -2,
    lineHeight: 58,
  },
  countdownColon: {
    fontSize: 40,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.4)',
    marginBottom: 4,
    lineHeight: 52,
  },
  countdownSecs: {
    fontSize: 52,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -2,
    lineHeight: 58,
  },
  customLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  actions: {
    width: '100%',
    gap: 10,
  },
  btnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: TEAL,
    borderRadius: 14,
    paddingVertical: 14,
  },
  btnPrimaryText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  btnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: TEAL_DIM,
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: TEAL,
  },
  btnSecondaryText: {
    fontSize: 15,
    fontWeight: '700',
    color: TEAL,
  },
  btnGhost: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  btnGhostText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.35)',
    fontWeight: '500',
  },
  sessionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sessionCountText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.35)',
  },
});

// ─── Discipline Empty State ───────────────────────────────────────────────────

function DisciplineEmptyState({
  isSignedIn,
  onSyncPress,
  onTrainingPress,
  onNutritionPress,
}: {
  isSignedIn: boolean;
  onSyncPress: () => void;
  onTrainingPress: () => void;
  onNutritionPress: () => void;
}) {
  if (isSignedIn) {
    return (
      <View style={emptyStyles.container}>
        <View style={emptyStyles.iconCircle}>
          <IconSymbol
            ios_icon_name="checkmark.circle"
            android_material_icon_name="check-circle-outline"
            size={32}
            color={TEAL}
          />
        </View>
        <Text style={emptyStyles.headline}>No priorities set for today.</Text>
        <Text style={emptyStyles.body}>
          Your execution plan updates based on your training and nutrition activity. Complete a workout or log a meal to generate today's priorities.
        </Text>
        <View style={emptyStyles.ctaRow}>
          <AnimatedPressable
            style={emptyStyles.ctaSecondary}
            onPress={() => {
              console.log('[Focus] Empty state: User tapped Go to Training');
              onTrainingPress();
            }}
          >
            <Text style={emptyStyles.ctaSecondaryText}>Go to Training</Text>
          </AnimatedPressable>
          <AnimatedPressable
            style={emptyStyles.ctaSecondary}
            onPress={() => {
              console.log('[Focus] Empty state: User tapped Log a Meal');
              onNutritionPress();
            }}
          >
            <Text style={emptyStyles.ctaSecondaryText}>Log a Meal</Text>
          </AnimatedPressable>
        </View>
      </View>
    );
  }

  return (
    <View style={emptyStyles.container}>
      <View style={emptyStyles.iconCircle}>
        <IconSymbol
          ios_icon_name="target"
          android_material_icon_name="gps-fixed"
          size={32}
          color={TEAL}
        />
      </View>
      <Text style={emptyStyles.headline}>Your daily priorities will appear here.</Text>
      <Text style={emptyStyles.body}>
        Apex generates your daily execution plan from your training schedule, nutrition targets, recovery status, and active habits. Sign in to sync your priorities, streaks, and consistency data across devices.
      </Text>
      <AnimatedPressable
        style={emptyStyles.ctaPrimary}
        onPress={() => {
          console.log('[Focus] Empty state: User tapped Sync My Plan');
          onSyncPress();
        }}
      >
        <IconSymbol
          ios_icon_name="arrow.triangle.2.circlepath"
          android_material_icon_name="sync"
          size={16}
          color="#fff"
        />
        <Text style={emptyStyles.ctaPrimaryText}>Sync My Plan</Text>
      </AnimatedPressable>
    </View>
  );
}

const emptyStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 8,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: TEAL_DIM,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(69,155,155,0.3)',
  },
  headline: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  body: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 24,
    maxWidth: 320,
  },
  ctaPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: TEAL,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 28,
  },
  ctaPrimaryText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  ctaRow: {
    flexDirection: 'row',
    gap: 10,
  },
  ctaSecondary: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: TEAL_DIM,
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(69,155,155,0.3)',
  },
  ctaSecondaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: TEAL,
  },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function MomentumScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [priorities, setPriorities] = useState<PriorityItem[]>(INITIAL_PRIORITIES);

  // Timer state
  const [showPresetsModal, setShowPresetsModal] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<TimerPreset>(TIMER_PRESETS[3]); // Meal Prep default
  const [secondsLeft, setSecondsLeft] = useState((TIMER_PRESETS[3].minutes ?? 20) * 60);
  const [totalSeconds, setTotalSeconds] = useState((TIMER_PRESETS[3].minutes ?? 20) * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const isSignedIn = !!user;
  const hasPriorities = priorities.length > 0;

  const completedCount = priorities.filter((p) => p.completed).length;
  const totalCount = priorities.length;

  const todayWins = `${completedCount} / ${totalCount}`;
  const streakLabel = STREAK > 0 ? `${STREAK} day streak 🔥` : 'Start your streak today';
  const planDayLabel = `Day ${PLAN_DAY} of your plan`;

  const insightText =
    completedCount === 0
      ? 'Your best streak was 12 days. Today is a fresh chance — start strong.'
      : completedCount >= totalCount
      ? 'Perfect execution today. Every priority checked off. Keep this momentum going.'
      : `You've completed ${completedCount} of ${totalCount} priorities today. Finish strong — the last reps count most.`;

  const remainingText =
    completedCount === totalCount ? 'All done — outstanding execution.' : `${totalCount - completedCount} remaining`;

  const sortedPriorities = [
    ...priorities.filter((p) => !p.completed),
    ...priorities.filter((p) => p.completed),
  ];

  // Timer tick
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setIsRunning(false);
            setSessionCount((c) => c + 1);
            console.log('[Focus] Timer completed:', selectedPreset.name);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
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

  function handleHold() {
    setIsRunning(false);
  }

  function handleEndSession() {
    console.log('[Focus] Session ended early:', selectedPreset.name);
    setIsRunning(false);
    const mins = selectedPreset.minutes ?? 25;
    setSecondsLeft(mins * 60);
    setTotalSeconds(mins * 60);
  }

  function togglePriority(id: string) {
    console.log('[Momentum] User toggled priority item:', id);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setPriorities((prev) =>
      prev.map((p) => (p.id === id ? { ...p, completed: !p.completed } : p))
    );
  }

  function handleStatPress(label: string) {
    console.log('[Momentum] User tapped stat card:', label);
  }

  function handlePriorityPress(item: PriorityItem) {
    console.log('[Momentum] User tapped priority item:', item.title, '→', item.navigateTo ?? 'no nav');
    if (item.navigateTo) {
      router.push(item.navigateTo as never);
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.title}>Momentum</Text>
            {STREAK > 0 && (
              <View style={styles.streakBadge}>
                <Text style={styles.streakBadgeText}>{STREAK} day streak 🔥</Text>
              </View>
            )}
          </View>
          <Text style={styles.subtitle}>
            {planDayLabel}
            {'  ·  '}
            {streakLabel}
          </Text>
          <Text style={styles.subtitleMuted}>Stay consistent. Execute your plan.</Text>
        </View>

        {/* ── Stats Grid ── */}
        <View style={styles.statsGrid}>
          <StatCard value={todayWins} label="Today's Wins" onPress={() => handleStatPress("Today's Wins")} />
          <StatCard value={WEEKLY_ADHERENCE} label="Weekly Adherence" onPress={() => handleStatPress('Weekly Adherence')} />
          <StatCard value={NUTRITION_STREAK} label="Nutrition Streak" onPress={() => handleStatPress('Nutrition Streak')} />
          <StatCard value={RECOVERY_SCORE} label="Recovery Score" onPress={() => handleStatPress('Recovery Score')} />
        </View>

        {/* ── Focus Timer ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>Focus Timer</Text>
              <Text style={styles.sectionSubtitle}>Execute with intention</Text>
            </View>
            <AnimatedPressable
              style={styles.changePresetBtn}
              onPress={() => {
                console.log('[Focus] User opened timer presets modal');
                setShowPresetsModal(true);
              }}
            >
              <IconSymbol
                ios_icon_name="slider.horizontal.3"
                android_material_icon_name="tune"
                size={16}
                color={TEAL}
              />
              <Text style={styles.changePresetText}>Change</Text>
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

        {/* ── Today's Priorities ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Priorities</Text>
          <Text style={styles.sectionSubtitle}>{remainingText}</Text>

          {hasPriorities ? (
            sortedPriorities.map((item, index) => (
              <AnimatedListItem key={item.id} index={index}>
                <PriorityRow
                  item={item}
                  onToggle={() => togglePriority(item.id)}
                  onPress={() => handlePriorityPress(item)}
                />
              </AnimatedListItem>
            ))
          ) : (
            <DisciplineEmptyState
              isSignedIn={isSignedIn}
              onSyncPress={() => router.push('/auth' as never)}
              onTrainingPress={() => router.push('/(tabs)/training' as never)}
              onNutritionPress={() => router.push('/(tabs)/nutrition' as never)}
            />
          )}
        </View>

        {/* ── Weekly Heatmap ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>This Week</Text>
          <View style={styles.heatmapCard}>
            {WEEK_DAYS.map((day, i) => (
              <WeekDayDot key={i} day={day} />
            ))}
          </View>
          <View style={styles.heatmapLegend}>
            <LegendDot color={TEAL} label="Complete" />
            <LegendDot color="transparent" border={TEAL} label="Partial" />
            <LegendDot color={colors.card} label="Missed" />
          </View>
        </View>

        {/* ── Momentum Insight ── */}
        <View style={styles.insightCard}>
          <View style={styles.insightAccent} />
          <View style={styles.insightInner}>
            <View style={styles.insightIconRow}>
              <IconSymbol
                ios_icon_name="chart.line.uptrend.xyaxis"
                android_material_icon_name="trending-up"
                size={16}
                color={TEAL}
              />
              <Text style={styles.insightLabel}>Momentum Insight</Text>
            </View>
            <Text style={styles.insightText}>{insightText}</Text>
          </View>
        </View>
      </ScrollView>

      {/* ── Timer Presets Modal ── */}
      <TimerPresetsModal
        visible={showPresetsModal}
        selectedId={selectedPreset.id}
        onSelect={handleSelectPreset}
        onClose={() => {
          console.log('[Focus] User closed timer presets modal');
          setShowPresetsModal(false);
        }}
      />
    </View>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ value, label, onPress }: { value: string; label: string; onPress: () => void }) {
  const displayValue = value === '0' || value === '' ? 'Start today' : value;

  return (
    <AnimatedPressable style={styles.statCard} onPress={onPress}>
      <Text style={styles.statValue}>{displayValue}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </AnimatedPressable>
  );
}

function PriorityRow({
  item,
  onToggle,
  onPress,
}: {
  item: PriorityItem;
  onToggle: () => void;
  onPress: () => void;
}) {
  const badge = BADGE_COLORS[item.category];
  const isCompleted = item.completed;

  return (
    <View style={[styles.priorityCard, isCompleted && styles.priorityCardDone]}>
      {/* Checkbox */}
      <AnimatedPressable
        onPress={onToggle}
        style={styles.checkboxHit}
        accessibilityLabel={isCompleted ? 'Mark incomplete' : 'Mark complete'}
      >
        <IconSymbol
          ios_icon_name={isCompleted ? 'checkmark.circle.fill' : 'circle'}
          android_material_icon_name={isCompleted ? 'check-circle' : 'radio-button-unchecked'}
          size={22}
          color={isCompleted ? TEAL : 'rgba(255,255,255,0.3)'}
        />
      </AnimatedPressable>

      {/* Content */}
      <AnimatedPressable style={styles.priorityContent} onPress={onPress}>
        <View style={styles.priorityTop}>
          <Text style={styles.priorityEmoji}>{item.emoji}</Text>
          <Text
            style={[styles.priorityTitle, isCompleted && styles.priorityTitleDone]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.badgeText, { color: badge.text }]}>{item.category}</Text>
          </View>
        </View>
        <View style={styles.priorityBottom}>
          <Text style={[styles.prioritySubtitle, isCompleted && styles.prioritySubtitleDone]}>
            {item.subtitle}
          </Text>
          {item.navigateTo && !isCompleted && (
            <IconSymbol
              ios_icon_name="chevron.right"
              android_material_icon_name="chevron-right"
              size={16}
              color="rgba(255,255,255,0.3)"
            />
          )}
        </View>
      </AnimatedPressable>
    </View>
  );
}

function WeekDayDot({ day }: { day: WeekDay }) {
  const isFull = day.status === 'full';
  const isPartial = day.status === 'partial';
  const isToday = day.isToday;

  const dotBg = isFull ? TEAL : isPartial ? 'transparent' : 'rgba(255,255,255,0.06)';
  const dotBorder = isFull ? TEAL : isPartial ? TEAL : 'rgba(255,255,255,0.1)';

  return (
    <View style={styles.weekDayCol}>
      <View
        style={[
          styles.weekDot,
          { backgroundColor: dotBg, borderColor: dotBorder },
          isToday && styles.weekDotToday,
        ]}
      />
      <Text style={[styles.weekDayLabel, isToday && styles.weekDayLabelToday]}>
        {day.label}
      </Text>
    </View>
  );
}

function LegendDot({ color, border, label }: { color: string; border?: string; label: string }) {
  const borderWidth = border ? 1.5 : 0;
  const borderColor = border ?? 'transparent';

  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color, borderColor, borderWidth }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: Platform.OS === 'android' ? 52 : 64,
    paddingHorizontal: 20,
    paddingBottom: 120,
  },

  // Header
  header: {
    marginBottom: 28,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 6,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },
  streakBadge: {
    backgroundColor: 'rgba(245,158,11,0.15)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.3)',
  },
  streakBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#f59e0b',
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  subtitleMuted: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.3)',
  },

  // Stats grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 32,
  },
  statCard: {
    width: '47.5%',
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: TEAL,
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },

  // Section
  section: {
    marginBottom: 28,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  changePresetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: TEAL_DIM,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(69,155,155,0.3)',
    marginTop: 2,
  },
  changePresetText: {
    fontSize: 13,
    fontWeight: '600',
    color: TEAL,
  },

  // Priority cards
  priorityCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 12,
  },
  priorityCardDone: {
    opacity: 0.5,
  },
  checkboxHit: {
    paddingTop: 1,
    minWidth: 28,
    minHeight: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priorityContent: {
    flex: 1,
    gap: 5,
  },
  priorityTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  priorityEmoji: {
    fontSize: 16,
  },
  priorityTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  priorityTitleDone: {
    textDecorationLine: 'line-through',
    color: colors.textSecondary,
  },
  badge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  priorityBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 23,
  },
  prioritySubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    flex: 1,
  },
  prioritySubtitleDone: {
    color: 'rgba(255,255,255,0.25)',
  },

  // Heatmap
  heatmapCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 10,
  },
  weekDayCol: {
    alignItems: 'center',
    gap: 8,
  },
  weekDot: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  weekDotToday: {
    shadowColor: TEAL,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 4,
    borderColor: TEAL,
    borderWidth: 2,
    backgroundColor: 'rgba(69,155,155,0.2)',
  },
  weekDayLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  weekDayLabelToday: {
    color: TEAL,
  },
  heatmapLegend: {
    flexDirection: 'row',
    gap: 16,
    paddingLeft: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },
  legendLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.35)',
  },

  // Insight card
  insightCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: 'hidden',
    marginBottom: 8,
  },
  insightAccent: {
    width: 3,
    backgroundColor: TEAL,
  },
  insightInner: {
    flex: 1,
    padding: 16,
    gap: 8,
  },
  insightIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  insightLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: TEAL,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  insightText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 21,
  },
});
