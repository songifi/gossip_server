import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { GroupChat } from './group-chat.entity';
import { User } from '../../users/entities/user.entity';

@Entity('group_messages')
export class GroupMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text')
  content: string;

  @ManyToOne(() => User)
  sender: User;

  @ManyToOne(() => GroupChat, (group) => group.messages, {
    onDelete: 'CASCADE',
  })
  group: GroupChat;

  @CreateDateColumn()
  createdAt: Date;
}
