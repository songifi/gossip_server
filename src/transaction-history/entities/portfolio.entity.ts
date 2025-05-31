// src/entities/portfolio.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Transaction } from './transaction.entity';
import { PortfolioHolding } from './portfolio-holding.entity';
import { PortfolioBalanceHistory } from './portfolio-balance-history.entity';

@Entity('portfolios')
export class Portfolio {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'total_value', type: 'decimal', precision: 20, scale: 8, default: 0 })
  totalValue: number;

  @Column({ name: 'total_cost', type: 'decimal', precision: 20, scale: 8, default: 0 })
  totalCost: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => User, user => user.portfolios)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany(() => Transaction, transaction => transaction.portfolio)
  transactions: Transaction[];

  @OneToMany(() => PortfolioHolding, holding => holding.portfolio)
  holdings: PortfolioHolding[];

  @OneToMany(() => PortfolioBalanceHistory, history => history.portfolio)
  balanceHistory: PortfolioBalanceHistory[];
}