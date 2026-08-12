import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

/** Client → server: heartbeat to refresh presence */
export class HeartbeatDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  note?: string;
}

/** Client → server: demo ping (validated inbound event) */
export class ClientPingDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  message?: string;
}

/** Optional: client asks to watch a specific order (push still driven by server) */
export class WatchOrderDto {
  @IsUUID()
  orderId: string;
}
