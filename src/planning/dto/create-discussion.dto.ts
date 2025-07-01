import { IsString, IsOptional, IsArray, IsUUID } from 'class-validator';

export class CreateDiscussionDto {
  @IsString()
  message: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];

  @IsUUID()
  eventId: string;
}