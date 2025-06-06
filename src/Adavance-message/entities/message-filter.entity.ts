import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from './user.entity';

export interface FilterCriteria {
  subject?: string;
  content?: string;
  senderId?: string;
  priority?: MessagePriority[];
  tags?: string[];
  dateRange?: {
    from: Date;
    to: Date;
  };
  isStarred?: boolean;
  hasAttachment?: boolean;
}

export interface FilterAction {
  addTags?: string[];
  removeTags?: string[];
  setPriority?: MessagePriority;
  moveToFolder?: string;
  markAsRead?: boolean;
  archive?: boolean;
}

@Entity('message_filters')
export class MessageFilter {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column('json')
  criteria: FilterCriteria;

  @Column('json', { nullable: true })
  actions: FilterAction;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isAutomatic: boolean;

  @Column()
  userId: string;

  @ManyToOne(() => User, user => user.messageFilters)
  user: User;

  @Column({ default: false })
  isShared: boolean;

  @Column('simple-array', { nullable: true })
  sharedWithUsers: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
