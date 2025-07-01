import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Event } from './event.entity';
import { User } from '../../users/entities/user.entity';

export enum RsvpStatus {
  GOING = 'going',
  NOT_GOING = 'not_going',
  MAYBE = 'maybe',
  PENDING = 'pending'
}

@Entity('event_rsvps')
export class EventRsvp {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: RsvpStatus, default: RsvpStatus.PENDING })
  status: RsvpStatus;

  @Column({ nullable: true })
  note: string;

  @Column({ default: 1 })
  guestCount: number;

  @ManyToOne(() => Event, event => event.rsvps, { onDelete: 'CASCADE' })
  event: Event;

  @ManyToOne(() => User, { eager: true })
  user: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}