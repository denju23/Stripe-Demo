import { Global, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OrderSocketGateway } from './order-socket.gateway';
import { SocketEmitService } from './socket-emit.service';
import { SocketPresenceService } from './presence/socket-presence.service';
import { SocketDebugController } from './socket-debug.controller';

@Global()
@Module({
  imports: [AuthModule],
  providers: [SocketPresenceService, SocketEmitService, OrderSocketGateway],
  controllers: [SocketDebugController],
  exports: [SocketEmitService, SocketPresenceService],
})
export class SocketModule {}
