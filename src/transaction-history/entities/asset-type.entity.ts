// src/entities/asset-type.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { Transaction } from './transaction.entity';
import { PortfolioHolding } from './portfolio-holding.entity';

@Entity('asset_types')
export class AssetType {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  symbol: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToMany(() => Transaction, transaction => transaction.assetType)
  transactions: Transaction[];

  @OneToMany(() => PortfolioHolding, holding => holding.assetType)
  holdings: PortfolioHolding[];
}
