import { Injectable, Logger, NotFoundException } from "@nestjs/common"
import { Repository } from "typeorm"
import { SyncStateEntity } from "../entities/device.entity"
import { ThreadEntity } from "../../threads/entities/thread.entity"
import { SyncResponse, SyncResult, SyncOperation, VectorClock, SyncState } from "../interfaces/sync.interface"
import { VectorClockService } from "./vector-clock.service"
import { ConflictResolutionService } from "./conflict-resolution.service"
import { OfflineQueueService } from "./offline-queue.service"
import { DeviceService } from "./device.service"
import * as crypto from "crypto"
import { BulkSyncDto, SyncRequestDto } from "../dto/create-sync.dto"

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name)

  constructor(
    private syncStateRepository: Repository<SyncStateEntity>,
    private threadRepository: Repository<ThreadEntity>,
    private vectorClockService: VectorClockService,
    private conflictResolutionService: ConflictResolutionService,
    private offlineQueueService: OfflineQueueService,
    private deviceService: DeviceService,
  ) {}

  async initiateSync(userId: string, syncRequest: SyncRequestDto): Promise<SyncResponse> {
    // Validate device access
    const hasAccess = await this.deviceService.validateDeviceAccess(syncRequest.deviceId, userId)
    if (!hasAccess) {
      throw new NotFoundException("Device not found or access denied")
    }

    // Update device last seen
    await this.deviceService.updateLastSeen(syncRequest.deviceId)

    // Get changes since last sync
    const changes = await this.getChangesSinceLastSync(syncRequest)

    // Process any pending offline operations
    await this.processPendingOperations(syncRequest.deviceId)

    // Generate next sync token
    const nextSyncToken = this.generateSyncToken(syncRequest.deviceId)

    return {
      items: changes,
      conflicts: [], // Conflicts are handled separately
      nextSyncToken,
      hasMore: changes.length === syncRequest.batchSize,
      serverTime: new Date(),
    }
  }

  async processBulkSync(userId: string, bulkSync: BulkSyncDto): Promise<SyncResult> {
    const { operations, deviceId } = bulkSync

    // Validate device access
    const hasAccess = await this.deviceService.validateDeviceAccess(deviceId, userId)
    if (!hasAccess) {
      throw new NotFoundException("Device not found or access denied")
    }

    const result: SyncResult = {
      success: true,
      syncedItems: 0,
      conflicts: [],
      errors: [],
    }

    // Process each operation
    for (const operation of operations) {
      try {
        await this.processOperation(deviceId, operation)
        result.syncedItems++
      } catch (error) {
        this.logger.error(`Failed to process operation:`, error)
        result.errors.push(error.message)
        result.success = false
      }
    }

    // Auto-resolve conflicts where possible
    for (const operation of operations) {
      const conflicts = await this.conflictResolutionService.autoResolveConflicts(
        operation.resourceType,
        operation.resourceId,
      )
      result.conflicts.push(...conflicts)
    }

    return result
  }

  async getChangesSinceLastSync(syncRequest: SyncRequestDto): Promise<SyncOperation[]> {
    const { deviceId, lastSyncToken, resourceTypes, batchSize, includeDeleted } = syncRequest

    const changes: SyncOperation[] = []

    for (const resourceType of resourceTypes) {
      const resourceChanges = await this.getResourceChanges(
        deviceId,
        resourceType,
        lastSyncToken,
        batchSize,
        includeDeleted,
      )
      changes.push(...resourceChanges)
    }

    // Sort by timestamp and limit to batch size
    changes.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
    return changes.slice(0, batchSize)
  }

  private async getResourceChanges(
    deviceId: string,
    resourceType: "thread" | "notification",
    lastSyncToken?: string,
    batchSize?: number,
    includeDeleted?: boolean,
  ): Promise<SyncOperation[]> {
    const lastSyncTime = lastSyncToken ? this.parseSyncToken(lastSyncToken) : new Date(0)

    switch (resourceType) {
      case "thread":
        return this.getThreadChanges(deviceId, lastSyncTime, batchSize, includeDeleted)
      case "notification":
        return this.getNotificationChanges(deviceId, lastSyncTime, batchSize, includeDeleted)
      default:
        return []
    }
  }

  private async getThreadChanges(
    deviceId: string,
    lastSyncTime: Date,
    batchSize?: number,
    includeDeleted?: boolean,
  ): Promise<SyncOperation[]> {
    let query = this.threadRepository
      .createQueryBuilder("thread")
      .where("thread.updatedAt > :lastSyncTime", { lastSyncTime })
      .orderBy("thread.updatedAt", "ASC")

    if (!includeDeleted) {
      query = query.andWhere("thread.isArchived = :isArchived", { isArchived: false })
    }

    if (batchSize) {
      query = query.take(batchSize)
    }

    const threads = await query.getMany()

    return threads.map((thread) => ({
      id: crypto.randomUUID(),
      deviceId,
      operation: thread.isArchived ? "delete" : "update",
      resourceType: "thread" as const,
      resourceId: thread.id,
      payload: thread,
      vectorClock: this.getOrCreateVectorClock(deviceId, "thread", thread.id),
      timestamp: thread.updatedAt,
    }))
  }

  private async getNotificationChanges(
    deviceId: string,
    lastSyncTime: Date,
    batchSize?: number,
    includeDeleted?: boolean,
  ): Promise<SyncOperation[]> {
    // This would be implemented similarly to threads
    // For now, return empty array as notifications aren't fully implemented
    return []
  }

  private async processOperation(deviceId: string, operation: any): Promise<void> {
    // Get current sync state
    const currentState = await this.getSyncState(deviceId, operation.resourceType, operation.resourceId)

    if (currentState) {
      // Check for conflicts
      const comparison = this.vectorClockService.compare(operation.vectorClock, currentState.vectorClock)

      if (comparison === "concurrent") {
        // Handle conflict
        await this.handleConflict(deviceId, operation, currentState)
        return
      } else if (comparison === "before") {
        // Operation is outdated, ignore
        this.logger.debug(`Ignoring outdated operation for ${operation.resourceType}:${operation.resourceId}`)
        return
      }
    }

    // Apply the operation
    await this.applyOperation(operation)

    // Update sync state
    await this.updateSyncState(deviceId, operation)
  }

  private async handleConflict(deviceId: string, operation: any, currentState: SyncState): Promise<void> {
    // Get current resource data
    const currentData = await this.getResourceData(operation.resourceType, operation.resourceId)

    // Detect and record conflict
    await this.conflictResolutionService.detectConflict(
      operation.resourceType,
      operation.resourceId,
      operation.payload,
      currentData,
      operation.vectorClock,
      currentState.vectorClock,
      deviceId,
      currentState.deviceId,
    )

    // Queue operation for manual resolution
    await this.offlineQueueService.queueOperation(deviceId, {
      operation: operation.operation,
      resourceType: operation.resourceType,
      resourceId: operation.resourceId,
      payload: operation.payload,
      vectorClock: operation.vectorClock,
    })
  }

  private async applyOperation(operation: SyncOperation): Promise<void> {
    switch (operation.resourceType) {
      case "thread":
        await this.applyThreadOperation(operation)
        break
      case "notification":
        await this.applyNotificationOperation(operation)
        break
    }
  }

  private async applyThreadOperation(operation: SyncOperation): Promise<void> {
    const { operation: op, resourceId, payload } = operation

    switch (op) {
      case "create":
        await this.threadRepository.save(payload)
        break
      case "update":
        await this.threadRepository.update(resourceId, payload)
        break
      case "delete":
        await this.threadRepository.update(resourceId, { isArchived: true })
        break
    }
  }

  private async applyNotificationOperation(operation: SyncOperation): Promise<void> {
    // Implementation for notification operations
    // This would be similar to thread operations
  }

  private async getSyncState(deviceId: string, resourceType: string, resourceId: string): Promise<SyncState | null> {
    const entity = await this.syncStateRepository.findOne({
      where: { deviceId, resourceType: resourceType as "thread" | "notification" | "user_settings", resourceId },
    })

    return entity ? this.mapEntityToSyncState(entity) : null
  }

  private async updateSyncState(deviceId: string, operation: SyncOperation): Promise<void> {
    const checksum = this.calculateChecksum(operation.payload)

    await this.syncStateRepository.upsert(
      {
        deviceId,
        resourceType: operation.resourceType,
        resourceId: operation.resourceId,
        vectorClock: operation.vectorClock,
        lastSyncedAt: new Date(),
        checksum,
        status: "synced",
      },
      ["deviceId", "resourceType", "resourceId"],
    )
  }

  private async getResourceData(resourceType: string, resourceId: string): Promise<any> {
    switch (resourceType) {
      case "thread":
        return this.threadRepository.findOne({ where: { id: resourceId } })
      case "notification":
        // Implementation for notifications
        return null
      default:
        return null
    }
  }

  private getOrCreateVectorClock(deviceId: string, resourceType: string, resourceId: string): VectorClock {
    // This would typically be stored and retrieved from the database
    // For now, create a simple clock
    return this.vectorClockService.createClock(deviceId)
  }

  private async processPendingOperations(deviceId: string): Promise<void> {
    const pendingOps = await this.offlineQueueService.getPendingOperations(deviceId)

    for (const operation of pendingOps) {
      try {
        await this.processOperation(deviceId, operation)
        await this.offlineQueueService.markOperationSynced(operation.id)
      } catch (error) {
        await this.offlineQueueService.markOperationFailed(operation.id, error.message)
      }
    }
  }

  private generateSyncToken(deviceId: string): string {
    const timestamp = Date.now()
    const data = { deviceId, timestamp }
    return Buffer.from(JSON.stringify(data)).toString("base64")
  }

  private parseSyncToken(token: string): Date {
    try {
      const data = JSON.parse(Buffer.from(token, "base64").toString())
      return new Date(data.timestamp)
    } catch {
      return new Date(0)
    }
  }

  private calculateChecksum(data: any): string {
    return crypto.createHash("sha256").update(JSON.stringify(data)).digest("hex")
  }

  private mapEntityToSyncState(entity: SyncStateEntity): SyncState {
    return {
      id: entity.id,
      deviceId: entity.deviceId,
      resourceType: entity.resourceType as "thread" | "notification" | "user_settings",
      resourceId: entity.resourceId,
      vectorClock: entity.vectorClock,
      lastSyncedAt: entity.lastSyncedAt,
      checksum: entity.checksum,
      status: entity.status,
      conflictData: entity.conflictData,
    }
  }
}
