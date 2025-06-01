import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationStatus, NotificationType } from './notification.entity';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {}

  async createNotification(userId: string, type: NotificationType, content: string, batchId?: string): Promise<Notification> {
    const notification = this.notificationRepository.create({
      userId,
      type,
      content,
      status: NotificationStatus.SENT,
      batchId,
    });
    return this.notificationRepository.save(notification);
  }

  async updateStatus(id: string, status: NotificationStatus): Promise<Notification> {
    await this.notificationRepository.update(id, { status });
    const notification = await this.notificationRepository.findOneBy({ id });
    if (!notification) {
      throw new Error(`Notification with id ${id} not found`);
    }
    return notification;
  }

  async getUserNotifications(userId: string): Promise<Notification[]> {
    return this.notificationRepository.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  async batchNotifications(userId: string, notifications: { type: NotificationType; content: string }[], batchId: string): Promise<Notification[]> {
    const batch = notifications.map(n => this.notificationRepository.create({
      userId,
      type: n.type,
      content: n.content,
      status: NotificationStatus.SENT,
      batchId,
    }));
    return this.notificationRepository.save(batch);
  }
}
