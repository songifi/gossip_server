import { IsDateString, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { ReminderType } from '../entities/event-reminder.entity';

export class CreateReminderDto {
  @IsDateString()
  remindAt: string;

  @IsEnum(ReminderType)
  type: ReminderType;

  @IsOptional()
  @IsString()
  message?: string;

  @IsUUID()
  eventId: string;
}