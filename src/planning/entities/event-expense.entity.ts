import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn } from 'typeorm';
import { Event } from './event.entity';
import { User } from '../../users/entities/user.entity';
import { ExpenseSplit } from './expense-split.entity';

@Entity('event_expenses')
export class EventExpense {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  description: string;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column()
  currency: string;

  @Column({ nullable: true })
  receipt: string;

  @ManyToOne(() => Event, event => event.expenses, { onDelete: 'CASCADE' })
  event: Event;

  @ManyToOne(() => User, { eager: true })
  paidBy: User;

  @OneToMany(() => ExpenseSplit, split => split.expense, { cascade: true })
  splits: ExpenseSplit[];

  @CreateDateColumn()
  createdAt: Date;
}