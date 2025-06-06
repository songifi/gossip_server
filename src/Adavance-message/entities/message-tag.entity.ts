import { Entity, PrimaryGeneratedColumn, Column, ManyToMany, ManyToOne } from 'typeorm';
import { Message } from './message.entity';
import { User } from './user.entity';

@Entity('message_tags')
export class MessageTag {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  color: string;

  @Column({ nullable: true })
  description: string;

  @Column()
  userId: string;

  @ManyToOne(() => User, user => user.messageTags)
  user: User;

  @ManyToMany(() => Message, message => message.tags)
  messages: Message[];

  @Column({ default: false })
  isSystem: boolean;
}
