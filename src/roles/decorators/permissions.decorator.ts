import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';
export const REQUIRE_GROUP_CONTEXT_KEY = 'requireGroupContext';

export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

export const RequireGroupContext = () =>
  SetMetadata(REQUIRE_GROUP_CONTEXT_KEY, true);

export const GroupPermissions = (...permissions: string[]) => {
  return (target: any, propertyKey?: string | symbol, descriptor?: PropertyDescriptor) => {
    if (propertyKey !== undefined && descriptor !== undefined) {
      RequirePermissions(...permissions)(target, propertyKey, descriptor);
      RequireGroupContext()(target, propertyKey, descriptor);
    } else {
      RequirePermissions(...permissions)(target);
      RequireGroupContext()(target);
    }
  };
};

