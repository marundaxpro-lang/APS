
import React, { useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  Droplets, Egg, ChefHat, Zap, Activity, Circle, Moon,
  Flame, ClipboardList, CheckSquare, BarChart2, Camera,
  Footprints, Check,
} from 'lucide-react-native';
import { AnimatedPressable } from './AnimatedPressable';
import { HabitStreakBadge } from './HabitStreakBadge';
import { Habit } from '@/utils/habitEngine';
import { colors } from '@/styles/commonStyles';

const ICON_MAP: Record<string, React.ComponentType<{ size: number; color: string; strokeWidth?: number }>> = {
  Droplets, Egg, ChefHat, Zap, Activity, Circle, Moon,
  Flame, ClipboardList, CheckSquare, BarChart2, Camera, Footprints,
};

interface HabitCardProps {
  habit: Habit;
  onComplete: (habitId: string) => void;
  index?: number;
}

export function HabitCard({ habit, onComplete, index = 0 }: HabitCardProps) {
  const checkScale = useRef(new Animated.Value(habit.completedToday ? 1 : 0)).current;
  const cardOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (habit.completedToday) {
      Animated.spring(checkScale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 20,
        bounciness: 12,
      }).start();
      Animated.timing(cardOpacity, {
        toValue: 0.6,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      checkScale.setValue(0);
      cardOpacity.setValue(1);
    }
  }, [habit.completedToday]);

  const handlePress = useCallback(async () => {
    if (habit.completedToday) return;
    console.log('[HabitCard] User tapped habit to complete:', habit.id, habit.title);

    // Haptic feedback on iOS
    if (Platform.OS === 'ios') {
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (_) {}
    }

    onComplete(habit.id);
  }, [habit.completedToday, habit.id, habit.title, onComplete]);

  const IconComponent = ICON_MAP[habit.icon] || Flame;

  const durationLabel = habit.durationMinutes === 0 ? 'Instant' : `${habit.durationMinutes} min`;
  const titleStyle = habit.completedToday
    ? [styles.title, styles.titleCompleted]
    : styles.title;

  return (
    <Animated.View style={{ opacity: cardOpacity }}>
      <AnimatedPressable
        style={styles.card}
        onPress={handlePress}
        scaleValue={0.98}
      >
        {/* Left: icon circle */}
        <View style={[styles.iconCircle, { backgroundColor: `${habit.color}26` }]}>
          <IconComponent size={20} color={habit.color} strokeWidth={2} />
        </View>

        {/* Center: text */}
        <View style={styles.textContainer}>
          <View style={styles.titleRow}>
            <Text style={titleStyle} numberOfLines={1}>{habit.title}</Text>
            {habit.streakCount >= 2 && (
              <HabitStreakBadge streakCount={habit.streakCount} size="sm" />
            )}
          </View>
          <Text style={styles.description} numberOfLines={1}>{habit.description}</Text>
        </View>

        {/* Right: completion or badges */}
        {habit.completedToday ? (
          <Animated.View style={[styles.checkCircle, { transform: [{ scale: checkScale }] }]}>
            <Check size={14} color="#fff" strokeWidth={2.5} />
          </Animated.View>
        ) : (
          <View style={styles.badgesColumn}>
            <View style={styles.durationBadge}>
              <Text style={styles.durationText}>{durationLabel}</Text>
            </View>
            <View style={styles.xpBadge}>
              <Text style={styles.xpText}>+{habit.xpReward} XP</Text>
            </View>
          </View>
        )}
      </AnimatedPressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 14,
    paddingVertical: 14,
    minHeight: 72,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  textContainer: {
    flex: 1,
    gap: 3,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    letterSpacing: -0.1,
    flexShrink: 1,
  },
  titleCompleted: {
    textDecorationLine: 'line-through',
    color: colors.grey,
  },
  description: {
    fontSize: 12,
    color: colors.grey,
    lineHeight: 16,
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#34D399',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  badgesColumn: {
    alignItems: 'flex-end',
    gap: 4,
    flexShrink: 0,
  },
  durationBadge: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  durationText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.grey,
  },
  xpBadge: {
    backgroundColor: 'rgba(108,99,255,0.18)',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  xpText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6C63FF',
  },
});
