
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Flame, Zap, Moon } from 'lucide-react-native';
import { StreakState, calculateDayScore } from '@/utils/streakEngine';

const C = {
  card: '#1A1E2E',
  primary: '#6C63FF',
  green: '#34D399',
  amber: '#F59E0B',
  text: '#E8EAF6',
  textSecondary: '#8B9CC8',
  textTertiary: '#4A5580',
  empty: '#252A3D',
};

function getDotColor(score: number, isRestDay: boolean): string {
  if (isRestDay) return C.primary;
  if (score >= 80) return C.primary;
  if (score >= 40) return C.green;
  if (score >= 20) return C.amber;
  return C.empty;
}

interface StreakMiniWidgetProps {
  state: StreakState;
}

export function StreakMiniWidget({ state }: StreakMiniWidgetProps) {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // Last 3 days
  const dots = [2, 1, 0].map((offset) => {
    const d = new Date(today);
    d.setDate(today.getDate() - offset);
    const dateStr = d.toISOString().split('T')[0];
    const activity = state.history.find((h) => h.date === dateStr);
    const score = activity ? calculateDayScore(activity) : 0;
    const isRestDay = activity?.restDayScheduled ?? false;
    const isToday = dateStr === todayStr;
    return { score, isRestDay, isToday };
  });

  const streakText = String(state.currentStreak);

  const FlameIcon =
    state.streakType === 'fire' ? (
      <Flame size={16} color="#FF6B35" fill="#FF6B35" />
    ) : state.streakType === 'resting' ? (
      <Moon size={16} color="#9B8FFF" />
    ) : (
      <Zap size={16} color={C.primary} fill={C.primary} />
    );

  return (
    <View style={styles.container}>
      <View style={styles.dotsRow}>
        {dots.map((dot, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              { backgroundColor: dot.score > 0 || dot.isRestDay ? getDotColor(dot.score, dot.isRestDay) : C.empty },
              dot.isToday && styles.dotToday,
            ]}
          />
        ))}
      </View>
      <View style={styles.streakRow}>
        {FlameIcon}
        <Text style={styles.streakText}>{streakText}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: C.card,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(108, 99, 255, 0.15)',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 5,
    alignItems: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotToday: {
    borderWidth: 1.5,
    borderColor: C.primary,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  streakText: {
    fontSize: 15,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
});
