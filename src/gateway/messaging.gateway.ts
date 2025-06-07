// src/gateway/messaging.gateway.ts

import {
  WebSocketGateway,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards, Logger } from '@nestjs/common';
import { JwtWsGuard } from '../auth/jwt-ws.guard';
import { Events } from './events.enum';
import { RateLimiter } from './utils/rate-limiter';

interface UserSocket extends Socket {
  userId?: string;
}

@WebSocketGateway({ cors: true })
export class MessagingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger('MessagingGateway');
  private rateLimiter = new RateLimiter(10, 60); // 10 messages per 60s per user
  private onlineUsers = new Map<string, string>(); // userId => socketId

  async handleConnection(client: UserSocket) {
    try {
      const token = client.handshake.auth.token;
      const userId = this.validateToken(token);
      if (!userId) throw new Error('Invalid token');
      client.userId = userId;
      this.onlineUsers.set(userId, client.id);
      this.logger.log(`Client connected: ${userId}`);
      this.server.emit(Events.USER_ONLINE, { userId });
    } catch (err) {
      client.disconnect();
    }
  }

  async handleDisconnect(client: UserSocket) {
    if (client.userId) {
      this.onlineUsers.delete(client.userId);
      this.logger.log(`Client disconnected: ${client.userId}`);
      this.server.emit(Events.USER_OFFLINE, { userId: client.userId });
    }
  }

  @UseGuards(JwtWsGuard)
  @SubscribeMessage(Events.SEND_MESSAGE)
  async onMessage(
    @MessageBody() data: { to: string; message: string },
    @ConnectedSocket() client: UserSocket,
  ) {
    const { userId } = client;
    if (!userId || !data.to || !data.message) return;

    if (!this.rateLimiter.allow(userId)) {
      client.emit(Events.RATE_LIMITED, { message: 'Rate limit exceeded' });
      return;
    }

    const payload = {
      from: userId,
      message: data.message,
      timestamp: new Date().toISOString(),
    };

    const recipientSocketId = this.onlineUsers.get(data.to);
    if (recipientSocketId) {
      this.server.to(recipientSocketId).emit(Events.RECEIVE_MESSAGE, payload);
    }
    client.emit(Events.MESSAGE_SENT, payload);
  }

  @SubscribeMessage(Events.TYPING_START)
  async onTypingStart(
    @MessageBody() data: { to: string },
    @ConnectedSocket() client: UserSocket,
  ) {
    if (!client.userId || !data.to) return;
    const recipientSocketId = this.onlineUsers.get(data.to);
    if (recipientSocketId) {
      this.server.to(recipientSocketId).emit(Events.TYPING_START, { from: client.userId });
    }
  }

  @SubscribeMessage(Events.TYPING_STOP)
  async onTypingStop(
    @MessageBody() data: { to: string },
    @ConnectedSocket() client: UserSocket,
  ) {
    if (!client.userId || !data.to) return;
    const recipientSocketId = this.onlineUsers.get(data.to);
    if (recipientSocketId) {
      this.server.to(recipientSocketId).emit(Events.TYPING_STOP, { from: client.userId });
    }
  }

  private validateToken(token: string): string | null {
    // TODO: Use JWT service to verify
    try {
      const decoded = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      return decoded.sub || decoded.id || null;
    } catch {
      return null;
    }
  }
}
