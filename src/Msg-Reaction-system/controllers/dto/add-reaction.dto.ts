import { IsEnum, IsString, IsOptional, IsUUID } from 'class-validator';
import { ReactionType } from '../entities/message-reaction.entity';

export class AddReactionDto {
  @IsUUID()
  messageId: string;

  @IsEnum(ReactionType)
  type: ReactionType;

  @IsString()
  reactionIdentifier: string; // Unicode emoji or custom reaction ID

  @IsOptional()
  @IsUUID()
  customReactionId?: string;
}
