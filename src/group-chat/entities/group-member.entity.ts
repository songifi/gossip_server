import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { GroupChat } from './group-chat.entity';
import { User } from '../../users/entities/user.entity';
import { GroupRole } from '../enums/group-role.enum';

@Entity('group_members')
export class GroupMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.groupMemberships)
  user: User;

  @ManyToOne(() => GroupChat, (group) => group.members, { onDelete: 'CASCADE' })
  group: GroupChat;

  @Column({
    type: 'enum',
    enum: GroupRole,
    default: GroupRole.MEMBER,
  })
  role: GroupRole;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  lastActivity: Date;

  @CreateDateColumn()
  joinedAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
