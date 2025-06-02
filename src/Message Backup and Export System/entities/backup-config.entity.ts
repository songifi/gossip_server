import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn } from 'typeorm';

export interface BackupConfigOptions {
  format: 'json' | 'csv' | 'pdf';
  includeMetadata: boolean;
  dateRange?: { from: Date; to: Date };
  channels?: string[];
  encrypted: boolean;
  compression: boolean;
}

@Entity('backup_configs')
export class BackupConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  name: string;

  @Column('json')
  options: BackupConfigOptions;

  @Column({ nullable: true })
  schedule?: string; // Cron expression

  @Column({ default: true })
  isActive: boolean;

  @UpdateDateColumn()
  updatedAt: Date;
}
