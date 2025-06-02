import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as zlib from 'zlib';
import * as PDFDocument from 'pdfkit';
import { Message, BackupJob, BackupConfig, BackupStatus, BackupType } from './entities';

interface CreateBackupOptions {
  userId: string;
  format: 'json' | 'csv' | 'pdf';
  includeMetadata?: boolean;
  dateRange?: { from: Date; to: Date };
  channels?: string[];
  encrypted?: boolean;
  compression?: boolean;
  encryptionKey?: string;
  type?: BackupType;
}

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);
  private readonly backupDir = process.env.BACKUP_DIR || './backups';

  constructor(
    @InjectRepository(Message)
    private messageRepo: Repository<Message>,
    @InjectRepository(BackupJob)
    private backupJobRepo: Repository<BackupJob>,
    @InjectRepository(BackupConfig)
    private backupConfigRepo: Repository<BackupConfig>,
  ) {
    this.ensureBackupDirectory();
  }

  private async ensureBackupDirectory() {
    try {
      await fs.mkdir(this.backupDir, { recursive: true });
    } catch (error) {
      this.logger.error('Failed to create backup directory', error);
    }
  }

  async createBackup(options: CreateBackupOptions): Promise<string> {
    const job = this.backupJobRepo.create({
      userId: options.userId,
      type: options.type || BackupType.FULL,
      status: BackupStatus.PENDING,
      filePath: '',
      checksum: '',
      fileSize: 0,
      messageCount: 0,
      config: {
        format: options.format,
        includeMetadata: options.includeMetadata || false,
        dateRange: options.dateRange,
        channels: options.channels,
        encrypted: options.encrypted || false,
        compression: options.compression || false,
      },
    });

    const savedJob = await this.backupJobRepo.save(job);

    // Process backup asynchronously
    this.processBackup(savedJob.id, options).catch(error => {
      this.logger.error(`Backup job ${savedJob.id} failed`, error);
    });

    return savedJob.id;
  }

  private async processBackup(jobId: string, options: CreateBackupOptions) {
    const job = await this.backupJobRepo.findOne({ where: { id: jobId } });
    if (!job) return;

    try {
      await this.backupJobRepo.update(jobId, { status: BackupStatus.RUNNING });

      // Get messages based on criteria
      const messages = await this.getMessagesForBackup(options);
      
      // Generate filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `backup_${options.userId}_${timestamp}.${options.format}`;
      const filePath = path.join(this.backupDir, filename);

      // Generate backup content
      let content: Buffer;
      switch (options.format) {
        case 'json':
          content = await this.generateJsonBackup(messages, options.includeMetadata);
          break;
        case 'csv':
          content = await this.generateCsvBackup(messages, options.includeMetadata);
          break;
        case 'pdf':
          content = await this.generatePdfBackup(messages, options.includeMetadata);
          break;
      }

      // Apply compression if requested
      if (options.compression) {
        content = zlib.gzipSync(content);
      }

      // Apply encryption if requested
      if (options.encrypted && options.encryptionKey) {
        content = this.encryptData(content, options.encryptionKey);
      }

      // Save to file
      await fs.writeFile(filePath, content);

      // Calculate checksum and file size
      const checksum = this.calculateChecksum(content);
      const fileSize = content.length;

      // Update job
      await this.backupJobRepo.update(jobId, {
        status: BackupStatus.COMPLETED,
        filePath,
        checksum,
        fileSize,
        messageCount: messages.length,
        completedAt: new Date(),
      });

      this.logger.log(`Backup job ${jobId} completed successfully`);
    } catch (error) {
      await this.backupJobRepo.update(jobId, {
        status: BackupStatus.FAILED,
        errorMessage: error.message,
      });
      this.logger.error(`Backup job ${jobId} failed`, error);
    }
  }

  private async getMessagesForBackup(options: CreateBackupOptions): Promise<Message[]> {
    const queryBuilder = this.messageRepo.createQueryBuilder('message')
      .where('message.userId = :userId', { userId: options.userId })
      .andWhere('message.isDeleted = false');

    // Apply date range filter
    if (options.dateRange) {
      queryBuilder.andWhere('message.createdAt BETWEEN :from AND :to', {
        from: options.dateRange.from,
        to: options.dateRange.to,
      });
    }

    // Apply channel filter
    if (options.channels && options.channels.length > 0) {
      queryBuilder.andWhere('message.channelId IN (:...channels)', {
        channels: options.channels,
      });
    }

    // For incremental backups, get only messages after last backup
    if (options.type === BackupType.INCREMENTAL) {
      const lastBackup = await this.backupJobRepo.findOne({
        where: { userId: options.userId, status: BackupStatus.COMPLETED },
        order: { completedAt: 'DESC' },
      });

      if (lastBackup) {
        queryBuilder.andWhere('message.createdAt > :lastBackupDate', {
          lastBackupDate: lastBackup.completedAt,
        });
      }
    }

    return queryBuilder.orderBy('message.createdAt', 'ASC').getMany();
  }

  private async generateJsonBackup(messages: Message[], includeMetadata: boolean): Promise<Buffer> {
    const data = messages.map(msg => ({
      id: msg.id,
      content: msg.content,
      channelId: msg.channelId,
      threadId: msg.threadId,
      createdAt: msg.createdAt,
      updatedAt: msg.updatedAt,
      ...(includeMetadata && { metadata: msg.metadata }),
    }));

    return Buffer.from(JSON.stringify(data, null, 2));
  }

  private async generateCsvBackup(messages: Message[], includeMetadata: boolean): Promise<Buffer> {
    const headers = ['id', 'content', 'channelId', 'threadId', 'createdAt', 'updatedAt'];
    if (includeMetadata) headers.push('metadata');

    const csvRows = [headers.join(',')];

    for (const msg of messages) {
      const row = [
        msg.id,
        `"${msg.content.replace(/"/g, '""')}"`,
        msg.channelId || '',
        msg.threadId || '',
        msg.createdAt.toISOString(),
        msg.updatedAt.toISOString(),
      ];

      if (includeMetadata) {
        row.push(`"${JSON.stringify(msg.metadata || {}).replace(/"/g, '""')}"`);
      }

      csvRows.push(row.join(','));
    }

    return Buffer.from(csvRows.join('\n'));
  }

  private async generatePdfBackup(messages: Message[], includeMetadata: boolean): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument();
      const chunks: Buffer[] = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // PDF Header
      doc.fontSize(16).text('Message Backup Report', { align: 'center' });
      doc.fontSize(12).text(`Generated: ${new Date().toISOString()}`, { align: 'center' });
      doc.text(`Total Messages: ${messages.length}`, { align: 'center' });
      doc.moveDown(2);

      // Messages
      messages.forEach((msg, index) => {
        doc.fontSize(10);
        doc.text(`${index + 1}. [${msg.createdAt.toISOString()}]`);
        doc.text(`Channel: ${msg.channelId || 'N/A'}`);
        doc.text(`Content: ${msg.content}`);
        
        if (includeMetadata && msg.metadata) {
          doc.text(`Metadata: ${JSON.stringify(msg.metadata)}`);
        }
        
        doc.moveDown(1);

        // Add new page every 20 messages
        if ((index + 1) % 20 === 0 && index < messages.length - 1) {
          doc.addPage();
        }
      });

      doc.end();
    });
  }

  private encryptData(data: Buffer, key: string): Buffer {
    const algorithm = 'aes-256-cbc';
    const keyBuffer = crypto.scryptSync(key, 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(algorithm, keyBuffer);
    
    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    return Buffer.concat([iv, encrypted]);
  }

  private decryptData(encryptedData: Buffer, key: string): Buffer {
    const algorithm = 'aes-256-cbc';
    const keyBuffer = crypto.scryptSync(key, 'salt', 32);
    const iv = encryptedData.slice(0, 16);
    const encrypted = encryptedData.slice(16);
    
    const decipher = crypto.createDecipher(algorithm, keyBuffer);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  }

  private calculateChecksum(data: Buffer): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  async verifyBackupIntegrity(jobId: string): Promise<boolean> {
    const job = await this.backupJobRepo.findOne({ where: { id: jobId } });
    if (!job || job.status !== BackupStatus.COMPLETED) {
      return false;
    }

    try {
      const fileData = await fs.readFile(job.filePath);
      const calculatedChecksum = this.calculateChecksum(fileData);
      return calculatedChecksum === job.checksum;
    } catch (error) {
      this.logger.error(`Failed to verify backup ${jobId}`, error);
      return false;
    }
  }

  async restoreFromBackup(jobId: string, encryptionKey?: string): Promise<Message[]> {
    const job = await this.backupJobRepo.findOne({ where: { id: jobId } });
    if (!job || job.status !== BackupStatus.COMPLETED) {
      throw new Error('Backup job not found or not completed');
    }

    // Verify integrity first
    const isValid = await this.verifyBackupIntegrity(jobId);
    if (!isValid) {
      throw new Error('Backup integrity verification failed');
    }

    let fileData = await fs.readFile(job.filePath);

    // Decrypt if necessary
    if (job.config.encrypted && encryptionKey) {
      fileData = this.decryptData(fileData, encryptionKey);
    }

    // Decompress if necessary
    if (job.config.compression) {
      fileData = zlib.gunzipSync(fileData);
    }

    // Parse based on format
    let messages: Message[];
    switch (job.config.format) {
      case 'json':
        messages = JSON.parse(fileData.toString());
        break;
      case 'csv':
        messages = this.parseCsvBackup(fileData.toString());
        break;
      default:
        throw new Error(`Restore not supported for format: ${job.config.format}`);
    }

    return messages;
  }

  private parseCsvBackup(csvData: string): Message[] {
    const lines = csvData.split('\n');
    const headers = lines[0].split(',');
    const messages: Message[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCsvLine(lines[i]);
      if (values.length === headers.length) {
        const message = new Message();
        message.id = values[0];
        message.content = values[1].replace(/""/g, '"').slice(1, -1);
        message.channelId = values[2] || null;
        message.threadId = values[3] || null;
        message.createdAt = new Date(values[4]);
        message.updatedAt = new Date(values[5]);
        
        if (headers.includes('metadata') && values[6]) {
          message.metadata = JSON.parse(values[6].replace(/""/g, '"').slice(1, -1));
        }
        
        messages.push(message);
      }
    }

    return messages;
  }

  private parseCsvLine(line: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current);
        current = '';
        continue;
      }
      
      current += char;
    }
    
    values.push(current);
    return values;
  }

  @Cron(CronExpression.EVERY_HOUR)
  async processScheduledBackups() {
    const configs = await this.backupConfigRepo.find({
      where: { isActive: true },
    });

    for (const config of configs) {
      if (this.shouldRunBackup(config.schedule)) {
        await this.createBackup({
          userId: config.userId,
          format: config.options.format,
          includeMetadata: config.options.includeMetadata,
          dateRange: config.options.dateRange,
          channels: config.options.channels,
          encrypted: config.options.encrypted,
          compression: config.options.compression,
          type: BackupType.INCREMENTAL,
        });
      }
    }
  }

  private shouldRunBackup(schedule: string): boolean {
    // Simple cron evaluation - in production, use a proper cron library
    const now = new Date();
    const hour = now.getHours();
    
    // Example: "0 2 * * *" means daily at 2 AM
    if (schedule === '0 2 * * *' && hour === 2) {
      return true;
    }
    
    return false;
  }

  async getBackupJobs(userId: string): Promise<BackupJob[]> {
    return this.backupJobRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async createBackupConfig(config: Partial<BackupConfig>): Promise<BackupConfig> {
    const backupConfig = this.backupConfigRepo.create(config);
    return this.backupConfigRepo.save(backupConfig);
  }
}
