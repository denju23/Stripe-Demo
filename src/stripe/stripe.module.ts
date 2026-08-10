import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StripeService } from './stripe.service';

@Global()
@Module({
  providers: [
    {
      provide: 'STRIPE_CLIENT',
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        // lazy import so Nest can boot without key during docs-only use
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const Stripe = require('stripe');
        const key = config.get<string>('STRIPE_SECRET_KEY');
        if (!key || key.includes('xxxxxxxx')) {
          console.warn(
            '[Stripe] STRIPE_SECRET_KEY is missing or still a placeholder. Set a real sk_test_ key in .env',
          );
        }
        return new Stripe(key || 'sk_test_placeholder');
      },
    },
    StripeService,
  ],
  exports: ['STRIPE_CLIENT', StripeService],
})
export class StripeModule {}
