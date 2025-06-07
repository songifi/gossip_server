import {
    WebSocketGateway,
    WebSocketServer,
    OnGatewayConnection,
    OnGatewayDisconnect,
  } from '@nestjs/websockets';
  import { Server, Socket } from 'socket.io';
  import { OnEvent } from '@nestjs/event-emitter';
  import { UseGuards } from '@nestjs/common';
  import { WsJwtGuard } from '../guards/ws-jwt.guard';
  
  @WebSocketGateway({
    cors: {
      origin: '*',
    },
  })
  export class ReactionGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;
  
    private connectedUsers = new Map<string, string>(); // socketId -> userId
  
    handleConnection(client: Socket) {
      console.log(`Client connected: ${client.id}`);
    }
  
    handleDisconnect(client: Socket) {
      console.log(`Client disconnected: ${client.id}`);
      this.connectedUsers.delete(client.id);
    }
  
    @OnEvent('reaction.added')
    handleReactionAdded(payload: any) {
      this.server.to(`message:${payload.messageId}`).emit('reactionAdded', payload);
    }
  
    @OnEvent('reaction.removed')
    handleReactionRemoved(payload: any) {
      this.server.to(`message:${payload.messageId}`).emit('reactionRemoved', payload);
    }
  
    @OnEvent('reaction.notification')
    handleReactionNotification(payload: any) {
      this.server.to(`user:${payload.messageAuthorId}`).emit('reactionNotification', payload);
    }
  }
  