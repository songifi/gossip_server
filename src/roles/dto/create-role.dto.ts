import {
  IsString,
  IsOptional,
  IsArray,
  IsInt,
  IsEnum,
  IsBoolean,
  IsObject,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RoleLevel } from '../entities/index';

export class CreateRoleDto {
  @ApiProperty({ example: 'Moderator', description: 'Role name' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name: string;

  @ApiProperty({ example: 'Can moderate messages and manage users', description: 'Role description' })
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  description: string;

  @ApiPropertyOptional({ type: [Number], description: 'Permission IDs to assign' })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Type(() => Number)
  permissionIds?: number[];

  @ApiPropertyOptional({ description: 'Parent role ID for inheritance' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  parentRoleId?: number;

  @ApiPropertyOptional({ enum: RoleLevel, description: 'Role hierarchy level' })
  @IsOptional()
  @IsEnum(RoleLevel)
  level?: RoleLevel;

  @ApiPropertyOptional({ description: 'Set as default role for new members' })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ description: 'Additional role metadata' })
  @IsOptional()
  @IsObject()
  metadata?: any;
}
