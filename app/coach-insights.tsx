
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Brain, ChevronLeft } from 'lucide-react-native';
import { CoachExplanationCard } from '@/components/CoachExplanationCard';
import { CoachChange } from '@/utils/coachExplainer';
import { getChanges, dismissChange } from '@/utils/coachExplainerStore';

const COLORS = {
  background: '#0A0D1A',
  surface: '#12162A',
  card: '#1A1E2E',
  primary: '#6C63FF',
  text: '#E8EAF6',
  textSecondary: '#8B9CC8',
  textTertiary: '#4A5580',
  border: 'rgba(108,99,255,0.15)',
};

type FilterTab = 'active' | 'all' | 'dismissed';

function getWeekLabel(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const startOfThisWeek = new Date(now);
  startOfThisWeek.setDate(now.getDate() - now.getDay());
  startOfThisWeek.setHours(0, 0, 0, 0);

  const startOfLastWeek = new Date(startOfThisWeek);
  startOfLastWeek.setDate(startOfThisWeek.getDate() - 7);

  if (date >= startOfThisWeek) return 'This week';
  if (date >= startOfLastWeek) return 'Last week';
  return 'Earlier';
}

function groupByWeek(changes: CoachChange[]): Array<{ label: string; items: CoachChange[] }> {
  const groups: Record<string, CoachChange[]> = {};
  for (const change of changes) {
    const label = getWeekLabel(change.timestamp);
    if (!groups[label]) groups[label] = [];
    groups[label].push(change);
  }
  const order = ['This week', 'Last week', 'Earlier'];
  return order
    .filter(label => groups[label]?.length > 0)
    .map(label => ({ label, items: groups[label] }));
}

export default function CoachInsightsScreen() {
  const router = useRouter();
  const [allChanges, setAllChanges] = useState<CoachChange[]>([]);
  const [filter, setFilter] = useState<FilterTab>('active');
  const [refreshing, setRefreshing] = useState(false);

  const loadChanges = useCallback(async () => {
    console.log('[CoachInsights] Loading all changes');
    const changes = await getChanges();
    const sorted = [...changes].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    setAllChanges(sorted);
  }, []);

  useEffect(() => {
    loadChanges();
  }, [loadChanges]);

  const onRefresh = async () => {
    console.log('[CoachInsights] User pulled to refresh');
    setRefreshing(true);
    await loadChanges();
    setRefreshing(false);
  };

  const handleDismiss = async (id: string) => {
    await dismissChange(id);
    setAllChanges(prev =>
      prev.map(c => (c.id === id ? { ...c, dismissed: true } : c))
    );
  };

  const handleFilterChange = (tab: FilterTab) => {
    console.log('[CoachInsights] User switched filter to:', tab);
    setFilter(tab);
  };

  const filteredChanges = allChanges.filter(c => {
    if (filter === 'active') return !c.dismissed;
    if (filter === 'dismissed') return c.dismissed;
    return true;
  });

  const grouped = groupByWeek(filteredChanges);

  const activeCount = allChanges.filter(c => !c.dismissed).length;
  const dismissedCount = allChanges.filter(c => c.dismissed).length;

  const emptyMessages: Record<FilterTab, { title: string; subtitle: string }> = {
    active: { title: 'No active changes', subtitle: 'Your plan is running smoothly' },
    all: { title: 'No changes yet', subtitle: 'Coach insights will appear here as your plan adapts' },
    dismissed: { title: 'Nothing dismissed', subtitle: 'Dismissed changes will appear here' },
  };

  const emptyMsg = emptyMessages[filter];

  return (
    <View style={styles.container}>
      {/* Custom header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            console.log('[CoachInsights] User tapped back');
            router.back();
          }}
        >
          <ChevronLeft size={22} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Brain size={18} color={COLORS.primary} />
          <Text style={styles.headerTitle}>Coach Insights</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      {/* Filter tabs */}
      <View style={styles.filterRow}>
        {(['active', 'all', 'dismissed'] as FilterTab[]).map(tab => {
          const isActive = filter === tab;
          const count = tab === 'active' ? activeCount : tab === 'dismissed' ? dismissedCount : allChanges.length;
          const label = tab.charAt(0).toUpperCase() + tab.slice(1);
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.filterTab, isActive && styles.filterTabActive]}
              onPress={() => handleFilterChange(tab)}
            >
              <Text style={[styles.filterTabText, isActive && styles.filterTabTextActive]}>
                {label}
              </Text>
              {count > 0 && (
                <View style={[styles.filterBadge, isActive && styles.filterBadgeActive]}>
                  <Text style={[styles.filterBadgeText, isActive && styles.filterBadgeTextActive]}>
                    {String(count)}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
      >
        {grouped.length === 0 ? (
          <View style={styles.emptyState}>
            <Brain size={40} color={COLORS.textTertiary} />
            <Text style={styles.emptyTitle}>{emptyMsg.title}</Text>
            <Text style={styles.emptySubtitle}>{emptyMsg.subtitle}</Text>
          </View>
        ) : (
          grouped.map(group => (
            <View key={group.label} style={styles.group}>
              <Text style={styles.groupLabel}>{group.label}</Text>
              <View style={styles.groupItems}>
                {group.items.map(change => (
                  <CoachExplanationCard
                    key={change.id}
                    change={change}
                    onDismiss={handleDismiss}
                  />
                ))}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'android' ? 48 : 60,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.card,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: -0.2,
  },
  headerRight: {
    width: 40,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 20,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterTabActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  filterTabTextActive: {
    color: '#fff',
  },
  filterBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 1,
    minWidth: 18,
    alignItems: 'center',
  },
  filterBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  filterBadgeTextActive: {
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 100,
    gap: 24,
  },
  group: {},
  groupLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  groupItems: {
    gap: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 32,
  },
});
