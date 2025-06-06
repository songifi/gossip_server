import { IsString, IsDateString, IsOptional, IsEnum, ValidateNested, IsObject, IsArray, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { RecurrenceType } from '../entities/scheduled-message.entity';

class RecurrenceConfigDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  interval?: number;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  daysOfWeek?: number[];

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(31)
  dayOfMonth?: number;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxOccurrences?: number;

  @IsOptional()
  @IsString()
  cronExpression?: string;
}

export class CreateScheduledMessageDto {
  @IsString()
  recipientId: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsDateString()
  scheduledAt: string;

  @IsOptional()
  @IsString()
  timezone?: string = 'UTC';

  @IsOptional()
  @IsEnum(RecurrenceType)
  recurrenceType?: RecurrenceType = RecurrenceType.NONE;

  @IsOptional()
  @ValidateNested()
  @Type(() => RecurrenceConfigDto)
  recurrenceConfig?: RecurrenceConfigDto;
}