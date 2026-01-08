
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { colors } from '@/styles/commonStyles';

interface Particle {
  x: Animated.Value;
  y: Animated.Value;
  size: number;
  speedX: number;
  speedY: number;
  opacity: Animated.Value;
  duration: number;
}

const { width, height } = Dimensions.get('window');

export default function ParticleBackground() {
  const particles = useRef<Particle[]>([]);

  useEffect(() => {
    // Create 20 particles
    particles.current = Array.from({ length: 20 }, () => {
      const duration = 10000 + Math.random() * 10000;
      return {
        x: new Animated.Value(Math.random() * width),
        y: new Animated.Value(Math.random() * height),
        size: Math.random() * 4 + 2,
        speedX: (Math.random() - 0.5) * 0.5,
        speedY: (Math.random() - 0.5) * 0.5,
        opacity: new Animated.Value(Math.random() * 0.5 + 0.2),
        duration,
      };
    });

    // Animate particles
    const animateParticles = () => {
      particles.current.forEach((particle) => {
        // Continuous floating animation
        Animated.loop(
          Animated.parallel([
            Animated.sequence([
              Animated.timing(particle.x, {
                toValue: Math.random() * width,
                duration: particle.duration,
                useNativeDriver: true,
              }),
            ]),
            Animated.sequence([
              Animated.timing(particle.y, {
                toValue: Math.random() * height,
                duration: particle.duration,
                useNativeDriver: true,
              }),
            ]),
            Animated.sequence([
              Animated.timing(particle.opacity, {
                toValue: Math.random() * 0.5 + 0.2,
                duration: 3000,
                useNativeDriver: true,
              }),
              Animated.timing(particle.opacity, {
                toValue: Math.random() * 0.3 + 0.1,
                duration: 3000,
                useNativeDriver: true,
              }),
            ]),
          ])
        ).start();
      });
    };

    animateParticles();
  }, []);

  return (
    <View style={styles.container} pointerEvents="none">
      {particles.current.map((particle, index) => (
        <Animated.View
          key={index}
          style={[
            styles.particle,
            {
              width: particle.size,
              height: particle.size,
              transform: [
                { translateX: particle.x },
                { translateY: particle.y },
              ],
              opacity: particle.opacity,
            },
          ]}
        />
      ))}
    </View>
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
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
});
