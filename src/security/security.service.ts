// src/security/security.service.ts
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SecurityService {
  private readonly logger = new Logger(SecurityService.name);

  onRateLimitExceeded(req: any) {
    const user = req.user?.id || req.ip;
    this.logger.warn(`Rate limit exceeded for: ${user}`);
    // TODO: Integrate webhook or email alert
  }
}
