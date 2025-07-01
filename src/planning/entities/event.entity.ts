import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { GroupChat } from '../../chats/entities/group-chat.entity';
import { EventRsvp } from './event-rsvp.entity';
import { EventReminder } from './event-reminder.entity';
import { EventDiscussion } from './event-discussion.entity';
import { EventExpense } from './event-expense.entity';
import { EventMedia } from './event-media.entity';

@Entity('events')
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column('text', { nullable: true })
  description: string;

  @Column('timestamp')
  startDate: Date;

  @Column('timestamp', { nullable: true })
  endDate: Date;

  @Column({ nullable: true })
  location: string;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  totalCost: number;

  @Column({ default: false })
  costSharingEnabled: boolean;

  @Column('json', { nullable: true })
  metadata: Record<string, any>;

  @ManyToOne(() => User, { eager: true })
  organizer: User;

  @ManyToOne(() => GroupChat, { eager: true })
  groupChat: GroupChat;

  @OneToMany(() => EventRsvp, rsvp => rsvp.event, { cascade: true })
  rsvps: EventRsvp[];

  @OneToMany(() => EventReminder, reminder => reminder.event, { cascade: true })
  reminders: EventReminder[];

  @OneToMany(() => EventDiscussion, discussion => discussion.event, { cascade: true })
  discussions: EventDiscussion[];

  @OneToMany(() => EventExpense, expense => expense.event, { cascade: true })
  expenses: EventExpense[];

  @OneToMany(() => EventMedia, media => media.event, { cascade: true })
  media: EventMedia[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}