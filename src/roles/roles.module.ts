// src/roles/roles.module.ts
import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { 
  Role, 
  Permission, 
  UserGroupRole, 
  RoleAuditLog 
} from './entities';
import { 
  RoleService, 
  PermissionService, 
  AuditService 
} from './services';
import { 
  RolesController, 
  PermissionsController 
} from './controllers';
import { 
  PermissionsGuard, 
  RolesGuard 
} from './guards';
import { 
  PermissionCheckMiddleware 
} from './middleware';
import { 
  PermissionLoggingInterceptor 
} from './interceptors';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Role,
      Permission,
      UserGroupRole,
      RoleAuditLog,
    ]),
    CacheModule.register({
      ttl: 300, // 5 minutes default
      max: 1000, // Maximum items in cache
    }),
  ],
  controllers: [
    RolesController,
    PermissionsController,
  ],
  providers: [
    RoleService,
    PermissionService,
    AuditService,
    PermissionsGuard,
    RolesGuard,
    PermissionLoggingInterceptor,
  ],
  exports: [
    RoleService,
    PermissionService,
    AuditService,
    PermissionsGuard,
    RolesGuard,
  ],
})
export class RolesModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(PermissionCheckMiddleware)
      .forRoutes('*'); // Apply to all routes
  }
}