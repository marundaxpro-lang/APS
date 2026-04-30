
import React, { useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Home, Plane, BookOpen, Dumbbell, TrendingUp, Moon, Activity, Star,
  Lock, Zap,
} from 'lucide-react-native';
import { ProgramPack } from '@/data/programPacks';

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  Home,
  Plane,
  BookOpen,
  Dumbbell,
  TrendingUp,
  Moon,
  Activity,
  Star,
};

function PackIcon({ name, size, color }: { name: string; size: number; color: string }) {
  const Icon = ICON_MAP[name] ?? Zap;
  return <Icon size={size} color={color} />;
}

interface PackCardProps {
  pack: ProgramPack;
  width?: number;
  height?: number;
}

export function PackCard({ pack, width = 200, height = 260 }: PackCardProps) {
  const router = useRouter();
  const scale = useRef(new Animated.Value(1)).current;

  const animateIn = useCallback(() => {
    Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  }, [scale]);

  const animateOut = useCallback(() => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  }, [scale]);

  const handlePress = useCallback(() => {
    console.log('[PackCard] User tapped pack:', pack.id, '→ /pack-detail/' + pack.id);
    router.push(`/pack-detail/${pack.id}` as any);
  }, [pack.id, router]);

  const difficultyLabel = pack.difficulty.charAt(0).toUpperCase() + pack.difficulty.slice(1);
  const workoutsText = pack.workoutsPerWeek + 'x/wk';
  const minutesText = pack.avgWorkoutMinutes + ' min';

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPressIn={animateIn}
        onPressOut={animateOut}
        onPress={handlePress}
        style={[styles.card, { width, height }]}
      >
        {/* Gradient background via layered views */}
        <View style={[styles.gradientBase, { backgroundColor: pack.gradientColors[1] }]} />
        <View style={[styles.gradientOverlay, { backgroundColor: pack.gradientColors[0] }]} />

        {/* Noise texture overlay */}
        <View style={styles.noiseOverlay} />

        {/* Content */}
        <View style={styles.content}>
          {/* Top row: icon + NEW badge */}
          <View style={styles.topRow}>
            <View style={styles.iconContainer}>
              <PackIcon name={pack.iconName} size={28} color="#fff" />
            </View>
            {pack.isNew && (
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>NEW</Text>
              </View>
            )}
          </View>

          {/* Middle: title + subtitle */}
          <View style={styles.middle}>
            <Text style={styles.title} numberOfLines={2}>{pack.title}</Text>
            <Text style={styles.subtitle} numberOfLines={2}>{pack.subtitle}</Text>
          </View>

          {/* Bottom: stat chips + premium badge */}
          <View style={styles.bottom}>
            <View style={styles.statsRow}>
              <View style={styles.statChip}>
                <Text style={styles.statChipText}>{pack.durationLabel}</Text>
              </View>
              <View style={styles.statChip}>
                <Text style={styles.statChipText}>{workoutsText}</Text>
              </View>
              <View style={styles.statChip}>
                <Text style={styles.statChipText}>{minutesText}</Text>
              </View>
            </View>
            {pack.isPremium && (
              <View style={styles.premiumBadge}>
                <Lock size={9} color="#fff" />
                <Text style={styles.premiumBadgeText}>PREMIUM</Text>
              </View>
            )}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  gradientBase: {
    ...StyleSheet.absoluteFillObject,
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.65,
    borderRadius: 16,
  },
  noiseOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  content: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  newBadge: {
    backgroundColor: '#fff',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  newBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#000',
    letterSpacing: 0.8,
  },
  middle: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.4,
    marginBottom: 4,
    lineHeight: 24,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.70)',
    fontWeight: '500',
    lineHeight: 18,
  },
  bottom: {
    gap: 8,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 5,
    flexWrap: 'wrap',
  },
  statChip: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  statChipText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  premiumBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.8,
  },
});
