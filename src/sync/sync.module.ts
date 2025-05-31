import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { DeviceEntity, SyncStateEntity, OfflineQueueEntity, SyncConflictEntity } from "./entities/device.entity"
import { ThreadEntity } from "../threads/entities/thread.entity"
import { SyncController } from "./controllers/sync.controller"
import { SyncService } from "./providers/sync.service"
import { DeviceService } from "./providers/device.service"
import { VectorClockService } from "./providers/vector-clock.service"
import { ConflictResolutionService } from "./providers/conflict-resolution.service"
import { OfflineQueueService } from "./providers/offline-queue.service"

@Module({
  imports: [
    TypeOrmModule.forFeature([DeviceEntity, SyncStateEntity, OfflineQueueEntity, SyncConflictEntity, ThreadEntity]),
  ],
  controllers: [SyncController],
  providers: [SyncService, DeviceService, VectorClockService, ConflictResolutionService, OfflineQueueService],
  exports: [SyncService, DeviceService, VectorClockService, ConflictResolutionService, OfflineQueueService],
})
export class SyncModule {}
