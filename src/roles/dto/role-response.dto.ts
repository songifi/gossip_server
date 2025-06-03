import { Expose, Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RoleType, RoleLevel } from '../entities/index';

export class PermissionResponseDto {
  @ApiProperty()
  @Expose()
  id: number;

  @ApiProperty()
  @Expose()
  name: string;

  @ApiProperty()
  @Expose()
  description: string;

  @ApiProperty()
  @Expose()
  resourceType: string;

  @ApiProperty()
  @Expose()
  actionType: string;

  @ApiPropertyOptional({ type: [PermissionResponseDto] })
  @Expose()
  @Type(() => PermissionResponseDto)
  children?: PermissionResponseDto[];
}

export class RoleResponseDto {
  @ApiProperty()
  @Expose()
  id: number;

  @ApiProperty()
  @Expose()
  name: string;

  @ApiProperty()
  @Expose()
  description: string;

  @ApiProperty({ enum: RoleType })
  @Expose()
  type: RoleType;

  @ApiProperty({ enum: RoleLevel })
  @Expose()
  level: RoleLevel;

  @ApiProperty()
  @Expose()
  active: boolean;

  @ApiProperty()
  @Expose()
  isDefault: boolean;

  @ApiPropertyOptional()
  @Expose()
  groupId?: number;

  @ApiProperty()
  @Expose()
  createdBy: number;

  @ApiPropertyOptional()
  @Expose()
  metadata?: any;

  @ApiPropertyOptional({ type: [PermissionResponseDto] })
  @Expose()
  @Type(() => PermissionResponseDto)
  permissions?: PermissionResponseDto[];

  @ApiPropertyOptional({ type: [RoleResponseDto] })
  @Expose()
  @Type(() => RoleResponseDto)
  children?: RoleResponseDto[];

  @ApiProperty()
  @Expose()
  @Transform(({ value }) => value.toISOString())
  createdAt: Date;

  @ApiProperty()
  @Expose()
  @Transform(({ value }) => value.toISOString())
  updatedAt: Date;
}
