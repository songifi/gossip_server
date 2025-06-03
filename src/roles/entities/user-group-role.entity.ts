import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
  Index,
} from 'typeorm';
import { Role } from './role.entity';

@Entity('user_group_roles')
@Unique(['userId', 'groupId'])
@Index(['userId', 'groupId', 'active'])
export class UserGroupRole {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ name: 'group_id' })
  groupId: number;

  @Column({ name: 'role_id' })
  roleId: number;

  @Column({ name: 'assigned_by' })
  assignedBy: number;

  @Column({ name: 'assigned_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  assignedAt: Date;

  @Column({ name: 'expires_at', nullable: true })
  expiresAt?: Date;

  @Column({ default: true })
  active: boolean;

  @Column({ type: 'json', nullable: true })
  metadata?: any;

  @ManyToOne(() => Role, role => role.userGroupRoles)
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
