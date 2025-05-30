import { Injectable, Logger } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import { Repository } from "typeorm"
import { SyncConflictEntity } from "../entities/device.entity"
import { SyncConflict, VectorClock, ConflictResolution } from "../interfaces/sync.interface"
import { VectorClockService } from "./vector-clock.service"

@Injectable()
export class ConflictResolutionService {
  private readonly logger = new Logger(ConflictResolutionService.name);

  constructor(
    @InjectRepository(SyncConflictEntity)
    private conflictRepository: Repository<SyncConflictEntity>,
    private vectorClockService: VectorClockService,
  ) {}

  async detectConflict(
    resourceType: "thread" | "notification",
    resourceId: string,
    localVersion: any,
    remoteVersion: any,
    localClock: VectorClock,
    remoteClock: VectorClock,
    localDeviceId: string,
    remoteDeviceId: string,
  ): Promise<SyncConflict | null> {
    // Check if clocks are concurrent (conflicting)
    if (!this.vectorClockService.areConcurrent(localClock, remoteClock)) {
      return null // No conflict
    }

    // Create conflict record
    const conflictEntity = this.conflictRepository.create({
      resourceType,
      resourceId,
      deviceId1: localDeviceId,
      deviceId2: remoteDeviceId,
      localVersion,
      remoteVersion,
      vectorClock1: localClock,
      vectorClock2: remoteClock,
      status: "unresolved",
    })

    const saved = await this.conflictRepository.save(conflictEntity)
    return this.mapEntityToConflict(saved)
  }

  async resolveConflict(resolution: ConflictResolution): Promise<SyncConflict> {
    const conflict = await this.conflictRepository.findOne({
      where: { id: resolution.conflictId },
    })

    if (!conflict) {
      throw new Error("Conflict not found")
    }

    let resolvedVersion: any

    switch (resolution.resolution) {
      case "local_wins":
        resolvedVersion = conflict.localVersion
        break
      case "remote_wins":
        resolvedVersion = conflict.remoteVersion
        break
      case "merge":
        resolvedVersion = await this.mergeVersions(conflict.resourceType, conflict.localVersion, conflict.remoteVersion)
        break
      case "manual":
        resolvedVersion = resolution.resolvedData
        break
    }

    conflict.status = "resolved"
    conflict.resolution = resolution.resolution
    conflict.resolvedVersion = resolvedVersion

    const updated = await this.conflictRepository.save(conflict)
    return this.mapEntityToConflict(updated)
  }

  async autoResolveConflicts(resourceType: "thread" | "notification", resourceId: string): Promise<SyncConflict[]> {
    const conflicts = await this.conflictRepository.find({
      where: {
        resourceType,
        resourceId,
        status: "unresolved",
      },
    })

    const resolved: SyncConflict[] = []

    for (const conflict of conflicts) {
      try {
        const autoResolution = await this.determineAutoResolution(conflict)
        if (autoResolution) {
          const resolvedConflict = await this.resolveConflict({
            conflictId: conflict.id,
            resolution: autoResolution.resolution,
            resolvedData: autoResolution.resolvedData,
          })
          resolved.push(resolvedConflict)
        }
      } catch (error) {
        this.logger.error(`Failed to auto-resolve conflict ${conflict.id}:`, error)
      }
    }

    return resolved
  }

  async getUnresolvedConflicts(userId: string): Promise<SyncConflict[]> {
    // This would need to join with device table to filter by user
    const conflicts = await this.conflictRepository.find({
      where: { status: "unresolved" },
      order: { createdAt: "DESC" },
    })

    return conflicts.map((conflict) => this.mapEntityToConflict(conflict))
  }

  private async determineAutoResolution(
    conflict: SyncConflictEntity,
  ): Promise<{ resolution: "local_wins" | "remote_wins" | "merge"; resolvedData?: any } | null> {
    switch (conflict.resourceType) {
      case "thread":
        return this.autoResolveThreadConflict(conflict)
      case "notification":
        return this.autoResolveNotificationConflict(conflict)
      default:
        return null
    }
  }

  private async autoResolveThreadConflict(
    conflict: SyncConflictEntity,
  ): Promise<{ resolution: "local_wins" | "remote_wins" | "merge"; resolvedData?: any } | null> {
    const local = conflict.localVersion
    const remote = conflict.remoteVersion

    // If one version is archived and the other isn't, prefer the archived version
    if (local.isArchived && !remote.isArchived) {
      return { resolution: "local_wins" }
    }
    if (remote.isArchived && !local.isArchived) {
      return { resolution: "remote_wins" }
    }

    // If content is the same but metadata differs, merge metadata
    if (local.content === remote.content) {
      const merged = {
        ...local,
        metadata: {
          ...local.metadata,
          ...remote.metadata,
          tags: [...new Set([...local.metadata.tags, ...remote.metadata.tags])],
          lastActivityAt: new Date(
            Math.max(
              new Date(local.metadata.lastActivityAt).getTime(),
              new Date(remote.metadata.lastActivityAt).getTime(),
            ),
          ),
        },
      }
      return { resolution: "merge", resolvedData: merged }
    }

    // Default to most recent based on updatedAt
    const localTime = new Date(local.updatedAt).getTime()
    const remoteTime = new Date(remote.updatedAt).getTime()

    return localTime > remoteTime ? { resolution: "local_wins" } : { resolution: "remote_wins" }
  }

  private async autoResolveNotificationConflict(
    conflict: SyncConflictEntity,
  ): Promise<{ resolution: "local_wins" | "remote_wins" | "merge"; resolvedData?: any } | null> {
    const local = conflict.localVersion
    const remote = conflict.remoteVersion

    // For notifications, prefer the version that has been read
    if (local.isRead && !remote.isRead) {
      return { resolution: "local_wins" }
    }
    if (remote.isRead && !local.isRead) {
      return { resolution: "remote_wins" }
    }

    // Merge notification settings
    const merged = {
      ...local,
      ...remote,
      isRead: local.isRead || remote.isRead,
      readAt: local.readAt || remote.readAt,
    }

    return { resolution: "merge", resolvedData: merged }
  }

  private async mergeVersions(
    resourceType: "thread" | "notification",
    localVersion: any,
    remoteVersion: any,
  ): Promise<any> {
    switch (resourceType) {
      case "thread":
        return this.mergeThreadVersions(localVersion, remoteVersion)
      case "notification":
        return this.mergeNotificationVersions(localVersion, remoteVersion)
      default:
        throw new Error(`Unsupported resource type for merging: ${resourceType}`)
    }
  }

  private mergeThreadVersions(local: any, remote: any): any {
    return {
      ...local,
      ...remote,
      // Merge participant lists
      participantIds: [...new Set([...local.participantIds, ...remote.participantIds])],
      // Merge metadata
      metadata: {
        ...local.metadata,
        ...remote.metadata,
        // Combine tags
        tags: [...new Set([...local.metadata.tags, ...remote.metadata.tags])],
        // Use latest activity time
        lastActivityAt: new Date(
          Math.max(
            new Date(local.metadata.lastActivityAt).getTime(),
            new Date(remote.metadata.lastActivityAt).getTime(),
          ),
        ),
        // Merge read status
        readStatus: {
          ...local.metadata.readStatus,
          ...remote.metadata.readStatus,
        },
      },
    }
  }

  private mergeNotificationVersions(local: any, remote: any): any {
    return {
      ...local,
      ...remote,
      isRead: local.isRead || remote.isRead,
      readAt: local.readAt || remote.readAt,
    }
  }

  private mapEntityToConflict(entity: SyncConflictEntity): SyncConflict {
    return {
      id: entity.id,
      resourceType: entity.resourceType,
      resourceId: entity.resourceId,
      deviceId1: entity.deviceId1,
      deviceId2: entity.deviceId2,
      localVersion: entity.localVersion,
      remoteVersion: entity.remoteVersion,
      vectorClock1: entity.vectorClock1,
      vectorClock2: entity.vectorClock2,
      status: entity.status,
      resolution: entity.resolution,
      resolvedVersion: entity.resolvedVersion,
    }
  }
}
