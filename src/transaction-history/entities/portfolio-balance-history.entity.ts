// src/entities/portfolio-balance-history.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Portfolio } from './portfolio.entity';

@Entity('portfolio_balance_history')
export class PortfolioBalanceHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'portfolio_id' })
  portfolioId: string;

  @Column({ name: 'total_value', type: 'decimal', precision: 20, scale: 8 })
  totalValue: number;

  @Column({ name: 'total_cost', type: 'decimal', precision: 20, scale: 8 })
  totalCost: number;

  @Column({ name: 'realized_pnl', type: 'decimal', precision: 20, scale: 8, default: 0 })
  realizedPnl: number;

  @Column({ name: 'unrealized_pnl', type: 'decimal', precision: 20, scale: 8, default: 0 })
  unrealizedPnl: number;

  @Column({ name: 'recorded_at' })
  recordedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Portfolio, portfolio => portfolio.balanceHistory)
  @JoinColumn({ name: 'portfolio_id' })
  portfolio: Portfolio;
}