// src/modules/portfolio/portfolio.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Transaction } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Portfolio } from './entities/portfolio.entity';
import { PortfolioHolding } from './entities/portfolio-holding.entity';
import { PortfolioBalanceHistory } from './entities/portfolio-balance-history.entity';
import { CreatePortfolioDto, UpdatePortfolioDto } from './dto/portfolio_dtos';

@Injectable()
export class PortfolioService {
  constructor(
    @InjectRepository(Portfolio)
    private portfolioRepository: Repository<Portfolio>,
    @InjectRepository(PortfolioHolding)
    private holdingRepository: Repository<PortfolioHolding>,
    @InjectRepository(PortfolioBalanceHistory)
    private balanceHistoryRepository: Repository<PortfolioBalanceHistory>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
  ) {}

  async createPortfolio(userId: string, createPortfolioDto: CreatePortfolioDto): Promise<Portfolio> {
    const portfolio = this.portfolioRepository.create({
      userId,
      ...createPortfolioDto,
    });

    return this.portfolioRepository.save(portfolio);
  }

  async findUserPortfolios(userId: string): Promise<Portfolio[]> {
    return this.portfolioRepository.find({
      where: { userId },
      relations: ['holdings', 'holdings.assetType'],
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string, userId: string): Promise<Portfolio> {
    const portfolio = await this.portfolioRepository.findOne({
      where: { id, userId },
      relations: ['holdings', 'holdings.assetType', 'transactions', 'transactions.assetType'],
    });

    if (!portfolio) {
      throw new NotFoundException('Portfolio not found');
    }

    return portfolio;
  }

  async updatePortfolio(id: string, userId: string, updatePortfolioDto: UpdatePortfolioDto): Promise<Portfolio> {
    const portfolio = await this.portfolioRepository.findOne({
      where: { id, userId },
    });

    if (!portfolio) {
      throw new NotFoundException('Portfolio not found');
    }

    Object.assign(portfolio, updatePortfolioDto);
    return this.portfolioRepository.save(portfolio);
  }

  async deletePortfolio(id: string, userId: string): Promise<void> {
    const portfolio = await this.portfolioRepository.findOne({
      where: { id, userId },
    });

    if (!portfolio) {
      throw new NotFoundException('Portfolio not found');
    }

    await this.portfolioRepository.delete(id);
  }

  async getPortfolioHoldings(portfolioId: string, userId: string): Promise<PortfolioHolding[]> {
    const portfolio = await this.portfolioRepository.findOne({
      where: { id: portfolioId, userId },
    });

    if (!portfolio) {
      throw new NotFoundException('Portfolio not found');
    }

    return this.holdingRepository.find({
      where: { portfolioId },
      relations: ['assetType'],
      order: { totalValue: 'DESC' },
    });
  }

  async getPortfolioPerformance(portfolioId: string, userId: string, days: number = 30) {
    const portfolio = await this.portfolioRepository.findOne({
      where: { id: portfolioId, userId },
    });

    if (!portfolio) {
      throw new NotFoundException('Portfolio not found');
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const balanceHistory = await this.balanceHistoryRepository.find({
      where: {
        portfolioId,
        recordedAt: Between(startDate, new Date()),
      },
      order: { recordedAt: 'ASC' },
    });

    const performance = this.calculatePerformanceMetrics(balanceHistory);
    
    return {
      portfolio,
      balanceHistory,
      performance,
    };
  }

  private calculatePerformanceMetrics(balanceHistory: PortfolioBalanceHistory[]) {
    if (balanceHistory.length < 2) {
      return {
        totalReturn: 0,
        totalReturnPercentage: 0,
        dailyReturns: [],
        volatility: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
      };
    }

    const values = balanceHistory.map(h => h.totalValue);
    const firstValue = values[0];
    const lastValue = values[values.length - 1];
    
    const totalReturn = lastValue - firstValue;
    const totalReturnPercentage = firstValue > 0 ? (totalReturn / firstValue) * 100 : 0;

    // Calculate daily returns
    const dailyReturns = [];
    for (let i = 1; i < values.length; i++) {
      const dailyReturn = values[i - 1] > 0 ? (values[i] - values[i - 1]) / values[i - 1] : 0;
      dailyReturns.push(dailyReturn);
    }

    // Calculate volatility (standard deviation of daily returns)
    const avgDailyReturn = dailyReturns.reduce((sum, ret) => sum + ret, 0) / dailyReturns.length;
    const variance = dailyReturns.reduce((sum, ret) => sum + Math.pow(ret - avgDailyReturn, 2), 0) / dailyReturns.length;
    const volatility = Math.sqrt(variance) * Math.sqrt(252); // Annualized volatility

    // Calculate Sharpe ratio (assuming risk-free rate of 2%)
    const riskFreeRate = 0.02;
    const excessReturn = (totalReturnPercentage / 100) - riskFreeRate;
    const sharpeRatio = volatility > 0 ? excessReturn / volatility : 0;

    // Calculate max drawdown
    let maxDrawdown = 0;
    let peak = values[0];
    
    for (const value of values) {
      if (value > peak) {
        peak = value;
      }
      const drawdown = peak > 0 ? (peak - value) / peak : 0;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }

    return {
      totalReturn,
      totalReturnPercentage,
      dailyReturns,
      volatility,
      sharpeRatio,
      maxDrawdown: maxDrawdown * 100, // Convert to percentage
    };
  }

  async getPortfolioProfitLoss(portfolioId: string, userId: string) {
    const portfolio = await this.portfolioRepository.findOne({
      where: { id: portfolioId, userId },
    });

    if (!portfolio) {
      throw new NotFoundException('Portfolio not found');
    }

    const holdings = await this.holdingRepository.find({
      where: { portfolioId },
      relations: ['assetType'],
    });

    // Calculate realized P&L from transactions
    const realizedPnL = await this.calculateRealizedPnL(portfolioId);

    // Calculate unrealized P&L from current holdings
    const unrealizedPnL = holdings.reduce((total, holding) => total + holding.unrealizedPnl, 0);

    const totalPnL = realizedPnL + unrealizedPnL;
    const totalCost = portfolio.totalCost;
    const totalReturnPercentage = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;

    return {
      realizedPnL,
      unrealizedPnL,
      totalPnL,
      totalCost,
      totalValue: portfolio.totalValue,
      totalReturnPercentage,
      holdings: holdings.map(holding => ({
        assetType: holding.assetType,
        quantity: holding.quantity,
        averageCost: holding.averageCost,
        currentPrice: holding.currentPrice,
        totalValue: holding.totalValue,
        unrealizedPnL: holding.unrealizedPnl,
        unrealizedPnLPercentage: holding.averageCost > 0 ? (holding.unrealizedPnl / (holding.quantity * holding.averageCost)) * 100 : 0,
      })),
    };
  }

  private async calculateRealizedPnL(portfolioId: string): Promise<number> {
    const sellTransactions = await this.transactionRepository.find({
      where: { portfolioId, type: TransactionType.SELL },
      order: { executedAt: 'ASC' },
    });

    let totalRealizedPnL = 0;

    for (const sellTx of sellTransactions) {
      // Get cost basis for this sale (simplified FIFO calculation)
      const costBasis = await this.calculateCostBasisForSale(portfolioId, sellTx);
      const realizedPnL = sellTx.totalAmount - costBasis;
      totalRealizedPnL += realizedPnL;
    }

    return totalRealizedPnL;
  }

  private async calculateCostBasisForSale(portfolioId: string, sellTransaction: Transaction): Promise<number> {
    const buyTransactions = await this.transactionRepository.find({
      where: {
        portfolioId,
        assetTypeId: sellTransaction.assetTypeId,
        type: TransactionType.BUY,
        executedAt: Between(new Date('1900-01-01'), sellTransaction.executedAt),
      },
      order: { executedAt: 'ASC' }, // FIFO
    });

    let remainingQuantity = sellTransaction.quantity;
    let totalCostBasis = 0;

    for (const buyTx of buyTransactions) {
      if (remainingQuantity <= 0) break;

      const quantityToUse = Math.min(remainingQuantity, buyTx.quantity);
      totalCostBasis += quantityToUse * buyTx.price;
      remainingQuantity -= quantityToUse;
    }

    return totalCostBasis;
  }

  async recalculatePortfolioTotals(portfolioId: string): Promise<void> {
    const holdings = await this.holdingRepository.find({
      where: { portfolioId },
    });

    const totalValue = holdings.reduce((sum, holding) => sum + holding.totalValue, 0);
    const totalCost = holdings.reduce((sum, holding) => sum + (holding.quantity * holding.averageCost), 0);

    await this.portfolioRepository.update(portfolioId, {
      totalValue,
      totalCost,
      updatedAt: new Date(),
    });
  }

  async getPortfolioAllocation(portfolioId: string, userId: string) {
    const portfolio = await this.portfolioRepository.findOne({
      where: { id: portfolioId, userId },
    });

    if (!portfolio) {
      throw new NotFoundException('Portfolio not found');
    }

    const holdings = await this.holdingRepository.find({
      where: { portfolioId },
      relations: ['assetType'],
    });

    const totalValue = holdings.reduce((sum, holding) => sum + holding.totalValue, 0);

    const allocation = holdings.map(holding => ({
      assetType: holding.assetType,
      value: holding.totalValue,
      percentage: totalValue > 0 ? (holding.totalValue / totalValue) * 100 : 0,
      quantity: holding.quantity,
    }));

    return {
      totalValue,
      allocation: allocation.sort((a, b) => b.percentage - a.percentage),
    };
  }

  // Cron job to record daily portfolio balances
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async recordDailyBalances(): Promise<void> {
    const portfolios = await this.portfolioRepository.find();

    for (const portfolio of portfolios) {
      const holdings = await this.holdingRepository.find({
        where: { portfolioId: portfolio.id },
      });

      const totalValue = holdings.reduce((sum, holding) => sum + holding.totalValue, 0);
      const totalCost = holdings.reduce((sum, holding) => sum + (holding.quantity * holding.averageCost), 0);
      const unrealizedPnl = holdings.reduce((sum, holding) => sum + holding.unrealizedPnl, 0);
      const realizedPnl = await this.calculateRealizedPnL(portfolio.id);

      const balanceRecord = this.balanceHistoryRepository.create({
        portfolioId: portfolio.id,
        totalValue,
        totalCost,
        realizedPnl,
        unrealizedPnl,
        recordedAt: new Date(),
      });

      await this.balanceHistoryRepository.save(balanceRecord);
    }
  }

  async getPortfolioComparison(portfolioIds: string[], userId: string, days: number = 30) {
    const portfolios = await this.portfolioRepository.find({
      where: { id: In(portfolioIds), userId },
    });

    if (portfolios.length !== portfolioIds.length) {
      throw new NotFoundException('One or more portfolios not found');
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const comparison = [];

    for (const portfolio of portfolios) {
      const performance = await this.getPortfolioPerformance(portfolio.id, userId, days);
      comparison.push({
        portfolio: portfolio.name,
        portfolioId: portfolio.id,
        currentValue: portfolio.totalValue,
        totalReturn: performance.performance.totalReturn,
        totalReturnPercentage: performance.performance.totalReturnPercentage,
        volatility: performance.performance.volatility,
        sharpeRatio: performance.performance.sharpeRatio,
        maxDrawdown: performance.performance.maxDrawdown,
      });
    }

    return comparison.sort((a, b) => b.totalReturnPercentage - a.totalReturnPercentage);
  }
}