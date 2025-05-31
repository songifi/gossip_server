// src/modules/transactions/transaction.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TransactionService } from './transaction_service';
import { Transaction } from './entities/transaction.entity';
import { CreateTransactionDto, TransactionFilterDto, UpdateTransactionDto } from './dto/transaction_dtos';
// import { JwtAuthGuard } from '../../guards/jwt-auth.guard';

@ApiTags('Transactions')
@ApiBearerAuth()
// @UseGuards(JwtAuthGuard)
@Controller('transactions')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new transaction' })
  @ApiResponse({
    status: 201,
    description: 'Transaction created successfully',
    type: Transaction,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Portfolio not found' })
  async createTransaction(
    @Request() req: any,
    @Body() createTransactionDto: CreateTransactionDto,
  ): Promise<Transaction> {
    return this.transactionService.createTransaction(req.user.id, createTransactionDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get user transactions with filtering and pagination' })
  @ApiResponse({
    status: 200,
    description: 'Transactions retrieved successfully',
  })
  @ApiQuery({ name: 'portfolioId', required: false, type: String })
  @ApiQuery({ name: 'assetTypeId', required: false, type: String })
  @ApiQuery({ name: 'type', required: false, type: String })
  @ApiQuery({ name: 'categoryId', required: false, type: String })
  @ApiQuery({ name: 'tagIds', required: false, type: [String] })
  @ApiQuery({ name: 'startDate', required: false, type: Date })
  @ApiQuery({ name: 'endDate', required: false, type: Date })
  @ApiQuery({ name: 'minAmount', required: false, type: Number })
  @ApiQuery({ name: 'maxAmount', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'sortBy', required: false, type: String, example: 'executedAt' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'], example: 'DESC' })
  async getUserTransactions(
    @Request() req: any,
    @Query() filters: TransactionFilterDto,
  ): Promise<{ transactions: Transaction[]; total: number; page: number; limit: number; totalPages: number }> {
    const result = await this.transactionService.findUserTransactions(req.user.id, filters);
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const totalPages = Math.ceil(result.total / limit);

    return {
      ...result,
      page,
      limit,
      totalPages,
    };
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get transaction summary statistics' })
  @ApiResponse({
    status: 200,
    description: 'Transaction summary retrieved successfully',
  })
  @ApiQuery({ name: 'portfolioId', required: false, type: String })
  async getTransactionSummary(
    @Request() req: any,
    @Query('portfolioId') portfolioId?: string,
  ): Promise<{
    totalTransactions: number;
    buyTransactions: number;
    sellTransactions: number;
    totalVolume: number;
    totalFees: number;
  }> {
    return this.transactionService.getTransactionSummary(req.user.id, portfolioId);
  }

  @Get('by-category')
  @ApiOperation({ summary: 'Get transactions grouped by category' })
  @ApiResponse({
    status: 200,
    description: 'Transactions by category retrieved successfully',
  })
  @ApiQuery({ name: 'portfolioId', required: false, type: String })
  async getTransactionsByCategory(
    @Request() req: any,
    @Query('portfolioId') portfolioId?: string,
  ): Promise<Array<{ categoryName: string; count: string; totalAmount: string }>> {
    return this.transactionService.getTransactionsByCategory(req.user.id, portfolioId);
  }

  @Get('monthly-volume')
  @ApiOperation({ summary: 'Get monthly transaction volume analytics' })
  @ApiResponse({
    status: 200,
    description: 'Monthly transaction volume retrieved successfully',
  })
  @ApiQuery({ name: 'year', required: false, type: Number })
  async getMonthlyTransactionVolume(
    @Request() req: any,
    @Query('year') year?: number,
  ): Promise<Array<{
    month: string;
    year: string;
    transactionCount: string;
    totalVolume: string;
  }>> {
    return this.transactionService.getMonthlyTransactionVolume(req.user.id, year);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get transaction by ID' })
  @ApiResponse({
    status: 200,
    description: 'Transaction retrieved successfully',
    type: Transaction,
  })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async getTransactionById(@Param('id') id: string): Promise<Transaction> {
    return this.transactionService.findById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update transaction' })
  @ApiResponse({
    status: 200,
    description: 'Transaction updated successfully',
    type: Transaction,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async updateTransaction(
    @Param('id') id: string,
    @Request() req: any,
    @Body() updateTransactionDto: UpdateTransactionDto,
  ): Promise<Transaction> {
    return this.transactionService.updateTransaction(id, req.user.id, updateTransactionDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete transaction' })
  @ApiResponse({ status: 204, description: 'Transaction deleted successfully' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async deleteTransaction(@Param('id') id: string, @Request() req: any): Promise<void> {
    return this.transactionService.deleteTransaction(id, req.user.id);
  }
}