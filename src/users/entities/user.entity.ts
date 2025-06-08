import {
  Entity,
  PrimaryColumn,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { GroupMember } from '../../group-chat/entities/group-member.entity';

@Entity('users')
export class User {
  @PrimaryColumn({ type: 'varchar', length: 100, unique: true })
  walletAddress: string;

  @Column()
  username: string;

  @Column()
  avatar: string;

  @Column({ nullable: true })
  bio?: string;

  @Column()
  email: string;

  @Column()
  password: string;

  @Column({ nullable: true })
  refreshToken?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => GroupMember, (member) => member.user)
  groupMemberships: GroupMember[];
}
