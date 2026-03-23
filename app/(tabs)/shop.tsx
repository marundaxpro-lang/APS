
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { colors } from '@/styles/commonStyles';
import { BodyScrollView } from '@/components/BodyScrollView';

const TEAL = '#00D4AA';
const GOLD = '#FFD700';

interface FeatureItem {
  icon: string;
  title: string;
  description: string;
}

const PREMIUM_FEATURES: FeatureItem[] = [
  {
    icon: '🤖',
    title: 'AI Personal Coach',
    description: 'Get real-time coaching, form tips, and adaptive workout recommendations powered by AI.',
  },
  {
    icon: '🍽️',
    title: 'Smart Meal Plans',
    description: 'Personalized nutrition plans with macro tracking, recipes, and grocery lists.',
  },
  {
    icon: '✈️',
    title: 'Travel & Student Modes',
    description: 'Optimized workouts for hotel rooms, dorms, or anywhere with zero equipment.',
  },
  {
    icon: '📊',
    title: 'Advanced Analytics',
    description: 'Deep insights into your progress, adherence trends, and performance over time.',
  },
  {
    icon: '🎯',
    title: 'Unlimited Program Packs',
    description: 'Access every training program, challenge, and specialty pack in the library.',
  },
];

function FeatureRow({ item }: { item: FeatureItem }) {
  return (
    <View style={styles.featureRow}>
      <View style={styles.featureIconContainer}>
        <Text style={styles.featureIcon}>{item.icon}</Text>
      </View>
      <View style={styles.featureTextContainer}>
        <Text style={styles.featureTitle}>{item.title}</Text>
        <Text style={styles.featureDescription}>{item.description}</Text>
      </View>
    </View>
  );
}

export default function ShopScreen() {
  const router = useRouter();
  const { isSubscribed, loading } = useSubscription();

  const handleUpgrade = () => {
    console.log('[ShopScreen] User tapped Go Pro / Upgrade button');
    router.push('/paywall');
  };

  const handleManage = () => {
    console.log('[ShopScreen] User tapped Manage Subscription button');
    router.push('/paywall');
  };

  return (
    <BodyScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Hero */}
      <View style={styles.hero}>
        <Text style={styles.heroEmoji}>⚡</Text>
        <Text style={styles.heroTitle}>APS Pro</Text>
        <Text style={styles.heroSubtitle}>
          Unlock the full power of your fitness journey
        </Text>

        {isSubscribed ? (
          <View style={styles.proBadge}>
            <Text style={styles.proBadgeText}>✓ Pro Active</Text>
          </View>
        ) : (
          <View style={styles.freeBadge}>
            <Text style={styles.freeBadgeText}>Free Plan</Text>
          </View>
        )}
      </View>

      {/* CTA Card */}
      {isSubscribed ? (
        <View style={styles.activeCard}>
          <View style={styles.activeCardHeader}>
            <Text style={styles.activeCardTitle}>You&apos;re on Pro</Text>
            <Text style={styles.activeCardCheck}>✓</Text>
          </View>
          <Text style={styles.activeCardSubtitle}>
            All premium features are unlocked. Keep crushing your goals!
          </Text>
          <TouchableOpacity style={styles.manageButton} onPress={handleManage}>
            <Text style={styles.manageButtonText}>Manage Subscription</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.upgradeCard}>
          <Text style={styles.upgradeCardTitle}>Upgrade to Pro</Text>
          <Text style={styles.upgradeCardSubtitle}>
            Join thousands of athletes training smarter with APS Pro.
          </Text>
          <TouchableOpacity style={styles.upgradeButton} onPress={handleUpgrade}>
            <Text style={styles.upgradeButtonText}>⚡ Go Pro — See Plans</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Features List */}
      <View style={styles.featuresSection}>
        <Text style={styles.featuresSectionTitle}>What&apos;s included</Text>
        <View style={styles.featuresList}>
          {PREMIUM_FEATURES.map((item) => (
            <FeatureRow key={item.title} item={item} />
          ))}
        </View>
      </View>

      {/* Bottom CTA */}
      {!isSubscribed && (
        <TouchableOpacity style={styles.bottomCta} onPress={handleUpgrade}>
          <Text style={styles.bottomCtaText}>View Plans & Pricing</Text>
        </TouchableOpacity>
      )}
    </BodyScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 120,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 28,
  },
  heroEmoji: {
    fontSize: 52,
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 38,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  proBadge: {
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    borderWidth: 1.5,
    borderColor: GOLD,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 6,
  },
  proBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: GOLD,
  },
  freeBadge: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 6,
  },
  freeBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  activeCard: {
    backgroundColor: 'rgba(255, 215, 0, 0.08)',
    borderWidth: 2,
    borderColor: GOLD,
    borderRadius: 20,
    padding: 22,
    marginBottom: 28,
  },
  activeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  activeCardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: GOLD,
  },
  activeCardCheck: {
    fontSize: 22,
    color: GOLD,
    fontWeight: '700',
  },
  activeCardSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 18,
  },
  manageButton: {
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    borderWidth: 1.5,
    borderColor: GOLD,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  manageButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: GOLD,
  },
  upgradeCard: {
    backgroundColor: 'rgba(0, 212, 170, 0.08)',
    borderWidth: 2,
    borderColor: TEAL,
    borderRadius: 20,
    padding: 22,
    marginBottom: 28,
  },
  upgradeCardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 8,
  },
  upgradeCardSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 18,
  },
  upgradeButton: {
    backgroundColor: TEAL,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: TEAL,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  upgradeButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#000',
    letterSpacing: 0.2,
  },
  featuresSection: {
    marginBottom: 28,
  },
  featuresSectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  featuresList: {
    backgroundColor: colors.card,
    borderRadius: 18,
    overflow: 'hidden',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  featureIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 212, 170, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    flexShrink: 0,
  },
  featureIcon: {
    fontSize: 22,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  bottomCta: {
    borderWidth: 1.5,
    borderColor: TEAL,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  bottomCtaText: {
    fontSize: 15,
    fontWeight: '700',
    color: TEAL,
  },
});
