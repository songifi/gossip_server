import { SetMetadata } from '@nestjs/common';
import { RoleLevel } from '../entities/index';

export const ROLES_KEY = 'roles';

export const RequireRoles = (...roles: RoleLevel[]) =>
  SetMetadata(ROLES_KEY, roles);

// Convenience decorators for common role checks
export const AdminOnly = () => RequireRoles(RoleLevel.ADMIN);
export const ModeratorOrHigher = () => RequireRoles(RoleLevel.ADMIN, RoleLevel.MODERATOR);
export const MemberOrHigher = () => RequireRoles(RoleLevel.ADMIN, RoleLevel.MODERATOR, RoleLevel.MEMBER);
