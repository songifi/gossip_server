import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  JoinTable,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Tree,
  TreeParent,
  TreeChildren,
  Index,
} from 'typeorm';
import { Permission } from './permission.entity';
import { UserGroupRole } from './user-group-role.entity';
import { RoleAuditLog } from './role-audit-log.entity';

export enum RoleType {
  SYSTEM = 'system',
  CUSTOM = 'custom',
}

export enum RoleLevel {
  SUPER_ADMIN = 0,
  ADMIN = 1,
  MODERATOR = 2,
  MEMBER = 3,
  GUEST = 4,
}

@Entity('roles')
@Tree('nested-set')
@Index(['name', 'groupId'], { unique: true })
export class Role {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  description: string;

  @Column({
    type: 'enum',
    enum: RoleType,
    default: RoleType.CUSTOM,
  })
  type: RoleType;

  @Column({
    type: 'enum',
    enum: RoleLevel,
    default: RoleLevel.MEMBER,
  })
  level: RoleLevel;

  @Column({ default: true })
  active: boolean;

  @Column({ name: 'is_default', default: false })
  isDefault: boolean;

  @Column({ name: 'group_id', nullable: true })
  groupId?: number;

  @Column({ name: 'created_by' })
  createdBy: number;

  @Column({ type: 'json', nullable: true })
  metadata?: any;

  @TreeParent()
  parent: Role;

  @TreeChildren()
  children: Role[];

  @ManyToMany(() => Permission, permission => permission.roles, {
    cascade: true,
  })
  @JoinTable({
    name: 'role_permissions',
    joinColumn: { name: 'role_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'permission_id', referencedColumnName: 'id' },
  })
  permissions: Permission[];

  @OneToMany(() => UserGroupRole, userGroupRole => userGroupRole.role)
  userGroupRoles: UserGroupRole[];

  @OneToMany(() => RoleAuditLog, auditLog => auditLog.role)
  auditLogs: RoleAuditLog[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
