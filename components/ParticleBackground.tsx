
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

// Safe function to get dimensions with fallback
function getSafeDimensions() {
  try {
    const window = Dimensions.get('window');
    if (window && typeof window.width === 'number' && typeof window.height === 'number') {
      return {
        width: window.width,
        height: window.height,
      };
    }
  } catch (error) {
    console.log('[ParticleBackground] Error getting dimensions:', error);
  }
  
  // Fallback dimensions
  return {
    width: 375,
    height: 667,
  };
}

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
  const [dimensions, setDimensions] = useState(getSafeDimensions);

  useEffect(() => {
    // Update dimensions on mount
    const initialDimensions = getSafeDimensions();
    setDimensions(initialDimensions);

    // Listen for dimension changes
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      if (window && typeof window.width === 'number' && typeof window.height === 'number') {
        setDimensions({
          width: window.width,
          height: window.height,
        });
      }
    });

    return () => {
      if (subscription && typeof subscription.remove === 'function') {
        subscription.remove();
      }
    };
  }, []);

  // Don't render particles if dimensions are invalid
  if (!dimensions || !dimensions.width || !dimensions.height || dimensions.width <= 0 || dimensions.height <= 0) {
    console.log('[ParticleBackground] Invalid dimensions, rendering empty container');
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
