// src/entities/transaction.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, ManyToMany, JoinColumn, JoinTable } from 'typeorm';
import { User } from './user.entity';
import { Portfolio } from './portfolio.entity';
import { AssetType } from './asset-type.entity';
import { TransactionCategory } from './transaction-category.entity';
import { TransactionTag } from './transaction-tag.entity';

export enum TransactionType {
  BUY = 'BUY',
  SELL = 'SELL',
  DIVIDEND = 'DIVIDEND',
  SPLIT = 'SPLIT',
  TRANSFER_IN = 'TRANSFER_IN',
  TRANSFER_OUT = 'TRANSFER_OUT'
}

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'portfolio_id' })
  portfolioId: string;

  @Column({ name: 'asset_type_id' })
  assetTypeId: string;

  @Column({ name: 'category_id', nullable: true })
  categoryId: string;

  @Column({ type: 'enum', enum: TransactionType })
  type: TransactionType;

  @Column({ type: 'decimal', precision: 20, scale: 8 })
  quantity: number;

  @Column({ type: 'decimal', precision: 20, scale: 8 })
  price: number;

  @Column({ name: 'total_amount', type: 'decimal', precision: 20, scale: 8 })
  totalAmount: number;

  @Column({ type: 'decimal', precision: 20, scale: 8, default: 0 })
  fees: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ name: 'executed_at' })
  executedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => User, user => user.transactions)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Portfolio, portfolio => portfolio.transactions)
  @JoinColumn({ name: 'portfolio_id' })
  portfolio: Portfolio;

  @ManyToOne(() => AssetType, assetType => assetType.transactions)
  @JoinColumn({ name: 'asset_type_id' })
  assetType: AssetType;

  @ManyToOne(() => TransactionCategory, category => category.transactions)
  @JoinColumn({ name: 'category_id' })
  category: TransactionCategory;

  @ManyToMany(() => TransactionTag, tag => tag.transactions)
  @JoinTable({
    name: 'transaction_tag_relations',
    joinColumn: { name: 'transaction_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'tag_id', referencedColumnName: 'id' }
  })
  tags: TransactionTag[];
}
