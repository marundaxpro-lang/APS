
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Flame } from 'lucide-react-native';

interface HabitStreakBadgeProps {
  streakCount: number;
  size?: 'sm' | 'md';
}

export function HabitStreakBadge({ streakCount, size = 'sm' }: HabitStreakBadgeProps) {
  if (streakCount < 2) return null;

  const streakColor = streakCount >= 14 ? '#EF4444' : streakCount >= 7 ? '#F97316' : '#F59E0B';
  const iconSize = size === 'md' ? 13 : 11;
  const fontSize = size === 'md' ? 12 : 11;

  return (
    <View style={[styles.badge, { backgroundColor: `${streakColor}18` }]}>
      <Flame size={iconSize} color={streakColor} strokeWidth={2} />
      <Text style={[styles.text, { color: streakColor, fontSize }]}>{streakCount}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  text: {
    fontWeight: '700',
    letterSpacing: -0.2,
  },
});
