export interface Device {
  id: string
  userId: string
  fingerprint: string
  deviceName: string
  deviceType: "mobile" | "desktop" | "tablet" | "web"
  platform: string
  userAgent: string
  isActive: boolean
  lastSeenAt?: Date
  pushToken?: string
  capabilities: DeviceCapabilities
  syncSettings: SyncSettings
  createdAt: Date
  updatedAt: Date
}

export interface DeviceCapabilities {
  supportsOfflineSync: boolean
  supportsPushNotifications: boolean
  maxSyncBatchSize: number
  preferredSyncInterval: number
}

export interface SyncSettings {
  enableAutoSync: boolean
  syncThreads: boolean
  syncNotifications: boolean
  syncOnlyWhenCharging: boolean
  syncOnlyOnWifi: boolean
  maxOfflineMessages: number
}

export interface VectorClock {
  [deviceId: string]: number
}

export interface SyncState {
  id: string
  deviceId: string
  resourceType: "thread" | "notification" | "user_settings"
  resourceId: string
  vectorClock: VectorClock
  lastSyncedAt: Date
  checksum: string
  status: "synced" | "pending" | "conflict" | "failed"
  conflictData?: string
}

export interface SyncOperation {
  id: string
  deviceId: string
  operation: "create" | "update" | "delete"
  resourceType: "thread" | "notification"
  resourceId: string
  payload: any
  vectorClock: VectorClock
  timestamp: Date
}

export interface SyncConflict {
  id: string
  resourceType: "thread" | "notification"
  resourceId: string
  deviceId1: string
  deviceId2: string
  localVersion: any
  remoteVersion: any
  vectorClock1: VectorClock
  vectorClock2: VectorClock
  status: "unresolved" | "resolved" | "auto_resolved"
  resolution?: "local_wins" | "remote_wins" | "merge" | "manual"
  resolvedVersion?: any
}

export interface SyncResult {
  success: boolean
  syncedItems: number
  conflicts: SyncConflict[]
  errors: string[]
  nextSyncToken?: string
}

export interface SyncRequest {
  deviceId: string
  lastSyncToken?: string
  resourceTypes: ("thread" | "notification")[]
  batchSize?: number
  includeDeleted?: boolean
}

export interface SyncResponse {
  items: SyncOperation[]
  conflicts: SyncConflict[]
  nextSyncToken: string
  hasMore: boolean
  serverTime: Date
}

export interface ConflictResolution {
  conflictId: string
  resolution: "local_wins" | "remote_wins" | "merge" | "manual"
  resolvedData?: any
}
