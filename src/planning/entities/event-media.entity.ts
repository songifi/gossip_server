import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Event } from './event.entity';
import { User } from '../../users/entities/user.entity';

export enum MediaType {
  IMAGE = 'image',
  VIDEO = 'video',
  DOCUMENT = 'document'
}

@Entity('event_media')
export class EventMedia {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  filename: string;

  @Column()
  url: string;

  @Column({ type: 'enum', enum: MediaType })
  type: MediaType;

  @Column('bigint')
  size: number;

  @Column({ nullable: true })
  caption: string;

  @ManyToOne(() => Event, event => event.media, { onDelete: 'CASCADE' })
  event: Event;

  @ManyToOne(() => User, { eager: true })
  uploadedBy: User;

  @CreateDateColumn()
  createdAt: Date;
}
