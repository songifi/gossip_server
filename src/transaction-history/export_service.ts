// src/modules/export/export.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Response } from 'express';
import * as PDFDocument from 'pdfkit';
import { Transaction } from './entities/transaction.entity';
import { Portfolio } from './entities/portfolio.entity';
import { TaxEvent } from './entities/tax-event.entity';
import { TransactionService } from './transaction_service';
import { PortfolioService } from './portfolio_service';
import { TransactionFilterDto } from './dto/transaction_dtos';

@Injectable()
export class ExportService {
  constructor(
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @InjectRepository(Portfolio)
    private portfolioRepository: Repository<Portfolio>,
    @InjectRepository(TaxEvent)
    private taxEventRepository: Repository<TaxEvent>,
    private transactionService: TransactionService,
    private portfolioService: PortfolioService,
  ) {}

  async exportTransactionsToCSV(
    userId: string,
    filters: TransactionFilterDto,
    res: Response,
  ): Promise<void> {
    const { transactions } = await this.transactionService.findUserTransactions(userId, {
      ...filters,
      limit: 10000, // Export all matching transactions
    });

    const csvHeaders = [
      'Date',
      'Portfolio',
      'Asset',
      'Symbol',
      'Type',
      'Quantity',
      'Price',
      'Total Amount',
      'Fees',
      'Category',
      'Tags',
      'Notes',
    ];

    const csvRows = transactions.map(transaction => [
      this.formatDate(transaction.executedAt),
      transaction.portfolio?.name || '',
      transaction.assetType?.name || '',
      transaction.assetType?.symbol || '',
      transaction.type,
      transaction.quantity.toString(),
      transaction.price.toString(),
      transaction.totalAmount.toString(),
      transaction.fees?.toString() || '0',
      transaction.category?.name || '',
      transaction.tags?.map(tag => tag.name).join('; ') || '',
      this.sanitizeCSVField(transaction.notes || ''),
    ]);

    const csvContent = [csvHeaders, ...csvRows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="transactions.csv"');
    res.send(csvContent);
  }

  async exportPortfolioToCSV(
    userId: string,
    portfolioId: string,
    res: Response,
  ): Promise<void> {
    const holdings = await this.portfolioService.getPortfolioHoldings(portfolioId, userId);
    const profitLoss = await this.portfolioService.getPortfolioProfitLoss(portfolioId, userId);

    const csvHeaders = [
      'Asset',
      'Symbol',
      'Quantity',
      'Average Cost',
      'Current Price',
      'Total Value',
      'Unrealized P&L',
      'Unrealized P&L %',
      'Weight %',
    ];

    const totalValue = profitLoss.totalValue;

    const csvRows = holdings.map(holding => [
      holding.assetType?.name || '',
      holding.assetType?.symbol || '',
      holding.quantity.toString(),
      holding.averageCost.toString(),
      holding.currentPrice.toString(),
      holding.totalValue.toString(),
      holding.unrealizedPnl.toString(),
      holding.averageCost > 0 ? 
        ((holding.unrealizedPnl / (holding.quantity * holding.averageCost)) * 100).toFixed(2) : '0',
      totalValue > 0 ? ((holding.totalValue / totalValue) * 100).toFixed(2) : '0',
    ]);

    const csvContent = [csvHeaders, ...csvRows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="portfolio.csv"');
    res.send(csvContent);
  }

  async exportTaxReportToCSV(
    userId: string,
    taxYear: number,
    res: Response,
  ): Promise<void> {
    const taxEvents = await this.taxEventRepository.find({
      where: { userId, taxYear },
      relations: ['transaction', 'transaction.assetType'],
      order: { createdAt: 'ASC' },
    });

    const csvHeaders = [
      'Date',
      'Asset',
      'Symbol',
      'Event Type',
      'Quantity',
      'Sale Price',
      'Cost Basis',
      'Gain/Loss',
      'Holding Period (Days)',
      'Term',
    ];

    const csvRows = taxEvents.map(event => [
      this.formatDate(event.transaction.executedAt),
      event.transaction.assetType?.name || '',
      event.transaction.assetType?.symbol || '',
      event.eventType,
      event.transaction.quantity.toString(),
      event.amount.toString(),
      event.costBasis?.toString() || '0',
      event.gainLoss?.toString() || '0',
      event.holdingPeriod?.toString() || '0',
      (event.holdingPeriod && event.holdingPeriod > 365) ? 'Long-term' : 'Short-term',
    ]);

    const csvContent = [csvHeaders, ...csvRows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="tax-report-${taxYear}.csv"`);
    res.send(csvContent);
  }

  async exportTransactionsToPDF(
    userId: string,
    filters: TransactionFilterDto,
    res: Response,
  ): Promise<void> {
    const { transactions } = await this.transactionService.findUserTransactions(userId, {
      ...filters,
      limit: 1000, // Limit for PDF to avoid memory issues
    });

    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="transactions.pdf"');

    doc.pipe(res);

    // Header
    doc.fontSize(20).text('Transaction History Report', { align: 'center' });
    doc.moveDown();

    // Summary
    const summary = await this.transactionService.getTransactionSummary(
      userId,
      filters.portfolioId,
    );

    doc.fontSize(14).text('Summary:', { underline: true });
    doc.fontSize(12);
    doc.text(`Total Transactions: ${summary.totalTransactions}`);
    doc.text(`Buy Transactions: ${summary.buyTransactions}`);
    doc.text(`Sell Transactions: ${summary.sellTransactions}`);
    doc.text(`Total Volume: $${summary.totalVolume.toFixed(2)}`);
    doc.text(`Total Fees: $${summary.totalFees.toFixed(2)}`);
    doc.moveDown();

    // Transactions table
    doc.fontSize(14).text('Transactions:', { underline: true });
    doc.moveDown();

    const tableTop = doc.y;
    const itemHeight = 20;

    // Table headers
    doc.fontSize(10);
    this.drawTableHeader(doc, tableTop);

    let currentY = tableTop + itemHeight;

    transactions.forEach((transaction, index) => {
      if (currentY > 700) { // Start new page if needed
        doc.addPage();
        currentY = 50;
        this.drawTableHeader(doc, currentY);
        currentY += itemHeight;
      }

      this.drawTransactionRow(doc, transaction, currentY, index % 2 === 0);
      currentY += itemHeight;
    });

    doc.end();
  }

  async exportPortfolioToPDF(
    userId: string,
    portfolioId: string,
    res: Response,
  ): Promise<void> {
    const portfolio = await this.portfolioService.findById(portfolioId, userId);
    const profitLoss = await this.portfolioService.getPortfolioProfitLoss(portfolioId, userId);
    const allocation = await this.portfolioService.getPortfolioAllocation(portfolioId, userId);

    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="portfolio-${portfolio.name}.pdf"`);

    doc.pipe(res);

    // Header
    doc.fontSize(20).text(`Portfolio Report: ${portfolio.name}`, { align: 'center' });
    doc.moveDown();

    // Portfolio Summary
    doc.fontSize(14).text('Portfolio Summary:', { underline: true });
    doc.fontSize(12);
    doc.text(`Total Value: $${profitLoss.totalValue.toFixed(2)}`);
    doc.text(`Total Cost: $${profitLoss.totalCost.toFixed(2)}`);
    doc.text(`Total P&L: $${profitLoss.totalPnL.toFixed(2)}`);
    doc.text(`Total Return: ${profitLoss.totalReturnPercentage.toFixed(2)}%`);
    doc.text(`Realized P&L: $${profitLoss.realizedPnL.toFixed(2)}`);
    doc.text(`Unrealized P&L: $${profitLoss.unrealizedPnL.toFixed(2)}`);
    doc.moveDown();

    // Holdings table
    doc.fontSize(14).text('Portfolio Holdings:', { underline: true });
    doc.moveDown();

    const holdingsTableTop = doc.y;
    this.drawHoldingsTableHeader(doc, holdingsTableTop);

    let currentY = holdingsTableTop + 20;

    profitLoss.holdings.forEach((holding, index) => {
      if (currentY > 700) {
        doc.addPage();
        currentY = 50;
        this.drawHoldingsTableHeader(doc, currentY);
        currentY += 20;
      }

      this.drawHoldingRow(doc, holding, currentY, index % 2 === 0);
      currentY += 20;
    });

    // Asset allocation chart (simple text representation)
    doc.addPage();
    doc.fontSize(14).text('Asset Allocation:', { underline: true });
    doc.moveDown();

    allocation.allocation.forEach(asset => {
      doc.fontSize(10);
      doc.text(`${asset.assetType.name} (${asset.assetType.symbol}): ${asset.percentage.toFixed(2)}% - $${asset.value.toFixed(2)}`);
    });

    doc.end();
  }

  async exportTaxReportToPDF(
    userId: string,
    taxYear: number,
    res: Response,
  ): Promise<void> {
    const taxEvents = await this.taxEventRepository.find({
      where: { userId, taxYear },
      relations: ['transaction', 'transaction.assetType'],
      order: { createdAt: 'ASC' },
    });

    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="tax-report-${taxYear}.pdf"`);

    doc.pipe(res);

    // Header
    doc.fontSize(20).text(`Tax Report - ${taxYear}`, { align: 'center' });
    doc.moveDown();

    // Summary
    const totalGains = taxEvents.filter(e => e.gainLoss > 0).reduce((sum, e) => sum + e.gainLoss, 0);
    const totalLosses = taxEvents.filter(e => e.gainLoss < 0).reduce((sum, e) => sum + Math.abs(e.gainLoss), 0);
    const netGainLoss = totalGains - totalLosses;

    doc.fontSize(14).text('Tax Summary:', { underline: true });
    doc.fontSize(12);
    doc.text(`Total Capital Gains: $${totalGains.toFixed(2)}`);
    doc.text(`Total Capital Losses: $${totalLosses.toFixed(2)}`);
    doc.text(`Net Capital Gain/Loss: $${netGainLoss.toFixed(2)}`);
    doc.text(`Total Tax Events: ${taxEvents.length}`);
    doc.moveDown();

    // Tax events table
    doc.fontSize(14).text('Tax Events:', { underline: true });
    doc.moveDown();

    const tableTop = doc.y;
    this.drawTaxTableHeader(doc, tableTop);

    let currentY = tableTop + 20;

    taxEvents.forEach((event, index) => {
      if (currentY > 700) {
        doc.addPage();
        currentY = 50;
        this.drawTaxTableHeader(doc, currentY);
        currentY += 20;
      }

      this.drawTaxEventRow(doc, event, currentY, index % 2 === 0);
      currentY += 20;
    });

    doc.end();
  }

  private drawTableHeader(doc: PDFKit.PDFDocument, y: number): void {
    doc.fontSize(8);
    doc.text('Date', 50, y, { width: 60 });
    doc.text('Asset', 110, y, { width: 80 });
    doc.text('Type', 190, y, { width: 50 });
    doc.text('Quantity', 240, y, { width: 60 });
    doc.text('Price', 300, y, { width: 60 });
    doc.text('Total', 360, y, { width: 60 });
    doc.text('Fees', 420, y, { width: 50 });
    doc.text('Category', 470, y, { width: 80 });
  }

  private drawTransactionRow(doc: PDFKit.PDFDocument, transaction: any, y: number, isEven: boolean): void {
    if (isEven) {
      doc.rect(50, y - 2, 500, 18).fillAndStroke('#f5f5f5', '#f5f5f5');
    }

    doc.fillColor('black').fontSize(8);
    doc.text(this.formatDate(transaction.executedAt), 50, y, { width: 60 });
    doc.text(transaction.assetType?.symbol || '', 110, y, { width: 80 });
    doc.text(transaction.type, 190, y, { width: 50 });
    doc.text(transaction.quantity.toString(), 240, y, { width: 60 });
    doc.text(`$${transaction.price.toFixed(2)}`, 300, y, { width: 60 });
    doc.text(`$${transaction.totalAmount.toFixed(2)}`, 360, y, { width: 60 });
    doc.text(`$${(transaction.fees || 0).toFixed(2)}`, 420, y, { width: 50 });
    doc.text(transaction.category?.name || '', 470, y, { width: 80 });
  }

  private drawHoldingsTableHeader(doc: PDFKit.PDFDocument, y: number): void {
    doc.fontSize(8);
    doc.text('Asset', 50, y, { width: 80 });
    doc.text('Quantity', 130, y, { width: 60 });
    doc.text('Avg Cost', 190, y, { width: 60 });
    doc.text('Current', 250, y, { width: 60 });
    doc.text('Value', 310, y, { width: 60 });
    doc.text('P&L', 370, y, { width: 60 });
    doc.text('P&L %', 430, y, { width: 60 });
    doc.text('Weight %', 490, y, { width: 60 });
  }

  private drawHoldingRow(doc: PDFKit.PDFDocument, holding: any, y: number, isEven: boolean): void {
    if (isEven) {
      doc.rect(50, y - 2, 500, 18).fillAndStroke('#f5f5f5', '#f5f5f5');
    }

    doc.fillColor('black').fontSize(8);
    doc.text(holding.assetType?.symbol || '', 50, y, { width: 80 });
    doc.text(holding.quantity.toString(), 130, y, { width: 60 });
    doc.text(`$${holding.averageCost.toFixed(2)}`, 190, y, { width: 60 });
    doc.text(`$${holding.currentPrice.toFixed(2)}`, 250, y, { width: 60 });
    doc.text(`$${holding.totalValue.toFixed(2)}`, 310, y, { width: 60 });
    doc.text(`$${holding.unrealizedPnL.toFixed(2)}`, 370, y, { width: 60 });
    doc.text(`${holding.unrealizedPnLPercentage.toFixed(2)}%`, 430, y, { width: 60 });
  }

  private drawTaxTableHeader(doc: PDFKit.PDFDocument, y: number): void {
    doc.fontSize(8);
    doc.text('Date', 50, y, { width: 60 });
    doc.text('Asset', 110, y, { width: 80 });
    doc.text('Type', 190, y, { width: 60 });
    doc.text('Amount', 250, y, { width: 60 });
    doc.text('Cost Basis', 310, y, { width: 60 });
    doc.text('Gain/Loss', 370, y, { width: 60 });
    doc.text('Term', 430, y, { width: 60 });
  }

  private drawTaxEventRow(doc: PDFKit.PDFDocument, event: any, y: number, isEven: boolean): void {
    if (isEven) {
      doc.rect(50, y - 2, 500, 18).fillAndStroke('#f5f5f5', '#f5f5f5');
    }

    doc.fillColor('black').fontSize(8);
    doc.text(this.formatDate(event.transaction.executedAt), 50, y, { width: 60 });
    doc.text(event.transaction.assetType?.symbol || '', 110, y, { width: 80 });
    doc.text(event.eventType, 190, y, { width: 60 });
    doc.text(`$${event.amount.toFixed(2)}`, 250, y, { width: 60 });
    doc.text(`$${(event.costBasis || 0).toFixed(2)}`, 310, y, { width: 60 });
    doc.text(`$${(event.gainLoss || 0).toFixed(2)}`, 370, y, { width: 60 });
    doc.text((event.holdingPeriod && event.holdingPeriod > 365) ? 'Long' : 'Short', 430, y, { width: 60 });
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private sanitizeCSVField(value: string): string {
    return value.replace(/"/g, '""').replace(/\n/g, ' ').replace(/\r/g, '');
  }
}