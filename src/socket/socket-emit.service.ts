import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import { SOCKET_EVENTS } from './constants/socket-events';
import { SocketPresenceService } from './presence/socket-presence.service';
import { Order } from '../payments/order.entity';
import { Subscription } from '../subscriptions/subscription.entity';

export function userRoom(userId: string): string {
  return `user:${userId}`;
}

/**
 * Server → client emit helpers (FetchIt chatSocketEvents pattern).
 * Prefer calling these AFTER DB commit from HTTP/webhook services.
 * Never let socket failures break the HTTP response — callers wrap in try/catch.
 */
@Injectable()
export class SocketEmitService {
  private readonly logger = new Logger(SocketEmitService.name);
  private server: Server | null = null;

  constructor(private readonly presence: SocketPresenceService) {}

  /** Called once from gateway.afterInit — Nest equivalent of exporting getIO() */
  setServer(server: Server): void {
    this.server = server;
  }

  getIO(): Server | null {
    return this.server;
  }

  /**
   * Fan-out to a user via room `user:{userId}` (multi-device safe).
   * Presence map is the FetchIt-style routing/isOnline table — not used for emit
   * target so we don't double-deliver when both room + socketId are active.
   *
   * FetchIt equivalent: io.to(cache.get(userId)).emit(...)
   * Nest upgrade:       io.to(`user:${userId}`).emit(...)
   */
  emitToUser(userId: string, event: string, payload: unknown): boolean {
    if (!this.server) {
      this.logger.warn('Socket server not ready; skip emit');
      return false;
    }

    try {
      if (!this.presence.isOnline(userId)) {
        this.logger.debug(`User ${userId} offline; skip ${event}`);
        return false;
      }

      this.server.to(userRoom(userId)).emit(event, payload);
      return true;
    } catch (err) {
      this.logger.error(
        `emitToUser failed userId=${userId} event=${event}`,
        err instanceof Error ? err.stack : String(err),
      );
      return false;
    }
  }

  /** Strict FetchIt-style: look up one socketId and emit to it only */
  emitToSocketId(socketId: string, event: string, payload: unknown): boolean {
    if (!this.server) return false;
    try {
      this.server.to(socketId).emit(event, payload);
      return true;
    } catch {
      return false;
    }
  }

  emitSocketError(userId: string, error: unknown): void {
    this.emitToUser(userId, SOCKET_EVENTS.SOCKET_ERROR, {
      message:
        error instanceof Error ? error.message : String(error ?? 'Socket error'),
      at: new Date().toISOString(),
    });
  }

  emitOrderStatus(userId: string, order: Order): void {
    this.emitToUser(userId, SOCKET_EVENTS.ORDER_STATUS, {
      orderId: order.id,
      status: order.status,
      amount: order.amount,
      currency: order.currency,
      metadata: order.metadata,
      updatedAt: order.updatedAt,
    });
  }

  emitPaymentSucceeded(userId: string, order: Order): void {
    this.emitToUser(userId, SOCKET_EVENTS.PAYMENT_SUCCEEDED, {
      orderId: order.id,
      status: order.status,
      amount: order.amount,
      currency: order.currency,
    });
    this.emitOrderStatus(userId, order);
  }

  emitPaymentFailed(userId: string, order: Order): void {
    this.emitToUser(userId, SOCKET_EVENTS.PAYMENT_FAILED, {
      orderId: order.id,
      status: order.status,
      amount: order.amount,
      currency: order.currency,
    });
    this.emitOrderStatus(userId, order);
  }

  emitSubscriptionUpdated(userId: string, sub: Subscription): void {
    this.emitToUser(userId, SOCKET_EVENTS.SUBSCRIPTION_UPDATED, {
      subscriptionId: sub.id,
      stripeSubscriptionId: sub.stripeSubscriptionId,
      status: sub.status,
      priceId: sub.priceId,
      currentPeriodEnd: sub.currentPeriodEnd,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    });
  }
}
