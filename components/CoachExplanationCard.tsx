
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import {
  Zap,
  RefreshCw,
  Apple,
  Target,
  Moon,
  TrendingDown,
  TrendingUp,
  Heart,
  X,
  ChevronRight,
  ChevronDown,
} from 'lucide-react-native';
import { AnimatedPressable } from './AnimatedPressable';
import { CoachChange, ChangeType } from '@/utils/coachExplainer';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const COLORS = {
  background: '#0A0D1A',
  surface: '#12162A',
  card: '#1A1E2E',
  primary: '#6C63FF',
  green: '#34D399',
  amber: '#F59E0B',
  red: '#EF4444',
  text: '#E8EAF6',
  textSecondary: '#8B9CC8',
  textTertiary: '#4A5580',
  chipBg: '#252A3D',
  border: 'rgba(108,99,255,0.15)',
};

function getImpactColor(impact: CoachChange['impact']): string {
  if (impact === 'positive') return COLORS.green;
  if (impact === 'caution') return COLORS.red;
  return COLORS.amber;
}

function getTypeIcon(type: ChangeType, color: string) {
  const size = 14;
  switch (type) {
    case 'workout_swap': return <Zap size={size} color={color} />;
    case 'week_reshuffle': return <RefreshCw size={size} color={color} />;
    case 'nutrition_fix': return <Apple size={size} color={color} />;
    case 'priority_change': return <Target size={size} color={color} />;
    case 'rest_day_added': return <Moon size={size} color={color} />;
    case 'recovery_suggested': return <Heart size={size} color={color} />;
    case 'intensity_drop': return <TrendingDown size={size} color={color} />;
    case 'intensity_increase': return <TrendingUp size={size} color={color} />;
    default: return <Zap size={size} color={color} />;
  }
}

function getTypeLabel(type: ChangeType): string {
  const map: Record<ChangeType, string> = {
    workout_swap: 'WORKOUT SWAP',
    week_reshuffle: 'WEEK RESHUFFLE',
    nutrition_fix: 'NUTRITION FIX',
    priority_change: 'PRIORITY CHANGE',
    intensity_drop: 'INTENSITY DROP',
    intensity_increase: 'INTENSITY BOOST',
    rest_day_added: 'REST DAY ADDED',
    recovery_suggested: 'RECOVERY',
  };
  return map[type] || 'CHANGE';
}

function getConfidenceLabel(confidence: CoachChange['confidence']): string {
  if (confidence === 'high') return 'High confidence';
  if (confidence === 'medium') return 'Learning';
  return 'Exploring';
}

function getRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

interface Props {
  change: CoachChange;
  onDismiss: (id: string) => void;
}

export function CoachExplanationCard({ change, onDismiss }: Props) {
  const [expanded, setExpanded] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  const impactColor = getImpactColor(change.impact);
  const typeLabel = getTypeLabel(change.type);
  const confidenceLabel = getConfidenceLabel(change.confidence);
  const relativeTime = getRelativeTime(change.timestamp);

  const handleToggleExpand = () => {
    console.log('[CoachCard] User tapped expand/collapse for change:', change.id, 'expanded:', !expanded);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(prev => !prev);
  };

  const handleDismiss = () => {
    console.log('[CoachCard] User dismissed change:', change.id);
    onDismiss(change.id);
  };

  const expandText = expanded ? 'Hide details' : 'See why →';

  return (
    <Animated.View style={[styles.card, { opacity: fadeAnim, borderLeftColor: impactColor }]}>
      {/* Top row */}
      <View style={styles.topRow}>
        <View style={styles.typeRow}>
          {getTypeIcon(change.type, impactColor)}
          <Text style={[styles.typeLabel, { color: impactColor }]}>{typeLabel}</Text>
        </View>
        <View style={styles.topRight}>
          <Text style={styles.timestamp}>{relativeTime}</Text>
          <TouchableOpacity
            style={styles.dismissButton}
            onPress={handleDismiss}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <X size={14} color={COLORS.textTertiary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Confidence badge */}
      <View style={styles.confidenceBadge}>
        <View style={[styles.confidenceDot, { backgroundColor: impactColor }]} />
        <Text style={styles.confidenceText}>{confidenceLabel}</Text>
      </View>

      {/* Title */}
      <Text style={styles.title}>{change.title}</Text>

      {/* Short reason */}
      <Text style={styles.shortReason}>{change.shortReason}</Text>

      {/* Expand trigger */}
      <AnimatedPressable onPress={handleToggleExpand} style={styles.expandTrigger}>
        <Text style={styles.expandText}>{expandText}</Text>
        {expanded
          ? <ChevronDown size={13} color={COLORS.primary} />
          : <ChevronRight size={13} color={COLORS.primary} />
        }
      </AnimatedPressable>

      {/* Expanded section */}
      {expanded && (
        <View style={styles.expandedSection}>
          <View style={styles.divider} />
          <Text style={styles.fullReason}>{change.fullReason}</Text>
          <View style={styles.dataPointsRow}>
            {change.dataPoints.map((point, i) => (
              <View key={i} style={styles.chip}>
                <Text style={styles.chipText}>{point}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderLeftWidth: 3,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  typeLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  topRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timestamp: {
    fontSize: 11,
    color: COLORS.textTertiary,
    fontWeight: '500',
  },
  dismissButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 10,
  },
  confidenceDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    opacity: 0.7,
  },
  confidenceText: {
    fontSize: 10,
    color: COLORS.textTertiary,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: -0.2,
    marginBottom: 6,
  },
  shortReason: {
    fontSize: 15,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginBottom: 12,
  },
  expandTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
  },
  expandText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  expandedSection: {
    marginTop: 12,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginBottom: 12,
  },
  fullReason: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 21,
    marginBottom: 12,
  },
  dataPointsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    backgroundColor: COLORS.chipBg,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
});
