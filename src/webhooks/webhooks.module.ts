import { Module } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { WebhooksController } from './webhooks.controller';
import { PaymentsModule } from '../payments/payments.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [PaymentsModule, SubscriptionsModule],
  providers: [WebhooksService],
  controllers: [WebhooksController],
})
export class WebhooksModule {}
