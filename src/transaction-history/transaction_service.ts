// src/modules/transactions/transaction.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In, SelectQueryBuilder } from 'typeorm';
import { PortfolioService } from './portfolio_service';
import { Transaction, TransactionType } from './entities/transaction.entity';
import { Portfolio } from './entities/portfolio.entity';
import { PortfolioHolding } from './entities/portfolio-holding.entity';
import { TaxEvent } from './entities/tax-event.entity';
import { CreateTransactionDto, TransactionFilterDto, UpdateTransactionDto } from './dto/transaction_dtos';


@Injectable()
export class TransactionService {
  constructor(
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @InjectRepository(Portfolio)
    private portfolioRepository: Repository<Portfolio>,
    @InjectRepository(PortfolioHolding)
    private holdingRepository: Repository<PortfolioHolding>,
    @InjectRepository(TaxEvent)
    private taxEventRepository: Repository<TaxEvent>,
    private portfolioService: PortfolioService,
  ) {}

  async createTransaction(userId: string, createTransactionDto: CreateTransactionDto): Promise<Transaction> {
    const { portfolioId, assetTypeId, type, quantity, price, fees = 0, tags = [], ...rest } = createTransactionDto;

    // Verify portfolio belongs to user
    const portfolio = await this.portfolioRepository.findOne({
      where: { id: portfolioId, userId },
    });

    if (!portfolio) {
      throw new NotFoundException('Portfolio not found');
    }

    // Calculate total amount
    const totalAmount = quantity * price + fees;

    // Create transaction
    const transaction = this.transactionRepository.create({
      userId,
      portfolioId,
      assetTypeId,
      type,
      quantity,
      price,
      totalAmount,
      fees,
      ...rest,
    });

    const savedTransaction = await this.transactionRepository.save(transaction);

    // Add tags if provided
    if (tags.length > 0) {
      // Implementation for adding tags would go here
      // await this.addTagsToTransaction(savedTransaction.id, tags);
    }

    // Update portfolio holdings
    await this.updatePortfolioHoldings(portfolioId, assetTypeId, type, quantity, price);

    // Generate tax events if applicable
    await this.generateTaxEvents(savedTransaction);

    // Update portfolio totals
    await this.portfolioService.recalculatePortfolioTotals(portfolioId);

    return this.findById(savedTransaction.id);
  }

  async findById(id: string): Promise<Transaction> {
    const transaction = await this.transactionRepository.findOne({
      where: { id },
      relations: ['user', 'portfolio', 'assetType', 'category', 'tags'],
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    return transaction;
  }

  async findUserTransactions(
    userId: string,
    filters: TransactionFilterDto,
  ): Promise<{ transactions: Transaction[]; total: number }> {
    const {
      portfolioId,
      assetTypeId,
      type,
      categoryId,
      tagIds,
      startDate,
      endDate,
      minAmount,
      maxAmount,
      search,
      page = 1,
      limit = 20,
      sortBy = 'executedAt',
      sortOrder = 'DESC',
    } = filters;

    const queryBuilder = this.transactionRepository
      .createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.assetType', 'assetType')
      .leftJoinAndSelect('transaction.category', 'category')
      .leftJoinAndSelect('transaction.tags', 'tags')
      .leftJoinAndSelect('transaction.portfolio', 'portfolio')
      .where('transaction.userId = :userId', { userId });

    // Apply filters
    if (portfolioId) {
      queryBuilder.andWhere('transaction.portfolioId = :portfolioId', { portfolioId });
    }

    if (assetTypeId) {
      queryBuilder.andWhere('transaction.assetTypeId = :assetTypeId', { assetTypeId });
    }

    if (type) {
      if (Array.isArray(type)) {
        queryBuilder.andWhere('transaction.type IN (:...types)', { types: type });
      } else {
        queryBuilder.andWhere('transaction.type = :type', { type });
      }
    }

    if (categoryId) {
      queryBuilder.andWhere('transaction.categoryId = :categoryId', { categoryId });
    }

    if (tagIds && tagIds.length > 0) {
      queryBuilder.andWhere('tags.id IN (:...tagIds)', { tagIds });
    }

    if (startDate) {
      queryBuilder.andWhere('transaction.executedAt >= :startDate', { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere('transaction.executedAt <= :endDate', { endDate });
    }

    if (minAmount !== undefined) {
      queryBuilder.andWhere('transaction.totalAmount >= :minAmount', { minAmount });
    }

    if (maxAmount !== undefined) {
      queryBuilder.andWhere('transaction.totalAmount <= :maxAmount', { maxAmount });
    }

    if (search) {
      queryBuilder.andWhere(
        '(assetType.name ILIKE :search OR assetType.symbol ILIKE :search OR transaction.notes ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Apply sorting
    const validSortFields = ['executedAt', 'totalAmount', 'quantity', 'price', 'createdAt'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'executedAt';
    queryBuilder.orderBy(`transaction.${sortField}`, sortOrder as 'ASC' | 'DESC');

    // Apply pagination
    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);

    const [transactions, total] = await queryBuilder.getManyAndCount();

    return { transactions, total };
  }

  async updateTransaction(id: string, userId: string, updateTransactionDto: UpdateTransactionDto): Promise<Transaction> {
    const transaction = await this.transactionRepository.findOne({
      where: { id, userId },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    // Store original values for portfolio recalculation
    const originalQuantity = transaction.quantity;
    const originalPrice = transaction.price;
    const originalType = transaction.type;

    // Update transaction
    Object.assign(transaction, updateTransactionDto);

    if (updateTransactionDto.quantity !== undefined || updateTransactionDto.price !== undefined) {
      transaction.totalAmount = transaction.quantity * transaction.price + (transaction.fees || 0);
    }

    const updatedTransaction = await this.transactionRepository.save(transaction);

    // Recalculate portfolio holdings if quantity, price, or type changed
    if (
      updateTransactionDto.quantity !== undefined ||
      updateTransactionDto.price !== undefined ||
      updateTransactionDto.type !== undefined
    ) {
      // Reverse original transaction effect
      await this.updatePortfolioHoldings(
        transaction.portfolioId,
        transaction.assetTypeId,
        this.reverseTransactionType(originalType),
        originalQuantity,
        originalPrice,
      );

      // Apply new transaction effect
      await this.updatePortfolioHoldings(
        transaction.portfolioId,
        transaction.assetTypeId,
        transaction.type,
        transaction.quantity,
        transaction.price,
      );

      // Update portfolio totals
      await this.portfolioService.recalculatePortfolioTotals(transaction.portfolioId);
    }

    return this.findById(updatedTransaction.id);
  }

  async deleteTransaction(id: string, userId: string): Promise<void> {
    const transaction = await this.transactionRepository.findOne({
      where: { id, userId },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    // Reverse transaction effect on portfolio holdings
    await this.updatePortfolioHoldings(
      transaction.portfolioId,
      transaction.assetTypeId,
      this.reverseTransactionType(transaction.type),
      transaction.quantity,
      transaction.price,
    );

    // Delete associated tax events
    await this.taxEventRepository.delete({ transactionId: id });

    // Delete transaction
    await this.transactionRepository.delete(id);

    // Update portfolio totals
    await this.portfolioService.recalculatePortfolioTotals(transaction.portfolioId);
  }

  async getTransactionSummary(userId: string, portfolioId?: string) {
    const queryBuilder = this.transactionRepository
      .createQueryBuilder('transaction')
      .where('transaction.userId = :userId', { userId });

    if (portfolioId) {
      queryBuilder.andWhere('transaction.portfolioId = :portfolioId', { portfolioId });
    }

    const [totalTransactions, buyTransactions, sellTransactions, totalVolume, totalFees] = await Promise.all([
      queryBuilder.getCount(),
      queryBuilder.clone().andWhere('transaction.type = :type', { type: TransactionType.BUY }).getCount(),
      queryBuilder.clone().andWhere('transaction.type = :type', { type: TransactionType.SELL }).getCount(),
      queryBuilder.clone().select('SUM(transaction.totalAmount)', 'total').getRawOne(),
      queryBuilder.clone().select('SUM(transaction.fees)', 'total').getRawOne(),
    ]);

    return {
      totalTransactions,
      buyTransactions,
      sellTransactions,
      totalVolume: parseFloat(totalVolume?.total || '0'),
      totalFees: parseFloat(totalFees?.total || '0'),
    };
  }

  private async updatePortfolioHoldings(
    portfolioId: string,
    assetTypeId: string,
    type: TransactionType,
    quantity: number,
    price: number,
  ): Promise<void> {
    let holding = await this.holdingRepository.findOne({
      where: { portfolioId, assetTypeId },
    });

    if (!holding) {
      holding = this.holdingRepository.create({
        portfolioId,
        assetTypeId,
        quantity: 0,
        averageCost: 0,
        totalValue: 0,
      });
    }

    switch (type) {
      case TransactionType.BUY:
        const newTotalCost = holding.quantity * holding.averageCost + quantity * price;
        const newQuantity = holding.quantity + quantity;
        holding.averageCost = newQuantity > 0 ? newTotalCost / newQuantity : 0;
        holding.quantity = newQuantity;
        break;

      case TransactionType.SELL:
        holding.quantity = Math.max(0, holding.quantity - quantity);
        break;

      case TransactionType.DIVIDEND:
        // Dividends don't affect quantity or average cost
        break;

      case TransactionType.SPLIT:
        // Stock split - multiply quantity, divide average cost
        const splitRatio = quantity; // Assuming quantity represents the split ratio
        holding.quantity *= splitRatio;
        holding.averageCost /= splitRatio;
        break;

      case TransactionType.TRANSFER_IN:
        holding.quantity += quantity;
        if (holding.quantity > 0) {
          const totalCost = holding.averageCost * (holding.quantity - quantity) + price * quantity;
          holding.averageCost = totalCost / holding.quantity;
        }
        break;

      case TransactionType.TRANSFER_OUT:
        holding.quantity = Math.max(0, holding.quantity - quantity);
        break;
    }

    // Update total value (this would typically use current market price)
    holding.totalValue = holding.quantity * (holding.currentPrice || price);
    holding.unrealizedPnl = holding.totalValue - (holding.quantity * holding.averageCost);

    await this.holdingRepository.save(holding);
  }

  private reverseTransactionType(type: TransactionType): TransactionType {
    switch (type) {
      case TransactionType.BUY:
        return TransactionType.SELL;
      case TransactionType.SELL:
        return TransactionType.BUY;
      case TransactionType.TRANSFER_IN:
        return TransactionType.TRANSFER_OUT;
      case TransactionType.TRANSFER_OUT:
        return TransactionType.TRANSFER_IN;
      default:
        return type;
    }
  }

  private async generateTaxEvents(transaction: Transaction): Promise<void> {
    // Only generate tax events for sell transactions
    if (transaction.type !== TransactionType.SELL) {
      return;
    }

    // Calculate cost basis using FIFO method
    const costBasis = await this.calculateCostBasis(
      transaction.userId,
      transaction.assetTypeId,
      transaction.quantity,
      transaction.executedAt,
    );

    const gainLoss = transaction.totalAmount - costBasis;
    const taxYear = transaction.executedAt.getFullYear();

    const taxEvent = this.taxEventRepository.create({
      userId: transaction.userId,
      transactionId: transaction.id,
      eventType: gainLoss >= 0 ? 'CAPITAL_GAIN' : 'CAPITAL_LOSS',
      amount: transaction.totalAmount,
      costBasis,
      gainLoss,
      taxYear,
    });

    await this.taxEventRepository.save(taxEvent);
  }

  private async calculateCostBasis(
    userId: string,
    assetTypeId: string,
    quantity: number,
    saleDate: Date,
  ): Promise<number> {
    // Get all buy transactions for this asset before the sale date
    const buyTransactions = await this.transactionRepository.find({
      where: {
        userId,
        assetTypeId,
        type: In([TransactionType.BUY, TransactionType.TRANSFER_IN]),
        executedAt: Between(new Date('1900-01-01'), saleDate),
      },
      order: { executedAt: 'ASC' }, // FIFO
    });

    let remainingQuantity = quantity;
    let totalCostBasis = 0;

    for (const buyTx of buyTransactions) {
      if (remainingQuantity <= 0) break;

      const quantityToUse = Math.min(remainingQuantity, buyTx.quantity);
      totalCostBasis += quantityToUse * buyTx.price;
      remainingQuantity -= quantityToUse;
    }

    return totalCostBasis;
  }

  async getTransactionsByCategory(userId: string, portfolioId?: string) {
    const queryBuilder = this.transactionRepository
      .createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.category', 'category')
      .select(['category.name as categoryName', 'COUNT(*) as count', 'SUM(transaction.totalAmount) as totalAmount'])
      .where('transaction.userId = :userId', { userId })
      .groupBy('category.id, category.name');

    if (portfolioId) {
      queryBuilder.andWhere('transaction.portfolioId = :portfolioId', { portfolioId });
    }

    return queryBuilder.getRawMany();
  }

  async getMonthlyTransactionVolume(userId: string, year?: number) {
    const queryBuilder = this.transactionRepository
      .createQueryBuilder('transaction')
      .select([
        'EXTRACT(MONTH FROM transaction.executedAt) as month',
        'EXTRACT(YEAR FROM transaction.executedAt) as year',
        'COUNT(*) as transactionCount',
        'SUM(transaction.totalAmount) as totalVolume',
      ])
      .where('transaction.userId = :userId', { userId })
      .groupBy('EXTRACT(YEAR FROM transaction.executedAt), EXTRACT(MONTH FROM transaction.executedAt)')
      .orderBy('year, month');

    if (year) {
      queryBuilder.andWhere('EXTRACT(YEAR FROM transaction.executedAt) = :year', { year });
    }

    return queryBuilder.getRawMany();
  }
}