
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Brain, ChevronLeft, Sparkles, AlertCircle } from 'lucide-react-native';
import { CoachExplanationCard } from '@/components/CoachExplanationCard';
import { CoachChange } from '@/utils/coachExplainer';
import { getChanges, dismissChange } from '@/utils/coachExplainerStore';
import { useAuth } from '@/contexts/AuthContext';
import { authenticatedGet } from '@/utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const COLORS = {
  background: '#0A0D1A',
  surface: '#12162A',
  card: '#1A1E2E',
  primary: '#6C63FF',
  teal: '#00D4AA',
  text: '#E8EAF6',
  textSecondary: '#8B9CC8',
  textTertiary: '#4A5580',
  border: 'rgba(108,99,255,0.15)',
  amber: '#F59E0B',
};

type FilterTab = 'active' | 'all' | 'dismissed';

interface ApiInsight {
  id: string;
  type: string;
  title: string;
  shortReason: string;
  fullReason: string;
  dataPoints: string[];
  confidence: 'high' | 'medium' | 'low';
  impact: 'positive' | 'neutral' | 'caution';
  timestamp: string;
  dismissed: boolean;
}

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
  const { user } = useAuth();
  const [allChanges, setAllChanges] = useState<CoachChange[]>([]);
  const [filter, setFilter] = useState<FilterTab>('active');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const loadInsights = useCallback(async () => {
    console.log('[CoachInsights] Loading insights, user:', user?.id ?? 'none');

    // Check if onboarding is done
    const profile = await AsyncStorage.getItem('fitnessProfile');
    const isOnboarded = !!profile;
    setOnboardingComplete(isOnboarded);

    if (!isOnboarded || !user) {
      setLoading(false);
      return;
    }

    // Try to fetch from backend API
    try {
      console.log('[CoachInsights] Fetching from GET /api/user/coach-insights');
      const data = await authenticatedGet<{ insights: ApiInsight[] }>('/api/user/coach-insights');
      console.log('[CoachInsights] API response received, insights count:', data?.insights?.length ?? 0);

      if (data?.insights && Array.isArray(data.insights) && data.insights.length > 0) {
        const mapped: CoachChange[] = data.insights.map((item) => ({
          id: String(item.id),
          type: (item.type as CoachChange['type']) || 'workout_swap',
          timestamp: item.timestamp || new Date().toISOString(),
          title: String(item.title || ''),
          shortReason: String(item.shortReason || ''),
          fullReason: String(item.fullReason || ''),
          dataPoints: Array.isArray(item.dataPoints) ? item.dataPoints.map(String) : [],
          confidence: item.confidence || 'medium',
          impact: item.impact || 'neutral',
          dismissed: !!item.dismissed,
        }));
        const sorted = [...mapped].sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        setAllChanges(sorted);
        setApiError(null);
        setLoading(false);
        return;
      }
    } catch (err: any) {
      console.warn('[CoachInsights] API fetch failed, falling back to local store:', err?.message);
      setApiError(null); // Don't show error — fall back gracefully
    }

    // Fallback: load from local store
    console.log('[CoachInsights] Loading from local coachExplainerStore');
    const changes = await getChanges();
    const sorted = [...changes].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    setAllChanges(sorted);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadInsights();
  }, [loadInsights]);

  const onRefresh = async () => {
    console.log('[CoachInsights] User pulled to refresh');
    setRefreshing(true);
    await loadInsights();
    setRefreshing(false);
  };

  const handleDismiss = async (id: string) => {
    console.log('[CoachInsights] User dismissed insight:', id);
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
    active: { title: 'No active insights', subtitle: 'Your plan is running smoothly' },
    all: { title: 'No insights yet', subtitle: 'Coach insights will appear here as your plan adapts' },
    dismissed: { title: 'Nothing dismissed', subtitle: 'Dismissed insights will appear here' },
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

      {/* Not onboarded state */}
      {onboardingComplete === false && (
        <View style={styles.emptyState}>
          <AlertCircle size={40} color={COLORS.amber} />
          <Text style={styles.emptyTitle}>Complete your profile</Text>
          <Text style={styles.emptySubtitle}>
            Complete your profile to get personalized insights from your AI coach.
          </Text>
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={() => {
              console.log('[CoachInsights] User tapped complete profile CTA → navigating to /onboarding');
              router.push('/onboarding');
            }}
          >
            <Text style={styles.ctaButtonText}>Set Up Profile</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Loading state */}
      {onboardingComplete === true && loading && (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading your insights...</Text>
        </View>
      )}

      {/* Main content */}
      {onboardingComplete === true && !loading && (
        <>
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
        </>
      )}
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
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 12,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  ctaButton: {
    marginTop: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  ctaButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
