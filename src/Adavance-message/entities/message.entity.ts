import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, ManyToMany, JoinTable, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { User } from './user.entity';
import { MessageTag } from './message-tag.entity';
import { MessageFolder } from './message-folder.entity';

export enum MessagePriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent'
}

export enum MessageStatus {
  UNREAD = 'unread',
  READ = 'read',
  ARCHIVED = 'archived',
  DELETED = 'deleted'
}

@Entity('messages')
@Index(['userId', 'status'])
@Index(['userId', 'priority'])
@Index(['createdAt'])
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  subject: string;

  @Column('text')
  content: string;

  @Column()
  senderId: string;

  @Column()
  userId: string;

  @ManyToOne(() => User, user => user.messages)
  user: User;

  @Column({
    type: 'enum',
    enum: MessagePriority,
    default: MessagePriority.NORMAL
  })
  priority: MessagePriority;

  @Column({
    type: 'enum',
    enum: MessageStatus,
    default: MessageStatus.UNREAD
  })
  status: MessageStatus;

  @Column({ default: false })
  isStarred: boolean;

  @Column({ nullable: true })
  folderId: string;

  @ManyToOne(() => MessageFolder, folder => folder.messages, { nullable: true })
  folder: MessageFolder;

  @ManyToMany(() => MessageTag, tag => tag.messages)
  @JoinTable()
  tags: MessageTag[];

  @Column('json', { nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  archivedAt: Date;
}
