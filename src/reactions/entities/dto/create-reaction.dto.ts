import { IsString, IsOptional, IsEnum, ValidateIf, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateReactionDto {
  @ApiProperty({ description: 'Message ID to react to' })
  @IsUUID()
  messageId: string;

  @ApiProperty({ description: 'Reaction type', enum: ['emoji', 'custom'] })
  @IsEnum(['emoji', 'custom'])
  type: 'emoji' | 'custom';

  @ApiProperty({ description: 'Unicode emoji (required for emoji type)', required: false })
  @ValidateIf(o => o.type === 'emoji')
  @IsString()
  emoji?: string;

  @ApiProperty({ description: 'Custom reaction ID (required for custom type)', required: false })
  @ValidateIf(o => o.type === 'custom')
  @IsUUID()
  customReactionId?: string;
}

export class CreateCustomReactionDto {
  @ApiProperty({ description: 'Custom reaction name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Description of the custom reaction', required: false })
  @IsOptional()
  @IsString()
  description?: string;
}