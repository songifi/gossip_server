import { ScheduledMessage } from '../entities/scheduled-message.entity';
import { CreateScheduledMessageDto, UpdateScheduledMessageDto, BatchScheduleDto } from '../dto';

export interface IMessageScheduler {
  scheduleMessage(userId: string, dto: CreateScheduledMessageDto): Promise<ScheduledMessage>;
  updateScheduledMessage(id: string, userId: string, dto: UpdateScheduledMessageDto): Promise<ScheduledMessage>;
  cancelScheduledMessage(id: string, userId: string): Promise<void>;
  pauseScheduledMessage(id: string, userId: string): Promise<void>;
  resumeScheduledMessage(id: string, userId: string): Promise<void>;
  batchScheduleMessages(userId: string, dto: BatchScheduleDto): Promise<ScheduledMessage[]>;
  getScheduledMessages(userId: string, filters?: any): Promise<ScheduledMessage[]>;
  processScheduledMessage(messageId: string): Promise<void>;
}
