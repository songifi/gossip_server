import { IsString, IsOptional, IsBoolean, IsEnum, IsArray, IsDateString, ValidateNested, IsUUID } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { MessagePriority, MessageStatus } from '../entities/message.entity';

export class DateRangeDto {
  @IsDateString()
  from: string;

  @IsDateString()
  to: string;
}

export class FilterCriteriaDto {
  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  senderId?: string;

  @IsOptional()
  @IsArray()
  @IsEnum(MessagePriority, { each: true })
  priority?: MessagePriority[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => DateRangeDto)
  dateRange?: DateRangeDto;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isStarred?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  hasAttachment?: boolean;

  @IsOptional()
  @IsEnum(MessageStatus)
  status?: MessageStatus;

  @IsOptional()
  @IsString()
  folderId?: string;
}

export class CreateMessageFilterDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @ValidateNested()
  @Type(() => FilterCriteriaDto)
  criteria: FilterCriteriaDto;

  @IsOptional()
  @IsBoolean()
  isAutomatic?: boolean;
}

export class MessageQueryDto extends FilterCriteriaDto {
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  limit?: number = 20;

  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}

export class BulkOperationDto {
  @IsArray()
  @IsUUID(4, { each: true })
  messageIds: string[];

  @IsString()
  operation: 'read' | 'unread' | 'archive' | 'delete' | 'star' | 'unstar' | 'addTags' | 'removeTags' | 'moveToFolder';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  folderId?: string;
}