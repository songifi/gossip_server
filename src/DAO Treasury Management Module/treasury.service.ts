import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
  Treasury,
  TreasuryBalance,
  Proposal,
  Vote,
  TreasuryTransaction,
  BudgetAllocation,
  ProposalStatus,
  TransactionType
} from './treasury.entity';
import {
  CreateTreasuryDto,
  CreateProposalDto,
  CastVoteDto,
  CreateBudgetAllocationDto
} from './treasury.dto';

@Injectable()
export class TreasuryService {
  constructor(
    @InjectRepository(Treasury)
    private treasuryRepository: Repository<Treasury>,
    @InjectRepository(TreasuryBalance)
    private balanceRepository: Repository<TreasuryBalance>,
    @InjectRepository(Proposal)
    private proposalRepository: Repository<Proposal>,
    @InjectRepository(Vote)
    private voteRepository: Repository<Vote>,
    @InjectRepository(TreasuryTransaction)
    private transactionRepository: Repository<TreasuryTransaction>,
    @InjectRepository(BudgetAllocation)
    private budgetRepository: Repository<BudgetAllocation>,
    private httpService: HttpService
  ) {}

  async createTreasury(createTreasuryDto: CreateTreasuryDto): Promise<Treasury> {
    // Validate multi-sig address and signatories
    await this.validateMultiSigWallet(createTreasuryDto.multiSigAddress, createTreasuryDto.signatories);

    const treasury = this.treasuryRepository.create(createTreasuryDto);
    const savedTreasury = await this.treasuryRepository.save(treasury);

    // Initialize balance tracking
    await this.initializeTreasuryBalances(savedTreasury.id);

    return savedTreasury;
  }

  async getTreasury(id: string): Promise<Treasury> {
    const treasury = await this.treasuryRepository.findOne({
      where: { id },
      relations: ['balances', 'proposals', 'transactions', 'budgetAllocations']
    });

    if (!treasury) {
      throw new NotFoundException('Treasury not found');
    }

    return treasury;
  }

  async getTreasuryByGroupChat(groupChatId: string): Promise<Treasury> {
    const treasury = await this.treasuryRepository.findOne({
      where: { groupChatId },
      relations: ['balances', 'proposals', 'transactions', 'budgetAllocations']
    });

    if (!treasury) {
      throw new NotFoundException('Treasury not found for this group chat');
    }

    return treasury;
  }

  async createProposal(createProposalDto: CreateProposalDto): Promise<Proposal> {
    const treasury = await this.getTreasury(createProposalDto.treasuryId);

    // Validate proposal based on type
    await this.validateProposal(createProposalDto, treasury);

    const proposal = this.proposalRepository.create({
      ...createProposalDto,
      treasury,
      status: ProposalStatus.ACTIVE
    });

    return this.proposalRepository.save(proposal);
  }

  async castVote(castVoteDto: CastVoteDto): Promise<Vote> {
    const proposal = await this.proposalRepository.findOne({
      where: { id: castVoteDto.proposalId },
      relations: ['treasury']
    });

    if (!proposal) {
      throw new NotFoundException('Proposal not found');
    }

    // Check if voting is still active
    const now = new Date();
    if (now < proposal.votingStartTime || now > proposal.votingEndTime) {
      throw new BadRequestException('Voting period is not active');
    }

    // Check if user already voted
    const existingVote = await this.voteRepository.findOne({
      where: { proposal: { id: proposal.id }, voter: castVoteDto.voter }
    });

    if (existingVote) {
      throw new BadRequestException('User has already voted on this proposal');
    }

    // Validate voting power (should be done via governance token balance check)
    const votingPower = await this.getVotingPower(castVoteDto.voter, proposal.treasury.governanceTokenAddress);
    
    const vote = this.voteRepository.create({
      ...castVoteDto,
      proposal,
      votingPower
    });

    const savedVote = await this.voteRepository.save(vote);

    // Update proposal vote counts
    await this.updateProposalVotes(proposal.id);

    return savedVote;
  }

  async executeProposal(proposalId: string, executorAddress: string): Promise<void> {
    const proposal = await this.proposalRepository.findOne({
      where: { id: proposalId },
      relations: ['treasury', 'votes']
    });

    if (!proposal) {
      throw new NotFoundException('Proposal not found');
    }

    // Check if proposal can be executed
    if (proposal.status !== ProposalStatus.ACTIVE) {
      throw new BadRequestException('Proposal is not in active status');
    }

    if (new Date() < proposal.votingEndTime) {
      throw new BadRequestException('Voting period has not ended');
    }

    // Check if proposal passed
    const approvalPercentage = (proposal.votesFor / proposal.totalVotingPower) * 100;
    if (approvalPercentage < proposal.requiredApprovalPercentage) {
      proposal.status = ProposalStatus.REJECTED;
      await this.proposalRepository.save(proposal);
      throw new BadRequestException('Proposal did not meet approval threshold');
    }

    // Execute proposal via Gnosis Safe
    const txHash = await this.executeGnosisSafeTransaction(proposal);
    
    proposal.status = ProposalStatus.EXECUTED;
    proposal.executionTxHash = txHash;
    await this.proposalRepository.save(proposal);

    // Record transaction
    await this.recordProposalExecution(proposal, txHash);
  }

  async createBudgetAllocation(createBudgetDto: CreateBudgetAllocationDto): Promise<BudgetAllocation> {
    const treasury = await this.getTreasury(createBudgetDto.treasuryId);

    const budget = this.budgetRepository.create({
      ...createBudgetDto,
      treasury
    });

    return this.budgetRepository.save(budget);
  }

  async getTreasuryAnalytics(treasuryId: string, startDate?: Date, endDate?: Date) {
    const treasury = await this.getTreasury(treasuryId);

    const dateFilter = startDate && endDate ? Between(startDate, endDate) : {};

    const [
      totalTransactions,
      totalVolume,
      activeProposals,
      executedProposals,
      budgetUtilization
    ] = await Promise.all([
      this.transactionRepository.count({
        where: { treasury: { id: treasuryId }, timestamp: dateFilter }
      }),
      this.transactionRepository
        .createQueryBuilder('tx')
        .select('SUM(tx.usdValue)', 'total')
        .where('tx.treasuryId = :treasuryId', { treasuryId })
        .andWhere(startDate && endDate ? 'tx.timestamp BETWEEN :startDate AND :endDate' : 'TRUE', { startDate, endDate })
        .getRawOne(),
      this.proposalRepository.count({
        where: { treasury: { id: treasuryId }, status: ProposalStatus.ACTIVE }
      }),
      this.proposalRepository.count({
        where: { treasury: { id: treasuryId }, status: ProposalStatus.EXECUTED }
      }),
      this.calculateBudgetUtilization(treasuryId)
    ]);

    return {
      treasury: {
        id: treasury.id,
        name: treasury.name,
        totalValue: treasury.totalValue,
        multiSigAddress: treasury.multiSigAddress
      },
      metrics: {
        totalTransactions,
        totalVolume: totalVolume?.total || 0,
        activeProposals,
        executedProposals,
        budgetUtilization
      },
      balances: treasury.balances,
      recentTransactions: await this.getRecentTransactions(treasuryId, 10)
    };
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async updateAllTreasuryBalances() {
    const treasuries = await this.treasuryRepository.find();
    
    for (const treasury of treasuries) {
      await this.updateTreasuryBalances(treasury.id);
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async checkProposalDeadlines() {
    const now = new Date();
    const expiredProposals = await this.proposalRepository.find({
      where: {
        status: ProposalStatus.ACTIVE,
        votingEndTime: Between(new Date(0), now)
      }
    });

    for (const proposal of expiredProposals) {
      const approvalPercentage = (proposal.votesFor / proposal.totalVotingPower) * 100;
      
      if (approvalPercentage >= proposal.requiredApprovalPercentage) {
        // Auto-execute if it meets criteria
        try {
          await this.executeProposal(proposal.id, 'system');
        } catch (error) {
          console.error(`Failed to auto-execute proposal ${proposal.id}:`, error);
          proposal.status = ProposalStatus.EXPIRED;
          await this.proposalRepository.save(proposal);
        }
      } else {
        proposal.status = ProposalStatus.EXPIRED;
        await this.proposalRepository.save(proposal);
      }
    }
  }

  private async validateMultiSigWallet(address: string, signatories: string[]): Promise<void> {
    // Implement Gnosis Safe validation
    try {
      const response = await firstValueFrom(
        this.httpService.get(`https://safe-transaction-mainnet.safe.global/api/v1/safes/${address}/`)
      );
      
      const safeInfo = response.data;
      if (safeInfo.owners.length !== signatories.length) {
        throw new BadRequestException('Signatories do not match Safe owners');
      }
    } catch (error) {
      throw new BadRequestException('Invalid multi-sig wallet address');
    }
  }

  private async initializeTreasuryBalances(treasuryId: string): Promise<void> {
    const treasury = await this.getTreasury(treasuryId);
    
    // Get initial balances from blockchain
    const balances = await this.fetchWalletBalances(treasury.multiSigAddress);
    
    for (const balance of balances) {
      const treasuryBalance = this.balanceRepository.create({
        treasury,
        ...balance
      });
      await this.balanceRepository.save(treasuryBalance);
    }
  }

  private async updateTreasuryBalances(treasuryId: string): Promise<void> {
    const treasury = await this.getTreasury(treasuryId);
    const currentBalances = await this.fetchWalletBalances(treasury.multiSigAddress);
    
    // Update existing balances
    for (const balance of currentBalances) {
      await this.balanceRepository.upsert({
        treasury: { id: treasuryId },
        tokenAddress: balance.tokenAddress,
        ...balance
      }, ['treasury', 'tokenAddress']);
    }

    // Update total treasury value
    const totalValue = currentBalances.reduce((sum, b) => sum + b.usdValue, 0);
    await this.treasuryRepository.update(treasuryId, { totalValue });
  }

  private async fetchWalletBalances(walletAddress: string): Promise<any[]> {
    // Mock implementation - integrate with actual blockchain API
    try {
      const response = await firstValueFrom(
        this.httpService.get(`https://api.etherscan.io/api?module=account&action=tokenlist&address=${walletAddress}&apikey=YOUR_API_KEY`)
      );
      
      return response.data.result?.map(token => ({
        tokenAddress: token.contractAddress,
        tokenSymbol: token.symbol,
        tokenName: token.name,
        balance: parseFloat(token.balance) / Math.pow(10, parseInt(token.decimals)),
        decimals: parseInt(token.decimals),
        usdValue: 0 // Would need price oracle integration
      })) || [];
    } catch (error) {
      console.error('Failed to fetch wallet balances:', error);
      return [];
    }
  }

  private async validateProposal(dto: CreateProposalDto, treasury: Treasury): Promise<void> {
    if (dto.requestedAmount && dto.requestedTokenAddress) {
      const balance = await this.balanceRepository.findOne({
        where: {
          treasury: { id: treasury.id },
          tokenAddress: dto.requestedTokenAddress
        }
      });

      if (!balance || balance.balance < dto.requestedAmount) {
        throw new BadRequestException('Insufficient treasury balance for requested amount');
      }
    }

    if (dto.votingStartTime >= dto.votingEndTime) {
      throw new BadRequestException('Voting start time must be before end time');
    }
  }

  private async getVotingPower(voterAddress: string, governanceTokenAddress: string): Promise<number> {
    // Mock implementation - would integrate with ERC20 token contract
    try {
      // This would call the governance token contract to get balance
      return 100; // Placeholder
    } catch (error) {
      throw new BadRequestException('Failed to get voting power');
    }
  }

  private async updateProposalVotes(proposalId: string): Promise<void> {
    const votes = await this.voteRepository.find({
      where: { proposal: { id: proposalId } }
    });

    const votesFor = votes
      .filter(v => v.support)
      .reduce((sum, v) => sum + v.votingPower, 0);

    const votesAgainst = votes
      .filter(v => !v.support)
      .reduce((sum, v) => sum + v.votingPower, 0);

    const totalVotingPower = votesFor + votesAgainst;

    await this.proposalRepository.update(proposalId, {
      votesFor,
      votesAgainst,
      totalVotingPower
    });
  }

  private async executeGnosisSafeTransaction(proposal: Proposal): Promise<string> {
    // Mock implementation - would integrate with Gnosis Safe SDK
    try {
      // This would create and execute a Safe transaction
      return '0x' + Math.random().toString(16).substr(2, 64); // Mock tx hash
    } catch (error) {
      throw new BadRequestException('Failed to execute Safe transaction');
    }
  }

  private async recordProposalExecution(proposal: Proposal, txHash: string): Promise<void> {
    if (proposal.requestedAmount && proposal.requestedTokenAddress) {
      const transaction = this.transactionRepository.create({
        treasury: proposal.treasury,
        txHash,
        type: TransactionType.PROPOSAL_EXECUTION,
        from: proposal.treasury.multiSigAddress,
        to: 'recipient', // Would be extracted from proposal execution data
        amount: proposal.requestedAmount,
        tokenAddress: proposal.requestedTokenAddress,
        tokenSymbol: 'TOKEN', // Would be fetched
        usdValue: 0, // Would be calculated
        proposalId: proposal.id,
        blockNumber: 0 // Would be fetched from blockchain
      });

      await this.transactionRepository.save(transaction);
    }
  }

  private async calculateBudgetUtilization(treasuryId: string): Promise<any> {
    const budgets = await this.budgetRepository.find({
      where: { treasury: { id: treasuryId }, isActive: true }
    });

    return budgets.map(budget => ({
      category: budget.category,
      allocatedAmount: budget.allocatedAmount,
      spentAmount: budget.spentAmount,
      utilizationPercentage: (budget.spentAmount / budget.allocatedAmount) * 100,
      remainingAmount: budget.allocatedAmount - budget.spentAmount
    }));
  }

  private async getRecentTransactions(treasuryId: string, limit: number): Promise<TreasuryTransaction[]> {
    return this.transactionRepository.find({
      where: { treasury: { id: treasuryId } },
      order: { timestamp: 'DESC' },
      take: limit
    });
  }
}

