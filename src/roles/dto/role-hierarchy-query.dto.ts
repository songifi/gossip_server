import {
  IsOptional,
  IsInt,
  IsBoolean,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class RoleHierarchyQueryDto {
  @ApiPropertyOptional({ description: 'Group ID to filter roles' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  groupId?: number;

  @ApiPropertyOptional({ description: 'Include permissions in response', default: false })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includePermissions?: boolean = false;

  @ApiPropertyOptional({ description: 'Include inactive roles', default: false })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeInactive?: boolean = false;
}