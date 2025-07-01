import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Event } from './event.entity';
import { User } from '../../users/entities/user.entity';

@Entity('event_discussions')
export class EventDiscussion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text')
  message: string;

  @Column('json', { nullable: true })
  attachments: string[];

  @ManyToOne(() => Event, event => event.discussions, { onDelete: 'CASCADE' })
  event: Event;

  @ManyToOne(() => User, { eager: true })
  author: User;

  @CreateDateColumn()
  createdAt: Date;
}