import { Injectable, Logger } from '@nestjs/common';
import { SOCKET_PRESENCE_NAMESPACE } from '../constants/socket-events';

interface PresenceEntry {
  socketId: string;
  connectedAt: number;
  lastSeenAt: number;
  /** 0 = never expire (recommended for presence while connected) */
  ttlMs: number;
}

/**
 * userId → socketId routing table (FetchIt CacheService pattern).
 * Default TTL is 0 (no expiry). Call touch() from heartbeat if you ever set a TTL.
 */
@Injectable()
export class SocketPresenceService {
  private readonly logger = new Logger(SocketPresenceService.name);
  private readonly map = new Map<string, PresenceEntry>();

  private key(userId: string): string {
    return `${SOCKET_PRESENCE_NAMESPACE}:${userId}`;
  }

  set(userId: string, socketId: string, ttlMs = 0): void {
    const now = Date.now();
    this.map.set(this.key(userId), {
      socketId,
      connectedAt: now,
      lastSeenAt: now,
      ttlMs,
    });
    this.logger.debug(`Presence set ${userId} → ${socketId}`);
  }

  get(userId: string): string | null {
    const entry = this.map.get(this.key(userId));
    if (!entry) return null;
    if (entry.ttlMs > 0 && Date.now() - entry.lastSeenAt > entry.ttlMs) {
      this.map.delete(this.key(userId));
      return null;
    }
    return entry.socketId;
  }

  /** Refresh lastSeen (heartbeat). Prevents false offline if TTL > 0. */
  touch(userId: string): boolean {
    const entry = this.map.get(this.key(userId));
    if (!entry) return false;
    entry.lastSeenAt = Date.now();
    return true;
  }

  delete(userId: string, socketId?: string): void {
    const entry = this.map.get(this.key(userId));
    if (!entry) return;
    // Only delete if this disconnect matches the mapped socket (avoid racing reconnects)
    if (socketId && entry.socketId !== socketId) return;
    this.map.delete(this.key(userId));
    this.logger.debug(`Presence cleared ${userId}`);
  }

  isOnline(userId: string): boolean {
    return this.get(userId) !== null;
  }

  snapshot(): Array<{ userId: string; socketId: string; lastSeenAt: number }> {
    const rows: Array<{ userId: string; socketId: string; lastSeenAt: number }> =
      [];
    for (const [k, v] of this.map.entries()) {
      if (v.ttlMs > 0 && Date.now() - v.lastSeenAt > v.ttlMs) continue;
      rows.push({
        userId: k.replace(`${SOCKET_PRESENCE_NAMESPACE}:`, ''),
        socketId: v.socketId,
        lastSeenAt: v.lastSeenAt,
      });
    }
    return rows;
  }
}
