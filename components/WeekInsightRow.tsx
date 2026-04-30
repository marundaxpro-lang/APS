
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Dumbbell, Apple, Moon, Target, TrendingUp } from 'lucide-react-native';
import { WeekInsight } from '@/utils/adherenceEngine';

const C = {
  bg: '#1A1E2E',
  green: '#34D399',
  amber: '#F59E0B',
  red: '#EF4444',
  primary: '#6C63FF',
  text: '#E8EAF6',
  textSecondary: '#8B9CC8',
  textTertiary: '#4A5580',
};

function dotColor(type: WeekInsight['type']): string {
  if (type === 'strong' || type === 'on_track') return C.green;
  if (type === 'slipping' || type === 'needs_attention') return C.amber;
  return C.primary;
}

function badgeLabel(type: WeekInsight['type']): string {
  if (type === 'strong') return 'Strong';
  if (type === 'on_track') return 'On Track';
  if (type === 'slipping') return 'Slipping';
  if (type === 'needs_attention') return 'Needs Attention';
  return 'Recovered';
}

function badgeBg(type: WeekInsight['type']): string {
  if (type === 'strong' || type === 'on_track') return 'rgba(52,211,153,0.15)';
  if (type === 'slipping' || type === 'needs_attention') return 'rgba(245,158,11,0.15)';
  return 'rgba(108,99,255,0.15)';
}

function CategoryIcon({ category }: { category: WeekInsight['category'] }) {
  const color = C.textSecondary;
  const size = 16;
  if (category === 'workout') return <Dumbbell size={size} color={color} />;
  if (category === 'nutrition') return <Apple size={size} color={color} />;
  if (category === 'recovery') return <Moon size={size} color={color} />;
  if (category === 'priorities') return <Target size={size} color={color} />;
  return <TrendingUp size={size} color={color} />;
}

interface Props {
  insight: WeekInsight;
}

export function WeekInsightRow({ insight }: Props) {
  const dot = dotColor(insight.type);
  const label = badgeLabel(insight.type);
  const bg = badgeBg(insight.type);
  const textColor = dotColor(insight.type);

  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <View style={[styles.dot, { backgroundColor: dot }]} />
        <CategoryIcon category={insight.category} />
      </View>
      <View style={styles.center}>
        <Text style={styles.message}>{insight.message}</Text>
        <Text style={styles.actionable}>{insight.actionable}</Text>
      </View>
      <View style={[styles.badge, { backgroundColor: bg }]}>
        <Text style={[styles.badgeText, { color: textColor }]}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 2,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  center: {
    flex: 1,
    gap: 3,
  },
  message: {
    fontSize: 15,
    fontWeight: '600',
    color: C.text,
    lineHeight: 20,
  },
  actionable: {
    fontSize: 13,
    color: C.textSecondary,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
