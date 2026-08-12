import { Controller, Get } from '@nestjs/common';
import { SocketPresenceService } from './presence/socket-presence.service';
import { SocketEmitService } from './socket-emit.service';
import { SOCKET_EVENTS } from './constants/socket-events';

/** Dev-only helpers to inspect presence / event names */
@Controller('socket')
export class SocketDebugController {
  constructor(
    private readonly presence: SocketPresenceService,
    private readonly emitService: SocketEmitService,
  ) {}

  @Get('events')
  events() {
    return SOCKET_EVENTS;
  }

  @Get('online')
  online() {
    return {
      serverReady: Boolean(this.emitService.getIO()),
      users: this.presence.snapshot(),
    };
  }
}
