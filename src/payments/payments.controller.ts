import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import {
  CreateCheckoutSessionDto,
  CreatePaymentIntentDto,
} from './dto/checkout.dto';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('orders')
  listOrders(@Query('userId') userId?: string) {
    return this.paymentsService.listOrders(userId);
  }

  @Get('orders/:id')
  getOrder(@Param('id', ParseUUIDPipe) id: string) {
    return this.paymentsService.getOrder(id);
  }

  /** Hosted Stripe Checkout (one-time or subscription) */
  @Post('checkout-session')
  createCheckout(@Body() dto: CreateCheckoutSessionDto) {
    return this.paymentsService.createCheckoutSession(dto);
  }

  /** Custom Elements / Payment Element flow */
  @Post('payment-intent')
  createPaymentIntent(@Body() dto: CreatePaymentIntentDto) {
    return this.paymentsService.createPaymentIntent(dto);
  }
}
