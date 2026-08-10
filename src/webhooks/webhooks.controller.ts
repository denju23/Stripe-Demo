import {
  Controller,
  Headers,
  HttpCode,
  Post,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { WebhooksService } from './webhooks.service';

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  /**
   * Stripe webhook endpoint.
   * Forward with: stripe listen --forward-to localhost:3000/api/webhooks/stripe
   * Note: global prefix is /api — path is /api/webhooks/stripe
   */
  @Post('stripe')
  @HttpCode(200)
  async handleStripe(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('stripe-signature') signature: string,
  ) {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }
    const rawBody = req.rawBody;
    if (!rawBody) {
      throw new BadRequestException(
        'Raw body missing. Ensure NestFactory.create(..., { rawBody: true })',
      );
    }
    return this.webhooksService.handleStripeEvent(rawBody, signature);
  }
}
