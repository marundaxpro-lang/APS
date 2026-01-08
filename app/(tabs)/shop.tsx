
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  Linking,
} from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import ParticleBackground from '@/components/ParticleBackground';
import { colors } from '@/styles/commonStyles';
import React, { useState } from 'react';
import { authenticatedPost } from '@/utils/api';

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    priceValue: 0,
    features: [
      'Basic workout tracking',
      'Limited exercise library',
      'Basic nutrition tracking',
      'Community access',
    ],
    color: colors.text,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$9.99',
    priceValue: 9.99,
    period: '/month',
    features: [
      'Full exercise library',
      'Advanced workout plans',
      'Complete nutrition database',
      'AI coaching assistant',
      'Progress analytics',
      'Priority support',
    ],
    color: colors.primary,
    popular: true,
  },
  {
    id: 'elite',
    name: 'Elite',
    price: '$29.99',
    priceValue: 29.99,
    period: '/month',
    features: [
      'Everything in Pro',
      'Personal training consultation',
      'Custom meal plans',
      'Video form checks',
      '1-on-1 coaching sessions',
      'Exclusive community access',
    ],
    color: '#FFD700',
  },
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 30,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  plansContainer: {
    gap: 20,
  },
  planCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    right: 20,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
  },
  popularText: {
    color: colors.background,
    fontSize: 12,
    fontWeight: 'bold',
  },
  planHeader: {
    marginBottom: 20,
  },
  planName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  price: {
    fontSize: 36,
    fontWeight: 'bold',
  },
  period: {
    fontSize: 16,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  featuresContainer: {
    marginBottom: 24,
    gap: 12,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 15,
    color: colors.text,
    flex: 1,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  buttonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonTextDisabled: {
    color: colors.textSecondary,
  },
  footer: {
    marginTop: 40,
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
  },
  footerText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default function ShopScreen() {
  const [loading, setLoading] = useState<string | null>(null);

  const handlePlanPress = async (plan: typeof plans[0]) => {
    if (plan.id === 'free') {
      Alert.alert('Free Plan', 'You are already on the free plan!');
      return;
    }

    setLoading(plan.id);

    try {
      // TODO: Backend Integration - Call the Stripe checkout API endpoint
      // This will create a Stripe checkout session and return the URL
      const response = await authenticatedPost('/api/payments/create-checkout', {
        planId: plan.id,
        planName: plan.name,
        amount: plan.priceValue,
      });

      if (response.checkoutUrl) {
        // Open Stripe checkout page
        const supported = await Linking.canOpenURL(response.checkoutUrl);
        if (supported) {
          await Linking.openURL(response.checkoutUrl);
        } else {
          Alert.alert('Error', 'Unable to open checkout page');
        }
      } else {
        Alert.alert('Error', 'Failed to create checkout session');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      Alert.alert(
        'Error',
        'Failed to start checkout process. Please try again.'
      );
    } finally {
      setLoading(null);
    }
  };

  return (
    <View style={styles.container}>
      <ParticleBackground />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Choose Your Plan</Text>
          <Text style={styles.subtitle}>
            Unlock your full potential with premium features
          </Text>
        </View>

        <View style={styles.plansContainer}>
          {plans.map((plan) => (
            <View
              key={plan.id}
              style={[
                styles.planCard,
                { borderColor: plan.popular ? plan.color : 'rgba(255, 255, 255, 0.1)' },
              ]}
            >
              {plan.popular && (
                <View style={styles.popularBadge}>
                  <Text style={styles.popularText}>MOST POPULAR</Text>
                </View>
              )}

              <View style={styles.planHeader}>
                <Text style={styles.planName}>{plan.name}</Text>
                <View style={styles.priceContainer}>
                  <Text style={[styles.price, { color: plan.color }]}>
                    {plan.price}
                  </Text>
                  {plan.period && (
                    <Text style={styles.period}>{plan.period}</Text>
                  )}
                </View>
              </View>

              <View style={styles.featuresContainer}>
                {plan.features.map((feature, index) => (
                  <View key={index} style={styles.feature}>
                    <IconSymbol
                      ios_icon_name="checkmark.circle.fill"
                      android_material_icon_name="check-circle"
                      size={20}
                      color={plan.color}
                    />
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={[
                  styles.button,
                  plan.id === 'free' && styles.buttonDisabled,
                  { backgroundColor: plan.id === 'free' ? 'rgba(255, 255, 255, 0.1)' : plan.color },
                ]}
                onPress={() => handlePlanPress(plan)}
                disabled={plan.id === 'free' || loading === plan.id}
              >
                <Text
                  style={[
                    styles.buttonText,
                    plan.id === 'free' && styles.buttonTextDisabled,
                  ]}
                >
                  {loading === plan.id
                    ? 'Loading...'
                    : plan.id === 'free'
                    ? 'Current Plan'
                    : 'Get Started'}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            All plans include a 7-day free trial. Cancel anytime.{'\n'}
            Secure payment powered by Stripe.{'\n'}
            Supports all major payment methods including credit cards, PayPal, and iDEAL.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
