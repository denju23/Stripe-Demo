import { IsEmail, IsOptional, IsUUID, ValidateIf } from 'class-validator';

export class IssueTokenDto {
  @ValidateIf((o) => !o.email)
  @IsUUID()
  userId?: string;

  @ValidateIf((o) => !o.userId)
  @IsEmail()
  email?: string;
}
