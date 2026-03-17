
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from './IconSymbol';
import { AnimatedPressable } from './AnimatedPressable';

const TEAL = colors.primary;
const TEAL_DIM = 'rgba(69,155,155,0.15)';

interface RestTimerProps {
  seconds: number;
  onComplete: () => void;
  onSkip: () => void;
}

function ProgressArc({ progress, size = 160 }: { progress: number; size?: number }) {
  const animatedProgress = useRef(new Animated.Value(progress)).current;

  useEffect(() => {
    Animated.timing(animatedProgress, {
      toValue: progress,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [progress, animatedProgress]);

  const strokeWidth = 5;
  const half = size / 2;

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

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Track */}
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
      {/* Right half */}
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
      {/* Left half */}
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

export default function RestTimer({ seconds, onComplete, onSkip }: RestTimerProps) {
  const TOTAL_REST = 60;
  const progress = 1 - seconds / TOTAL_REST;

  useEffect(() => {
    if (seconds === 0) {
      onComplete();
    }
  }, [seconds, onComplete]);

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const minsStr = String(mins).padStart(2, '0');
  const secsStr = String(secs).padStart(2, '0');

  return (
    <View style={styles.container}>
      {/* Card */}
      <View style={styles.card}>
        {/* Teal accent bar */}
        <View style={styles.accentBar} />

        <View style={styles.inner}>
          {/* Session label */}
          <View style={styles.labelRow}>
            <IconSymbol
              ios_icon_name="bolt.fill"
              android_material_icon_name="bolt"
              size={13}
              color={TEAL}
            />
            <Text style={styles.sessionName}>RECOVERY RESET</Text>
          </View>
          <Text style={styles.contextLine}>Let your system rebuild.</Text>

          {/* Arc + countdown */}
          <View style={styles.arcWrapper}>
            <ProgressArc progress={progress} size={160} />
            <View style={styles.countdownOverlay}>
              <View style={styles.countdownRow}>
                <Text style={styles.countdownMins}>{minsStr}</Text>
                <Text style={styles.countdownColon}>:</Text>
                <Text style={styles.countdownSecs}>{secsStr}</Text>
              </View>
              <Text style={styles.countdownSub}>remaining</Text>
            </View>
          </View>

          {/* Skip button */}
          <AnimatedPressable
            style={styles.skipBtn}
            onPress={() => {
              console.log('[RestTimer] User pressed End Session (skip rest)');
              onSkip();
            }}
          >
            <IconSymbol
              ios_icon_name="forward.fill"
              android_material_icon_name="skip-next"
              size={16}
              color={TEAL}
            />
            <Text style={styles.skipText}>End Session</Text>
          </AnimatedPressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: 'hidden',
    width: '100%',
  },
  accentBar: {
    width: 3,
    backgroundColor: TEAL,
  },
  inner: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sessionName: {
    fontSize: 12,
    fontWeight: '700',
    color: TEAL,
    letterSpacing: 1.2,
  },
  contextLine: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.35)',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  arcWrapper: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
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
    fontSize: 46,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -2,
    lineHeight: 52,
  },
  countdownColon: {
    fontSize: 36,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.4)',
    marginBottom: 3,
    lineHeight: 46,
  },
  countdownSecs: {
    fontSize: 46,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -2,
    lineHeight: 52,
  },
  countdownSub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  skipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: TEAL_DIM,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: 'rgba(69,155,155,0.3)',
    marginTop: 4,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '600',
    color: TEAL,
  },
});
