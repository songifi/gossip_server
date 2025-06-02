import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { AssignRoleDto } from './assign-role.dto';

export class BulkAssignRolesDto {
  @ApiProperty({ type: [AssignRoleDto], description: 'Array of role assignments' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => AssignRoleDto)
  assignments: AssignRoleDto[];
}

