import { IsString, IsOptional, IsArray, IsEnum, IsBoolean, IsNumber, IsObject, ValidateNested } from "class-validator"
import { Type } from "class-transformer"

export class RegisterDeviceDto {
  @IsString()
  fingerprint: string

  @IsString()
  deviceName: string

  @IsEnum(["mobile", "desktop", "tablet", "web"])
  deviceType: "mobile" | "desktop" | "tablet" | "web"

  @IsString()
  platform: string

  @IsString()
  userAgent: string

  @IsOptional()
  @IsString()
  pushToken?: string

  @IsObject()
  capabilities: {
    supportsOfflineSync: boolean
    supportsPushNotifications: boolean
    maxSyncBatchSize: number
    preferredSyncInterval: number
  }
}

export class UpdateDeviceDto {
  @IsOptional()
  @IsString()
  deviceName?: string

  @IsOptional()
  @IsBoolean()
  isActive?: boolean

  @IsOptional()
  @IsString()
  pushToken?: string

  @IsOptional()
  @IsObject()
  syncSettings?: {
    enableAutoSync?: boolean
    syncThreads?: boolean
    syncNotifications?: boolean
    syncOnlyWhenCharging?: boolean
    syncOnlyOnWifi?: boolean
    maxOfflineMessages?: number
  }
}

export class SyncRequestDto {
  @IsString()
  deviceId: string

  @IsOptional()
  @IsString()
  lastSyncToken?: string

  @IsArray()
  @IsEnum(["thread", "notification"], { each: true })
  resourceTypes: ("thread" | "notification")[]

  @IsOptional()
  @IsNumber()
  batchSize?: number = 100

  @IsOptional()
  @IsBoolean()
  includeDeleted?: boolean = false
}

export class OfflineOperationDto {
  @IsEnum(["create", "update", "delete"])
  operation: "create" | "update" | "delete"

  @IsEnum(["thread", "notification"])
  resourceType: "thread" | "notification"

  @IsString()
  resourceId: string

  @IsObject()
  payload: any

  @IsObject()
  vectorClock: Record<string, number>
}

export class ConflictResolutionDto {
  @IsString()
  conflictId: string

  @IsEnum(["local_wins", "remote_wins", "merge", "manual"])
  resolution: "local_wins" | "remote_wins" | "merge" | "manual"

  @IsOptional()
  @IsObject()
  resolvedData?: any
}

export class BulkSyncDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OfflineOperationDto)
  operations: OfflineOperationDto[]

  @IsString()
  deviceId: string
}
