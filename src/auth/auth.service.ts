import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { User } from '../users/user.entity';

export type SocketJwtPayload = {
  sub: string; // userId
  email: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly jwt: JwtService,
    private readonly usersService: UsersService,
  ) {}

  async issueTokenForUserId(userId: string): Promise<{
    accessToken: string;
    user: User;
  }> {
    const user = await this.usersService.findOne(userId);
    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      email: user.email,
    } satisfies SocketJwtPayload);
    return { accessToken, user };
  }

  async issueTokenForEmail(email: string): Promise<{
    accessToken: string;
    user: User;
  }> {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new UnauthorizedException(`No user for email ${email}`);
    return this.issueTokenForUserId(user.id);
  }

  async verifyAccessToken(token: string): Promise<User> {
    try {
      const payload = await this.jwt.verifyAsync<SocketJwtPayload>(token);
      return this.usersService.findOne(payload.sub);
    } catch {
      throw new UnauthorizedException('Invalid or expired socket token');
    }
  }

  /**
   * Accept JWT from the same places as the Express FetchIt app:
   * headers.authorization | auth.authorization | query.authorization
   */
  extractToken(sources: {
    headerAuth?: string | string[];
    authAuth?: string;
    queryAuth?: string | string[];
  }): string | null {
    const raw =
      this.asString(sources.headerAuth) ||
      sources.authAuth ||
      this.asString(sources.queryAuth);
    if (!raw) return null;
    return raw.startsWith('Bearer ') ? raw.slice(7).trim() : raw.trim();
  }

  private asString(v?: string | string[]): string | undefined {
    if (!v) return undefined;
    return Array.isArray(v) ? v[0] : v;
  }
}
