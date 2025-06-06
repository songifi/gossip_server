import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, In } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import * as moment from 'moment-timezone';
import { CronJob } from 'cron';
import { ScheduledMessage, MessageStatus, RecurrenceType } from '../entities/scheduled-message.entity';
import { CreateScheduledMessageDto, UpdateScheduledMessageDto, BatchScheduleDto } from '../dto';
import { IMessageScheduler } from '../interfaces/message-scheduler.interface';

@Injectable()
export class MessageSchedulerService implements IMessageScheduler {
  private readonly logger = new Logger(MessageSchedulerService.name);

  constructor(
    @InjectRepository(ScheduledMessage)
    private readonly scheduledMessageRepository: Repository<ScheduledMessage>,
    @InjectQueue('message-queue')
    private readonly messageQueue: Queue,
  ) {}

  async scheduleMessage(userId: string, dto: CreateScheduledMessageDto): Promise<ScheduledMessage> {
    // Validate scheduling time
    const scheduledMoment = moment.tz(dto.scheduledAt, dto.timezone || 'UTC');
    if (scheduledMoment.isBefore(moment())) {
      throw new BadRequestException('Cannot schedule messages in the past');
    }

    // Check for conflicts if needed
    await this.checkScheduleConflicts(userId, scheduledMoment.toDate(), dto.recipientId);

    const scheduledMessage = this.scheduledMessageRepository.create({
      userId,
      recipientId: dto.recipientId,
      content: dto.content,
      metadata: dto.metadata,
      scheduledAt: scheduledMoment.toDate(),
      timezone: dto.timezone || 'UTC',
      recurrenceType: dto.recurrenceType || RecurrenceType.NONE,
      recurrenceConfig: dto.recurrenceConfig,
    });

    const saved = await this.scheduledMessageRepository.save(scheduledMessage);

    // Add to job queue
    const delay = scheduledMoment.diff(moment());
    const job = await this.messageQueue.add(
      'send-scheduled-message',
      { messageId: saved.id },
      {
        delay,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      }
    );

    saved.jobId = job.id.toString();
    await this.scheduledMessageRepository.save(saved);

    // Schedule recurring messages if applicable
    if (saved.recurrenceType !== RecurrenceType.NONE) {
      await this.scheduleRecurringMessages(saved);
    }

    this.logger.log(`Scheduled message ${saved.id} for ${scheduledMoment.format()}`);
    return saved;
  }

  async updateScheduledMessage(id: string, userId: string, dto: UpdateScheduledMessageDto): Promise<ScheduledMessage> {
    const message = await this.findUserMessage(id, userId);
    
    if (message.status !== MessageStatus.PENDING) {
      throw new BadRequestException('Can only update pending messages');
    }

    // Remove old job if schedule time is changing
    if (dto.scheduledAt && message.jobId) {
      await this.messageQueue.getJob(message.jobId).then(job => job?.remove());
    }

    // Update message
    Object.assign(message, dto);
    
    if (dto.scheduledAt) {
      const scheduledMoment = moment.tz(dto.scheduledAt, message.timezone);
      if (scheduledMoment.isBefore(moment())) {
        throw new BadRequestException('Cannot schedule messages in the past');
      }
      message.scheduledAt = scheduledMoment.toDate();

      // Add new job
      const delay = scheduledMoment.diff(moment());
      const job = await this.messageQueue.add(
        'send-scheduled-message',
        { messageId: message.id },
        { delay, attempts: 3 }
      );
      message.jobId = job.id.toString();
    }

    const updated = await this.scheduledMessageRepository.save(message);
    this.logger.log(`Updated scheduled message ${id}`);
    return updated;
  }

  async cancelScheduledMessage(id: string, userId: string): Promise<void> {
    const message = await this.findUserMessage(id, userId);
    
    if (message.jobId) {
      await this.messageQueue.getJob(message.jobId).then(job => job?.remove());
    }

    message.status = MessageStatus.CANCELLED;
    await this.scheduledMessageRepository.save(message);
    
    this.logger.log(`Cancelled scheduled message ${id}`);
  }

  async pauseScheduledMessage(id: string, userId: string): Promise<void> {
    const message = await this.findUserMessage(id, userId);
    
    if (message.status !== MessageStatus.PENDING) {
      throw new BadRequestException('Can only pause pending messages');
    }

    if (message.jobId) {
      await this.messageQueue.getJob(message.jobId).then(job => job?.remove());
    }

    message.status = MessageStatus.PAUSED;
    await this.scheduledMessageRepository.save(message);
    
    this.logger.log(`Paused scheduled message ${id}`);
  }

  async resumeScheduledMessage(id: string, userId: string): Promise<void> {
    const message = await this.findUserMessage(id, userId);
    
    if (message.status !== MessageStatus.PAUSED) {
      throw new BadRequestException('Can only resume paused messages');
    }

    const scheduledMoment = moment.tz(message.scheduledAt, message.timezone);
    if (scheduledMoment.isBefore(moment())) {
      throw new BadRequestException('Cannot resume messages scheduled in the past');
    }

    const delay = scheduledMoment.diff(moment());
    const job = await this.messageQueue.add(
      'send-scheduled-message',
      { messageId: message.id },
      { delay, attempts: 3 }
    );

    message.jobId = job.id.toString();
    message.status = MessageStatus.PENDING;
    await this.scheduledMessageRepository.save(message);
    
    this.logger.log(`Resumed scheduled message ${id}`);
  }

  async batchScheduleMessages(userId: string, dto: BatchScheduleDto): Promise<ScheduledMessage[]> {
    const results: ScheduledMessage[] = [];
    const batchId = dto.batchName || `batch-${Date.now()}`;

    for (const messageDto of dto.messages) {
      try {
        const scheduled = await this.scheduleMessage(userId, {
          ...messageDto,
          metadata: { ...messageDto.metadata, batchId }
        });
        results.push(scheduled);
      } catch (error) {
        this.logger.error(`Failed to schedule message in batch: ${error.message}`);
        // Continue with other messages
      }
    }

    this.logger.log(`Batch scheduled ${results.length}/${dto.messages.length} messages`);
    return results;
  }

  async getScheduledMessages(userId: string, filters: any = {}): Promise<ScheduledMessage[]> {
    const queryBuilder = this.scheduledMessageRepository.createQueryBuilder('sm')
      .where('sm.userId = :userId', { userId });

    if (filters.status) {
      queryBuilder.andWhere('sm.status = :status', { status: filters.status });
    }

    if (filters.recipientId) {
      queryBuilder.andWhere('sm.recipientId = :recipientId', { recipientId: filters.recipientId });
    }

    if (filters.from) {
      queryBuilder.andWhere('sm.scheduledAt >= :from', { from: filters.from });
    }

    if (filters.to) {
      queryBuilder.andWhere('sm.scheduledAt <= :to', { to: filters.to });
    }

    return queryBuilder.orderBy('sm.scheduledAt', 'ASC').getMany();
  }

  async processScheduledMessage(messageId: string): Promise<void> {
    const message = await this.scheduledMessageRepository.findOne({
      where: { id: messageId }
    });

    if (!message) {
      this.logger.error(`Scheduled message ${messageId} not found`);
      return;
    }

    if (message.status !== MessageStatus.PENDING) {
      this.logger.warn(`Message ${messageId} is not pending (status: ${message.status})`);
      return;
    }

    try {
      // Simulate message sending (replace with actual implementation)
      await this.sendMessage(message);
      
      message.status = MessageStatus.SENT;
      message.lastAttemptAt = new Date();
      await this.scheduledMessageRepository.save(message);
      
      this.logger.log(`Successfully sent scheduled message ${messageId}`);

      // Schedule next occurrence if recurring
      if (message.recurrenceType !== RecurrenceType.NONE) {
        await this.scheduleNextRecurrence(message);
      }

    } catch (error) {
      message.attemptCount++;
      message.lastAttemptAt = new Date();
      message.failureReason = error.message;

      if (message.attemptCount >= 3) {
        message.status = MessageStatus.FAILED;
        this.logger.error(`Message ${messageId} failed after 3 attempts: ${error.message}`);
      }

      await this.scheduledMessageRepository.save(message);
      throw error;
    }
  }

  private async findUserMessage(id: string, userId: string): Promise<ScheduledMessage> {
    const message = await this.scheduledMessageRepository.findOne({
      where: { id, userId }
    });

    if (!message) {
      throw new NotFoundException('Scheduled message not found');
    }

    return message;
  }

  private async checkScheduleConflicts(userId: string, scheduledAt: Date, recipientId: string): Promise<void> {
    // Check for conflicts within 5 minutes
    const conflictWindow = 5 * 60 * 1000; // 5 minutes in milliseconds
    const startTime = new Date(scheduledAt.getTime() - conflictWindow);
    const endTime = new Date(scheduledAt.getTime() + conflictWindow);

    const conflicts = await this.scheduledMessageRepository.count({
      where: {
        userId,
        recipientId,
        status: MessageStatus.PENDING,
        scheduledAt: MoreThan(startTime)
      }
    });

    if (conflicts > 0) {
      this.logger.warn(`Potential scheduling conflict detected for user ${userId} and recipient ${recipientId}`);
      // Could throw an error or just log warning based on requirements
    }
  }

  private async scheduleRecurringMessages(message: ScheduledMessage): Promise<void> {
    if (!message.recurrenceConfig) return;

    const nextDates = this.calculateNextRecurrenceDates(message);
    
    for (const nextDate of nextDates.slice(0, 10)) { // Limit to next 10 occurrences
      const recurringMessage = this.scheduledMessageRepository.create({
        ...message,
        id: undefined,
        scheduledAt: nextDate,
        parentScheduleId: message.id,
        createdAt: undefined,
        updatedAt: undefined,
        jobId: null
      });

      const saved = await this.scheduledMessageRepository.save(recurringMessage);

      const delay = moment(nextDate).diff(moment());
      if (delay > 0) {
        const job = await this.messageQueue.add(
          'send-scheduled-message',
          { messageId: saved.id },
          { delay, attempts: 3 }
        );
        saved.jobId = job.id.toString();
        await this.scheduledMessageRepository.save(saved);
      }
    }
  }

  private calculateNextRecurrenceDates(message: ScheduledMessage): Date[] {
    const dates: Date[] = [];
    const config = message.recurrenceConfig;
    const startMoment = moment.tz(message.scheduledAt, message.timezone);
    let currentMoment = startMoment.clone();

    const maxOccurrences = config.maxOccurrences || 52; // Default to 1 year worth
    const endDate = config.endDate ? moment(config.endDate) : null;

    for (let i = 0; i < maxOccurrences; i++) {
      switch (message.recurrenceType) {
        case RecurrenceType.DAILY:
          currentMoment.add(config.interval || 1, 'days');
          break;
        
        case RecurrenceType.WEEKLY:
          if (config.daysOfWeek && config.daysOfWeek.length > 0) {
            currentMoment = this.getNextWeeklyOccurrence(currentMoment, config.daysOfWeek);
          } else {
            currentMoment.add(config.interval || 1, 'weeks');
          }
          break;
        
        case RecurrenceType.MONTHLY:
          if (config.dayOfMonth) {
            currentMoment.add(1, 'month').date(config.dayOfMonth);
          } else {
            currentMoment.add(config.interval || 1, 'months');
          }
          break;
        
        case RecurrenceType.CUSTOM:
          if (config.cronExpression) {
            // Use a cron library to calculate next occurrence
            const cron = new CronJob(config.cronExpression, () => {});
            currentMoment = moment(cron.nextDate().toJSDate());
          }
          break;
      }

      if (endDate && currentMoment.isAfter(endDate)) {
        break;
      }

      if (currentMoment.isAfter(moment())) {
        dates.push(currentMoment.toDate());
      }
    }

    return dates;
  }

  private getNextWeeklyOccurrence(current: moment.Moment, daysOfWeek: number[]): moment.Moment {
    const currentDay = current.day();
    const nextDays = daysOfWeek.filter(day => day > currentDay);
    
    if (nextDays.length > 0) {
      return current.clone().day(nextDays[0]);
    } else {
      return current.clone().add(1, 'week').day(daysOfWeek[0]);
    }
  }

  private async scheduleNextRecurrence(message: ScheduledMessage): Promise<void> {
    const nextDates = this.calculateNextRecurrenceDates(message);
    if (nextDates.length === 0) return;

    const nextMessage = this.scheduledMessageRepository.create({
      ...message,
      id: undefined,
      scheduledAt: nextDates[0],
      parentScheduleId: message.parentScheduleId || message.id,
      status: MessageStatus.PENDING,
      attemptCount: 0,
      lastAttemptAt: null,
      failureReason: null,
      jobId: null,
      createdAt: undefined,
      updatedAt: undefined
    });

    const saved = await this.scheduledMessageRepository.save(nextMessage);

    const delay = moment(nextDates[0]).diff(moment());
    const job = await this.messageQueue.add(
      'send-scheduled-message',
      { messageId: saved.id },
      { delay, attempts: 3 }
    );

    saved.jobId = job.id.toString();
    await this.scheduledMessageRepository.save(saved);
  }

  private async sendMessage(message: ScheduledMessage): Promise<void> {
    // Replace this with your actual message sending logic
    // This could be email, SMS, push notification, etc.
    
    this.logger.log(`Sending message to ${message.recipientId}: ${message.content}`);
    
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Simulate occasional failures for testing
    if (Math.random() < 0.05) { // 5% failure rate
      throw new Error('Simulated message delivery failure');
    }
  }
}
