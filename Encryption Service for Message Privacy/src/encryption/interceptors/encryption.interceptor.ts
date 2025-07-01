import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { Reflector } from "@nestjs/core";
import { ENCRYPTION_KEY } from "../decorators/encrypted.decorator";

@Injectable()
export class EncryptionInterceptor implements NestInterceptor {
  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const isEncryptionRequired = this.reflector.get<boolean>(
      ENCRYPTION_KEY,
      context.getHandler()
    );

    if (!isEncryptionRequired) {
      return next.handle();
    }

    return next.handle().pipe(
      map((data) => ({
        ...data,
        encrypted: true,
        timestamp: new Date().toISOString(),
      }))
    );
  }
}
