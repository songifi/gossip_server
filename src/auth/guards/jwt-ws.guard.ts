// src/gateway/ws-auth.guard.ts
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Injectable()
export class JwtWsGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient();
    const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.split(' ')[1];

    if (!token) {
      throw new WsException('Missing token');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token);
      context.switchToWs().getData().user = payload;
      client.data.user = payload;
      return true;
    } catch (err) {
      throw new WsException('Invalid or expired token');
    }
  }
}
