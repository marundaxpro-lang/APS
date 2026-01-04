
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from './IconSymbol';

interface RestTimerProps {
  seconds: number;
  onComplete: () => void;
  onSkip: () => void;
}

export default function RestTimer({ seconds, onComplete, onSkip }: RestTimerProps) {
  useEffect(() => {
    if (seconds === 0) {
      onComplete();
    }
  }, [seconds, onComplete]);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Rest Time</Text>
      <Text style={styles.timer}>{formatTime(seconds)}</Text>
      <TouchableOpacity style={styles.skipButton} onPress={onSkip}>
        <IconSymbol
          ios_icon_name="forward.fill"
          android_material_icon_name="skip-next"
          size={24}
          color={colors.text}
        />
        <Text style={styles.skipText}>Skip Rest</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 16,
  },
  timer: {
    fontSize: 96,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 32,
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  skipText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
});
