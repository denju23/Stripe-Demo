import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  constructor(
    @Inject('STRIPE_CLIENT') private readonly stripe: Stripe,
    private readonly config: ConfigService,
  ) {}

  get client(): Stripe {
    return this.stripe;
  }

  get currency(): string {
    return (this.config.get<string>('STRIPE_CURRENCY') || 'usd').toLowerCase();
  }

  get frontendUrl(): string {
    return this.config.get<string>('FRONTEND_URL', 'http://localhost:5173');
  }

  constructEvent(payload: Buffer, signature: string): Stripe.Event {
    const secret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!secret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is not set');
    }
    return this.stripe.webhooks.constructEvent(payload, signature, secret);
  }
}
