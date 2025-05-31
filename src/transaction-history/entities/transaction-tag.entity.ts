// src/entities/transaction-tag.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToMany } from 'typeorm';
import { Transaction } from './transaction.entity';

@Entity('transaction_tags')
export class TransactionTag {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  color: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToMany(() => Transaction, transaction => transaction.tags)
  transactions: Transaction[];
}