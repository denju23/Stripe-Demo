import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { AuthService } from '../auth/auth.service';
import { User } from '../users/user.entity';
import { SOCKET_EVENTS } from './constants/socket-events';
import { SocketPresenceService } from './presence/socket-presence.service';
import { SocketEmitService, userRoom } from './socket-emit.service';
import { validateSocketPayload } from './validation/socket-validation';
import { ClientPingDto, HeartbeatDto } from './dto/socket-inbound.dto';

type AuthedSocket = Socket & { user?: User };

/**
 * NestJS equivalent of chatSocket.ts:
 * - mount on same HTTP server (Nest does this via @WebSocketGateway)
 * - JWT auth on handshake
 * - store userId → socketId
 * - wire client listeners
 * - expose server via SocketEmitService.setServer (getIO)
 */
@WebSocketGateway({
  cors: { origin: true, credentials: true },
  transports: ['websocket', 'polling'],
  // path: '/socket.io', // default
})
export class OrderSocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(OrderSocketGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly authService: AuthService,
    private readonly presence: SocketPresenceService,
    private readonly emitService: SocketEmitService,
  ) {}

  afterInit(server: Server): void {
    this.emitService.setServer(server);
    this.logger.log('Socket.IO ready (order / payment notifications)');
  }

  async handleConnection(client: AuthedSocket): Promise<void> {
    try {
      const token = this.authService.extractToken({
        headerAuth: client.handshake.headers.authorization,
        authAuth: (client.handshake.auth as { authorization?: string })
          ?.authorization,
        queryAuth: client.handshake.query?.authorization as string | undefined,
      });

      if (!token) {
        this.logger.warn(`Reject socket ${client.id}: missing JWT`);
        client.emit(SOCKET_EVENTS.SOCKET_ERROR, {
          message: 'Missing authorization token',
        });
        client.disconnect(true);
        return;
      }

      const user = await this.authService.verifyAccessToken(token);
      client.user = user;

      // Presence: ttl 0 = no expiry while connected (fixes FetchIt 300s gap)
      this.presence.set(user.id, client.id, 0);
      // Rooms: multi-device / multi-tab safe fan-out
      await client.join(userRoom(user.id));

      this.logger.log(
        `Socket connected user=${user.email} id=${user.id} socket=${client.id}`,
      );
    } catch (err) {
      this.logger.warn(
        `Auth failed for socket ${client.id}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      client.emit(SOCKET_EVENTS.SOCKET_ERROR, {
        message: 'Unauthorized socket connection',
      });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: AuthedSocket): void {
    const userId = client.user?.id;
    if (userId) {
      this.presence.delete(userId, client.id);
      this.logger.log(`Socket disconnected user=${userId} socket=${client.id}`);
    }
  }

  @SubscribeMessage(SOCKET_EVENTS.HEARTBEAT)
  onHeartbeat(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: unknown,
  ) {
    const userId = client.user?.id;
    if (!userId) return;

    const parsed = validateSocketPayload<HeartbeatDto>(
      SOCKET_EVENTS.HEARTBEAT,
      body,
    );
    if (!parsed.ok) {
      client.emit(SOCKET_EVENTS.SOCKET_ERROR, { errors: parsed.errors });
      return;
    }

    this.presence.touch(userId);
    return { ok: true, at: new Date().toISOString() };
  }

  @SubscribeMessage(SOCKET_EVENTS.CLIENT_PING)
  onClientPing(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: unknown,
  ) {
    const parsed = validateSocketPayload<ClientPingDto>(
      SOCKET_EVENTS.CLIENT_PING,
      body,
    );
    if (!parsed.ok) {
      client.emit(SOCKET_EVENTS.SOCKET_ERROR, { errors: parsed.errors });
      return;
    }

    client.emit(SOCKET_EVENTS.CLIENT_PONG, {
      message: parsed.data.message ?? 'pong',
      userId: client.user?.id,
      at: new Date().toISOString(),
    });
  }
}
