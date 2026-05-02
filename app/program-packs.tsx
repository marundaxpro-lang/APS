
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
  Dimensions,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import {
  Home, Plane, BookOpen, Dumbbell, TrendingUp, Moon, Activity, Star,
  ChevronRight, Zap, Clock, Users,
} from 'lucide-react-native';
import { PROGRAM_PACKS, ProgramPack, PackCategory } from '@/data/programPacks';
import { AnimatedPressable } from '@/components/AnimatedPressable';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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

function AnimatedListItem({ index, children }: { index: number; children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 380, delay: index * 60, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 380, delay: index * 60, useNativeDriver: true }),
    ]).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

function FullWidthPackCard({ pack }: { pack: ProgramPack }) {
  const router = useRouter();
  const scale = useRef(new Animated.Value(1)).current;

  const animateIn = useCallback(() => {
    Animated.spring(scale, { toValue: 0.98, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  }, [scale]);

  const animateOut = useCallback(() => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  }, [scale]);

  const handlePress = useCallback(() => {
    console.log('[ProgramPacks] User tapped pack card:', pack.id, pack.title);
    router.push(`/pack-detail/${pack.id}` as any);
  }, [pack.id, pack.title, router]);

  const difficultyLabel = pack.difficulty.charAt(0).toUpperCase() + pack.difficulty.slice(1);
  const workoutsText = pack.workoutsPerWeek + 'x / week';
  const minutesText = pack.avgWorkoutMinutes + ' min';

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPressIn={animateIn}
        onPressOut={animateOut}
        onPress={handlePress}
        style={styles.fullCard}
      >
        {/* Gradient background */}
        <View style={[styles.fullCardGradientBase, { backgroundColor: pack.gradientColors[1] }]} />
        <View style={[styles.fullCardGradientOverlay, { backgroundColor: pack.gradientColors[0] }]} />
        <View style={styles.fullCardNoise} />

        {/* Content */}
        <View style={styles.fullCardContent}>
          {/* Top row */}
          <View style={styles.fullCardTopRow}>
            <View style={styles.fullCardIconCircle}>
              <PackIcon name={pack.iconName} size={26} color="#fff" />
            </View>
            <View style={styles.fullCardBadgeRow}>
              {pack.isNew && (
                <View style={styles.newBadge}>
                  <Text style={styles.newBadgeText}>NEW</Text>
                </View>
              )}
              {pack.isPremium && (
                <View style={styles.premiumBadge}>
                  <Text style={styles.premiumBadgeText}>PREMIUM</Text>
                </View>
              )}
              <View style={styles.diffBadge}>
                <Text style={styles.diffBadgeText}>{difficultyLabel}</Text>
              </View>
            </View>
          </View>

          {/* Title & subtitle */}
          <Text style={styles.fullCardTitle}>{pack.title}</Text>
          <Text style={styles.fullCardSubtitle} numberOfLines={2}>{pack.subtitle}</Text>

          {/* Stats row */}
          <View style={styles.fullCardStatsRow}>
            <View style={styles.fullCardStat}>
              <Clock size={12} color="rgba(255,255,255,0.7)" strokeWidth={2} />
              <Text style={styles.fullCardStatText}>{minutesText}</Text>
            </View>
            <View style={styles.fullCardStatDot} />
            <View style={styles.fullCardStat}>
              <Users size={12} color="rgba(255,255,255,0.7)" strokeWidth={2} />
              <Text style={styles.fullCardStatText}>{workoutsText}</Text>
            </View>
            <View style={styles.fullCardStatDot} />
            <View style={styles.fullCardStat}>
              <Text style={styles.fullCardStatText}>{pack.durationLabel}</Text>
            </View>
          </View>

          {/* CTA */}
          <View style={styles.fullCardCTA}>
            <Text style={styles.fullCardCTAText}>View Program</Text>
            <ChevronRight size={14} color="#fff" strokeWidth={2.5} />
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

  const handleFilterPress = (key: FilterCategory) => {
    console.log('[ProgramPacks] User tapped filter tab:', key);
    setActiveFilter(key);
  };

  const gridSectionLabel = activeFilter === 'all'
    ? 'ALL PROGRAMS'
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
          <Text style={styles.heroSubtitle}>{PROGRAM_PACKS.length} specialized packs built for real life</Text>
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

        {/* ── Pack List ── */}
        <View style={styles.listSection}>
          <Text style={styles.sectionLabel}>{gridSectionLabel}</Text>
          <View style={styles.list}>
            {filteredPacks.map((pack, index) => (
              <AnimatedListItem key={pack.id} index={index}>
                <FullWidthPackCard pack={pack} />
              </AnimatedListItem>
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
  listSection: {
    paddingHorizontal: 20,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: TEXT_TERTIARY,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  list: {
    gap: 16,
  },
  // Full-width card
  fullCard: {
    width: '100%',
    height: 200,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  fullCardGradientBase: {
    ...StyleSheet.absoluteFillObject,
  },
  fullCardGradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.65,
  },
  fullCardNoise: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  fullCardContent: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  fullCardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  fullCardIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullCardBadgeRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    flex: 1,
    paddingLeft: 12,
  },
  newBadge: {
    backgroundColor: '#fff',
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  newBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#000',
    letterSpacing: 0.8,
  },
  premiumBadge: {
    backgroundColor: 'rgba(255,215,0,0.25)',
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.4)',
  },
  premiumBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFD700',
    letterSpacing: 0.5,
  },
  diffBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  diffBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  fullCardTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.4,
    lineHeight: 30,
  },
  fullCardSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 18,
    flex: 1,
  },
  fullCardStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fullCardStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  fullCardStatText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
  fullCardStatDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  fullCardCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  fullCardCTAText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
});
