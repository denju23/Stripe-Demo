import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { PaymentsService } from '../payments/payments.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { StripeService } from '../stripe/stripe.service';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly stripeService: StripeService,
    private readonly paymentsService: PaymentsService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  async handleStripeEvent(rawBody: Buffer, signature: string) {
    const event = this.stripeService.constructEvent(rawBody, signature);
    this.logger.log(`Stripe event: ${event.type} (${event.id})`);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await this.paymentsService.markOrderPaid({
          orderId: session.metadata?.orderId,
          checkoutSessionId: session.id,
          paymentIntentId:
            typeof session.payment_intent === 'string'
              ? session.payment_intent
              : session.payment_intent?.id,
        });
        break;
      }
      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent;
        await this.paymentsService.markOrderPaid({
          orderId: pi.metadata?.orderId,
          paymentIntentId: pi.id,
        });
        break;
      }
      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent;
        await this.paymentsService.markOrderFailed(pi.id);
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await this.subscriptionsService.upsertFromStripe(sub);
        break;
      }
      case 'invoice.paid':
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        this.logger.log(
          `Invoice ${invoice.id} ${event.type} for customer ${invoice.customer}`,
        );
        break;
      }
      default:
        this.logger.debug(`Unhandled event type: ${event.type}`);
    }

    return { received: true };
  }
}
