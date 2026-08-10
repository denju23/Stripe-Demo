import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateIf,
} from 'class-validator';

export class CreateCheckoutSessionDto {
  @IsUUID()
  userId: string;

  @IsUUID()
  priceId: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  /** Override mode; inferred from price type if omitted */
  @IsOptional()
  @IsEnum(['payment', 'subscription'])
  mode?: 'payment' | 'subscription';

  @IsOptional()
  @IsString()
  successUrl?: string;

  @IsOptional()
  @IsString()
  cancelUrl?: string;
}

export class CreatePaymentIntentDto {
  @IsUUID()
  userId: string;

  @ValidateIf((o) => !o.amount)
  @IsUUID()
  priceId?: string;

  @ValidateIf((o) => !o.priceId)
  @IsInt()
  @Min(50)
  amount?: number;

  @IsOptional()
  @IsString()
  currency?: string;
}
