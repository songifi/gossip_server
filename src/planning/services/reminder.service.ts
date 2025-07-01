import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventReminder, ReminderType } from '../entities/event-reminder.entity';
import { CreateReminderDto } from '../dto/create-reminder.dto';
import { User } from '../../users/entities/user.entity';
import { NotificationService } from './notification.service';

@Injectable()
export class ReminderService {
  constructor(
    @InjectRepository(EventReminder)
    private reminderRepository: Repository<EventReminder>,
    private notificationService: NotificationService,
  ) {}

  async createReminder(createReminderDto: CreateReminderDto, user: User): Promise<EventReminder> {
    const reminder = this.reminderRepository.create({
      ...createReminderDto,
      remindAt: new Date(createReminderDto.remindAt),
      user,
      event: { id: createReminderDto.eventId } as any,
    });

    return this.reminderRepository.save(reminder);
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async processPendingReminders() {
    const pendingReminders = await this.reminderRepository.find({
      where: {
        sent: false,
        remindAt: LessThanOrEqual(new Date()),
      },
      relations: ['user', 'event'],
    });

    for (const reminder of pendingReminders) {
      try {
        await this.sendReminder(reminder);
        reminder.sent = true;
        await this.reminderRepository.save(reminder);
      } catch (error) {
        console.error('Failed to send reminder:', error);
      }
    }
  }

  private async sendReminder(reminder: EventReminder) {
    switch (reminder.type) {
      case ReminderType.EMAIL:
        await this.notificationService.sendEmailReminder(reminder);
        break;
      case ReminderType.PUSH:
        await this.notificationService.sendPushReminder(reminder);
        break;
      case ReminderType.SMS:
        await this.notificationService.sendSMSReminder(reminder);
        break;
    }
  }
}