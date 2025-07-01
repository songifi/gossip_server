import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { EventExpense } from './event-expense.entity';
import { User } from '../../users/entities/user.entity';

@Entity('expense_splits')
export class ExpenseSplit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column({ default: false })
  settled: boolean;

  @ManyToOne(() => EventExpense, expense => expense.splits, { onDelete: 'CASCADE' })
  expense: EventExpense;

  @ManyToOne(() => User, { eager: true })
  user: User;

  @CreateDateColumn()
  createdAt: Date;
}