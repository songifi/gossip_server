import {
  IsString,
  IsInt,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CheckPermissionDto {
  @ApiProperty({ description: 'Permission name to check' })
  @IsString()
  permissionName: string;

  @ApiProperty({ description: 'Group ID for context' })
  @IsInt()
  @Type(() => Number)
  groupId: number;

  @ApiPropertyOptional({ description: 'Resource ID for specific resource permissions' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  resourceId?: number;
}
