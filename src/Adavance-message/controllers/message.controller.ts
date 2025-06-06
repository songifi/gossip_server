import { Controller, Get, Post, Query, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { MessageQueryService } from '../services/message-query.service';
import { MessageManagementService } from '../services/message-management.service';
import { MessageQueryDto, BulkOperationDto } from '../dto/message-filter.dto';

@ApiTags('Messages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('messages')
export class MessageController {
  constructor(
    private queryService: MessageQueryService,
    private managementService: MessageManagementService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get messages with advanced filtering' })
  async getMessages(@Request() req, @Query() queryDto: MessageQueryDto) {
    return this.queryService.findMessages(req.user.id, queryDto);
  }

  @Post('bulk-operation')
  @ApiOperation({ summary: 'Perform bulk operations on messages' })
  async bulkOperation(@Request() req, @Body() bulkOpDto: BulkOperationDto) {
    return this.managementService.bulkOperation(req.user.id, bulkOpDto);
  }

  @Post('archive-old')
  @ApiOperation({ summary: 'Archive old messages' })
  async archiveOldMessages(@Request() req, @Body() body: { olderThanDays: number }) {
    const count = await this.managementService.archiveOldMessages(req.user.id, body.olderThanDays);
    return { message: `Archived ${count} messages` };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get message statistics' })
  async getMessageStats(@Request() req) {
    return this.managementService.getMessageStats(req.user.id);
  }
}

