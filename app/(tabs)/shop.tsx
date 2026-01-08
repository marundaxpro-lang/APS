
import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { usePlacement, useUser } from 'expo-superwall';
import ParticleBackground from '@/components/ParticleBackground';

export default function ShopScreen() {
  const { subscriptionStatus, user } = useUser();
  const { registerPlacement } = usePlacement({
    onError: (err) => {
      console.error('Paywall Error:', err);
      Alert.alert('Error', 'Failed to load payment options. Please try again.');
    },
    onPresent: (info) => {
      console.log('Paywall Presented:', info);
    },
    onDismiss: (info, result) => {
      console.log('Paywall Dismissed:', result);
      if (result.status === 'purchased') {
        Alert.alert('🎉 Success!', 'Welcome to premium! Enjoy all features.');
      }
    },
  });

  const isPro = subscriptionStatus?.status === 'ACTIVE';

  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: '$0',
      period: 'forever',
      features: [
        'Basic workout tracking',
        'Limited food database',
        'Progress photos',
        'Community access',
      ],
      current: !isPro,
    },
    {
      id: 'pro',
      name: 'Pro',
      price: '$9.99',
      period: '/month',
      features: [
        'All Free features',
        'Full food database',
        'AI coaching insights',
        'Advanced analytics',
        'Custom workout plans',
        'Priority support',
      ],
      popular: true,
      placement: 'pro_monthly',
    },
    {
      id: 'elite',
      name: 'Elite',
      price: '$29.99',
      period: '/month',
      features: [
        'All Pro features',
        'Personal coach consultation',
        'Meal planning service',
        'Video form checks',
        'Exclusive community',
        '1-on-1 support',
      ],
      placement: 'elite_monthly',
    },
  ];

  const handlePlanPress = async (plan: typeof plans[0]) => {
    if (plan.id === 'free' || plan.current) {
      return;
    }

    if (plan.placement) {
      await registerPlacement({
        placement: plan.placement,
        feature() {
          console.log('Feature unlocked!');
          Alert.alert('Success!', `You now have access to ${plan.name} features!`);
        },
      });
    }
  };

  return (
    <View style={styles.container}>
      <ParticleBackground />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Upgrade Your Training</Text>
          <Text style={styles.subtitle}>Choose the plan that fits your goals</Text>
          {isPro && (
            <View style={styles.premiumBadge}>
              <IconSymbol 
                ios_icon_name="star.fill" 
                android_material_icon_name="star" 
                size={16} 
                color="#fbbf24" 
              />
              <Text style={styles.premiumText}>Premium Member</Text>
            </View>
          )}
        </View>

        {plans.map((plan) => (
          <View
            key={plan.id}
            style={[
              styles.planCard,
              plan.popular && styles.planCardPopular,
            ]}
          >
            {plan.popular && (
              <View style={styles.popularBadge}>
                <Text style={styles.popularText}>MOST POPULAR</Text>
              </View>
            )}

            <View style={styles.planHeader}>
              <Text style={styles.planName}>{plan.name}</Text>
              <View style={styles.planPriceContainer}>
                <Text style={styles.planPrice}>{plan.price}</Text>
                <Text style={styles.planPeriod}>{plan.period}</Text>
              </View>
            </View>

            <View style={styles.planFeatures}>
              {plan.features.map((feature, index) => (
                <View key={index} style={styles.featureRow}>
                  <IconSymbol
                    ios_icon_name="checkmark.circle.fill"
                    android_material_icon_name="check-circle"
                    size={20}
                    color={plan.popular ? colors.primary : colors.success}
                  />
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={[
                styles.planButton,
                plan.current && styles.planButtonCurrent,
                plan.popular && styles.planButtonPopular,
              ]}
              onPress={() => handlePlanPress(plan)}
              disabled={plan.current}
            >
              <Text
                style={[
                  styles.planButtonText,
                  plan.current && styles.planButtonTextCurrent,
                ]}
              >
                {plan.current ? 'Current Plan' : 'Subscribe'}
              </Text>
            </TouchableOpacity>
          </View>
        ))}

        <View style={styles.faqCard}>
          <Text style={styles.faqTitle}>Frequently Asked Questions</Text>

          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>Can I cancel anytime?</Text>
            <Text style={styles.faqAnswer}>
              Yes, you can cancel your subscription at any time. No questions asked.
            </Text>
          </View>

          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>What payment methods do you accept?</Text>
            <Text style={styles.faqAnswer}>
              We accept all major credit cards, debit cards, Apple Pay, Google Pay, and more through our secure payment processor.
            </Text>
          </View>

          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>Is there a free trial?</Text>
            <Text style={styles.faqAnswer}>
              Pro and Elite plans come with a 7-day free trial. Cancel before the trial ends to avoid charges.
            </Text>
          </View>

          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>How do I manage my subscription?</Text>
            <Text style={styles.faqAnswer}>
              You can manage your subscription through your device's app store settings (App Store for iOS, Play Store for Android).
            </Text>
          </View>
        </View>

        <View style={styles.securityCard}>
          <IconSymbol 
            ios_icon_name="lock.shield.fill" 
            android_material_icon_name="security" 
            size={32} 
            color={colors.primary} 
          />
          <Text style={styles.securityTitle}>Secure Payments</Text>
          <Text style={styles.securityText}>
            All payments are processed securely through industry-standard encryption. Your payment information is never stored on our servers.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingTop: Platform.OS === 'android' ? 48 : 60,
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  header: {
    marginBottom: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  premiumText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fbbf24',
  },
  planCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
  },
  planCardPopular: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    alignSelf: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
  },
  popularText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  planHeader: {
    marginBottom: 24,
  },
  planName: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 8,
  },
  planPriceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  planPrice: {
    fontSize: 40,
    fontWeight: '800',
    color: colors.primary,
  },
  planPeriod: {
    fontSize: 16,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  planFeatures: {
    marginBottom: 24,
    gap: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
  },
  planButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  planButtonPopular: {
    backgroundColor: colors.primary,
  },
  planButtonCurrent: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  planButtonText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
  },
  planButtonTextCurrent: {
    color: colors.textSecondary,
  },
  faqCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
  },
  faqTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 20,
  },
  faqItem: {
    marginBottom: 16,
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  faqAnswer: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  securityCard: {
    backgroundColor: 'rgba(69, 155, 155, 0.1)',
    borderColor: colors.primary,
    borderWidth: 1,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  securityTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    marginTop: 12,
    marginBottom: 8,
  },
  securityText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
