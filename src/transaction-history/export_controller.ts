// src/modules/export/export.controller.ts
import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
  Res,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { TransactionFilterDto } from './dto/transaction_dtos';
import { ExportService } from './export_service';
// import { JwtAuthGuard } from '../../guards/jwt-auth.guard';

@ApiTags('Export')
@ApiBearerAuth()
// @UseGuards(JwtAuthGuard)
@Controller('export')
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get('transactions/csv')
  @ApiOperation({ summary: 'Export transactions to CSV format' })
  @ApiResponse({
    status: 200,
    description: 'Transactions exported successfully as CSV',
    headers: {
      'Content-Type': { description: 'text/csv' },
      'Content-Disposition': { description: 'attachment; filename="transactions.csv"' },
    },
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
  async exportTransactionsToCSV(
    @Request() req: any,
    @Query() filters: TransactionFilterDto,
    @Res() res: Response,
  ): Promise<void> {
    return this.exportService.exportTransactionsToCSV(req.user.id, filters, res);
  }

  @Get('transactions/pdf')
  @ApiOperation({ summary: 'Export transactions to PDF format' })
  @ApiResponse({
    status: 200,
    description: 'Transactions exported successfully as PDF',
    headers: {
      'Content-Type': { description: 'application/pdf' },
      'Content-Disposition': { description: 'attachment; filename="transactions.pdf"' },
    },
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
  async exportTransactionsToPDF(
    @Request() req: any,
    @Query() filters: TransactionFilterDto,
    @Res() res: Response,
  ): Promise<void> {
    return this.exportService.exportTransactionsToPDF(req.user.id, filters, res);
  }

  @Get('portfolio/:portfolioId/csv')
  @ApiOperation({ summary: 'Export portfolio holdings to CSV format' })
  @ApiResponse({
    status: 200,
    description: 'Portfolio exported successfully as CSV',
    headers: {
      'Content-Type': { description: 'text/csv' },
      'Content-Disposition': { description: 'attachment; filename="portfolio.csv"' },
    },
  })
  @ApiResponse({ status: 404, description: 'Portfolio not found' })
  async exportPortfolioToCSV(
    @Request() req: any,
    @Param('portfolioId') portfolioId: string,
    @Res() res: Response,
  ): Promise<void> {
    return this.exportService.exportPortfolioToCSV(req.user.id, portfolioId, res);
  }

  @Get('portfolio/:portfolioId/pdf')
  @ApiOperation({ summary: 'Export portfolio report to PDF format' })
  @ApiResponse({
    status: 200,
    description: 'Portfolio exported successfully as PDF',
    headers: {
      'Content-Type': { description: 'application/pdf' },
      'Content-Disposition': { description: 'attachment; filename="portfolio-{name}.pdf"' },
    },
  })
  @ApiResponse({ status: 404, description: 'Portfolio not found' })
  async exportPortfolioToPDF(
    @Request() req: any,
    @Param('portfolioId') portfolioId: string,
    @Res() res: Response,
  ): Promise<void> {
    return this.exportService.exportPortfolioToPDF(req.user.id, portfolioId, res);
  }

  @Get('tax-report/:taxYear/csv')
  @ApiOperation({ summary: 'Export tax report to CSV format' })
  @ApiResponse({
    status: 200,
    description: 'Tax report exported successfully as CSV',
    headers: {
      'Content-Type': { description: 'text/csv' },
      'Content-Disposition': { description: 'attachment; filename="tax-report-{year}.csv"' },
    },
  })
  async exportTaxReportToCSV(
    @Request() req: any,
    @Param('taxYear', ParseIntPipe) taxYear: number,
    @Res() res: Response,
  ): Promise<void> {
    return this.exportService.exportTaxReportToCSV(req.user.id, taxYear, res);
  }

  @Get('tax-report/:taxYear/pdf')
  @ApiOperation({ summary: 'Export tax report to PDF format' })
  @ApiResponse({
    status: 200,
    description: 'Tax report exported successfully as PDF',
    headers: {
      'Content-Type': { description: 'application/pdf' },
      'Content-Disposition': { description: 'attachment; filename="tax-report-{year}.pdf"' },
    },
  })
  async exportTaxReportToPDF(
    @Request() req: any,
    @Param('taxYear', ParseIntPipe) taxYear: number,
    @Res() res: Response,
  ): Promise<void> {
    return this.exportService.exportTaxReportToPDF(req.user.id, taxYear, res);
  }
}