
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Dumbbell, Apple, Moon, Target, ChevronRight, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react-native';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { WeekAdherence, WeekInsight, getWeekSummaryLabel, calculateDayAdherenceScore } from '@/utils/adherenceEngine';

const C = {
  bg: '#1A1E2E',
  track: '#252A3D',
  green: '#34D399',
  amber: '#F59E0B',
  red: '#EF4444',
  primary: '#6C63FF',
  text: '#E8EAF6',
  textSecondary: '#8B9CC8',
  textTertiary: '#4A5580',
};

function scoreColor(score: number): string {
  if (score >= 80) return C.green;
  if (score >= 50) return C.amber;
  return C.red;
}

function insightBg(type: WeekInsight['type']): string {
  if (type === 'strong' || type === 'on_track') return 'rgba(52,211,153,0.12)';
  if (type === 'slipping' || type === 'needs_attention') return 'rgba(245,158,11,0.12)';
  return 'rgba(108,99,255,0.12)';
}

function insightTextColor(type: WeekInsight['type']): string {
  if (type === 'strong' || type === 'on_track') return C.green;
  if (type === 'slipping' || type === 'needs_attention') return C.amber;
  return C.primary;
}

interface AnimatedBarProps {
  score: number;
  delay: number;
}

function AnimatedBar({ score, delay }: AnimatedBarProps) {
  const width = useRef(new Animated.Value(0)).current;
  const color = scoreColor(score);

  useEffect(() => {
    Animated.timing(width, {
      toValue: score,
      duration: 600,
      delay,
      useNativeDriver: false,
    }).start();
  }, [score, delay]);

  const widthInterpolated = width.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.barTrack}>
      <Animated.View
        style={[
          styles.barFill,
          { width: widthInterpolated, backgroundColor: color },
        ]}
      />
    </View>
  );
}

interface CategoryRowProps {
  icon: React.ReactNode;
  label: string;
  score: number;
  delay: number;
}

function CategoryRow({ icon, label, score, delay }: CategoryRowProps) {
  const color = scoreColor(score);
  const scoreText = String(score);
  return (
    <View style={styles.categoryRow}>
      <View style={styles.categoryLeft}>
        {icon}
        <Text style={styles.categoryLabel}>{label}</Text>
      </View>
      <View style={styles.categoryCenter}>
        <AnimatedBar score={score} delay={delay} />
      </View>
      <Text style={[styles.categoryScore, { color }]}>{scoreText}%</Text>
    </View>
  );
}

interface DayDotProps {
  score: number;
  label: string;
  isToday: boolean;
  isFuture: boolean;
}

function DayDot({ score, label, isToday, isFuture }: DayDotProps) {
  const bg = isFuture ? C.track : scoreColor(score);
  const opacity = isFuture ? 0.4 : 1;
  return (
    <View style={styles.dayDotWrapper}>
      <View
        style={[
          styles.dayDot,
          { backgroundColor: bg, opacity },
          isToday && styles.dayDotToday,
        ]}
      >
        <Text style={styles.dayDotLabel}>{label}</Text>
      </View>
    </View>
  );
}

interface Props {
  week: WeekAdherence;
}

export function WeeklyAdherenceCard({ week }: Props) {
  const router = useRouter();
  const { scores, days, insights } = week;

  const overallLabel = getWeekSummaryLabel(scores.overall);
  const overallText = String(scores.overall);
  const overallColor = scoreColor(scores.overall);

  const todayStr = new Date().toISOString().split('T')[0];

  const topInsight = insights[0] ?? null;
  const insightMessage = topInsight?.message ?? '';
  const insightType = topInsight?.type ?? 'on_track';
  const insightColor = topInsight ? insightTextColor(insightType) : C.primary;
  const insightBgColor = topInsight ? insightBg(insightType) : 'rgba(108,99,255,0.12)';

  const handlePress = () => {
    console.log('[WeeklyAdherenceCard] User tapped card → navigating to weekly-adherence-detail');
    router.push('/weekly-adherence-detail' as any);
  };

  return (
    <AnimatedPressable style={styles.card} onPress={handlePress}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TrendingUp size={16} color={C.primary} />
          <Text style={styles.headerTitle}>This Week</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={[styles.overallScore, { color: overallColor }]}>{overallText}</Text>
          <Text style={styles.overallLabel}>{overallLabel}</Text>
          <ChevronRight size={16} color={C.textTertiary} />
        </View>
      </View>

      {/* Category bars */}
      <View style={styles.categoriesSection}>
        <CategoryRow
          icon={<Dumbbell size={14} color={C.textSecondary} />}
          label="Workouts"
          score={scores.workout}
          delay={0}
        />
        <CategoryRow
          icon={<Apple size={14} color={C.textSecondary} />}
          label="Nutrition"
          score={scores.nutrition}
          delay={100}
        />
        <CategoryRow
          icon={<Moon size={14} color={C.textSecondary} />}
          label="Recovery"
          score={scores.recovery}
          delay={200}
        />
        <CategoryRow
          icon={<Target size={14} color={C.textSecondary} />}
          label="Priorities"
          score={scores.priorities}
          delay={300}
        />
      </View>

      {/* 7-day strip */}
      <View style={styles.dayStrip}>
        {days.map((day) => {
          const dayScore = calculateDayAdherenceScore(day);
          const isToday = day.date === todayStr;
          const isFuture = day.date > todayStr;
          return (
            <DayDot
              key={day.date}
              score={dayScore}
              label={day.dayOfWeek.charAt(0)}
              isToday={isToday}
              isFuture={isFuture}
            />
          );
        })}
      </View>

      {/* Insight pill */}
      {topInsight && (
        <View style={[styles.insightPill, { backgroundColor: insightBgColor }]}>
          {insightType === 'strong' || insightType === 'on_track' ? (
            <CheckCircle size={13} color={insightColor} />
          ) : (
            <AlertCircle size={13} color={insightColor} />
          )}
          <Text style={[styles.insightText, { color: insightColor }]} numberOfLines={1}>
            {insightMessage}
          </Text>
        </View>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.bg,
    borderRadius: 16,
    borderCurve: 'continuous',
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(108,99,255,0.15)',
    gap: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: C.text,
    letterSpacing: -0.2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  overallScore: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  overallLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: C.textSecondary,
    marginLeft: 2,
  },
  categoriesSection: {
    gap: 10,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    width: 84,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: C.textSecondary,
  },
  categoryCenter: {
    flex: 1,
  },
  barTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: C.track,
    overflow: 'hidden',
  },
  barFill: {
    height: 6,
    borderRadius: 3,
  },
  categoryScore: {
    fontSize: 12,
    fontWeight: '700',
    width: 34,
    textAlign: 'right',
  },
  dayStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  dayDotWrapper: {
    alignItems: 'center',
  },
  dayDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayDotToday: {
    borderWidth: 2,
    borderColor: '#fff',
  },
  dayDotLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  insightPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  insightText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
});
