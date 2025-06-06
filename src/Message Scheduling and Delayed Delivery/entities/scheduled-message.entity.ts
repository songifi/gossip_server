import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum MessageStatus {
  PENDING = 'pending',
  SENT = 'sent',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  PAUSED = 'paused'
}

export enum RecurrenceType {
  NONE = 'none',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  CUSTOM = 'custom'
}

@Entity('scheduled_messages')
@Index(['scheduledAt', 'status'])
@Index(['userId', 'status'])
export class ScheduledMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  recipientId: string;

  @Column('text')
  content: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'timestamp with time zone' })
  scheduledAt: Date;

  @Column({ default: 'UTC' })
  timezone: string;

  @Column({ type: 'enum', enum: MessageStatus, default: MessageStatus.PENDING })
  status: MessageStatus;

  @Column({ type: 'enum', enum: RecurrenceType, default: RecurrenceType.NONE })
  recurrenceType: RecurrenceType;

  @Column({ type: 'jsonb', nullable: true })
  recurrenceConfig: {
    interval?: number;
    daysOfWeek?: number[];
    dayOfMonth?: number;
    endDate?: Date;
    maxOccurrences?: number;
    cronExpression?: string;
  };

  @Column({ nullable: true })
  parentScheduleId: string;

  @Column({ default: 0 })
  attemptCount: number;

  @Column({ type: 'timestamp with time zone', nullable: true })
  lastAttemptAt: Date;

  @Column({ nullable: true })
  failureReason: string;

  @Column({ nullable: true })
  jobId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}