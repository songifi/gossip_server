import { IsEnum, IsUUID } from 'class-validator';
import { GroupRole } from '../enums/group-role.enum';

export class UpdateMemberRoleDto {
  @IsUUID()
  memberId: string;

  @IsEnum(GroupRole)
  role: GroupRole;
}
