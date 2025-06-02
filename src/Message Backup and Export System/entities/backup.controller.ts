import { Controller, Post, Get, Body, Param, Query, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { BackupService } from './backup.service';
import { BackupJob, BackupConfig } from './entities';

interface CreateBackupDto {
  userId: string;
  format: 'json' | 'csv' | 'pdf';
  includeMetadata?: boolean;
  dateRange?: { from: string; to: string };
  channels?: string[];
  encrypted?: boolean;
  compression?: boolean;
  encryptionKey?: string;
}

interface CreateConfigDto {
  userId: string;
  name: string;
  options: {
    format: 'json' | 'csv' | 'pdf';
    includeMetadata: boolean;
    dateRange?: { from: Date; to: Date };
    channels?: string[];
    encrypted: boolean;
    compression: boolean;
  };
  schedule?: string;
}

@Controller('backup')
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Post()
  async createBackup(@Body() dto: CreateBackupDto): Promise<{ jobId: string }> {
    const jobId = await this.backupService.createBackup({
      ...dto,
      dateRange: dto.dateRange ? {
        from: new Date(dto.dateRange.from),
        to: new Date(dto.dateRange.to)
      } : undefined,
    });

    return { jobId };
  }

  @Get('jobs/:userId')
  async getBackupJobs(@Param('userId') userId: string): Promise<BackupJob[]> {
    return this.backupService.getBackupJobs(userId);
  }

  @Get('download/:jobId')
  async downloadBackup(
    @Param('jobId') jobId: string,
    @Query('key') encryptionKey: string,
    @Res() res: Response,
  ) {
    try {
      // Implementation for downloading backup files
      res.status(HttpStatus.OK).json({ message: 'Download endpoint - implement file streaming' });
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: error.message });
    }
  }

  @Post('verify/:jobId')
  async verifyBackup(@Param('jobId') jobId: string): Promise<{ isValid: boolean }> {
    const isValid = await this.backupService.verifyBackupIntegrity(jobId);
    return { isValid };
  }

  @Post('restore/:jobId')
  async restoreBackup(
    @Param('jobId') jobId: string,
    @Body() body: { encryptionKey?: string },
  ) {
    const messages = await this.backupService.restoreFromBackup(jobId, body.encryptionKey);
    return { messageCount: messages.length, messages };
  }

  @Post('config')
  async createBackupConfig(@Body() dto: CreateConfigDto): Promise<BackupConfig> {
    return this.backupService.createBackupConfig(dto);
  }
}
