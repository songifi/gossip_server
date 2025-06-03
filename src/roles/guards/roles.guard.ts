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
import { ROLES_KEY } from '../decorators/roles.decorator';
import { RoleLevel } from '../entities/index';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(
    private reflector: Reflector,
    private roleService: RoleService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<RoleLevel[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const groupId = this.extractGroupId(request);

    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    if (!groupId) {
      throw new ForbiddenException('Group context required for role verification');
    }

    const userRole = await this.roleService.getUserRole(user.id, parseInt(groupId));

    if (!userRole) {
      throw new ForbiddenException('User has no role in this group');
    }

    // Check if user's role level is sufficient (lower number = higher permission)
    const hasRequiredRole = requiredRoles.some(
      requiredRole => userRole.level <= requiredRole,
    );

    if (!hasRequiredRole) {
      this.logger.warn(
        `Access denied: User ${user.id} role level ${userRole.level} insufficient for required levels [${requiredRoles.join(', ')}]`,
      );
      throw new ForbiddenException(
        `Insufficient role level. Required: ${Math.min(...requiredRoles)} or higher`,
      );
    }

    return true;
  }

  private extractGroupId(request: any): string | null {
    return (
      request.params?.groupId ||
      request.params?.id ||
      request.body?.groupId ||
      request.query?.groupId ||
      null
    );
  }
}
