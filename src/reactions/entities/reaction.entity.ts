import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, Index, Unique } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Message } from '../../messages/entities/message.entity';
import { CustomReaction } from './custom-reaction.entity';

@Entity('reactions')
@Unique(['user', 'message', 'emoji'])
@Index(['message', 'emoji'])
@Index(['user', 'createdAt'])
export class Reaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => Message, { onDelete: 'CASCADE' })
  message: Message;

  @Column('uuid')
  messageId: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  emoji: string; // Unicode emoji or null for custom

  @ManyToOne(() => CustomReaction, { nullable: true, onDelete: 'CASCADE' })
  customReaction: CustomReaction;

  @Column('uuid', { nullable: true })
  customReactionId: string;

  @Column({ type: 'enum', enum: ['emoji', 'custom'], default: 'emoji' })
  type: 'emoji' | 'custom';

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```
