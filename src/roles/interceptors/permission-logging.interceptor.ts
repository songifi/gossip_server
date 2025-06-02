import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(PermissionLoggingInterceptor.name);

  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const method = request.method;
    const url = request.url;
    const userAgent = request.get('user-agent');
    const ip = request.ip;

    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          this.logger.log(
            `Permission check successful: ${method} ${url} - User: ${user?.id} - ` +
            `Permissions: [${requiredPermissions.join(', ')}] - Duration: ${duration}ms - ` +
            `IP: ${ip} - UserAgent: ${userAgent}`,
          );
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          this.logger.error(
            `Permission check failed: ${method} ${url} - User: ${user?.id} - ` +
            `Permissions: [${requiredPermissions.join(', ')}] - Duration: ${duration}ms - ` +
            `Error: ${error.message} - IP: ${ip} - UserAgent: ${userAgent}`,
          );
        },
      }),
    );
  }
}