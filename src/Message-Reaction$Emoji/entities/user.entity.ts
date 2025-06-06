import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { MessageReaction } from './message-reaction.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  username: string;

  @Column()
  email: string;

  @OneToMany(() => MessageReaction, reaction => reaction.user)
  reactions: MessageReaction[];

  @CreateDateColumn()
  createdAt: Date;
}
