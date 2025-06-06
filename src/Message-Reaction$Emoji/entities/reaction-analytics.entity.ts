import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';
import { ReactionType } from './message-reaction.entity';

@Entity('reaction_analytics')
@Index(['date', 'reactionIdentifier'])
export class ReactionAnalytics {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('date')
  date: Date;

  @Column()
  reactionIdentifier: string;

  @Column({
    type: 'enum',
    enum: ReactionType
  })
  type: ReactionType;

  @Column({ default: 0 })
  usageCount: number;

  @Column({ default: 0 })
  uniqueUsers: number;

  @CreateDateColumn()
  createdAt: Date;
}