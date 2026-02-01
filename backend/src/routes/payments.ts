import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import { z } from 'zod';
import Stripe from 'stripe';

// Lazy initialization of Stripe client
let stripeClient: Stripe | null = null;

function getStripeClient(): Stripe {
  if (!stripeClient) {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not set');
    }
    stripeClient = new Stripe(apiKey);
  }
  return stripeClient;
}

// Stripe webhook secret from environment
function getWebhookSecret(): string {
  return process.env.STRIPE_WEBHOOK_SECRET || '';
}

// Plan pricing configuration
const PLAN_PRICES: Record<string, { amount: number; interval: string; productName: string }> = {
  pro: { amount: 999, interval: 'month', productName: 'Pro Plan' },
  elite: { amount: 2999, interval: 'month', productName: 'Elite Plan' },
};

const createCheckoutSchema = z.object({
  plan_type: z.enum(['free', 'pro', 'elite']),
  success_url: z.string().url(),
  cancel_url: z.string().url(),
  payment_method_types: z.array(z.enum(['card', 'ideal', 'paypal', 'sepa_debit', 'bancontact', 'giropay'])).optional(),
});

const cancelSubscriptionSchema = z.object({
  immediate: z.boolean().optional(),
});

export function registerPaymentRoutes(app: App) {
  const requireAuth = app.requireAuth();

  /**
   * POST /api/payments/create-checkout - Create a Stripe checkout session
   */
  app.fastify.post('/api/payments/create-checkout', async (
    request: FastifyRequest<{ Body: any }>,
    reply: FastifyReply
  ): Promise<any> => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    try {
      const validation = createCheckoutSchema.safeParse(request.body);
      if (!validation.success) {
        app.logger.warn({ errors: validation.error.issues }, 'Invalid checkout request');
        return reply.status(400).send({ error: 'Invalid request body' });
      }

      const { plan_type, success_url, cancel_url, payment_method_types } = validation.data;
      const userId = session.user.id;
      const userEmail = session.user.email;

      app.logger.info({ userId, planType: plan_type }, 'Creating checkout session');

      // Free plan doesn't require checkout
      if (plan_type === 'free') {
        app.logger.info({ userId }, 'Setting user to free plan');

        // Update subscription to free
        const existingSubscription = await app.db
          .select()
          .from(schema.subscriptions)
          .where(eq(schema.subscriptions.userId, userId))
          .limit(1);

        if (existingSubscription.length > 0) {
          await app.db
            .update(schema.subscriptions)
            .set({
              planType: 'free',
              status: 'active',
              stripeSubscriptionId: null,
              stripeCustomerId: null,
              currentPeriodEnd: null,
            })
            .where(eq(schema.subscriptions.userId, userId));
        } else {
          await app.db.insert(schema.subscriptions).values({
            userId,
            planType: 'free',
            status: 'active',
          });
        }

        app.logger.info({ userId }, 'User set to free plan successfully');

        return { checkoutUrl: success_url };
      }

      // Get plan pricing
      const planPrice = PLAN_PRICES[plan_type];
      if (!planPrice) {
        return reply.status(400).send({ error: 'Invalid plan type' });
      }

      try {
        // Get or create Stripe customer
        let stripeCustomerId: string;

        // Check if subscription record exists
        const existingSubscription = await app.db
          .select()
          .from(schema.subscriptions)
          .where(eq(schema.subscriptions.userId, userId))
          .limit(1);

        if (existingSubscription.length > 0 && existingSubscription[0].stripeCustomerId) {
          stripeCustomerId = existingSubscription[0].stripeCustomerId;
        } else {
          // Create new Stripe customer
          const customer = await getStripeClient().customers.create({
            email: userEmail,
            metadata: {
              userId,
            },
          });
          stripeCustomerId = customer.id;
        }

        // Determine payment methods
        const supportedPaymentMethods = payment_method_types || ['card', 'ideal', 'paypal'];

        // Create checkout session with payment methods
        const checkoutSession = await getStripeClient().checkout.sessions.create({
          customer: stripeCustomerId,
          payment_method_types: supportedPaymentMethods as any,
          line_items: [
            {
              price_data: {
                currency: 'eur',
                product_data: {
                  name: planPrice.productName,
                  description: `${plan_type.charAt(0).toUpperCase() + plan_type.slice(1)} subscription`,
                  metadata: {
                    planType: plan_type,
                  },
                },
                unit_amount: planPrice.amount,
                recurring: {
                  interval: planPrice.interval as 'month' | 'year',
                  interval_count: 1,
                },
              },
              quantity: 1,
            },
          ],
          mode: 'subscription',
          success_url,
          cancel_url,
          locale: 'auto',
          client_reference_id: userId,
          metadata: {
            userId,
            planType: plan_type,
          },
        });

        // Save subscription record if new
        if (existingSubscription.length === 0) {
          await app.db.insert(schema.subscriptions).values({
            userId,
            planType: plan_type,
            status: 'active',
            stripeCustomerId,
          });
        } else {
          // Update existing subscription record
          await app.db
            .update(schema.subscriptions)
            .set({
              stripeCustomerId,
              planType: plan_type,
            })
            .where(eq(schema.subscriptions.userId, userId));
        }

        app.logger.info(
          { userId, sessionId: checkoutSession.id, planType: plan_type },
          'Checkout session created successfully'
        );

        return {
          checkoutUrl: checkoutSession.url,
          sessionId: checkoutSession.id,
        };
      } catch (stripeError) {
        app.logger.error({ err: stripeError, userId }, 'Stripe checkout creation failed');
        return reply.status(500).send({ error: 'Failed to create checkout session' });
      }
    } catch (error) {
      app.logger.error({ err: error }, 'Error creating checkout');
      return reply.status(500).send({ error: 'Failed to create checkout' });
    }
  });

  /**
   * POST /api/payments/webhook - Handle Stripe webhook events
   */
  app.fastify.post('/api/payments/webhook', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<any> => {
    try {
      app.logger.info('Processing Stripe webhook');

      // Verify webhook signature
      const signature = request.headers['stripe-signature'];
      if (!signature) {
        app.logger.warn('Missing Stripe signature in webhook');
        return reply.status(400).send({ error: 'Missing signature' });
      }

      let event: Stripe.Event;
      try {
        // Get the raw body - Fastify stores it in request.rawBody
        const rawBody = (request as any).rawBody || (request.body as any);
        event = getStripeClient().webhooks.constructEvent(
          typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody),
          signature as string,
          getWebhookSecret()
        );
      } catch (err) {
        app.logger.error({ err }, 'Webhook signature verification failed');
        return reply.status(400).send({ error: 'Invalid signature' });
      }

      app.logger.info({ eventType: event.type }, 'Processing Stripe event');

      // Handle specific events
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;

          if (session.client_reference_id) {
            const userId = session.client_reference_id;
            const planType = session.metadata?.planType || 'pro';

            // Retrieve subscription details
            if (session.subscription) {
              const subscription = await getStripeClient().subscriptions.retrieve(
                session.subscription as string
              );

              // Update subscription record
              await app.db
                .update(schema.subscriptions)
                .set({
                  planType: planType as 'free' | 'pro' | 'elite',
                  status: 'active',
                  stripeSubscriptionId: subscription.id,
                  currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
                })
                .where(eq(schema.subscriptions.userId, userId));
            }
          }
          break;
        }

        case 'customer.subscription.updated': {
          const subscription = event.data.object as Stripe.Subscription;

          // Find user by subscription ID
          const subscriptionRecord = await app.db
            .select()
            .from(schema.subscriptions)
            .where(eq(schema.subscriptions.stripeSubscriptionId, subscription.id))
            .limit(1);

          if (subscriptionRecord.length > 0) {
            const status = subscription.status === 'active' ? 'active' : 'cancelled';

            await app.db
              .update(schema.subscriptions)
              .set({
                status: status as 'active' | 'cancelled' | 'expired',
                currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
              })
              .where(eq(schema.subscriptions.stripeSubscriptionId, subscription.id));
          }
          break;
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription;

          // Mark subscription as cancelled
          await app.db
            .update(schema.subscriptions)
            .set({
              status: 'cancelled',
            })
            .where(eq(schema.subscriptions.stripeSubscriptionId, subscription.id));
          break;
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object as Stripe.Invoice;

          // Handle payment failure
          if ((invoice as any).subscription) {
            const subscriptionRecord = await app.db
              .select()
              .from(schema.subscriptions)
              .where(eq(schema.subscriptions.stripeSubscriptionId, (invoice as any).subscription as string))
              .limit(1);

            if (subscriptionRecord.length > 0) {
              app.logger.warn(`Payment failed for subscription ${(invoice as any).subscription}`);
            }
          }
          break;
        }

        default:
          // Unhandled event type
          break;
      }

      app.logger.info('Stripe webhook processed successfully');

      return { received: true };
    } catch (error) {
      app.logger.error({ err: error }, 'Webhook processing error');
      return reply.status(500).send({ error: 'Webhook processing failed' });
    }
  });

  /**
   * GET /api/payments/subscription-status - Get current user's subscription status
   */
  app.fastify.get('/api/payments/subscription-status', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<any> => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    try {
      const userId = session.user.id;

      app.logger.info({ userId }, 'Retrieving subscription status');

      // Get or create default subscription
      let subscription = await app.db
        .select()
        .from(schema.subscriptions)
        .where(eq(schema.subscriptions.userId, userId))
        .limit(1);

      if (subscription.length === 0) {
        app.logger.info({ userId }, 'Creating default free subscription');

        // Create default free subscription
        const [newSub] = await app.db
          .insert(schema.subscriptions)
          .values({
            userId,
            planType: 'free',
            status: 'active',
          })
          .returning();

        subscription = [newSub];
      }

      const sub = subscription[0];

      app.logger.info(
        { userId, planType: sub.planType, status: sub.status },
        'Subscription status retrieved'
      );

      return {
        id: sub.id,
        planType: sub.planType,
        status: sub.status,
        currentPeriodEnd: sub.currentPeriodEnd,
        stripeCustomerId: sub.stripeCustomerId,
        stripeSubscriptionId: sub.stripeSubscriptionId,
        createdAt: sub.createdAt,
        updatedAt: sub.updatedAt,
      };
    } catch (error) {
      app.logger.error({ err: error }, 'Error retrieving subscription status');
      return reply.status(500).send({ error: 'Failed to retrieve subscription status' });
    }
  });

  /**
   * POST /api/payments/cancel-subscription - Cancel user's subscription
   */
  app.fastify.post('/api/payments/cancel-subscription', async (
    request: FastifyRequest<{ Body: any }>,
    reply: FastifyReply
  ): Promise<any> => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    try {
      const validation = cancelSubscriptionSchema.safeParse(request.body);
      const { immediate = true } = validation.data || { immediate: true };

      const userId = session.user.id;

      app.logger.info({ userId, immediate }, 'Cancelling subscription');

      // Get subscription
      const subscription = await app.db
        .select()
        .from(schema.subscriptions)
        .where(eq(schema.subscriptions.userId, userId))
        .limit(1);

      if (subscription.length === 0 || !subscription[0].stripeSubscriptionId) {
        app.logger.warn({ userId }, 'No active subscription found for cancellation');
        return reply.status(400).send({ error: 'No active subscription found' });
      }

      const sub = subscription[0];

      try {
        // Cancel at Stripe
        await getStripeClient().subscriptions.update(sub.stripeSubscriptionId, {
          cancel_at_period_end: !immediate,
        });

        if (immediate) {
          // Immediately cancel the subscription
          await getStripeClient().subscriptions.cancel(sub.stripeSubscriptionId);
        }

        // Update local subscription record
        await app.db
          .update(schema.subscriptions)
          .set({
            status: immediate ? 'cancelled' : 'active',
            planType: 'free',
          })
          .where(eq(schema.subscriptions.userId, userId));

        app.logger.info({ userId, immediate }, 'Subscription cancelled successfully');

        return {
          success: true,
          message: immediate
            ? 'Subscription cancelled immediately'
            : 'Subscription will be cancelled at the end of the billing period',
        };
      } catch (stripeError) {
        app.logger.error({ err: stripeError, userId }, 'Stripe cancellation failed');
        return reply.status(500).send({ error: 'Failed to cancel subscription with Stripe' });
      }
    } catch (error) {
      app.logger.error({ err: error }, 'Error cancelling subscription');
      return reply.status(500).send({ error: 'Failed to cancel subscription' });
    }
  });
}
