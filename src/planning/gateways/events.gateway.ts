import {
    WebSocketGateway,
    SubscribeMessage,
    MessageBody,
    ConnectedSocket,
    WebSocketServer,
    OnGatewayConnection,
    OnGatewayDisconnect,
  } from '@nestjs/websockets';
  import { Server, Socket } from 'socket.io';
  import { UseGuards } from '@nestjs/common';
  import { WsJwtGuard } from '../../auth/guards/ws-jwt.guard';
  import { DiscussionService } from '../services/discussion.service';
  import { CreateDiscussionDto } from '../dto/create-discussion.dto';
  
  @WebSocketGateway({
    namespace: '/events',
    cors: {
      origin: '*',
    },
  })
  @UseGuards(WsJwtGuard)
  export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;
  
    private userSockets = new Map<string, Set<string>>();
  
    constructor(private discussionService: DiscussionService) {}
  
    handleConnection(client: Socket) {
      const userId = client.data.user?.id;
      if (userId) {
        if (!this.userSockets.has(userId)) {
          this.userSockets.set(userId, new Set());
        }
        this.userSockets.get(userId).add(client.id);
      }
    }
  
    handleDisconnect(client: Socket) {
      const userId = client.data.user?.id;
      if (userId && this.userSockets.has(userId)) {
        this.userSockets.get(userId).delete(client.id);
        if (this.userSockets.get(userId).size === 0) {
          this.userSockets.delete(userId);
        }
      }
    }
  
    @SubscribeMessage('joinEvent')
    handleJoinEvent(
      @ConnectedSocket() client: Socket,
      @MessageBody() eventId: string,
    ) {
      client.join(`event-${eventId}`);
      return { event: 'joinedEvent', data: eventId };
    }
  
    @SubscribeMessage('leaveEvent')
    handleLeaveEvent(
      @ConnectedSocket() client: Socket,
      @MessageBody() eventId: string,
    ) {
      client.leave(`event-${eventId}`);
      return { event: 'leftEvent', data: eventId };
    }
  
    @SubscribeMessage('sendMessage')
    async handleMessage(
      @ConnectedSocket() client: Socket,
      @MessageBody() data: CreateDiscussionDto,
    ) {
      const user = client.data.user;
      const message = await this.discussionService.create(data, user);
      
      // Broadcast to all users in the event room
      this.server.to(`event-${data.eventId}`).emit('newMessage', message);
      
      return { event: 'messageSent', data: message };
    }
  
    // Method to notify users about event updates
    notifyEventUpdate(eventId: string, update: any) {
      this.server.to(`event-${eventId}`).emit('eventUpdate', update);
    }
  
    // Method to notify about RSVP changes
    notifyRsvpUpdate(eventId: string, rsvp: any) {
      this.server.to(`event-${eventId}`).emit('rsvpUpdate', rsvp);
    }
  }
  