import { User } from '../../users/entities/user.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  DeleteDateColumn,
  JoinColumn,
  Index
} from 'typeorm';

export enum MessageStatus {
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
}


@Entity('messages')
@Index(['content'], { fulltext: true })
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text', length: 4000 })
  content: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @Column({ type: 'uuid' })
  senderId: string;

  @Column({ type: 'uuid' })
  receiverId: string;

  @Column({
    type: 'enum',
    enum: MessageStatus,
    default: MessageStatus.SENT,
  })
  status: MessageStatus;

  @Column({ type: 'uuid', nullable: true })
  parentMessageId: string;

  @ManyToOne(() => Message, (message) => message.replies, { nullable: true })
  parentMessage: Message;

  @OneToMany(() => Message, (message) => message.parentMessage)
  replies: Message[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt?: Date;
}

