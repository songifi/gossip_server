import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ThreadNotificationEntity } from '../entities/thread.entity';
import { ThreadNotificationSettings } from '../interfaces/thread.interface';

@Injectable()
export class ThreadNotificationService {
  constructor(
    @InjectRepository(ThreadNotificationEntity)
    private notificationRepository: Repository<ThreadNotificationEntity>,
  ) {}

  async createNotificationSettings(settings: Partial<ThreadNotificationSettings>): Promise<ThreadNotificationSettings> {
    const entity = this.notificationRepository.create(settings);
    const saved = await this.notificationRepository.save(entity);
    return this.mapEntityToSettings(saved);
  }

  async updateNotificationSettings(
    threadId: string, 
    userId: string, 
    updates: Partial<ThreadNotificationSettings>
  ): Promise<ThreadNotificationSettings> {
    const existing = await this.notificationRepository.findOne({
      where: { threadId, userId },
    });

    if (!existing) {
      return this.createNotificationSettings({ threadId, userId, ...updates });
    }

    Object.assign(existing, updates);
    const updated = await this.notificationRepository.save(existing);
    return this.mapEntityToSettings(updated);
  }

  async getNotificationSettings(threadId: string, userId: string): Promise<ThreadNotificationSettings | null> {
    const entity = await this.notificationRepository.findOne({
      where: { threadId, userId },
    });

    return entity ? this.mapEntityToSettings(entity) : null;
  }

  async removeNotificationSettings(threadId: string, userId: string): Promise<void> {
    await this.notificationRepository.delete({ threadId, userId });
  }

  async notifyParticipantJoined(threadId: string, newParticipantId: string): Promise<void> {
    const settings = await this.notificationRepository.find({
      where: { threadId, notifyOnParticipantJoin: true },
    });

    console.log(`Notifying ${settings.length} users about new participant ${newParticipantId} in thread ${threadId}`);
  }

  private mapEntityToSettings(entity: ThreadNotificationEntity): ThreadNotificationSettings {
    return {
      id: entity.id,
      threadId: entity.threadId,
      userId: entity.userId,
      notifyOnReply: entity.notifyOnReply,
      notifyOnMention: entity.notifyOnMention,
      notifyOnParticipantJoin: entity.notifyOnParticipantJoin,
      mutedUntil: entity.mutedUntil,
    };
  }
}