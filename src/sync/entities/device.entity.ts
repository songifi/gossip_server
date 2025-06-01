import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from "typeorm"

@Entity("devices")
@Index(["userId", "isActive"])
export class DeviceEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column()
  userId: string

  @Column({ unique: true })
  fingerprint: string

  @Column()
  deviceName: string

  @Column()
  deviceType: "mobile" | "desktop" | "tablet" | "web"

  @Column()
  platform: string

  @Column()
  userAgent: string

  @Column({ default: true })
  isActive: boolean

  @Column({ nullable: true })
  lastSeenAt?: Date

  @Column({ nullable: true })
  pushToken?: string

  @Column("json", { nullable: true })
  capabilities: {
    supportsOfflineSync: boolean
    supportsPushNotifications: boolean
    maxSyncBatchSize: number
    preferredSyncInterval: number
  }

  @Column("json", { default: {} })
  syncSettings: {
    enableAutoSync: boolean
    syncThreads: boolean
    syncNotifications: boolean
    syncOnlyWhenCharging: boolean
    syncOnlyOnWifi: boolean
    maxOfflineMessages: number
  }

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}

@Entity("sync_states")
@Index(["deviceId", "resourceType"])
export class SyncStateEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column()
  deviceId: string

  @Column()
  resourceType: "thread" | "notification" | "user_settings"

  @Column()
  resourceId: string

  @Column("json")
  vectorClock: Record<string, number>

  @Column()
  lastSyncedAt: Date

  @Column()
  checksum: string

  @Column({ default: "synced" })
  status: "synced" | "pending" | "conflict" | "failed"

  @Column({ nullable: true })
  conflictData?: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}

@Entity("offline_queue")
@Index(["deviceId", "status"])
export class OfflineQueueEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column()
  deviceId: string

  @Column()
  operation: "create" | "update" | "delete"

  @Column()
  resourceType: "thread" | "notification"

  @Column()
  resourceId: string

  @Column("json")
  payload: any

  @Column("json")
  vectorClock: Record<string, number>

  @Column({ default: "pending" })
  status: "pending" | "synced" | "failed" | "conflict"

  @Column({ default: 0 })
  retryCount: number

  @Column({ nullable: true })
  errorMessage?: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}

@Entity("sync_conflicts")
export class SyncConflictEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column()
  resourceType: "thread" | "notification"

  @Column()
  resourceId: string

  @Column()
  deviceId1: string

  @Column()
  deviceId2: string

  @Column("json")
  localVersion: any

  @Column("json")
  remoteVersion: any

  @Column("json")
  vectorClock1: Record<string, number>

  @Column("json")
  vectorClock2: Record<string, number>

  @Column({ default: "unresolved" })
  status: "unresolved" | "resolved" | "auto_resolved"

  @Column({ nullable: true })
  resolution?: "local_wins" | "remote_wins" | "merge" | "manual"

  @Column("json", { nullable: true })
  resolvedVersion?: any

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
