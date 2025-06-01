import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum NotificationType {
  MESSAGE = 'MESSAGE',
  MENTION = 'MENTION',
  SYSTEM = 'SYSTEM',
}

export enum NotificationStatus {
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
  FAILED = 'FAILED',
}

@Entity()
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType;

  @Column()
  content: string;

  @Column({ type: 'enum', enum: NotificationStatus, default: NotificationStatus.SENT })
  status: NotificationStatus;

  @Column({ nullable: true })
  batchId?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
