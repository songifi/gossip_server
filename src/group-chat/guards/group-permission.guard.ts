import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GroupChatService } from '../group-chat.service';
import { GroupRole } from '../enums/group-role.enum';

@Injectable()
export class GroupPermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private groupChatService: GroupChatService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.get<GroupRole[]>(
      'roles',
      context.getHandler(),
    );
    if (!requiredRoles) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const groupId = request.params.groupId;

    const member = await this.groupChatService.getGroupMember(groupId, user.id);
    if (!member) {
      throw new ForbiddenException('Not a member of this group');
    }

    return requiredRoles.includes(member.role);
  }
}
