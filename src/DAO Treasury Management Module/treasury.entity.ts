import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum ProposalStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  EXECUTED = 'executed',
  REJECTED = 'rejected',
  EXPIRED = 'expired'
}

export enum ProposalType {
  SPENDING = 'spending',
  BUDGET_ALLOCATION = 'budget_allocation',
  GOVERNANCE = 'governance',
  PARAMETER_CHANGE = 'parameter_change'
}

export enum TransactionType {
  DEPOSIT = 'deposit',
  WITHDRAWAL = 'withdrawal',
  TRANSFER = 'transfer',
  PROPOSAL_EXECUTION = 'proposal_execution'
}

@Entity()
export class Treasury {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  groupChatId: string;

  @Column()
  name: string;

  @Column()
  description: string;

  @Column()
  multiSigAddress: string;

  @Column('json')
  signatories: string[]; // Ethereum addresses of signatories

  @Column()
  requiredSignatures: number;

  @Column('decimal', { precision: 18, scale: 8, default: 0 })
  totalValue: number; // USD value of all assets

  @Column()
  governanceTokenAddress: string;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => TreasuryBalance, balance => balance.treasury)
  balances: TreasuryBalance[];

  @OneToMany(() => Proposal, proposal => proposal.treasury)
  proposals: Proposal[];

  @OneToMany(() => TreasuryTransaction, transaction => transaction.treasury)
  transactions: TreasuryTransaction[];

  @OneToMany(() => BudgetAllocation, allocation => allocation.treasury)
  budgetAllocations: BudgetAllocation[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity()
export class TreasuryBalance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Treasury, treasury => treasury.balances)
  treasury: Treasury;

  @Column()
  tokenAddress: string;

  @Column()
  tokenSymbol: string;

  @Column()
  tokenName: string;

  @Column('decimal', { precision: 18, scale: 8 })
  balance: number;

  @Column('decimal', { precision: 18, scale: 8 })
  usdValue: number;

  @Column()
  decimals: number;

  @UpdateDateColumn()
  lastUpdated: Date;
}

@Entity()
export class Proposal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Treasury, treasury => treasury.proposals)
  treasury: Treasury;

  @Column()
  title: string;

  @Column('text')
  description: string;

  @Column({
    type: 'enum',
    enum: ProposalType
  })
  type: ProposalType;

  @Column({
    type: 'enum',
    enum: ProposalStatus,
    default: ProposalStatus.DRAFT
  })
  status: ProposalStatus;

  @Column()
  proposer: string; // Ethereum address

  @Column('json', { nullable: true })
  executionData: any; // Smart contract call data

  @Column('decimal', { precision: 18, scale: 8, nullable: true })
  requestedAmount: number;

  @Column({ nullable: true })
  requestedTokenAddress: string;

  @Column()
  votingStartTime: Date;

  @Column()
  votingEndTime: Date;

  @Column('decimal', { precision: 18, scale: 8, default: 0 })
  votesFor: number;

  @Column('decimal', { precision: 18, scale: 8, default: 0 })
  votesAgainst: number;

  @Column('decimal', { precision: 18, scale: 8, default: 0 })
  totalVotingPower: number;

  @Column('decimal', { precision: 2, scale: 2, default: 51.0 })
  requiredApprovalPercentage: number;

  @Column({ nullable: true })
  executionTxHash: string;

  @OneToMany(() => Vote, vote => vote.proposal)
  votes: Vote[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity()
export class Vote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Proposal, proposal => proposal.votes)
  proposal: Proposal;

  @Column()
  voter: string; // Ethereum address

  @Column()
  support: boolean; // true for yes, false for no

  @Column('decimal', { precision: 18, scale: 8 })
  votingPower: number;

  @Column({ nullable: true })
  reason: string;

  @CreateDateColumn()
  votedAt: Date;
}

@Entity()
export class TreasuryTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Treasury, treasury => treasury.transactions)
  treasury: Treasury;

  @Column()
  txHash: string;

  @Column({
    type: 'enum',
    enum: TransactionType
  })
  type: TransactionType;

  @Column()
  from: string;

  @Column()
  to: string;

  @Column('decimal', { precision: 18, scale: 8 })
  amount: number;

  @Column()
  tokenAddress: string;

  @Column()
  tokenSymbol: string;

  @Column('decimal', { precision: 18, scale: 8 })
  usdValue: number;

  @Column({ nullable: true })
  proposalId: string;

  @Column()
  blockNumber: number;

  @CreateDateColumn()
  timestamp: Date;
}

@Entity()
export class BudgetAllocation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Treasury, treasury => treasury.budgetAllocations)
  treasury: Treasury;

  @Column()
  category: string;

  @Column('text', { nullable: true })
  description: string;

  @Column('decimal', { precision: 18, scale: 8 })
  allocatedAmount: number;

  @Column('decimal', { precision: 18, scale: 8, default: 0 })
  spentAmount: number;

  @Column()
  tokenAddress: string;

  @Column()
  tokenSymbol: string;

  @Column()
  startDate: Date;

  @Column()
  endDate: Date;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
