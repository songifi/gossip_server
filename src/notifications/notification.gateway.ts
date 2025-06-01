import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { NotificationService } from './notification.service';

@WebSocketGateway({ namespace: '/notifications', cors: true })
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly notificationService: NotificationService) {}

  handleConnection(client: Socket) {
    // Optionally authenticate client here
  }

  handleDisconnect(client: Socket) {
    // Cleanup if needed
  }

  @SubscribeMessage('subscribe')
  async handleSubscribe(@MessageBody() data: { userId: string }, @ConnectedSocket() client: Socket) {
    client.join(data.userId);
    // Optionally send missed notifications
    const notifications = await this.notificationService.getUserNotifications(data.userId);
    client.emit('notification_history', notifications);
  }

  async sendNotificationToUser(userId: string, notification: any) {
    this.server.to(userId).emit('notification', notification);
  }
}
