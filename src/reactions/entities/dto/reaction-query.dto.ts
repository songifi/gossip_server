import { IsOptional, IsString, IsEnum, IsInt, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ReactionQueryDto {
  @ApiProperty({ description: 'Message ID to filter reactions', required: false })
  @IsOptional()
  @IsString()
  messageId?: string;

  @ApiProperty({ description: 'Reaction type filter', enum: ['emoji', 'custom'], required: false })
  @IsOptional()
  @IsEnum(['emoji', 'custom'])
  type?: 'emoji' | 'custom';

  @ApiProperty({ description: 'Page number', required: false, default: 1 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ description: 'Items per page', required: false, default: 20 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  limit?: number = 20;
}