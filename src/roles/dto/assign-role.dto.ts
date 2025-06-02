import {
  IsInt,
  IsOptional,
  IsDateString,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AssignRoleDto {
  @ApiProperty({ description: 'User ID to assign role to' })
  @IsInt()
  @Type(() => Number)
  userId: number;

  @ApiProperty({ description: 'Role ID to assign' })
  @IsInt()
  @Type(() => Number)
  roleId: number;

  @ApiPropertyOptional({ description: 'Role assignment expiration date' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({ description: 'Assignment metadata' })
  @IsOptional()
  @IsObject()
  metadata?: any;
}
