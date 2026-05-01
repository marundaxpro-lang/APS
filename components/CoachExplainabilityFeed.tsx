
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Sparkles, CheckCircle, ChevronRight } from 'lucide-react-native';
import { CoachExplanationCard } from './CoachExplanationCard';
import { CoachChange } from '@/utils/coachExplainer';
import { getChanges, dismissChange } from '@/utils/coachExplainerStore';

const COLORS = {
  background: '#0A0D1A',
  surface: '#12162A',
  card: '#1A1E2E',
  primary: '#6C63FF',
  green: '#34D399',
  text: '#E8EAF6',
  textSecondary: '#8B9CC8',
  textTertiary: '#4A5580',
  border: 'rgba(108,99,255,0.15)',
};

const MAX_FEED_ITEMS = 5;

function StaggeredItem({ index, children }: { index: number; children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 380,
        delay: index * 80,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 380,
        delay: index * 80,
        useNativeDriver: true,
      }),
    ]).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

interface Props {
  refreshKey?: number;
}

export function CoachExplainabilityFeed({ refreshKey }: Props) {
  const router = useRouter();
  const [changes, setChanges] = useState<CoachChange[]>([]);

  const loadChanges = useCallback(async () => {
    const all = await getChanges();
    const active = all
      .filter(c => !c.dismissed)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, MAX_FEED_ITEMS);
    setChanges(active);
  }, []);

  useEffect(() => {
    loadChanges();
  }, [loadChanges, refreshKey]);

  const handleDismiss = async (id: string) => {
    await dismissChange(id);
    setChanges(prev => prev.filter(c => c.id !== id));
  };

  const handleViewAll = () => {
    console.log('[CoachFeed] User tapped View all coach insights');
    router.push('/coach-insights' as any);
  };

  const isEmpty = changes.length === 0;

  return (
    <View style={styles.container}>
      {/* Section header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Sparkles size={16} color={COLORS.primary} />
          <Text style={styles.headerTitle}>Why your plan changed</Text>
          <View style={styles.aiBadge}>
            <Text style={styles.aiBadgeText}>ADAPTIVE AI</Text>
          </View>
        </View>
        {!isEmpty && (
          <TouchableOpacity onPress={handleViewAll} style={styles.viewAllButton}>
            <Text style={styles.viewAllText}>View all</Text>
            <ChevronRight size={13} color={COLORS.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Empty state */}
      {isEmpty ? (
        <View style={styles.emptyState}>
          <CheckCircle size={28} color={COLORS.green} />
          <View style={styles.emptyTextContainer}>
            <Text style={styles.emptyTitle}>Your plan is on track</Text>
            <Text style={styles.emptySubtitle}>No changes needed — keep it up</Text>
          </View>
        </View>
      ) : (
        <View style={styles.feed}>
          {changes.map((change, index) => (
            <StaggeredItem key={change.id} index={index}>
              <CoachExplanationCard change={change} onDismiss={handleDismiss} />
            </StaggeredItem>
          ))}
          <TouchableOpacity onPress={handleViewAll} style={styles.viewAllFooter}>
            <Text style={styles.viewAllFooterText}>View full history</Text>
            <ChevronRight size={13} color={COLORS.textTertiary} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: -0.2,
  },
  aiBadge: {
    backgroundColor: 'rgba(108,99,255,0.15)',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  aiBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 0.8,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  emptyState: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.2)',
  },
  emptyTextContainer: {
    flex: 1,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  feed: {
    gap: 12,
  },
  viewAllFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
  },
  viewAllFooterText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textTertiary,
  },
});
