import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index, Unique } from 'typeorm';
import { Message } from './message.entity';
import { User } from './user.entity';
import { CustomReaction } from './custom-reaction.entity';

export enum ReactionType {
  EMOJI = 'emoji',
  CUSTOM = 'custom'
}

@Entity('message_reactions')
@Unique(['messageId', 'userId', 'reactionIdentifier'])
@Index(['messageId', 'reactionIdentifier'])
export class MessageReaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  messageId: string;

  @ManyToOne(() => Message, message => message.reactions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'messageId' })
  message: Message;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, user => user.reactions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'enum',
    enum: ReactionType,
    default: ReactionType.EMOJI
  })
  type: ReactionType;

  @Column()
  reactionIdentifier: string; // Unicode for emoji, UUID for custom

  @Column({ nullable: true })
  customReactionId?: string;

  @ManyToOne(() => CustomReaction, { nullable: true })
  @JoinColumn({ name: 'customReactionId' })
  customReaction?: CustomReaction;

  @CreateDateColumn()
  createdAt: Date;
}