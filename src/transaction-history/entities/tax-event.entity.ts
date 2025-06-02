// src/entities/tax-event.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Transaction } from './transaction.entity';

@Entity('tax_events')
export class TaxEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'transaction_id' })
  transactionId: string;

  @Column({ name: 'event_type' })
  eventType: string;

  @Column({ type: 'decimal', precision: 20, scale: 8 })
  amount: number;

  @Column({ name: 'cost_basis', type: 'decimal', precision: 20, scale: 8, nullable: true })
  costBasis: number;

  @Column({ name: 'gain_loss', type: 'decimal', precision: 20, scale: 8, nullable: true })
  gainLoss: number;

  @Column({ name: 'holding_period', nullable: true })
  holdingPeriod: number;

  @Column({ name: 'tax_year' })
  taxYear: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Transaction)
  @JoinColumn({ name: 'transaction_id' })
  transaction: Transaction;
}