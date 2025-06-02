import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum BackupStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export enum BackupType {
  FULL = 'full',
  INCREMENTAL = 'incremental'
}

@Entity('backup_jobs')
export class BackupJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ type: 'enum', enum: BackupType })
  type: BackupType;

  @Column({ type: 'enum', enum: BackupStatus, default: BackupStatus.PENDING })
  status: BackupStatus;

  @Column()
  filePath: string;

  @Column()
  checksum: string;

  @Column('bigint')
  fileSize: number;

  @Column('int')
  messageCount: number;

  @Column({ nullable: true })
  errorMessage?: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ nullable: true })
  completedAt?: Date;

  @Column('json')
  config: BackupConfigOptions;
}
