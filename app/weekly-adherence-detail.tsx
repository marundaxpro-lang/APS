
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Dumbbell,
  Apple,
  Moon,
  Target,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  ArrowLeft,
  Calendar,
  Zap,
} from 'lucide-react-native';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { WeekInsightRow } from '@/components/WeekInsightRow';
import { WeekHistoryMini } from '@/components/WeekHistoryMini';
import {
  WeekAdherence,
  WeekInsight,
  DayAdherence,
  getWeekSummaryLabel,
  getNextWeekRecommendations,
  calculateDayAdherenceScore,
} from '@/utils/adherenceEngine';
import { getCurrentWeek, getWeekHistory } from '@/utils/adherenceStore';

const C = {
  background: '#0A0D1A',
  surface: '#12162A',
  card: '#1A1E2E',
  track: '#252A3D',
  green: '#34D399',
  amber: '#F59E0B',
  red: '#EF4444',
  primary: '#6C63FF',
  text: '#E8EAF6',
  textSecondary: '#8B9CC8',
  textTertiary: '#4A5580',
  border: 'rgba(255,255,255,0.06)',
};

function scoreColor(score: number): string {
  if (score >= 80) return C.green;
  if (score >= 50) return C.amber;
  return C.red;
}

function scoreStatusLabel(score: number): string {
  if (score >= 80) return 'On Track';
  if (score >= 60) return 'Solid';
  if (score >= 40) return 'Slipping';
  return 'Needs Work';
}

// ─── Circular progress ring ───────────────────────────────────────────────────
function CircularScore({ score }: { score: number }) {
  const progress = useRef(new Animated.Value(0)).current;
  const color = scoreColor(score);
  const label = getWeekSummaryLabel(score);
  const scoreText = String(score);

  useEffect(() => {
    Animated.timing(progress, {
      toValue: score,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [score]);

  const borderColor = progress.interpolate({
    inputRange: [0, 100],
    outputRange: [C.track, color],
  });

  return (
    <View style={styles.circularWrapper}>
      <Animated.View style={[styles.circularRing, { borderColor }]}>
        <Text style={[styles.circularScore, { color }]}>{scoreText}</Text>
        <Text style={styles.circularPct}>/ 100</Text>
      </Animated.View>
      <Text style={[styles.circularLabel, { color }]}>{label}</Text>
    </View>
  );
}

// ─── Day indicator strip ──────────────────────────────────────────────────────
function DayIndicatorStrip({ days }: { days: DayAdherence[] }) {
  const todayStr = new Date().toISOString().split('T')[0];
  return (
    <View style={styles.dayStrip}>
      {days.map((day) => {
        const s = calculateDayAdherenceScore(day);
        const isToday = day.date === todayStr;
        const isFuture = day.date > todayStr;
        const bg = isFuture ? C.track : scoreColor(s);
        const opacity = isFuture ? 0.35 : 1;
        const scoreText = isFuture ? '' : String(s);
        return (
          <View key={day.date} style={styles.dayIndicatorCol}>
            <View style={[styles.dayIndicator, { backgroundColor: bg, opacity }, isToday && styles.dayIndicatorToday]}>
              <Text style={styles.dayIndicatorScore}>{scoreText}</Text>
            </View>
            <Text style={styles.dayIndicatorLabel}>{day.dayOfWeek}</Text>
          </View>
        );
      })}
    </View>
  );
}

// ─── Expandable category section ─────────────────────────────────────────────
interface CategorySectionProps {
  title: string;
  icon: React.ReactNode;
  score: number;
  days: DayAdherence[];
  insights: WeekInsight[];
  categoryKey: 'workout' | 'nutrition' | 'recovery' | 'priorities';
}

function CategorySection({ title, icon, score, days, insights, categoryKey }: CategorySectionProps) {
  const [expanded, setExpanded] = useState(false);
  const color = scoreColor(score);
  const status = scoreStatusLabel(score);
  const scoreText = String(score);
  const catInsights = insights.filter(i => i.category === categoryKey);

  const handleToggle = () => {
    console.log('[WeeklyAdherenceDetail] User toggled category section:', title, !expanded ? 'expanded' : 'collapsed');
    setExpanded(v => !v);
  };

  return (
    <View style={styles.categorySection}>
      <AnimatedPressable onPress={handleToggle} style={styles.categorySectionHeader}>
        <View style={styles.categorySectionLeft}>
          {icon}
          <Text style={styles.categorySectionTitle}>{title}</Text>
        </View>
        <View style={styles.categorySectionRight}>
          <Text style={[styles.categorySectionScore, { color }]}>{scoreText}%</Text>
          <View style={[styles.statusBadge, { backgroundColor: `${color}20` }]}>
            <Text style={[styles.statusBadgeText, { color }]}>{status}</Text>
          </View>
          {expanded ? (
            <ChevronUp size={16} color={C.textTertiary} />
          ) : (
            <ChevronDown size={16} color={C.textTertiary} />
          )}
        </View>
      </AnimatedPressable>

      {expanded && (
        <View style={styles.categorySectionBody}>
          <DayIndicatorStrip days={days} />
          {catInsights.map((insight, i) => (
            <WeekInsightRow key={i} insight={insight} />
          ))}
          {catInsights.length === 0 && (
            <Text style={styles.noInsightText}>No specific insights for this category this week.</Text>
          )}
        </View>
      )}
    </View>
  );
}

// ─── Recommendation card ──────────────────────────────────────────────────────
function RecommendationCard({ text, index }: { text: string; index: number }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 350, delay: index * 80, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 350, delay: index * 80, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[styles.recCard, { opacity, transform: [{ translateY }] }]}>
      <View style={styles.recIconWrap}>
        <Zap size={16} color={C.primary} />
      </View>
      <Text style={styles.recText}>{text}</Text>
    </Animated.View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function WeeklyAdherenceDetailScreen() {
  const router = useRouter();
  const [week, setWeek] = useState<WeekAdherence | null>(null);
  const [history, setHistory] = useState<WeekAdherence[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    console.log('[WeeklyAdherenceDetail] Loading week adherence data');
    const [currentWeek, weekHistory] = await Promise.all([
      getCurrentWeek(),
      getWeekHistory(),
    ]);
    setWeek(currentWeek);
    setHistory(weekHistory);
    console.log('[WeeklyAdherenceDetail] Loaded week, overall score:', currentWeek.scores.overall);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    console.log('[WeeklyAdherenceDetail] User pulled to refresh');
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  if (!week) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const { scores, days, insights } = week;
  const recommendations = getNextWeekRecommendations(week);

  // Date range label
  const startDate = new Date(week.weekStartDate);
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const dateRange = `${fmt(startDate)} – ${fmt(endDate)}`;

  // History labels
  const historyWithCurrent = [week, ...history].slice(0, 8);

  return (
    <View style={styles.container}>
      {/* Custom header */}
      <View style={styles.header}>
        <AnimatedPressable
          onPress={() => {
            console.log('[WeeklyAdherenceDetail] User tapped back button');
            router.back();
          }}
          style={styles.backButton}
        >
          <ArrowLeft size={22} color={C.text} />
        </AnimatedPressable>
        <Text style={styles.headerTitle}>Weekly Adherence</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={C.primary}
          />
        }
      >
        {/* ── Top score ring ── */}
        <View style={styles.topSection}>
          <CircularScore score={scores.overall} />
          <View style={styles.dateRow}>
            <Calendar size={13} color={C.textTertiary} />
            <Text style={styles.dateRangeText}>{dateRange}</Text>
          </View>
        </View>

        {/* ── Category breakdown ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Category Breakdown</Text>
          <View style={styles.categorySections}>
            <CategorySection
              title="Workouts"
              icon={<Dumbbell size={18} color={C.textSecondary} />}
              score={scores.workout}
              days={days}
              insights={insights}
              categoryKey="workout"
            />
            <CategorySection
              title="Nutrition"
              icon={<Apple size={18} color={C.textSecondary} />}
              score={scores.nutrition}
              days={days}
              insights={insights}
              categoryKey="nutrition"
            />
            <CategorySection
              title="Recovery"
              icon={<Moon size={18} color={C.textSecondary} />}
              score={scores.recovery}
              days={days}
              insights={insights}
              categoryKey="recovery"
            />
            <CategorySection
              title="Priorities"
              icon={<Target size={18} color={C.textSecondary} />}
              score={scores.priorities}
              days={days}
              insights={insights}
              categoryKey="priorities"
            />
          </View>
        </View>

        {/* ── Insights ── */}
        {insights.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Insights</Text>
            <View style={styles.insightsCard}>
              {insights.map((insight, i) => (
                <WeekInsightRow key={i} insight={insight} />
              ))}
            </View>
          </View>
        )}

        {/* ── Next week recommendations ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Next Week</Text>
          <Text style={styles.sectionSubtitle}>Recommendations based on this week</Text>
          <View style={styles.recsContainer}>
            {recommendations.map((rec, i) => (
              <RecommendationCard key={i} text={rec} index={i} />
            ))}
          </View>
        </View>

        {/* ── Week history ── */}
        {historyWithCurrent.length > 1 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>History</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.historyScroll}
            >
              {historyWithCurrent.map((w, i) => {
                const wStart = new Date(w.weekStartDate);
                const wLabel = i === 0 ? 'Now' : `W-${i}`;
                return (
                  <WeekHistoryMini
                    key={w.weekStartDate}
                    week={w}
                    label={wLabel}
                    isCurrentWeek={i === 0}
                  />
                );
              })}
            </ScrollView>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: C.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: C.textSecondary,
    fontSize: 15,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: C.background,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    color: C.text,
    letterSpacing: -0.2,
  },
  headerSpacer: {
    width: 40,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 100,
    gap: 28,
  },
  // Top section
  topSection: {
    alignItems: 'center',
    gap: 12,
    paddingTop: 8,
  },
  circularWrapper: {
    alignItems: 'center',
    gap: 10,
  },
  circularRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.card,
  },
  circularScore: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -1,
  },
  circularPct: {
    fontSize: 12,
    color: C.textTertiary,
    fontWeight: '500',
    marginTop: -2,
  },
  circularLabel: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dateRangeText: {
    fontSize: 13,
    color: C.textTertiary,
    fontWeight: '500',
  },
  // Sections
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: C.text,
    letterSpacing: -0.2,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: C.textSecondary,
    marginTop: -8,
  },
  // Category sections
  categorySections: {
    gap: 8,
  },
  categorySection: {
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  categorySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  categorySectionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  categorySectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: C.text,
  },
  categorySectionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categorySectionScore: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  statusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  categorySectionBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  noInsightText: {
    fontSize: 13,
    color: C.textTertiary,
    fontStyle: 'italic',
    paddingVertical: 4,
  },
  // Day strip
  dayStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
  },
  dayIndicatorCol: {
    alignItems: 'center',
    gap: 4,
  },
  dayIndicator: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayIndicatorToday: {
    borderWidth: 2,
    borderColor: '#fff',
  },
  dayIndicatorScore: {
    fontSize: 9,
    fontWeight: '800',
    color: '#fff',
  },
  dayIndicatorLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: C.textTertiary,
  },
  // Insights card
  insightsCard: {
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
  },
  // Recommendations
  recsContainer: {
    gap: 10,
  },
  recCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
  },
  recIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(108,99,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  recText: {
    flex: 1,
    fontSize: 14,
    color: C.text,
    lineHeight: 20,
    fontWeight: '500',
  },
  // History
  historyScroll: {
    gap: 8,
    paddingRight: 4,
  },
});
