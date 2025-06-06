import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { MessageFilterService } from '../services/message-filter.service';
import { MessageQueryService } from '../services/message-query.service';
import { CreateMessageFilterDto, MessageQueryDto } from '../dto/message-filter.dto';

@ApiTags('Message Filters')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('message-filters')
export class MessageFilterController {
  constructor(
    private filterService: MessageFilterService,
    private queryService: MessageQueryService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new message filter' })
  async createFilter(@Request() req, @Body() createFilterDto: CreateMessageFilterDto) {
    return this.filterService.createFilter(req.user.id, createFilterDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get user filters' })
  async getUserFilters(@Request() req) {
    return this.filterService.getUserFilters(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get filter by ID' })
  async getFilter(@Request() req, @Param('id') id: string) {
    return this.filterService.getFilterById(id, req.user.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update filter' })
  async updateFilter(@Request() req, @Param('id') id: string, @Body() updateData: Partial<CreateMessageFilterDto>) {
    return this.filterService.updateFilter(id, req.user.id, updateData);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete filter' })
  async deleteFilter(@Request() req, @Param('id') id: string) {
    await this.filterService.deleteFilter(id, req.user.id);
    return { message: 'Filter deleted successfully' };
  }

  @Post(':id/share')
  @ApiOperation({ summary: 'Share filter with other users' })
  async shareFilter(@Request() req, @Param('id') id: string, @Body() body: { userIds: string[] }) {
    return this.filterService.shareFilter(id, req.user.id, body.userIds);
  }

  @Post(':id/apply')
  @ApiOperation({ summary: 'Apply filter to get messages' })
  async applyFilter(@Request() req, @Param('id') id: string) {
    return this.filterService.applyFilter(id, req.user.id);
  }
}
