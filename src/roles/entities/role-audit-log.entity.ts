import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Role } from './role.entity';

export enum AuditAction {
  CREATED = 'created',
  UPDATED = 'updated',
  DELETED = 'deleted',
  ASSIGNED = 'assigned',
  UNASSIGNED = 'unassigned',
  PERMISSION_ADDED = 'permission_added',
  PERMISSION_REMOVED = 'permission_removed',
  BULK_ASSIGNED = 'bulk_assigned',
}

@Entity('role_audit_logs')
@Index(['roleId', 'createdAt'])
@Index(['userId', 'createdAt'])
@Index(['groupId', 'createdAt'])
export class RoleAuditLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'role_id', nullable: true })
  roleId?: number;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ name: 'target_user_id', nullable: true })
  targetUserId?: number;

  @Column({ name: 'group_id', nullable: true })
  groupId?: number;

  @Column({
    type: 'enum',
    enum: AuditAction,
  })
  action: AuditAction;

  @Column({ type: 'json', nullable: true })
  details: any;

  @Column({ name: 'ip_address', nullable: true })
  ipAddress?: string;

  @Column({ name: 'user_agent', nullable: true })
  userAgent?: string;

  @ManyToOne(() => Role, role => role.auditLogs, { nullable: true })
  @JoinColumn({ name: 'role_id' })
  role?: Role;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}