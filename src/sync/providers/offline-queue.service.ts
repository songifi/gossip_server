import { Injectable, Logger } from "@nestjs/common"
import { Repository } from "typeorm"
import { OfflineQueueEntity } from "../entities/device.entity"
import { SyncOperation } from "../interfaces/sync.interface"
import { VectorClockService } from "./vector-clock.service"
import { OfflineOperationDto } from "../dto/create-sync.dto"

@Injectable()
export class OfflineQueueService {
  private readonly logger = new Logger(OfflineQueueService.name)
  private readonly MAX_RETRY_COUNT = 3

  constructor(
    private queueRepository: Repository<OfflineQueueEntity>,
    private vectorClockService: VectorClockService,
  ) {}

  async queueOperation(deviceId: string, operation: OfflineOperationDto): Promise<void> {
    const queueItem = this.queueRepository.create({
      deviceId,
      operation: operation.operation,
      resourceType: operation.resourceType,
      resourceId: operation.resourceId,
      payload: operation.payload,
      vectorClock: operation.vectorClock,
      status: "pending",
    })

    await this.queueRepository.save(queueItem)
    this.logger.debug(`Queued ${operation.operation} operation for ${operation.resourceType}:${operation.resourceId}`)
  }

  async queueBulkOperations(deviceId: string, operations: OfflineOperationDto[]): Promise<void> {
    const queueItems = operations.map((operation) =>
      this.queueRepository.create({
        deviceId,
        operation: operation.operation,
        resourceType: operation.resourceType,
        resourceId: operation.resourceId,
        payload: operation.payload,
        vectorClock: operation.vectorClock,
        status: "pending",
      }),
    )

    await this.queueRepository.save(queueItems)
    this.logger.debug(`Queued ${operations.length} operations for device ${deviceId}`)
  }

  async getPendingOperations(deviceId: string, limit = 100): Promise<SyncOperation[]> {
    const queueItems = await this.queueRepository.find({
      where: {
        deviceId,
        status: "pending",
      },
      order: { createdAt: "ASC" },
      take: limit,
    })

    return queueItems.map((item) => this.mapEntityToOperation(item))
  }

  async markOperationSynced(operationId: string): Promise<void> {
    await this.queueRepository.update(operationId, {
      status: "synced",
    })
  }

  async markOperationFailed(operationId: string, errorMessage: string): Promise<void> {
    const operation = await this.queueRepository.findOne({
      where: { id: operationId },
    })

    if (!operation) {
      return
    }

    operation.retryCount += 1
    operation.errorMessage = errorMessage

    if (operation.retryCount >= this.MAX_RETRY_COUNT) {
      operation.status = "failed"
      this.logger.error(`Operation ${operationId} failed permanently after ${this.MAX_RETRY_COUNT} retries`)
    }

    await this.queueRepository.save(operation)
  }

  async markOperationConflicted(operationId: string): Promise<void> {
    await this.queueRepository.update(operationId, {
      status: "conflict",
    })
  }

  async getFailedOperations(deviceId: string): Promise<SyncOperation[]> {
    const queueItems = await this.queueRepository.find({
      where: {
        deviceId,
        status: "failed",
      },
      order: { createdAt: "DESC" },
    })

    return queueItems.map((item) => this.mapEntityToOperation(item))
  }

  async retryFailedOperations(deviceId: string): Promise<SyncOperation[]> {
    await this.queueRepository.update(
      {
        deviceId,
        status: "failed",
      },
      {
        status: "pending",
        retryCount: 0,
        errorMessage: undefined,
      },
    )

    return this.getPendingOperations(deviceId)
  }

  async clearSyncedOperations(deviceId: string, olderThanDays = 7): Promise<number> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)

    const result = await this.queueRepository.delete({
      deviceId,
      status: "synced",
      updatedAt: { $lt: cutoffDate } as any,
    })

    return result.affected || 0
  }

  async getQueueStats(deviceId: string): Promise<{
    pending: number
    synced: number
    failed: number
    conflicts: number
  }> {
    const [pending, synced, failed, conflicts] = await Promise.all([
      this.queueRepository.count({ where: { deviceId, status: "pending" } }),
      this.queueRepository.count({ where: { deviceId, status: "synced" } }),
      this.queueRepository.count({ where: { deviceId, status: "failed" } }),
      this.queueRepository.count({ where: { deviceId, status: "conflict" } }),
    ])

    return { pending, synced, failed, conflicts }
  }

  async optimizeQueue(deviceId: string): Promise<void> {
    // Get all pending operations for the device
    const operations = await this.queueRepository.find({
      where: { deviceId, status: "pending" },
      order: { createdAt: "ASC" },
    })

    // Group by resource
    const resourceGroups = new Map<string, OfflineQueueEntity[]>()

    for (const op of operations) {
      const key = `${op.resourceType}:${op.resourceId}`
      if (!resourceGroups.has(key)) {
        resourceGroups.set(key, [])
      }
      resourceGroups.get(key)!.push(op)
    }

    // Optimize each resource group
    for (const [resourceKey, resourceOps] of resourceGroups) {
      await this.optimizeResourceOperations(resourceOps)
    }
  }

  private async optimizeResourceOperations(operations: OfflineQueueEntity[]): Promise<void> {
    if (operations.length <= 1) {
      return
    }

    // Sort by creation time
    operations.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())

    // Find redundant operations
    const toDelete: string[] = []
    let lastOperation = operations[0]

    for (let i = 1; i < operations.length; i++) {
      const currentOp = operations[i]

      // If we have multiple updates, keep only the latest
      if (lastOperation.operation === "update" && currentOp.operation === "update") {
        toDelete.push(lastOperation.id)
      }
      // If we have create followed by delete, remove both
      else if (lastOperation.operation === "create" && currentOp.operation === "delete") {
        toDelete.push(lastOperation.id, currentOp.id)
        continue
      }
      // If we have update followed by delete, keep only delete
      else if (lastOperation.operation === "update" && currentOp.operation === "delete") {
        toDelete.push(lastOperation.id)
      }

      lastOperation = currentOp
    }

    // Remove redundant operations
    if (toDelete.length > 0) {
      await this.queueRepository.delete(toDelete)
      this.logger.debug(`Optimized queue: removed ${toDelete.length} redundant operations`)
    }
  }

  private mapEntityToOperation(entity: OfflineQueueEntity): SyncOperation {
    return {
      id: entity.id,
      deviceId: entity.deviceId,
      operation: entity.operation,
      resourceType: entity.resourceType,
      resourceId: entity.resourceId,
      payload: entity.payload,
      vectorClock: entity.vectorClock,
      timestamp: entity.createdAt,
    }
  }
}
