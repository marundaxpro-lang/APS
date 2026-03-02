
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import React, { useState, useEffect } from 'react';
import { authenticatedPost, authenticatedGet, BACKEND_URL } from '@/utils/api';
import Modal from '@/components/ui/Modal';

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: '€0',
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
    price: '€9.99',
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
    price: '€29.99',
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

// European payment methods supported
const EUROPEAN_PAYMENT_METHODS = ['card', 'ideal', 'paypal', 'sepa_debit', 'bancontact', 'giropay'];

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
  currentPlanBadge: {
    marginTop: 12,
    backgroundColor: 'rgba(69, 155, 155, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  currentPlanText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  premiumBadge: {
    marginTop: 8,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  premiumBadgeText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: 'bold',
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
  cancelButton: {
    marginTop: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  cancelButtonText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
  },
  paymentMethodsContainer: {
    marginTop: 8,
    marginBottom: 16,
  },
  paymentMethodsTitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  paymentMethodsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  paymentMethodBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  paymentMethodText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
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
  periodEndText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
  },
});

interface SubscriptionStatus {
  id: string;
  planType: string;
  status: string;
  currentPeriodEnd: string | null;
  isPremium: boolean;
  stripeSubscriptionId: string | null;
}

export default function ShopScreen() {
  const [loading, setLoading] = useState<string | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<string>('free');
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [errorModal, setErrorModal] = useState<{ visible: boolean; message: string }>({ visible: false, message: '' });
  const [successModal, setSuccessModal] = useState<{ visible: boolean; message: string }>({ visible: false, message: '' });
  const [cancelConfirmModal, setCancelConfirmModal] = useState(false);

  useEffect(() => {
    loadCurrentPlan();
  }, []);

  const loadCurrentPlan = async () => {
    try {
      console.log('[Shop] Loading current subscription plan...');
      const response = await authenticatedGet<SubscriptionStatus>('/api/payments/subscription-status');
      console.log('[Shop] Subscription status:', response);
      setSubscriptionStatus(response);
      setCurrentPlan(response.planType || 'free');
    } catch (error) {
      console.log('[Shop] Could not load subscription status, defaulting to free plan');
      setCurrentPlan('free');
    } finally {
      setLoadingPlan(false);
    }
  };

  const getSuccessUrl = (): string => {
    if (Platform.OS === 'web') {
      // @ts-expect-error - window is available on web
      return `${window.location.origin}/shop?success=true`;
    }
    return `${BACKEND_URL}/payment-success`;
  };

  const getCancelUrl = (): string => {
    if (Platform.OS === 'web') {
      // @ts-expect-error - window is available on web
      return `${window.location.origin}/shop?cancelled=true`;
    }
    return `${BACKEND_URL}/payment-cancelled`;
  };

  const handlePlanPress = async (plan: typeof plans[0]) => {
    console.log('[Shop] User tapped plan:', plan.name);

    // If clicking current plan, just return
    if (plan.id === currentPlan) {
      console.log('[Shop] User clicked their current plan');
      return;
    }

    setLoading(plan.id);

    try {
      console.log('[Shop] Creating checkout session for plan:', plan.id);

      const response = await authenticatedPost<{ checkoutUrl: string; sessionId: string }>(
        '/api/payments/create-checkout',
        {
          plan_type: plan.id,
          success_url: getSuccessUrl(),
          cancel_url: getCancelUrl(),
          payment_method_types: EUROPEAN_PAYMENT_METHODS,
        }
      );

      console.log('[Shop] Checkout response:', response);

      if (response.checkoutUrl) {
        const supported = await Linking.canOpenURL(response.checkoutUrl);
        if (supported) {
          console.log('[Shop] Opening checkout URL:', response.checkoutUrl);
          await Linking.openURL(response.checkoutUrl);
          // Reload plan status after returning from checkout
          setTimeout(() => loadCurrentPlan(), 2000);
        } else {
          console.error('[Shop] Cannot open URL:', response.checkoutUrl);
          setErrorModal({ visible: true, message: 'Unable to open payment page. Please try again.' });
        }
      } else {
        console.error('[Shop] No checkout URL in response');
        setErrorModal({ visible: true, message: 'Failed to create checkout session. Please try again.' });
      }
    } catch (error: any) {
      console.error('[Shop] Checkout error:', error);
      setErrorModal({
        visible: true,
        message: error?.message || 'Failed to start checkout. Please try again.',
      });
    } finally {
      setLoading(null);
    }
  };

  const handleCancelSubscription = async () => {
    setCancelConfirmModal(false);
    setCancelLoading(true);
    try {
      console.log('[Shop] Cancelling subscription...');
      const response = await authenticatedPost<{ success: boolean; message: string }>(
        '/api/payments/cancel-subscription',
        { immediate: true }
      );
      console.log('[Shop] Cancel response:', response);
      setSuccessModal({ visible: true, message: response.message || 'Subscription cancelled successfully.' });
      await loadCurrentPlan();
    } catch (error: any) {
      console.error('[Shop] Cancel error:', error);
      setErrorModal({
        visible: true,
        message: error?.message || 'Failed to cancel subscription. Please try again.',
      });
    } finally {
      setCancelLoading(false);
    }
  };

  if (loadingPlan) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const currentPlanName = plans.find(p => p.id === currentPlan)?.name || 'Free';
  const isPremium = subscriptionStatus?.isPremium || false;
  const hasActiveStripeSubscription = !!(subscriptionStatus?.stripeSubscriptionId && subscriptionStatus?.status === 'active' && currentPlan !== 'free');

  const formatPeriodEnd = (dateStr: string | null | undefined): string => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-NL', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <View style={styles.container}>
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
          <View style={styles.currentPlanBadge}>
            <Text style={styles.currentPlanText}>
              Current Plan: {currentPlanName}
            </Text>
          </View>
          {isPremium && (
            <View style={styles.premiumBadge}>
              <Text style={styles.premiumBadgeText}>✨ PREMIUM ACTIVE</Text>
            </View>
          )}
          {subscriptionStatus?.currentPeriodEnd && hasActiveStripeSubscription && (
            <Text style={styles.periodEndText}>
              Renews on {formatPeriodEnd(subscriptionStatus.currentPeriodEnd)}
            </Text>
          )}
        </View>

        <View style={styles.plansContainer}>
          {plans.map((plan) => {
            const isLoading = loading === plan.id;
            const isCurrentPlan = plan.id === currentPlan;
            const buttonColor = isCurrentPlan ? 'rgba(255, 255, 255, 0.1)' : plan.color;
            const showPaymentMethods = plan.id !== 'free';

            return (
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

                {showPaymentMethods && (
                  <View style={styles.paymentMethodsContainer}>
                    <Text style={styles.paymentMethodsTitle}>Accepted payment methods:</Text>
                    <View style={styles.paymentMethodsList}>
                      {['Credit/Debit Card', 'Apple Pay', 'iDEAL', 'PayPal', 'SEPA', 'Bancontact', 'Giropay'].map((method) => (
                        <View key={method} style={styles.paymentMethodBadge}>
                          <Text style={styles.paymentMethodText}>{method}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                <TouchableOpacity
                  style={[
                    styles.button,
                    isCurrentPlan && styles.buttonDisabled,
                    { backgroundColor: buttonColor },
                  ]}
                  onPress={() => handlePlanPress(plan)}
                  disabled={isCurrentPlan || isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color={colors.background} />
                  ) : (
                    <Text
                      style={[
                        styles.buttonText,
                        isCurrentPlan && styles.buttonTextDisabled,
                      ]}
                    >
                      {isCurrentPlan ? 'Current Plan' : plan.id === 'free' ? 'Downgrade to Free' : 'Get Started'}
                    </Text>
                  )}
                </TouchableOpacity>

                {isCurrentPlan && hasActiveStripeSubscription && plan.id !== 'free' && (
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => setCancelConfirmModal(true)}
                    disabled={cancelLoading}
                  >
                    {cancelLoading ? (
                      <ActivityIndicator color="#ef4444" size="small" />
                    ) : (
                      <Text style={styles.cancelButtonText}>Cancel Subscription</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            All plans include a 7-day free trial. Cancel anytime.{'\n'}
            Secure payment powered by Stripe.{'\n'}
            Supports iDEAL, Apple Pay, credit cards, PayPal, SEPA, Bancontact & Giropay.{'\n'}
            Prices in EUR (€) — optimised for European customers.
          </Text>
        </View>
      </ScrollView>

      {/* Error Modal */}
      <Modal
        visible={errorModal.visible}
        onClose={() => setErrorModal({ visible: false, message: '' })}
        title="Payment Error"
        message={errorModal.message}
        type="error"
        confirmText="OK"
      />

      {/* Success Modal */}
      <Modal
        visible={successModal.visible}
        onClose={() => setSuccessModal({ visible: false, message: '' })}
        title="Success"
        message={successModal.message}
        type="success"
        confirmText="OK"
      />

      {/* Cancel Confirmation Modal */}
      <Modal
        visible={cancelConfirmModal}
        onClose={() => setCancelConfirmModal(false)}
        title="Cancel Subscription"
        message="Are you sure you want to cancel your subscription? You will lose access to premium features immediately."
        type="confirm"
        confirmText="Cancel Subscription"
        cancelText="Keep Plan"
        onConfirm={handleCancelSubscription}
      />
    </View>
  );
}
