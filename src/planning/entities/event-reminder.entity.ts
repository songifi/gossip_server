import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Event } from './event.entity';
import { User } from '../../users/entities/user.entity';

export enum ReminderType {
  EMAIL = 'email',
  PUSH = 'push',
  SMS = 'sms'
}

@Entity('event_reminders')
export class EventReminder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('timestamp')
  remindAt: Date;

  @Column({ type: 'enum', enum: ReminderType })
  type: ReminderType;

  @Column({ default: false })
  sent: boolean;

  @Column('text', { nullable: true })
  message: string;

  @ManyToOne(() => Event, event => event.reminders, { onDelete: 'CASCADE' })
  event: Event;

  @ManyToOne(() => User, { eager: true })
  user: User;

  @CreateDateColumn()
  createdAt: Date;
}
