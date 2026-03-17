
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { AnimatedPressable } from '@/components/AnimatedPressable';

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

// ─── Constants ────────────────────────────────────────────────────────────────

const TEAL = colors.primary;
const TEAL_DIM = 'rgba(69,155,155,0.15)';

const BADGE_COLORS: Record<PriorityCategory, { bg: string; text: string }> = {
  Workout: { bg: TEAL_DIM, text: TEAL },
  Nutrition: { bg: 'rgba(245,158,11,0.15)', text: '#f59e0b' },
  Recovery: { bg: 'rgba(99,102,241,0.15)', text: '#818cf8' },
  Habit: { bg: 'rgba(34,197,94,0.15)', text: '#4ade80' },
};

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

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function MomentumScreen() {
  const router = useRouter();
  const [priorities, setPriorities] = useState<PriorityItem[]>(INITIAL_PRIORITIES);

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

        {/* ── Today's Priorities ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Priorities</Text>
          <Text style={styles.sectionSubtitle}>{remainingText}</Text>

          {sortedPriorities.map((item, index) => (
            <AnimatedListItem key={item.id} index={index}>
              <PriorityRow
                item={item}
                onToggle={() => togglePriority(item.id)}
                onPress={() => handlePriorityPress(item)}
              />
            </AnimatedListItem>
          ))}
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
    marginBottom: 14,
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
