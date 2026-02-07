
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';

const PARTICLE_COUNT = 30;

const Particle = ({ index, screenWidth, screenHeight }: { index: number; screenWidth: number; screenHeight: number }) => {
  const translateX = useSharedValue(Math.random() * screenWidth);
  const translateY = useSharedValue(Math.random() * screenHeight);
  const opacity = useSharedValue(Math.random() * 0.5 + 0.2);
  const scale = useSharedValue(Math.random() * 0.5 + 0.5);

  useEffect(() => {
    const duration = 3000 + Math.random() * 4000;
    const delay = Math.random() * 2000;

    translateX.value = withDelay(
      delay,
      withRepeat(
        withTiming(Math.random() * screenWidth, {
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
        withTiming(Math.random() * screenHeight, {
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
  }, [opacity, translateX, translateY, screenWidth, screenHeight]);

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
  const [dimensions, setDimensions] = useState(() => {
    const window = Dimensions.get('window');
    return {
      width: window?.width || 375,
      height: window?.height || 667,
    };
  });

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      if (window?.width && window?.height) {
        setDimensions({
          width: window.width,
          height: window.height,
        });
      }
    });

    return () => subscription?.remove();
  }, []);

  // Don't render particles if dimensions are invalid
  if (!dimensions.width || !dimensions.height) {
    return <View style={styles.container} />;
  }

  return (
    <View style={styles.container}>
      {Array.from({ length: PARTICLE_COUNT }).map((_, index) => (
        <Particle 
          key={index} 
          index={index} 
          screenWidth={dimensions.width}
          screenHeight={dimensions.height}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    pointerEvents: 'none',
  },
  particle: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#459b9b',
  },
});
