import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { SOCKET_EVENTS } from '../constants/socket-events';
import {
  ClientPingDto,
  HeartbeatDto,
  WatchOrderDto,
} from '../dto/socket-inbound.dto';

/**
 * Map event name → DTO class (must match SOCKET_EVENTS keys used by clients).
 * Avoid mismatched names like emitX vs newX from the Express project gap.
 */
export const SOCKET_INBOUND_VALIDATORS: Record<
  string,
  new () => object
> = {
  [SOCKET_EVENTS.HEARTBEAT]: HeartbeatDto,
  [SOCKET_EVENTS.CLIENT_PING]: ClientPingDto,
  watchOrder: WatchOrderDto,
};

export function validateSocketPayload<T extends object>(
  event: string,
  payload: unknown,
): { ok: true; data: T } | { ok: false; errors: string[] } {
  const Dto = SOCKET_INBOUND_VALIDATORS[event];
  if (!Dto) {
    return { ok: false, errors: [`No validator registered for event: ${event}`] };
  }

  const instance = plainToInstance(Dto, payload ?? {}) as T;
  const errors = validateSync(instance as object, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });

  if (errors.length) {
    return {
      ok: false,
      errors: errors.flatMap((e) => Object.values(e.constraints ?? {})),
    };
  }

  return { ok: true, data: instance };
}
