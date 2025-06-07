import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const client = context.switchToWs().getClient();
    const token = client.handshake.auth.token || client.handshake.headers.authorization;
    
    if (!token) {
      return false;
    }

    try {
      const payload = this.jwtService.verify(token.replace('Bearer ', ''));
      client.user = payload;
      return true;
    } catch {
      return false;
    }
  }
}
