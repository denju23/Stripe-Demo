import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateBillingPortalDto {
  @IsUUID()
  userId: string;

  @IsOptional()
  @IsString()
  returnUrl?: string;
}

export class CancelSubscriptionDto {
  @IsOptional()
  cancelAtPeriodEnd?: boolean;
}
