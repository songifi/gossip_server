import { Injectable } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { KeyManagementService } from "../services/key-management.service";

@Injectable()
export class KeyCleanupService {
  constructor(private keyManagementService: KeyManagementService) {}

  @Cron(CronExpression.EVERY_HOUR)
  handleKeyCleanup() {
    console.log("Running key cleanup task...");
    this.keyManagementService.cleanupExpiredKeys();
  }
}
