import { IsString, IsUUID, IsOptional, MaxLength } from 'class-validator';

export class CreateMessageDto {
  @IsString()
  @MaxLength(4000)
  content: string;

  @IsUUID()
  receiverId: string;

  @IsUUID()
  @IsOptional()
  parentMessageId?: string;
}
