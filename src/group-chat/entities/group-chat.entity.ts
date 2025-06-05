import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { GroupMember } from './group-member.entity';
import { GroupMessage } from './group-message.entity';

@Entity('group_chats')
export class GroupChat {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column('text', { nullable: true })
  description: string;

  @Column({ nullable: true })
  avatar: string;

  @Column({ unique: true })
  inviteCode: string;

  @Column({ default: 100 })
  maxMembers: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => GroupMember, (member) => member.group, { cascade: true })
  members: GroupMember[];

  @OneToMany(() => GroupMessage, (message) => message.group, { cascade: true })
  messages: GroupMessage[];
}
