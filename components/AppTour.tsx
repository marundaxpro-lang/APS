
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const TOUR_KEY = 'apex_tour_completed';

const C = {
  bg: 'rgba(0,0,0,0.75)',
  surface: '#13131A',
  surface2: '#1C1C26',
  teal: '#00D4AA',
  tealMuted: 'rgba(0,212,170,0.12)',
  tealBorder: 'rgba(0,212,170,0.3)',
  text: '#F0F0F5',
  textSecondary: '#8A8A9A',
  border: 'rgba(255,255,255,0.08)',
};

interface TourStep {
  title: string;
  description: string;
  isIntro?: boolean;
}

const TOUR_STEPS: TourStep[] = [
  {
    title: 'Welcome to Apex Fitness 👋',
    description: 'Your AI-powered personal trainer. Let\'s show you around.',
    isIntro: true,
  },
  {
    title: "Today's Workout",
    description: 'Your daily workout is right here. Tap to start your session.',
  },
  {
    title: 'AI Coach',
    description: 'Your personal AI coach gives you real-time insights and adapts your plan.',
  },
  {
    title: 'Programs',
    description: 'Browse and activate training programs tailored to your goals.',
  },
  {
    title: 'Nutrition',
    description: 'Track your meals and macros to fuel your performance.',
  },
  {
    title: 'Profile & Progress',
    description: 'View your streaks, achievements, and progress over time.',
  },
];

interface Props {
  visible: boolean;
  onComplete: () => void;
}

export function AppTour({ visible, onComplete }: Props) {
  const [currentStep, setCurrentStep] = useState(0);
  const slideAnim = useRef(new Animated.Value(60)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  const totalSteps = TOUR_STEPS.length;
  const step = TOUR_STEPS[currentStep];
  const isLastStep = currentStep === totalSteps - 1;
  const stepLabel = `${currentStep + 1} of ${totalSteps}`;
  const nextButtonLabel = isLastStep ? 'Get Started!' : 'Next';

  useEffect(() => {
    if (visible) {
      animateIn();
      startGlowPulse();
    }
  }, [visible, currentStep]);

  function animateIn() {
    slideAnim.setValue(60);
    opacityAnim.setValue(0);
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }

  function startGlowPulse() {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }

  const handleNext = async () => {
    console.log('[AppTour] User tapped Next on step:', currentStep + 1, '/', totalSteps);
    if (isLastStep) {
      await completeTour();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleSkip = async () => {
    console.log('[AppTour] User tapped Skip on step:', currentStep + 1);
    await completeTour();
  };

  const completeTour = async () => {
    console.log('[AppTour] Tour completed, saving to AsyncStorage');
    await AsyncStorage.setItem(TOUR_KEY, 'true');
    onComplete();
  };

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 1],
  });

  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" visible={visible} statusBarTranslucent>
      <View style={styles.overlay}>
        {/* Spotlight glow for non-intro steps */}
        {!step.isIntro && (
          <Animated.View
            style={[
              styles.spotlight,
              { opacity: glowOpacity },
            ]}
          />
        )}

        {/* Tooltip card */}
        <Animated.View
          style={[
            styles.tooltipContainer,
            {
              opacity: opacityAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Step indicator */}
          <View style={styles.stepRow}>
            <View style={styles.stepDots}>
              {TOUR_STEPS.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.stepDot,
                    i === currentStep && styles.stepDotActive,
                  ]}
                />
              ))}
            </View>
            <Text style={styles.stepLabel}>{stepLabel}</Text>
          </View>

          {/* Content */}
          <Text style={styles.title}>{step.title}</Text>
          <Text style={styles.description}>{step.description}</Text>

          {/* Buttons */}
          <View style={styles.buttonRow}>
            {!isLastStep && (
              <TouchableOpacity
                style={styles.skipButton}
                onPress={handleSkip}
                activeOpacity={0.7}
              >
                <Text style={styles.skipButtonText}>Skip</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.nextButton, isLastStep && styles.nextButtonFull]}
              onPress={handleNext}
              activeOpacity={0.85}
            >
              <Text style={styles.nextButtonText}>{nextButtonLabel}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

export async function shouldShowTour(): Promise<boolean> {
  const completed = await AsyncStorage.getItem(TOUR_KEY);
  return completed !== 'true';
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: C.bg,
    justifyContent: 'flex-end',
  },
  spotlight: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.25,
    left: 20,
    right: 20,
    height: 180,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: C.teal,
    shadowColor: C.teal,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 10,
  },
  tooltipContainer: {
    backgroundColor: C.surface,
    borderRadius: 24,
    padding: 24,
    marginHorizontal: 16,
    marginBottom: 48,
    borderWidth: 1,
    borderColor: C.tealBorder,
    shadowColor: C.teal,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 20,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  stepDots: {
    flexDirection: 'row',
    gap: 5,
  },
  stepDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  stepDotActive: {
    backgroundColor: C.teal,
    width: 18,
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: C.textSecondary,
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.4,
    marginBottom: 10,
    lineHeight: 28,
  },
  description: {
    fontSize: 15,
    color: C.textSecondary,
    lineHeight: 22,
    marginBottom: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  skipButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.surface2,
    borderWidth: 1,
    borderColor: C.border,
  },
  skipButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: C.textSecondary,
  },
  nextButton: {
    flex: 2,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.teal,
  },
  nextButtonFull: {
    flex: 1,
  },
  nextButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 0.2,
  },
});
