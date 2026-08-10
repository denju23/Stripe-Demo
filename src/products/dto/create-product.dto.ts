import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateIf,
} from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  /** Amount in cents */
  @IsInt()
  @Min(1)
  amount: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsEnum(['one_time', 'recurring'])
  type: 'one_time' | 'recurring';

  @ValidateIf((o) => o.type === 'recurring')
  @IsEnum(['day', 'week', 'month', 'year'])
  interval?: 'day' | 'week' | 'month' | 'year';

  @IsOptional()
  @IsBoolean()
  syncToStripe?: boolean;
}

export class CreatePriceDto {
  @IsUUID()
  productId: string;

  @IsInt()
  @Min(1)
  amount: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsEnum(['one_time', 'recurring'])
  type: 'one_time' | 'recurring';

  @ValidateIf((o) => o.type === 'recurring')
  @IsEnum(['day', 'week', 'month', 'year'])
  interval?: 'day' | 'week' | 'month' | 'year';
}
