
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { colors } from '@/styles/commonStyles';

const { width, height } = Dimensions.get('window');

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
}

export default function ParticleBackground() {
  // Generate particles
  const particles: Particle[] = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * width,
    y: Math.random() * height,
    size: Math.random() * 4 + 2,
    duration: Math.random() * 3000 + 2000,
  }));

  return (
    <View style={styles.container} pointerEvents="none">
      {particles.map((particle) => (
        <AnimatedParticle key={particle.id} particle={particle} />
      ))}
    </View>
  );
}

function AnimatedParticle({ particle }: { particle: Particle }) {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    translateY.value = withRepeat(
      withSequence(
        withTiming(-20, { duration: particle.duration, easing: Easing.inOut(Easing.ease) }),
        withTiming(20, { duration: particle.duration, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    opacity.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: particle.duration / 2 }),
        withTiming(0.3, { duration: particle.duration / 2 })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          left: particle.x,
          top: particle.y,
          width: particle.size,
          height: particle.size,
        },
        animatedStyle,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  particle: {
    position: 'absolute',
    backgroundColor: colors.primary,
    borderRadius: 100,
  },
});
