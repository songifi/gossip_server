import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateScheduledMessageDto } from './create-scheduled-message.dto';

export class UpdateScheduledMessageDto extends PartialType(
  OmitType(CreateScheduledMessageDto, ['recipientId'] as const)
) {}

// src/dto/batch-schedule.dto.ts
import { IsArray, ValidateNested, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

class BatchMessageDto extends CreateScheduledMessageDto {
  @IsOptional()
  @IsString()
  batchId?: string;
}

export class BatchScheduleDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BatchMessageDto)
  messages: BatchMessageDto[];

  @IsOptional()
  @IsString()
  batchName?: string;
}