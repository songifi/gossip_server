import { Controller, Get, Post, Put, Delete, Body, Param, Query, Request } from "@nestjs/common"
import { SyncService } from "../providers/sync.service";
import { DeviceService } from "../providers/device.service";
import { ConflictResolutionService } from "../providers/conflict-resolution.service";
import { OfflineQueueService } from "../providers/offline-queue.service";
import { BulkSyncDto, ConflictResolutionDto, RegisterDeviceDto, SyncRequestDto, UpdateDeviceDto } from "../dto/create-sync.dto";

@Controller("sync")
export class SyncController {
  constructor(
    private readonly syncService: SyncService,
    private readonly deviceService: DeviceService,
    private readonly conflictResolutionService: ConflictResolutionService,
    private readonly offlineQueueService: OfflineQueueService,
  ) {}

  // Device Management
  @Post("devices")
  async registerDevice(@Body() registerDto: RegisterDeviceDto, @Request() req: any) {
    return this.deviceService.registerDevice(req.user.id, registerDto)
  }

  @Get('devices')
  async getUserDevices(@Request() req: any) {
    return this.deviceService.getUserDevices(req.user.id);
  }

  @Get("devices/:deviceId")
  async getDevice(@Param('deviceId') deviceId: string, @Request() req: any) {
    return this.deviceService.getDevice(deviceId, req.user.id)
  }

  @Put("devices/:deviceId")
  async updateDevice(@Param('deviceId') deviceId: string, @Body() updateDto: UpdateDeviceDto, @Request() req: any) {
    return this.deviceService.updateDevice(deviceId, req.user.id, updateDto)
  }

  @Delete("devices/:deviceId")
  async deactivateDevice(@Param('deviceId') deviceId: string, @Request() req: any) {
    return this.deviceService.deactivateDevice(deviceId, req.user.id)
  }

  // Sync Operations
  @Post("sync")
  async initiateSync(@Body() syncRequest: SyncRequestDto, @Request() req: any) {
    return this.syncService.initiateSync(req.user.id, syncRequest)
  }

  @Post("sync/bulk")
  async bulkSync(@Body() bulkSync: BulkSyncDto, @Request() req: any) {
    return this.syncService.processBulkSync(req.user.id, bulkSync)
  }

  @Get("sync/status/:deviceId")
  async getSyncStatus(@Param('deviceId') deviceId: string, @Request() req: any) {
    // Validate device access
    await this.deviceService.validateDeviceAccess(deviceId, req.user.id)

    const queueStats = await this.offlineQueueService.getQueueStats(deviceId)
    const conflicts = await this.conflictResolutionService.getUnresolvedConflicts(req.user.id)

    return {
      deviceId,
      queueStats,
      unresolvedConflicts: conflicts.length,
      lastSyncAt: new Date(), // This would come from sync state
    }
  }

  // Offline Queue Management
  @Get("queue/:deviceId")
  async getOfflineQueue(@Param('deviceId') deviceId: string, @Request() req: any) {
    await this.deviceService.validateDeviceAccess(deviceId, req.user.id)
    return this.offlineQueueService.getPendingOperations(deviceId)
  }

  @Get("queue/:deviceId/failed")
  async getFailedOperations(@Param('deviceId') deviceId: string, @Request() req: any) {
    await this.deviceService.validateDeviceAccess(deviceId, req.user.id)
    return this.offlineQueueService.getFailedOperations(deviceId)
  }

  @Post("queue/:deviceId/retry")
  async retryFailedOperations(@Param('deviceId') deviceId: string, @Request() req: any) {
    await this.deviceService.validateDeviceAccess(deviceId, req.user.id)
    return this.offlineQueueService.retryFailedOperations(deviceId)
  }

  @Post("queue/:deviceId/optimize")
  async optimizeQueue(@Param('deviceId') deviceId: string, @Request() req: any) {
    await this.deviceService.validateDeviceAccess(deviceId, req.user.id)
    await this.offlineQueueService.optimizeQueue(deviceId)
    return { success: true }
  }

  @Delete("queue/:deviceId/cleanup")
  async cleanupQueue(@Param('deviceId') deviceId: string, @Query('days') days: string = '7', @Request() req: any) {
    await this.deviceService.validateDeviceAccess(deviceId, req.user.id)
    const cleaned = await this.offlineQueueService.clearSyncedOperations(deviceId, Number.parseInt(days))
    return { cleaned }
  }

  // Conflict Resolution
  @Get('conflicts')
  async getUnresolvedConflicts(@Request() req: any) {
    return this.conflictResolutionService.getUnresolvedConflicts(req.user.id);
  }

  @Post('conflicts/resolve')
  async resolveConflict(@Body() resolution: ConflictResolutionDto) {
    return this.conflictResolutionService.resolveConflict(resolution);
  }

  @Post("conflicts/:resourceType/:resourceId/auto-resolve")
  async autoResolveConflicts(
    @Param('resourceType') resourceType: 'thread' | 'notification',
    @Param('resourceId') resourceId: string,
  ) {
    return this.conflictResolutionService.autoResolveConflicts(resourceType, resourceId)
  }

  // Utility endpoints
  @Post('devices/fingerprint')
  async generateFingerprint(@Body() data: { userAgent: string; additionalData?: any }) {
    return {
      fingerprint: await this.deviceService.generateDeviceFingerprint(
        data.userAgent,
        data.additionalData,
      ),
    };
  }

  @Post('maintenance/cleanup-devices')
  async cleanupInactiveDevices(@Query('days') days: string = '30') {
    const cleaned = await this.deviceService.cleanupInactiveDevices(Number.parseInt(days));
    return { cleaned };
  }
}
