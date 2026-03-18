
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  RefreshControl,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import {
  Droplets, Egg, ChefHat, Zap, Activity, Circle, Moon,
  Flame, ClipboardList, CheckSquare, BarChart2, Camera,
  Footprints, Lock, Check, SlidersHorizontal,
} from 'lucide-react-native';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { HabitStreakBadge } from '@/components/HabitStreakBadge';
import { Habit, HabitCategory, HABIT_LIBRARY, getHabitInsight } from '@/utils/habitEngine';
import { getHabits, saveHabits, toggleHabit, completeHabit, seedDemoHabits } from '@/utils/habitStore';
import { colors } from '@/styles/commonStyles';

const ICON_MAP: Record<string, React.ComponentType<{ size: number; color: string; strokeWidth?: number }>> = {
  Droplets, Egg, ChefHat, Zap, Activity, Circle, Moon,
  Flame, ClipboardList, CheckSquare, BarChart2, Camera, Footprints,
};

const CATEGORY_TABS: { key: 'all' | HabitCategory; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'hydration', label: 'Hydration' },
  { key: 'nutrition', label: 'Nutrition' },
  { key: 'recovery', label: 'Recovery' },
  { key: 'sleep', label: 'Sleep' },
  { key: 'training', label: 'Training' },
  { key: 'consistency', label: 'Consistency' },
];

const CATEGORY_COLORS: Record<HabitCategory, string> = {
  hydration: '#38BDF8',
  nutrition: '#F97316',
  recovery: '#34D399',
  sleep: '#A78BFA',
  training: '#6C63FF',
  consistency: '#F59E0B',
};

const CATEGORY_ORDER: HabitCategory[] = [
  'hydration', 'nutrition', 'recovery', 'sleep', 'training', 'consistency',
];

const CATEGORY_LABELS: Record<HabitCategory, string> = {
  hydration: 'Hydration',
  nutrition: 'Nutrition',
  recovery: 'Recovery',
  sleep: 'Sleep',
  training: 'Training',
  consistency: 'Consistency',
};

// Circular progress ring
function ProgressRing({ progress, size = 80 }: { progress: number; size?: number }) {
  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - Math.min(1, progress));

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 5,
          borderColor: 'rgba(255,255,255,0.08)',
          position: 'absolute',
        }}
      />
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 5,
          borderColor: '#34D399',
          position: 'absolute',
          borderTopColor: progress > 0.25 ? '#34D399' : 'transparent',
          borderRightColor: progress > 0.5 ? '#34D399' : 'transparent',
          borderBottomColor: progress > 0.75 ? '#34D399' : 'transparent',
          borderLeftColor: progress > 0 ? '#34D399' : 'transparent',
          transform: [{ rotate: '-90deg' }],
        }}
      />
      <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text, letterSpacing: -0.5 }}>
        {Math.round(progress * 100)}
      </Text>
      <Text style={{ fontSize: 9, fontWeight: '600', color: colors.grey, marginTop: -2 }}>%</Text>
    </View>
  );
}

interface HabitRowProps {
  habit: Habit;
  onToggle: (id: string, active: boolean) => void;
  onComplete: (id: string) => void;
  index: number;
}

function HabitRow({ habit, onToggle, onComplete, index }: HabitRowProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 300, delay: index * 40, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 300, delay: index * 40, useNativeDriver: true }),
    ]).start();
  }, []);

  const IconComponent = ICON_MAP[habit.icon] || Flame;
  const insight = getHabitInsight(habit);
  const categoryColor = CATEGORY_COLORS[habit.category];

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      <View style={[styles.habitRow, !habit.isActive && styles.habitRowInactive]}>
        {/* Icon */}
        <View style={[styles.habitRowIcon, { backgroundColor: `${categoryColor}20` }]}>
          <IconComponent size={18} color={categoryColor} strokeWidth={2} />
        </View>

        {/* Text */}
        <View style={styles.habitRowText}>
          <View style={styles.habitRowTitleLine}>
            <Text style={[styles.habitRowTitle, !habit.isActive && styles.habitRowTitleMuted]} numberOfLines={1}>
              {habit.title}
            </Text>
            {habit.isPremium && (
              <View style={styles.premiumBadge}>
                <Lock size={9} color="#F59E0B" strokeWidth={2} />
                <Text style={styles.premiumBadgeText}>Pro</Text>
              </View>
            )}
          </View>
          <View style={styles.habitRowMeta}>
            <Text style={styles.habitRowInsight}>{insight}</Text>
            {habit.isActive && habit.streakCount >= 2 && (
              <HabitStreakBadge streakCount={habit.streakCount} size="sm" />
            )}
          </View>
        </View>

        {/* Right side */}
        <View style={styles.habitRowRight}>
          {habit.isActive && habit.completedToday && (
            <View style={styles.completedDot}>
              <Check size={10} color="#fff" strokeWidth={2.5} />
            </View>
          )}
          <Switch
            value={habit.isActive}
            onValueChange={(val) => {
              console.log('[Habits] User toggled habit:', habit.id, 'active:', val);
              onToggle(habit.id, val);
            }}
            trackColor={{ false: 'rgba(255,255,255,0.1)', true: `${categoryColor}60` }}
            thumbColor={habit.isActive ? categoryColor : '#4A5580'}
            ios_backgroundColor="rgba(255,255,255,0.1)"
          />
        </View>
      </View>
    </Animated.View>
  );
}

// A compact row used in the Customize panel (grouped by category)
interface CustomizeRowProps {
  habit: Habit;
  onToggle: (id: string, active: boolean) => void;
}

function CustomizeRow({ habit, onToggle }: CustomizeRowProps) {
  const IconComponent = ICON_MAP[habit.icon] || Flame;
  const categoryColor = CATEGORY_COLORS[habit.category];

  return (
    <View style={styles.customizeRow}>
      <View style={[styles.customizeRowIcon, { backgroundColor: `${categoryColor}18` }]}>
        <IconComponent size={16} color={categoryColor} strokeWidth={2} />
      </View>
      <View style={styles.customizeRowText}>
        <Text style={styles.customizeRowTitle} numberOfLines={1}>{habit.title}</Text>
        <Text style={styles.customizeRowDesc} numberOfLines={1}>{habit.description}</Text>
      </View>
      {habit.isPremium && (
        <View style={styles.premiumBadge}>
          <Lock size={9} color="#F59E0B" strokeWidth={2} />
          <Text style={styles.premiumBadgeText}>Pro</Text>
        </View>
      )}
      <Switch
        value={habit.isActive}
        onValueChange={(val) => {
          console.log('[Habits] Customize panel toggled habit:', habit.id, 'active:', val);
          onToggle(habit.id, val);
        }}
        trackColor={{ false: 'rgba(255,255,255,0.1)', true: `${categoryColor}60` }}
        thumbColor={habit.isActive ? categoryColor : '#4A5580'}
        ios_backgroundColor="rgba(255,255,255,0.1)"
      />
    </View>
  );
}

export default function HabitsScreen() {
  const router = useRouter();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<'all' | HabitCategory>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showCustomize, setShowCustomize] = useState(false);

  const loadHabits = useCallback(async () => {
    try {
      await seedDemoHabits();
      const all = await getHabits();
      setHabits(all);
      console.log('[Habits] Loaded habits:', all.length);
    } catch (e) {
      console.error('[Habits] Error loading habits:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHabits();
  }, []);

  const handleRefresh = useCallback(async () => {
    console.log('[Habits] User pulled to refresh');
    setRefreshing(true);
    await loadHabits();
    setRefreshing(false);
  }, [loadHabits]);

  const handleToggle = useCallback(async (id: string, active: boolean) => {
    await toggleHabit(id, active);
    const all = await getHabits();
    setHabits(all);
  }, []);

  const handleComplete = useCallback(async (id: string) => {
    console.log('[Habits] User completed habit from management screen:', id);
    await completeHabit(id);
    const all = await getHabits();
    setHabits(all);
  }, []);

  const filteredHabits = selectedCategory === 'all'
    ? habits
    : habits.filter(h => h.category === selectedCategory);

  const activeHabits = filteredHabits.filter(h => h.isActive);
  const inactiveHabits = filteredHabits.filter(h => !h.isActive);

  const allActive = habits.filter(h => h.isActive);
  const completedTodayCount = allActive.filter(h => h.completedToday).length;
  const totalActiveCount = allActive.length;
  const progressRatio = totalActiveCount > 0 ? completedTodayCount / totalActiveCount : 0;

  const totalXpToday = allActive
    .filter(h => h.completedToday)
    .reduce((sum, h) => sum + h.xpReward, 0);

  const activeCountText = `${totalActiveCount} habit${totalActiveCount === 1 ? '' : 's'} active`;
  const xpText = `+${totalXpToday} XP today`;

  // Group all habits by category for the customize panel
  const habitsByCategory: Record<HabitCategory, Habit[]> = {
    hydration: [],
    nutrition: [],
    recovery: [],
    sleep: [],
    training: [],
    consistency: [],
  };
  for (const h of habits) {
    habitsByCategory[h.category].push(h);
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'My Habits',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          headerBackTitle: 'Back',
          headerRight: () => (
            <TouchableOpacity
              onPress={() => {
                console.log('[Habits] User tapped Customize Habits button, showCustomize:', !showCustomize);
                setShowCustomize(v => !v);
              }}
              style={styles.headerCustomizeBtn}
              activeOpacity={0.7}
            >
              <SlidersHorizontal size={18} color={showCustomize ? colors.primary : colors.grey} strokeWidth={2} />
              <Text style={[styles.headerCustomizeBtnText, showCustomize && { color: colors.primary }]}>
                Customize
              </Text>
            </TouchableOpacity>
          ),
        }}
      />
      <View style={styles.container}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
        >
          {/* Summary card */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryLeft}>
              <Text style={styles.summaryActiveCount}>{activeCountText}</Text>
              <Text style={styles.summaryXp}>{xpText}</Text>
              <View style={styles.summaryProgressBar}>
                <View style={[styles.summaryProgressFill, { width: `${progressRatio * 100}%` }]} />
              </View>
              <Text style={styles.summaryProgressLabel}>
                {completedTodayCount}/{totalActiveCount} done today
              </Text>
            </View>
            <ProgressRing progress={progressRatio} size={80} />
          </View>

          {/* ── Customize Habits panel ── */}
          {showCustomize && (
            <View style={styles.customizePanel}>
              <View style={styles.customizePanelHeader}>
                <SlidersHorizontal size={16} color={colors.primary} strokeWidth={2} />
                <Text style={styles.customizePanelTitle}>Customize Habits</Text>
              </View>
              <Text style={styles.customizePanelSubtitle}>
                Toggle any habit on or off. Active habits appear in your daily list.
              </Text>

              {CATEGORY_ORDER.map(cat => {
                const catHabits = habitsByCategory[cat];
                if (catHabits.length === 0) return null;
                const catColor = CATEGORY_COLORS[cat];
                return (
                  <View key={cat} style={styles.customizeCategoryBlock}>
                    <View style={[styles.customizeCategoryHeader, { borderLeftColor: catColor }]}>
                      <Text style={[styles.customizeCategoryLabel, { color: catColor }]}>
                        {CATEGORY_LABELS[cat].toUpperCase()}
                      </Text>
                    </View>
                    {catHabits.map(h => (
                      <CustomizeRow key={h.id} habit={h} onToggle={handleToggle} />
                    ))}
                  </View>
                );
              })}
            </View>
          )}

          {/* Category tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsContent}
            style={styles.tabs}
          >
            {CATEGORY_TABS.map(tab => {
              const isSelected = selectedCategory === tab.key;
              const tabColor = tab.key === 'all' ? colors.primary : CATEGORY_COLORS[tab.key as HabitCategory];
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[
                    styles.tab,
                    isSelected && { backgroundColor: `${tabColor}22`, borderColor: `${tabColor}60` },
                  ]}
                  onPress={() => {
                    console.log('[Habits] User selected category tab:', tab.key);
                    setSelectedCategory(tab.key);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.tabText, isSelected && { color: tabColor }]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Active habits */}
          {activeHabits.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>ACTIVE</Text>
              <View style={styles.habitList}>
                {activeHabits.map((habit, i) => (
                  <HabitRow
                    key={habit.id}
                    habit={habit}
                    onToggle={handleToggle}
                    onComplete={handleComplete}
                    index={i}
                  />
                ))}
              </View>
            </View>
          )}

          {/* Inactive habits */}
          {inactiveHabits.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>ADD A HABIT</Text>
              <View style={styles.habitList}>
                {inactiveHabits.map((habit, i) => (
                  <HabitRow
                    key={habit.id}
                    habit={habit}
                    onToggle={handleToggle}
                    onComplete={handleComplete}
                    index={activeHabits.length + i}
                  />
                ))}
              </View>
            </View>
          )}

          {filteredHabits.length === 0 && !loading && (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <CheckSquare size={28} color={colors.primary} strokeWidth={1.5} />
              </View>
              <Text style={styles.emptyTitle}>No habits here yet</Text>
              <Text style={styles.emptySubtitle}>Switch to a different category or add habits from the list above</Text>
            </View>
          )}
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 100,
    gap: 24,
  },

  // Header customize button
  headerCustomizeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  headerCustomizeBtnText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.grey,
  },

  // Summary card
  summaryCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryLeft: {
    flex: 1,
    gap: 4,
    paddingRight: 16,
  },
  summaryActiveCount: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.3,
  },
  summaryXp: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6C63FF',
    marginBottom: 8,
  },
  summaryProgressBar: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  summaryProgressFill: {
    height: '100%',
    backgroundColor: '#34D399',
    borderRadius: 2,
  },
  summaryProgressLabel: {
    fontSize: 12,
    color: colors.grey,
    fontWeight: '500',
  },

  // Customize panel
  customizePanel: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 16,
    gap: 12,
  },
  customizePanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  customizePanelTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.2,
  },
  customizePanelSubtitle: {
    fontSize: 13,
    color: colors.grey,
    lineHeight: 18,
    marginTop: -4,
  },
  customizeCategoryBlock: {
    gap: 6,
  },
  customizeCategoryHeader: {
    borderLeftWidth: 3,
    paddingLeft: 8,
    marginBottom: 2,
  },
  customizeCategoryLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  customizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  customizeRowIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  customizeRowText: {
    flex: 1,
    gap: 2,
  },
  customizeRowTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    letterSpacing: -0.1,
  },
  customizeRowDesc: {
    fontSize: 11,
    color: colors.grey,
  },

  // Category tabs
  tabs: {
    marginHorizontal: -20,
  },
  tabsContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.grey,
  },

  // Sections
  section: {
    gap: 10,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.grey,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  habitList: {
    gap: 8,
  },
  habitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  habitRowInactive: {
    opacity: 0.6,
  },
  habitRowIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  habitRowText: {
    flex: 1,
    gap: 3,
  },
  habitRowTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  habitRowTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    letterSpacing: -0.1,
    flexShrink: 1,
  },
  habitRowTitleMuted: {
    color: colors.grey,
  },
  habitRowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  habitRowInsight: {
    fontSize: 12,
    color: colors.grey,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(245,158,11,0.15)',
    borderRadius: 5,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  premiumBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#F59E0B',
  },
  habitRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  completedDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#34D399',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(69,155,155,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.grey,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 20,
  },
});
