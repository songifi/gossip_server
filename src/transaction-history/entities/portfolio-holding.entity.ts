// src/entities/portfolio-holding.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { Portfolio } from './portfolio.entity';
import { AssetType } from './asset-type.entity';

@Entity('portfolio_holdings')
@Unique(['portfolioId', 'assetTypeId'])
export class PortfolioHolding {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'portfolio_id' })
  portfolioId: string;

  @Column({ name: 'asset_type_id' })
  assetTypeId: string;

  @Column({ type: 'decimal', precision: 20, scale: 8, default: 0 })
  quantity: number;

  @Column({ name: 'average_cost', type: 'decimal', precision: 20, scale: 8, default: 0 })
  averageCost: number;

  @Column({ name: 'current_price', type: 'decimal', precision: 20, scale: 8, default: 0 })
  currentPrice: number;

  @Column({ name: 'total_value', type: 'decimal', precision: 20, scale: 8, default: 0 })
  totalValue: number;

  @Column({ name: 'unrealized_pnl', type: 'decimal', precision: 20, scale: 8, default: 0 })
  unrealizedPnl: number;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Portfolio, portfolio => portfolio.holdings)
  @JoinColumn({ name: 'portfolio_id' })
  portfolio: Portfolio;

  @ManyToOne(() => AssetType, assetType => assetType.holdings)
  @JoinColumn({ name: 'asset_type_id' })
  assetType: AssetType;
}
