import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Tree,
  TreeParent,
  TreeChildren,
  Index,
} from 'typeorm';
import { Role } from './role.entity';

export enum ResourceType {
  GROUP = 'group',
  MESSAGE = 'message',
  USER = 'user',
  ROLE = 'role',
  SYSTEM = 'system',
}

export enum ActionType {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  MANAGE = 'manage',
  INVITE = 'invite',
  KICK = 'kick',
  BAN = 'ban',
  MUTE = 'mute',
}

@Entity('permissions')
@Tree('nested-set')
@Index(['resourceType', 'actionType'], { unique: true })
export class Permission {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @Column()
  description: string;

  @Column({
    type: 'enum',
    enum: ResourceType,
  })
  resourceType: ResourceType;

  @Column({
    type: 'enum',
    enum: ActionType,
  })
  actionType: ActionType;

  @Column({ default: true })
  active: boolean;

  @Column({ name: 'system_permission', default: false })
  systemPermission: boolean;

  @TreeParent()
  parent: Permission;

  @TreeChildren()
  children: Permission[];

  @ManyToMany(() => Role, role => role.permissions)
  roles: Role[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
