import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import { KeyManagementService } from "../services/key-management.service";

@Injectable()
export class EncryptionGuard implements CanActivate {
  constructor(private keyManagementService: KeyManagementService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const keyId = request.headers["x-encryption-key-id"];
    const userId = request.user?.id;

    if (!keyId || !userId) {
      throw new UnauthorizedException("Encryption key or user not found");
    }

    const messageKey = this.keyManagementService.getMessageKey(keyId);

    if (!messageKey) {
      throw new UnauthorizedException("Invalid or expired encryption key");
    }

    return true;
  }
}
