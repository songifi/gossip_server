import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable, Logger } from '@nestjs/common';
import { MessageSchedulerService } from '../services/message-scheduler.service';

@Processor('message-queue')
@Injectable()
export class MessageQueueProcessor {
  private readonly logger = new Logger(MessageQueueProcessor.name);

  constructor(private readonly messageSchedulerService: MessageSchedulerService) {}

  @Process('send-scheduled-message')
  async handleScheduledMessage(job: Job<{ messageId: string }>) {
    this.logger.log(`Processing scheduled message job ${job.id} for message ${job.data.messageId}`);
    
    try {
      await this.messageSchedulerService.processScheduledMessage(job.data.messageId);
      this.logger.log(`Completed scheduled message job ${job.id}`);
    } catch (error) {
      this.logger.error(`Failed to process scheduled message job ${job.id}: ${error.message}`);
      throw error;
    }
  }
}