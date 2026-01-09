
import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');
const PARTICLE_COUNT = 30;

const Particle = ({ index }: { index: number }) => {
  const translateX = useSharedValue(Math.random() * width);
  const translateY = useSharedValue(Math.random() * height);
  const opacity = useSharedValue(Math.random() * 0.5 + 0.2);
  const scale = useSharedValue(Math.random() * 0.5 + 0.5);

  useEffect(() => {
    const duration = 3000 + Math.random() * 4000;
    const delay = Math.random() * 2000;

    translateX.value = withDelay(
      delay,
      withRepeat(
        withTiming(Math.random() * width, {
          duration,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true
      )
    );

    translateY.value = withDelay(
      delay,
      withRepeat(
        withTiming(Math.random() * height, {
          duration: duration * 1.2,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true
      )
    );

    opacity.value = withRepeat(
      withTiming(Math.random() * 0.3 + 0.1, {
        duration: 2000,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  return <Animated.View style={[styles.particle, animatedStyle]} />;
};

export default function ParticleBackground() {
  return (
    <View style={styles.container} pointerEvents="none">
      {Array.from({ length: PARTICLE_COUNT }).map((_, index) => (
        <Particle key={index} index={index} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  particle: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#459b9b',
  },
});
