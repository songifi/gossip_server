import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationStatus, NotificationType } from './notification.entity';
import { FcmService } from './fcm.service';
import { EmailService } from './email.service';
import { NotificationPreferencesService } from './notification-preferences.service';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    private readonly fcmService: FcmService,
    private readonly emailService: EmailService,
    private readonly preferencesService: NotificationPreferencesService,
  ) {}

  // Helper to check if current time is within DND window
  private isWithinDnd(dndStart?: string, dndEnd?: string): boolean {
    if (!dndStart || !dndEnd) return false;
    const now = new Date();
    const [startH, startM] = dndStart.split(':').map(Number);
    const [endH, endM] = dndEnd.split(':').map(Number);
    const start = new Date(now);
    start.setHours(startH, startM, 0, 0);
    const end = new Date(now);
    end.setHours(endH, endM, 0, 0);
    if (start < end) {
      return now >= start && now <= end;
    } else {
      // Overnight DND
      return now >= start || now <= end;
    }
  }

  async createNotification(userId: string, type: NotificationType, content: string, batchId?: string, pushToken?: string, email?: string): Promise<Notification> {
    // Fetch user preferences
    const prefs = await this.preferencesService.getPreferences(userId);
    // Enforce DND
    if (prefs.doNotDisturb && this.isWithinDnd(prefs.dndStart, prefs.dndEnd)) {
      // Optionally, queue or batch notification here
      return this.notificationRepository.save(this.notificationRepository.create({
        userId,
        type,
        content,
        status: NotificationStatus.SENT,
        batchId,
      }));
    }
    // Create and save notification
    const notification = this.notificationRepository.create({
      userId,
      type,
      content,
      status: NotificationStatus.SENT,
      batchId,
    });
    const saved = await this.notificationRepository.save(notification);
    // Deliver via FCM
    if (prefs.pushEnabled && pushToken) {
      await this.fcmService.sendPushNotification(pushToken, type, content, { notificationId: saved.id });
    }
    // Deliver via Email
    if (prefs.emailEnabled && email) {
      await this.emailService.sendEmail(email, `New ${type} notification`, content);
    }
    return saved;
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

  async batchNotifications(userId: string, notifications: { type: NotificationType; content: string }[], batchId: string, pushToken?: string, email?: string): Promise<Notification[]> {
    const prefs = await this.preferencesService.getPreferences(userId);
    // Enforce DND for batch
    if (prefs.doNotDisturb && this.isWithinDnd(prefs.dndStart, prefs.dndEnd)) {
      // Optionally, queue or batch notification here
      const batch = notifications.map(n => this.notificationRepository.create({
        userId,
        type: n.type,
        content: n.content,
        status: NotificationStatus.SENT,
        batchId,
      }));
      return this.notificationRepository.save(batch);
    }
    // Create and deliver batch
    const batch = notifications.map(n => this.notificationRepository.create({
      userId,
      type: n.type,
      content: n.content,
      status: NotificationStatus.SENT,
      batchId,
    }));
    const savedBatch = await this.notificationRepository.save(batch);
    // Deliver via FCM
    if (prefs.pushEnabled && pushToken) {
      for (const n of savedBatch) {
        await this.fcmService.sendPushNotification(pushToken, n.type, n.content, { notificationId: n.id });
      }
    }
    // Deliver via Email
    if (prefs.emailEnabled && email) {
      for (const n of savedBatch) {
        await this.emailService.sendEmail(email, `New ${n.type} notification`, n.content);
      }
    }
    return savedBatch;
  }
}
