import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleService } from '../services/index';
import { PERMISSIONS_KEY, REQUIRE_GROUP_CONTEXT_KEY } from '../decorators//permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(
    private reflector: Reflector,
    private roleService: RoleService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    const requireGroupContext = this.reflector.getAllAndOverride<boolean>(
      REQUIRE_GROUP_CONTEXT_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const groupId = this.extractGroupId(request);

    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    if (requireGroupContext && !groupId) {
      throw new ForbiddenException('Group context required for this operation');
    }

    const contextGroupId = groupId || 0; // 0 for system-level permissions

    for (const permission of requiredPermissions) {
      const hasPermission = await this.roleService.hasPermission(
        user.id,
        contextGroupId,
        permission,
      );

      if (!hasPermission) {
        this.logger.warn(
          `Access denied: User ${user.id} lacks permission '${permission}' in group ${contextGroupId}`,
        );
        throw new ForbiddenException(
          `Insufficient permissions. Required: ${permission}`,
        );
      }
    }

    this.logger.debug(
      `Permission check passed: User ${user.id} has permissions [${requiredPermissions.join(', ')}] in group ${contextGroupId}`,
    );

    return true;
  }

  private extractGroupId(request: any): number | null {
    // Try different ways to extract group ID
    return (
      request.params?.groupId ||
      request.params?.id ||
      request.body?.groupId ||
      request.query?.groupId ||
      null
    );
  }
}
