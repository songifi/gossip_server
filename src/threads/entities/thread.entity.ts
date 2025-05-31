import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from "typeorm"

@Entity("threads")
export class ThreadEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ nullable: true })
  parentId?: string

  @Column({ nullable: true })
  rootId?: string

  @Column()
  authorId: string

  @Column("text")
  content: string

  @Column({ nullable: true, length: 200 })
  subject?: string

  @Column({ default: 0 })
  depth: number

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @Column({ default: false })
  isArchived: boolean

  @Column({ default: false })
  isCollapsed: boolean

  @Column("simple-array")
  participantIds: string[]

  @Column("json", { nullable: true })
  metadata: {
    messageCount: number
    lastActivityAt: Date
    tags: string[]
    priority: "low" | "normal" | "high" | "urgent"
    readStatus: Record<string, boolean>
  }

  // Sync-related fields
  @Column("json", { default: {} })
  vectorClock: Record<string, number>

  @Column({ nullable: true })
  lastSyncedAt?: Date

  @Column({ nullable: true })
  syncChecksum?: string

  @ManyToOne(
    () => ThreadEntity,
    (thread) => thread.childThreads,
  )
  @JoinColumn({ name: "parentId" })
  parentThread?: ThreadEntity

  @OneToMany(
    () => ThreadEntity,
    (thread) => thread.parentThread,
  )
  childThreads: ThreadEntity[]
}

@Entity("thread_notifications")
export class ThreadNotificationEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column()
  threadId: string

  @Column()
  userId: string

  @Column({ default: true })
  notifyOnReply: boolean

  @Column({ default: true })
  notifyOnMention: boolean

  @Column({ default: false })
  notifyOnParticipantJoin: boolean

  @Column({ nullable: true })
  mutedUntil?: Date

  // Sync-related fields
  @Column("json", { default: {} })
  vectorClock: Record<string, number>

  @Column({ nullable: true })
  lastSyncedAt?: Date

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
