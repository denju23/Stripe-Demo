import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { IssueTokenDto } from './dto/issue-token.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Demo helper: mint a JWT for Socket.IO handshake.
   * In production, issue this from your real login endpoint instead.
   */
  @Post('socket-token')
  async socketToken(@Body() dto: IssueTokenDto) {
    if (dto.userId) {
      return this.authService.issueTokenForUserId(dto.userId);
    }
    if (dto.email) {
      return this.authService.issueTokenForEmail(dto.email);
    }
    throw new BadRequestException('Provide userId or email');
  }
}
