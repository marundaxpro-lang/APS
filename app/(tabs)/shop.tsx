
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Linking,
} from 'react-native';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';

export default function ShopScreen() {
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
      current: true,
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
      paymentLink: 'https://buy.stripe.com/test_pro_plan',
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
      paymentLink: 'https://buy.stripe.com/test_elite_plan',
    },
  ];

  const handlePlanPress = async (plan: typeof plans[0]) => {
    if (plan.id === 'free') {
      return;
    }

    if (plan.id === 'elite') {
      // TODO: Backend Integration - Submit Elite plan contact form to backend API
      console.log('Elite plan selected - contact form');
      return;
    }

    // For Pro plan, redirect to Stripe payment link
    if (plan.paymentLink) {
      try {
        await Linking.openURL(plan.paymentLink);
      } catch (error) {
        console.error('Error opening payment link:', error);
      }
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Upgrade Your Training</Text>
          <Text style={styles.subtitle}>Choose the plan that fits your goals</Text>
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
                {plan.current ? 'Current Plan' : plan.id === 'elite' ? 'Contact Us' : 'Subscribe'}
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
              We accept all major credit cards, debit cards, and digital wallets through Stripe.
            </Text>
          </View>

          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>Is there a free trial?</Text>
            <Text style={styles.faqAnswer}>
              Pro and Elite plans come with a 7-day free trial. Cancel before the trial ends to avoid charges.
            </Text>
          </View>
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
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  planCard: {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
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
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  planPriceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  planPrice: {
    fontSize: 36,
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
    fontSize: 14,
    color: colors.text,
  },
  planButton: {
    backgroundColor: colors.grey,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  planButtonPopular: {
    backgroundColor: colors.primary,
  },
  planButtonCurrent: {
    backgroundColor: colors.backgroundAlt,
  },
  planButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  planButtonTextCurrent: {
    color: colors.textSecondary,
  },
  faqCard: {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 24,
    padding: 20,
  },
  faqTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 20,
  },
  faqItem: {
    marginBottom: 16,
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  faqAnswer: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
