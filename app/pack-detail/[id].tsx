
import React, { useEffect, useRef, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
  Alert,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import {
  Home, Plane, BookOpen, Dumbbell, TrendingUp, Moon, Activity, Star,
  Lock, Check, ChevronRight, Zap, Calendar, Clock, BarChart2,
} from 'lucide-react-native';
import { PROGRAM_PACKS } from '@/data/programPacks';
import { setActivePack } from '@/utils/activePack';
import { AnimatedPressable } from '@/components/AnimatedPressable';

const BG = '#0A0D1A';
const SURFACE = '#12162A';
const CARD = '#1A1E2E';
const PRIMARY = '#6C63FF';
const TEXT = '#E8EAF6';
const TEXT_SECONDARY = '#8B9CC8';
const TEXT_TERTIARY = '#4A5580';
const BORDER = 'rgba(108,99,255,0.15)';

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  Home, Plane, BookOpen, Dumbbell, TrendingUp, Moon, Activity, Star,
};

function PackIcon({ name, size, color }: { name: string; size: number; color: string }) {
  const Icon = ICON_MAP[name] ?? Zap;
  return <Icon size={size} color={color} />;
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function PackDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [starting, setStarting] = useState(false);

  const pack = PROGRAM_PACKS.find(p => p.id === id);

  const heroAnim = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    console.log('[PackDetail] Viewing pack:', id);
    Animated.sequence([
      Animated.timing(heroAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(contentAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleStartPack = useCallback(async () => {
    if (!pack) return;
    console.log('[PackDetail] User tapped Start this pack:', pack.id);
    setStarting(true);
    try {
      await setActivePack(pack.id);
      Alert.alert(
        'Pack activated!',
        `${pack.title} is now your active program. Head to your training plan to get started.`,
        [
          {
            text: 'Go to Training',
            onPress: () => {
              console.log('[PackDetail] User navigating to training plan after activating pack:', pack.id);
              router.push('/training-plan');
            },
          },
          { text: 'Stay here', style: 'cancel' },
        ]
      );
    } catch (e) {
      console.error('[PackDetail] Error starting pack:', e);
    } finally {
      setStarting(false);
    }
  }, [pack, router]);

  if (!pack) {
    return (
      <View style={styles.notFound}>
        <Stack.Screen options={{ title: 'Pack not found', headerStyle: { backgroundColor: BG }, headerTintColor: TEXT }} />
        <Text style={styles.notFoundText}>Pack not found</Text>
      </View>
    );
  }

  const difficultyLabel = pack.difficulty.charAt(0).toUpperCase() + pack.difficulty.slice(1);
  const totalWeeks = pack.duration === 'ongoing' ? '∞' : pack.durationLabel.split(' ')[0];
  const heroOpacity = heroAnim;
  const heroTranslate = heroAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] });
  const contentOpacity = contentAnim;
  const contentTranslate = contentAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] });

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerTransparent: true,
          headerBackButtonDisplayMode: 'minimal',
          headerTintColor: '#fff',
          title: '',
          headerShown: true,
        }}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ── */}
        <Animated.View
          style={[
            styles.hero,
            { opacity: heroOpacity, transform: [{ translateY: heroTranslate }] },
          ]}
        >
          <View style={[styles.heroGradientBase, { backgroundColor: pack.gradientColors[1] }]} />
          <View style={[styles.heroGradientOverlay, { backgroundColor: pack.gradientColors[0] }]} />
          <View style={styles.heroNoise} />

          <View style={styles.heroContent}>
            <View style={styles.heroIconCircle}>
              <PackIcon name={pack.iconName} size={48} color="#fff" />
            </View>
            <Text style={styles.heroTitle}>{pack.title}</Text>
            <Text style={styles.heroSubtitle}>{pack.subtitle}</Text>
            <View style={styles.heroBadgeRow}>
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeText}>{difficultyLabel}</Text>
              </View>
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeText}>{pack.durationLabel}</Text>
              </View>
              {pack.isNew && (
                <View style={[styles.heroBadge, styles.heroBadgeNew]}>
                  <Text style={[styles.heroBadgeText, styles.heroBadgeNewText]}>NEW</Text>
                </View>
              )}
            </View>
          </View>
        </Animated.View>

        {/* ── Body ── */}
        <Animated.View
          style={[
            styles.body,
            { opacity: contentOpacity, transform: [{ translateY: contentTranslate }] },
          ]}
        >
          {/* ── Stats Row ── */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Calendar size={18} color={pack.accentColor} />
              <Text style={styles.statValue}>{pack.workoutsPerWeek}</Text>
              <Text style={styles.statLabel}>Workouts/wk</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCard}>
              <Clock size={18} color={pack.accentColor} />
              <Text style={styles.statValue}>{pack.avgWorkoutMinutes}</Text>
              <Text style={styles.statLabel}>Avg minutes</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCard}>
              <BarChart2 size={18} color={pack.accentColor} />
              <Text style={styles.statValue}>{totalWeeks}</Text>
              <Text style={styles.statLabel}>Total weeks</Text>
            </View>
          </View>

          {/* ── Description ── */}
          <View style={styles.section}>
            <Text style={styles.description}>{pack.description}</Text>
          </View>

          {/* ── What you get ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What you get</Text>
            <View style={styles.featureList}>
              {pack.keyFeatures.map((feature, i) => (
                <View key={i} style={styles.featureItem}>
                  <View style={[styles.featureCheck, { backgroundColor: pack.accentColor + '22' }]}>
                    <Check size={12} color={pack.accentColor} />
                  </View>
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* ── Weekly Structure ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Weekly structure</Text>
            <View style={styles.weekStrip}>
              {DAY_LABELS.map((day, i) => {
                const workout = pack.weeklyStructure[i] ?? 'Rest';
                const isRest = workout.toLowerCase().includes('rest');
                return (
                  <View key={day} style={[styles.dayCell, isRest && styles.dayCellRest]}>
                    <Text style={[styles.dayLabel, isRest && styles.dayLabelRest]}>{day}</Text>
                    <Text style={[styles.dayWorkout, isRest && styles.dayWorkoutRest]} numberOfLines={2}>
                      {workout}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* ── Target User ── */}
          <View style={styles.section}>
            <View style={[styles.targetCard, { borderLeftColor: pack.accentColor }]}>
              <Text style={styles.targetText}>{pack.targetUser}</Text>
            </View>
          </View>

          {/* ── Tags ── */}
          <View style={styles.section}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tagsRow}>
              {pack.tags.map(tag => (
                <View key={tag} style={styles.tagPill}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </ScrollView>
          </View>

          {/* ── Premium Banner ── */}
          {pack.isPremium && (
            <View style={styles.premiumBanner}>
              <Lock size={16} color={pack.accentColor} />
              <View style={styles.premiumBannerText}>
                <Text style={styles.premiumBannerTitle}>Premium pack</Text>
                <Text style={styles.premiumBannerSubtitle}>Unlock with Apex Fitness Premium</Text>
              </View>
            </View>
          )}

          {/* ── CTA ── */}
          <AnimatedPressable
            style={[styles.ctaButton, { backgroundColor: pack.accentColor }]}
            onPress={handleStartPack}
            disabled={starting}
            scaleValue={0.97}
          >
            <Text style={styles.ctaButtonText}>{starting ? 'Activating...' : 'Start this pack'}</Text>
          </AnimatedPressable>

          <View style={{ height: 32 }} />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: 0,
  },
  notFound: {
    flex: 1,
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notFoundText: {
    fontSize: 16,
    color: TEXT_SECONDARY,
  },
  // Hero
  hero: {
    height: 280,
    position: 'relative',
    overflow: 'hidden',
  },
  heroGradientBase: {
    ...StyleSheet.absoluteFillObject,
  },
  heroGradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.6,
  },
  heroNoise: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  heroContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 28,
    paddingHorizontal: 24,
    paddingTop: 80,
  },
  heroIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    marginBottom: 14,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  heroBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  heroBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
  heroBadgeNew: {
    backgroundColor: '#fff',
  },
  heroBadgeNewText: {
    color: '#000',
  },
  // Body
  body: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  // Stats
  statsRow: {
    flexDirection: 'row',
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 20,
    marginBottom: 24,
    alignItems: 'center',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  statValue: {
    fontSize: 26,
    fontWeight: '800',
    color: TEXT,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 11,
    color: TEXT_TERTIARY,
    fontWeight: '500',
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: BORDER,
  },
  // Sections
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT,
    letterSpacing: -0.2,
    marginBottom: 14,
  },
  description: {
    fontSize: 15,
    color: TEXT_SECONDARY,
    lineHeight: 23,
    fontWeight: '400',
  },
  // Features
  featureList: {
    gap: 10,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureCheck: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  featureText: {
    fontSize: 14,
    color: TEXT,
    fontWeight: '500',
    flex: 1,
  },
  // Weekly structure
  weekStrip: {
    flexDirection: 'row',
    gap: 6,
  },
  dayCell: {
    flex: 1,
    backgroundColor: CARD,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 8,
    alignItems: 'center',
    minHeight: 72,
    justifyContent: 'flex-start',
  },
  dayCellRest: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderColor: 'rgba(255,255,255,0.05)',
  },
  dayLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: PRIMARY,
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  dayLabelRest: {
    color: TEXT_TERTIARY,
  },
  dayWorkout: {
    fontSize: 8,
    color: TEXT_SECONDARY,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 11,
  },
  dayWorkoutRest: {
    color: TEXT_TERTIARY,
  },
  // Target user
  targetCard: {
    backgroundColor: CARD,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    borderLeftWidth: 3,
    padding: 16,
  },
  targetText: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    fontStyle: 'italic',
    lineHeight: 21,
  },
  // Tags
  tagsRow: {
    gap: 8,
  },
  tagPill: {
    backgroundColor: SURFACE,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  tagText: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    fontWeight: '500',
  },
  // Premium banner
  premiumBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: CARD,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    marginBottom: 16,
  },
  premiumBannerText: {
    flex: 1,
  },
  premiumBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT,
    marginBottom: 2,
  },
  premiumBannerSubtitle: {
    fontSize: 12,
    color: TEXT_SECONDARY,
  },
  // CTA
  ctaButton: {
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  ctaButtonText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.2,
  },
});
