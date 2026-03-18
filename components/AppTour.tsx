
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Modal,
  useWindowDimensions,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TOUR_KEY = 'apex_tour_completed';

const C = {
  surface: '#13131A',
  surface2: '#1C1C26',
  teal: '#00D4AA',
  tealMuted: 'rgba(0,212,170,0.12)',
  tealBorder: 'rgba(0,212,170,0.3)',
  text: '#F0F0F5',
  textSecondary: '#8A8A9A',
  border: 'rgba(255,255,255,0.08)',
  overlay: 'rgba(0,0,0,0.82)',
};

interface TourStep {
  title: string;
  description: string;
  /** If true, no spotlight — show centered modal card */
  fullScreen?: boolean;
  /** Y position of spotlight top edge (relative to screen) */
  spotlightY?: number;
  /** Height of spotlight cutout */
  spotlightHeight?: number;
  /** Primary button label */
  buttonLabel?: string;
}

// Spotlight positions use fixed pixel values (set at render time using screenHeight).
// spotlightY and spotlightHeight are fractions of SCREEN_HEIGHT for responsiveness.
// Layout order matches the actual home screen scroll order:
//   Header (~44px status bar + 20px padding + ~80px header = ~144px top)
//   Hero workout card: starts ~160px, height ~180px
//   Programs carousel: starts ~380px, height ~220px
//   Tab bar: bottom ~90px, height ~80px
// Quick Links is near the bottom of the scroll so we spotlight the tab bar instead.
const TOUR_STEPS: TourStep[] = [
  {
    title: 'Welcome to Apex Fitness 👋',
    description: "Your AI-powered personal trainer. Let's show you around in just a few seconds.",
    fullScreen: true,
    buttonLabel: "Let's Go!",
  },
  {
    title: "Today's Workout",
    description: 'Your daily workout is right here. Tap it to start your training session.',
    spotlightY: 160,
    spotlightHeight: 180,
  },
  {
    title: 'Programs',
    description: 'Browse and activate training programs tailored to your goals.',
    spotlightY: 380,
    spotlightHeight: 220,
  },
  {
    title: 'Quick Links',
    description: 'Jump to Programs, Nutrition, AI Coach, and Habits from here.',
    spotlightY: 630,
    spotlightHeight: 100,
  },
  {
    title: 'Navigation',
    description: 'Switch between Home, Train, Nutrition, Momentum, and Progress tabs.',
    spotlightY: -1, // computed at render using screenHeight
    spotlightHeight: 80,
  },
  {
    title: "You're all set! 💪",
    description: "Your AI coach is ready. Let's crush your goals.",
    fullScreen: true,
    buttonLabel: 'Start Training',
  },
];

interface Props {
  visible: boolean;
  onComplete: () => void;
}

export function AppTour({ visible, onComplete }: Props) {
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [currentStep, setCurrentStep] = useState(0);

  const cardSlide = useRef(new Animated.Value(50)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const spotlightOpacity = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const glowLoop = useRef<Animated.CompositeAnimation | null>(null);

  const totalSteps = TOUR_STEPS.length;
  const step = TOUR_STEPS[currentStep];
  const isLastStep = currentStep === totalSteps - 1;
  const buttonLabel = step.buttonLabel ?? (isLastStep ? 'Start Training' : 'Next');

  useEffect(() => {
    if (visible) {
      animateIn();
      startGlowPulse();
    }
    return () => {
      glowLoop.current?.stop();
    };
  }, [visible, currentStep]);

  function animateIn() {
    cardSlide.setValue(50);
    cardOpacity.setValue(0);
    spotlightOpacity.setValue(0);
    Animated.parallel([
      Animated.spring(cardSlide, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }),
      Animated.timing(cardOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(spotlightOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }

  function startGlowPulse() {
    glowLoop.current?.stop();
    glowAnim.setValue(0);
    glowLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1100, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 1100, useNativeDriver: true }),
      ])
    );
    glowLoop.current.start();
  }

  const handleNext = async () => {
    console.log('[AppTour] User tapped next on step:', currentStep + 1, '/', totalSteps, '-', step.title);
    if (isLastStep) {
      await completeTour();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const completeTour = async () => {
    console.log('[AppTour] Tour completed — saving apex_tour_completed to AsyncStorage');
    await AsyncStorage.setItem(TOUR_KEY, 'true');
    onComplete();
  };

  const glowBorderOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] });
  const glowShadowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.9] });

  if (!visible) return null;

  // Compute spotlight pixel values
  // spotlightY === -1 is a sentinel meaning "near the bottom" (tab bar)
  const rawSpotlightY = step.spotlightY === -1 ? SCREEN_HEIGHT - 90 : (step.spotlightY ?? 0);
  const spotlightTop = rawSpotlightY;
  const spotlightH = step.spotlightHeight ?? 0;
  const spotlightBottom = spotlightTop + spotlightH;
  const PADDING = 16;

  // Decide tooltip position: below spotlight if room, else above
  const tooltipBelow = spotlightBottom < SCREEN_HEIGHT * 0.72;
  const tooltipTop = tooltipBelow ? spotlightBottom + 16 : undefined;
  const tooltipBottom = !tooltipBelow ? SCREEN_HEIGHT - spotlightTop + 16 : undefined;

  return (
    <Modal transparent animationType="fade" visible={visible} statusBarTranslucent>
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">

        {step.fullScreen ? (
          /* ── Full-screen intro/outro card ── */
          <View style={[styles.fullScreenOverlay, { backgroundColor: C.overlay }]}>
            <Animated.View
              style={[
                styles.fullScreenCard,
                { opacity: cardOpacity, transform: [{ translateY: cardSlide }] },
              ]}
            >
              <View style={styles.logoCircle}>
                <Text style={styles.logoEmoji}>⚡</Text>
              </View>
              <Text style={styles.fullScreenTitle}>{step.title}</Text>
              <Text style={styles.fullScreenDesc}>{step.description}</Text>
              <TouchableOpacity style={styles.primaryBtn} onPress={handleNext} activeOpacity={0.85}>
                <Text style={styles.primaryBtnText}>{buttonLabel}</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        ) : (
          /* ── Spotlight overlay (4-rectangle cutout) ── */
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: spotlightOpacity }]} pointerEvents="none">
            {/* Top rectangle */}
            <View
              style={[
                styles.overlayRect,
                { top: 0, left: 0, right: 0, height: spotlightTop },
              ]}
            />
            {/* Bottom rectangle */}
            <View
              style={[
                styles.overlayRect,
                { top: spotlightBottom, left: 0, right: 0, bottom: 0 },
              ]}
            />
            {/* Left rectangle */}
            <View
              style={[
                styles.overlayRect,
                { top: spotlightTop, left: 0, width: PADDING, height: spotlightH },
              ]}
            />
            {/* Right rectangle */}
            <View
              style={[
                styles.overlayRect,
                { top: spotlightTop, right: 0, width: PADDING, height: spotlightH },
              ]}
            />

            {/* Spotlight border glow */}
            <Animated.View
              style={[
                styles.spotlightBorder,
                {
                  top: spotlightTop,
                  left: PADDING,
                  right: PADDING,
                  height: spotlightH,
                  opacity: glowBorderOpacity,
                  shadowOpacity: glowShadowOpacity as unknown as number,
                },
              ]}
            />
          </Animated.View>
        )}

        {/* ── Tooltip card (for spotlight steps) ── */}
        {!step.fullScreen && (
          <Animated.View
            style={[
              styles.tooltipCard,
              {
                opacity: cardOpacity,
                transform: [{ translateY: cardSlide }],
                marginHorizontal: 16,
                position: 'absolute',
                left: 0,
                right: 0,
                ...(tooltipTop != null ? { top: tooltipTop } : {}),
                ...(tooltipBottom != null ? { bottom: tooltipBottom } : {}),
              },
            ]}
            pointerEvents="box-none"
          >
            {/* Step dots */}
            <View style={styles.stepRow}>
              <View style={styles.stepDots}>
                {TOUR_STEPS.map((_, i) => (
                  <View
                    key={i}
                    style={[styles.stepDot, i === currentStep && styles.stepDotActive]}
                  />
                ))}
              </View>
              <Text style={styles.stepLabel}>{currentStep + 1} of {totalSteps}</Text>
            </View>

            <Text style={styles.tooltipTitle}>{step.title}</Text>
            <Text style={styles.tooltipDesc}>{step.description}</Text>

            <TouchableOpacity style={styles.primaryBtn} onPress={handleNext} activeOpacity={0.85}>
              <Text style={styles.primaryBtnText}>{buttonLabel}</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>
    </Modal>
  );
}

export async function shouldShowTour(): Promise<boolean> {
  const completed = await AsyncStorage.getItem(TOUR_KEY);
  return completed !== 'true';
}

const styles = StyleSheet.create({
  overlayRect: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.82)',
  },
  spotlightBorder: {
    position: 'absolute',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#00D4AA',
    shadowColor: '#00D4AA',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 18,
    elevation: 12,
  },

  // Full-screen card
  fullScreenOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  fullScreenCard: {
    backgroundColor: '#13131A',
    borderRadius: 28,
    padding: 32,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,212,170,0.3)',
    shadowColor: '#00D4AA',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 30,
    elevation: 20,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(0,212,170,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(0,212,170,0.3)',
  },
  logoEmoji: {
    fontSize: 32,
  },
  fullScreenTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#F0F0F5',
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 32,
  },
  fullScreenDesc: {
    fontSize: 15,
    color: '#8A8A9A',
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 32,
  },

  // Tooltip card
  tooltipCard: {
    backgroundColor: '#13131A',
    borderRadius: 22,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(0,212,170,0.3)',
    shadowColor: '#00D4AA',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 20,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
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
    backgroundColor: '#00D4AA',
    width: 18,
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8A8A9A',
    letterSpacing: 0.5,
  },
  tooltipTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#F0F0F5',
    letterSpacing: -0.4,
    marginBottom: 8,
    lineHeight: 26,
  },
  tooltipDesc: {
    fontSize: 14,
    color: '#8A8A9A',
    lineHeight: 21,
    marginBottom: 20,
  },

  // Shared button
  primaryBtn: {
    backgroundColor: '#00D4AA',
    borderRadius: 12,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 0.2,
  },
});
