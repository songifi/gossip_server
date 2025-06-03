// src/modules/portfolio/portfolio.controller.ts
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
// import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { Portfolio } from './entities/portfolio.entity';
import { PortfolioHolding } from './entities/portfolio-holding.entity';
import { PortfolioService } from './portfolio_service';
import { CreatePortfolioDto, UpdatePortfolioDto } from './dto/portfolio_dtos';

@ApiTags('Portfolios')
@ApiBearerAuth()
// @UseGuards(JwtAuthGuard)
@Controller('portfolios')
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new portfolio' })
  @ApiResponse({
    status: 201,
    description: 'Portfolio created successfully',
    type: Portfolio,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async createPortfolio(
    @Request() req: any,
    @Body() createPortfolioDto: CreatePortfolioDto,
  ): Promise<Portfolio> {
    return this.portfolioService.createPortfolio(req.user.id, createPortfolioDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all user portfolios' })
  @ApiResponse({
    status: 200,
    description: 'Portfolios retrieved successfully',
    type: [Portfolio],
  })
  async getUserPortfolios(@Request() req: any): Promise<Portfolio[]> {
    return this.portfolioService.findUserPortfolios(req.user.id);
  }

  @Get('comparison')
  @ApiOperation({ summary: 'Compare multiple portfolios performance' })
  @ApiResponse({
    status: 200,
    description: 'Portfolio comparison retrieved successfully',
  })
  @ApiQuery({ name: 'portfolioIds', required: true, type: [String] })
  @ApiQuery({ name: 'days', required: false, type: Number, example: 30 })
  async comparePortfolios(
    @Request() req: any,
    @Query('portfolioIds') portfolioIds: string[],
    @Query('days') days: number = 30,
  ): Promise<Array<{
    portfolio: string;
    portfolioId: string;
    currentValue: number;
    totalReturn: number;
    totalReturnPercentage: number;
    volatility: number;
    sharpeRatio: number;
    maxDrawdown: number;
  }>> {
    const ids = Array.isArray(portfolioIds) ? portfolioIds : [portfolioIds];
    return this.portfolioService.getPortfolioComparison(ids, req.user.id, days);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get portfolio by ID' })
  @ApiResponse({
    status: 200,
    description: 'Portfolio retrieved successfully',
    type: Portfolio,
  })
  @ApiResponse({ status: 404, description: 'Portfolio not found' })
  async getPortfolioById(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<Portfolio> {
    return this.portfolioService.findById(id, req.user.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update portfolio' })
  @ApiResponse({
    status: 200,
    description: 'Portfolio updated successfully',
    type: Portfolio,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Portfolio not found' })
  async updatePortfolio(
    @Param('id') id: string,
    @Request() req: any,
    @Body() updatePortfolioDto: UpdatePortfolioDto,
  ): Promise<Portfolio> {
    return this.portfolioService.updatePortfolio(id, req.user.id, updatePortfolioDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete portfolio' })
  @ApiResponse({ status: 204, description: 'Portfolio deleted successfully' })
  @ApiResponse({ status: 404, description: 'Portfolio not found' })
  async deletePortfolio(@Param('id') id: string, @Request() req: any): Promise<void> {
    return this.portfolioService.deletePortfolio(id, req.user.id);
  }

  @Get(':id/holdings')
  @ApiOperation({ summary: 'Get portfolio holdings' })
  @ApiResponse({
    status: 200,
    description: 'Portfolio holdings retrieved successfully',
    type: [PortfolioHolding],
  })
  @ApiResponse({ status: 404, description: 'Portfolio not found' })
  async getPortfolioHoldings(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<PortfolioHolding[]> {
    return this.portfolioService.getPortfolioHoldings(id, req.user.id);
  }

  @Get(':id/performance')
  @ApiOperation({ summary: 'Get portfolio performance analytics' })
  @ApiResponse({
    status: 200,
    description: 'Portfolio performance retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Portfolio not found' })
  @ApiQuery({ name: 'days', required: false, type: Number, example: 30 })
  async getPortfolioPerformance(
    @Param('id') id: string,
    @Request() req: any,
    @Query('days') days: number = 30,
  ): Promise<{
    portfolio: Portfolio;
    balanceHistory: any[];
    performance: {
      totalReturn: number;
      totalReturnPercentage: number;
      dailyReturns: number[];
      volatility: number;
      sharpeRatio: number;
      maxDrawdown: number;
    };
  }> {
    return this.portfolioService.getPortfolioPerformance(id, req.user.id, days);
  }

  @Get(':id/profit-loss')
  @ApiOperation({ summary: 'Get portfolio profit and loss analysis' })
  @ApiResponse({
    status: 200,
    description: 'Portfolio P&L retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Portfolio not found' })
  async getPortfolioProfitLoss(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<{
    realizedPnL: number;
    unrealizedPnL: number;
    totalPnL: number;
    totalCost: number;
    totalValue: number;
    totalReturnPercentage: number;
    holdings: Array<{
      assetType: any;
      quantity: number;
      averageCost: number;
      currentPrice: number;
      totalValue: number;
      unrealizedPnL: number;
      unrealizedPnLPercentage: number;
    }>;
  }> {
    return this.portfolioService.getPortfolioProfitLoss(id, req.user.id);
  }

  @Get(':id/allocation')
  @ApiOperation({ summary: 'Get portfolio asset allocation' })
  @ApiResponse({
    status: 200,
    description: 'Portfolio allocation retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Portfolio not found' })
  async getPortfolioAllocation(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<{
    totalValue: number;
    allocation: Array<{
      assetType: any;
      value: number;
      percentage: number;
      quantity: number;
    }>;
  }> {
    return this.portfolioService.getPortfolioAllocation(id, req.user.id);
  }

  @Post(':id/recalculate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manually trigger portfolio totals recalculation' })
  @ApiResponse({ status: 200, description: 'Portfolio totals recalculated successfully' })
  @ApiResponse({ status: 404, description: 'Portfolio not found' })
  async recalculatePortfolioTotals(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<{ message: string }> {
    // Verify user owns the portfolio first
    await this.portfolioService.findById(id, req.user.id);
    await this.portfolioService.recalculatePortfolioTotals(id);
    return { message: 'Portfolio totals recalculated successfully' };
  }
}