import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne, CreateDateColumn } from 'typeorm';
import { Message } from './message.entity';
import { User } from './user.entity';

@Entity('message_folders')
export class MessageFolder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  icon: string;

  @Column({ nullable: true })
  color: string;

  @Column()
  userId: string;

  @ManyToOne(() => User, user => user.messageFolders)
  user: User;

  @OneToMany(() => Message, message => message.folder)
  messages: Message[];

  @Column({ default: false })
  isSystem: boolean;

  @CreateDateColumn()
  createdAt: Date;
}