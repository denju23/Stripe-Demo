import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseBoolPipe,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { CreateBillingPortalDto } from './dto/subscription.dto';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get()
  list(@Query('userId') userId?: string) {
    return this.subscriptionsService.list(userId);
  }

  /** Stripe Customer Billing Portal — declare before :id routes */
  @Post('billing-portal')
  billingPortal(@Body() dto: CreateBillingPortalDto) {
    return this.subscriptionsService.createBillingPortal(dto);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.subscriptionsService.findOne(id);
  }

  @Post(':id/cancel')
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('atPeriodEnd', new DefaultValuePipe(true), ParseBoolPipe)
    atPeriodEnd: boolean,
  ) {
    return this.subscriptionsService.cancel(id, atPeriodEnd);
  }
}
