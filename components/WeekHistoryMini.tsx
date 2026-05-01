
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { WeekAdherence, getWeekSummaryLabel } from '@/utils/adherenceEngine';

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

interface Props {
  week: WeekAdherence;
  label: string;
  isCurrentWeek?: boolean;
}

export function WeekHistoryMini({ week, label, isCurrentWeek }: Props) {
  const score = week.scores.overall;
  const color = scoreColor(score);
  const scoreText = String(score);

  const arcProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(arcProgress, {
      toValue: score,
      duration: 600,
      useNativeDriver: false,
    }).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score]);

  const borderColor = arcProgress.interpolate({
    inputRange: [0, 100],
    outputRange: [C.track, color],
  });

  return (
    <View style={[styles.card, isCurrentWeek && styles.cardCurrent]}>
      <Text style={styles.label} numberOfLines={1}>{label}</Text>
      <Animated.View style={[styles.ring, { borderColor }]}>
        <Text style={[styles.scoreText, { color }]}>{scoreText}</Text>
      </Animated.View>
      <Text style={styles.sublabel} numberOfLines={1}>
        {isCurrentWeek ? 'This week' : getWeekSummaryLabel(score).split(' ')[0]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 72,
    backgroundColor: C.bg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 6,
    gap: 6,
  },
  cardCurrent: {
    borderColor: 'rgba(108,99,255,0.4)',
    backgroundColor: 'rgba(108,99,255,0.08)',
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: C.textSecondary,
    textAlign: 'center',
  },
  ring: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  sublabel: {
    fontSize: 10,
    fontWeight: '500',
    color: C.textTertiary,
    textAlign: 'center',
  },
});
