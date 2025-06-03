import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { RoleService } from '../services/index';

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    [key: string]: any;
  };
  permissions?: string[];
  userRole?: any;
}

@Injectable()
export class PermissionCheckMiddleware implements NestMiddleware {
  private readonly logger = new Logger(PermissionCheckMiddleware.name);

  constructor(private readonly roleService: RoleService) {}

  async use(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    if (req.user) {
      const groupId = this.extractGroupId(req);
      
      if (groupId) {
        try {
          const [permissions, userRole] = await Promise.all([
            this.roleService.getUserPermissions(req.user.id, parseInt(groupId)),
            this.roleService.getUserRole(req.user.id, parseInt(groupId)),
          ]);

          req.permissions = permissions.map((p: { name: any; }) => p.name);
          req.userRole = userRole;

          this.logger.debug(
            `Loaded permissions for user ${req.user.id} in group ${groupId}: [${(req.permissions ?? []).join(', ')}]`,
          );
        } catch (error) {
          this.logger.error(
            `Failed to load permissions for user ${req.user.id} in group ${groupId}: ${error.message}`,
          );
        }
      }
    }

    next();
  }

  private extractGroupId(req: AuthenticatedRequest): string | null {
    return (
      req.params?.groupId ||
      req.params?.id ||
      req.body?.groupId ||
      req.query?.groupId ||
      null
    );
  }
}
