
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  Pressable,
  Animated,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import {
  Home, Plane, BookOpen, Dumbbell, TrendingUp, Moon, Activity, Star,
  Lock, ChevronRight, Zap,
} from 'lucide-react-native';
import { PROGRAM_PACKS, ProgramPack, PackCategory } from '@/data/programPacks';
import { PackCard } from '@/components/PackCard';
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

type FilterCategory = 'all' | PackCategory;

const FILTER_TABS: { key: FilterCategory; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'fat_loss', label: 'Fat Loss' },
  { key: 'muscle', label: 'Muscle' },
  { key: 'strength', label: 'Strength' },
  { key: 'lifestyle', label: 'Lifestyle' },
  { key: 'special', label: 'Special' },
  { key: 'recovery', label: 'Recovery' },
];

function AnimatedGridItem({ index, children }: { index: number; children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 380, delay: index * 60, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 380, delay: index * 60, useNativeDriver: true }),
    ]).start();
  }, [index]);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

function FeaturedPackCard({ pack }: { pack: ProgramPack }) {
  const router = useRouter();
  const scale = useRef(new Animated.Value(1)).current;

  const animateIn = useCallback(() => {
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  }, [scale]);

  const animateOut = useCallback(() => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  }, [scale]);

  const handlePress = useCallback(() => {
    console.log('[ProgramPacks] User tapped featured pack:', pack.id);
    router.push(`/pack-detail/${pack.id}` as any);
  }, [pack.id, router]);

  const difficultyLabel = pack.difficulty.charAt(0).toUpperCase() + pack.difficulty.slice(1);

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPressIn={animateIn}
        onPressOut={animateOut}
        onPress={handlePress}
        style={styles.featuredCard}
      >
        <View style={[styles.featuredGradientBase, { backgroundColor: pack.gradientColors[1] }]} />
        <View style={[styles.featuredGradientOverlay, { backgroundColor: pack.gradientColors[0] }]} />
        <View style={styles.featuredNoise} />

        <View style={styles.featuredContent}>
          <View style={styles.featuredLeft}>
            <View style={styles.featuredBadgeRow}>
              {pack.isNew && (
                <View style={styles.featuredNewBadge}>
                  <Text style={styles.featuredNewBadgeText}>NEW</Text>
                </View>
              )}
              <View style={styles.featuredDiffBadge}>
                <Text style={styles.featuredDiffBadgeText}>{difficultyLabel}</Text>
              </View>
            </View>
            <Text style={styles.featuredTitle}>{pack.title}</Text>
            <Text style={styles.featuredSubtitle}>{pack.subtitle}</Text>
            <View style={styles.featuredMeta}>
              <Text style={styles.featuredMetaText}>{pack.durationLabel}</Text>
              <Text style={styles.featuredMetaDot}>·</Text>
              <Text style={styles.featuredMetaText}>{pack.workoutsPerWeek}x per week</Text>
              <Text style={styles.featuredMetaDot}>·</Text>
              <Text style={styles.featuredMetaText}>{pack.avgWorkoutMinutes} min</Text>
            </View>
          </View>
          <View style={styles.featuredRight}>
            <View style={styles.featuredIconCircle}>
              <PackIcon name={pack.iconName} size={32} color="#fff" />
            </View>
            <View style={styles.featuredStartBtn}>
              <Text style={styles.featuredStartBtnText}>Start</Text>
              <ChevronRight size={14} color="#fff" />
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function GridPackCard({ pack }: { pack: ProgramPack }) {
  const router = useRouter();
  const scale = useRef(new Animated.Value(1)).current;

  const animateIn = useCallback(() => {
    Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  }, [scale]);

  const animateOut = useCallback(() => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  }, [scale]);

  const handlePress = useCallback(() => {
    console.log('[ProgramPacks] User tapped grid pack:', pack.id);
    router.push(`/pack-detail/${pack.id}` as any);
  }, [pack.id, router]);

  const difficultyLabel = pack.difficulty.charAt(0).toUpperCase() + pack.difficulty.slice(1);

  return (
    <Animated.View style={[styles.gridCardWrapper, { transform: [{ scale }] }]}>
      <Pressable
        onPressIn={animateIn}
        onPressOut={animateOut}
        onPress={handlePress}
        style={styles.gridCard}
      >
        <View style={[styles.gridGradientBase, { backgroundColor: pack.gradientColors[1] }]} />
        <View style={[styles.gridGradientOverlay, { backgroundColor: pack.gradientColors[0] }]} />
        <View style={styles.gridNoise} />

        <View style={styles.gridContent}>
          <View style={styles.gridTop}>
            <View style={styles.gridIconCircle}>
              <PackIcon name={pack.iconName} size={20} color="#fff" />
            </View>
            {pack.isPremium && (
              <View style={styles.gridPremiumBadge}>
                <Lock size={8} color="#fff" />
              </View>
            )}
          </View>
          <Text style={styles.gridTitle} numberOfLines={2}>{pack.title}</Text>
          <Text style={styles.gridDuration}>{pack.durationLabel}</Text>
          <View style={styles.gridDiffBadge}>
            <Text style={styles.gridDiffText}>{difficultyLabel}</Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function ProgramPacksScreen() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('all');

  const filteredPacks = activeFilter === 'all'
    ? PROGRAM_PACKS
    : PROGRAM_PACKS.filter(p => p.category === activeFilter);

  const featuredPack = PROGRAM_PACKS.find(p => p.isPremium) ?? PROGRAM_PACKS[0];
  const displayGrid = activeFilter === 'all' ? filteredPacks.filter(p => p.id !== featuredPack.id) : filteredPacks;

  const handleFilterPress = (key: FilterCategory) => {
    console.log('[ProgramPacks] User tapped filter tab:', key);
    setActiveFilter(key);
  };

  const gridSectionLabel = activeFilter === 'all'
    ? 'ALL PACKS'
    : (FILTER_TABS.find(t => t.key === activeFilter)?.label.toUpperCase() ?? '');

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Program Packs',
          headerStyle: { backgroundColor: BG },
          headerTintColor: TEXT,
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
        }}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ── */}
        <View style={styles.hero}>
          <Text style={styles.heroHeading}>Find your program</Text>
          <Text style={styles.heroSubtitle}>8 specialized packs built for real life</Text>
        </View>

        {/* ── Category Filter Tabs ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
          style={styles.filterScroll}
        >
          {FILTER_TABS.map(tab => {
            const isActive = activeFilter === tab.key;
            return (
              <AnimatedPressable
                key={tab.key}
                style={[styles.filterTab, isActive && styles.filterTabActive]}
                onPress={() => handleFilterPress(tab.key)}
                scaleValue={0.94}
              >
                <Text style={[styles.filterTabText, isActive && styles.filterTabTextActive]}>
                  {tab.label}
                </Text>
              </AnimatedPressable>
            );
          })}
        </ScrollView>

        {/* ── Featured Pack ── */}
        {activeFilter === 'all' && (
          <View style={styles.featuredSection}>
            <Text style={styles.sectionLabel}>FEATURED</Text>
            <FeaturedPackCard pack={featuredPack} />
          </View>
        )}

        {/* ── Pack Grid ── */}
        <View style={styles.gridSection}>
          <Text style={styles.sectionLabel}>{gridSectionLabel}</Text>
          <View style={styles.grid}>
            {displayGrid.map((pack, index) => (
              <AnimatedGridItem key={pack.id} index={index}>
                <GridPackCard pack={pack} />
              </AnimatedGridItem>
            ))}
          </View>
        </View>
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
    paddingBottom: 48,
  },
  // Hero
  hero: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
  },
  heroHeading: {
    fontSize: 32,
    fontWeight: '800',
    color: TEXT,
    letterSpacing: -0.6,
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 15,
    color: TEXT_SECONDARY,
    fontWeight: '400',
  },
  // Filter tabs
  filterScroll: {
    marginBottom: 24,
  },
  filterRow: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: 'transparent',
  },
  filterTabActive: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT_SECONDARY,
  },
  filterTabTextActive: {
    color: '#fff',
  },
  // Featured
  featuredSection: {
    paddingHorizontal: 20,
    marginBottom: 28,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: TEXT_TERTIARY,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  featuredCard: {
    height: 180,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  featuredGradientBase: {
    ...StyleSheet.absoluteFillObject,
  },
  featuredGradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.6,
  },
  featuredNoise: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  featuredContent: {
    flex: 1,
    flexDirection: 'row',
    padding: 20,
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  featuredLeft: {
    flex: 1,
    paddingRight: 12,
  },
  featuredBadgeRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  featuredNewBadge: {
    backgroundColor: '#fff',
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  featuredNewBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#000',
    letterSpacing: 0.8,
  },
  featuredDiffBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  featuredDiffBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  featuredTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  featuredSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    marginBottom: 10,
  },
  featuredMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  featuredMetaText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.65)',
    fontWeight: '500',
  },
  featuredMetaDot: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
  },
  featuredRight: {
    alignItems: 'center',
    gap: 12,
  },
  featuredIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuredStartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  featuredStartBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  // Grid
  gridSection: {
    paddingHorizontal: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridCardWrapper: {
    width: '47.5%',
  },
  gridCard: {
    height: 160,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  gridGradientBase: {
    ...StyleSheet.absoluteFillObject,
  },
  gridGradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.65,
  },
  gridNoise: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.22)',
  },
  gridContent: {
    flex: 1,
    padding: 14,
    justifyContent: 'space-between',
  },
  gridTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  gridIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridPremiumBadge: {
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.2,
    lineHeight: 19,
    flex: 1,
  },
  gridDuration: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.65)',
    fontWeight: '500',
    marginBottom: 4,
  },
  gridDiffBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  gridDiffText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.4,
  },
});
