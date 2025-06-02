import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  ValidationPipe
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TreasuryService } from './treasury.service';
import {
  CreateTreasuryDto,
  CreateProposalDto,
  CastVoteDto,
  CreateBudgetAllocationDto
} from './treasury.dto';

@ApiTags('Treasury')
@Controller('treasury')
export class TreasuryController {
  constructor(private readonly treasuryService: TreasuryService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new DAO treasury' })
  @ApiResponse({ status: 201, description: 'Treasury created successfully' })
  async createTreasury(@Body(ValidationPipe) createTreasuryDto: CreateTreasuryDto) {
    return this.treasuryService.createTreasury(createTreasuryDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get treasury by ID' })
  async getTreasury(@Param('id') id: string) {
    return this.treasuryService.getTreasury(id);
  }

  @Get('group/:groupChatId')
  @ApiOperation({ summary: 'Get treasury by group chat ID' })
  async getTreasuryByGroupChat(@Param('groupChatId') groupChatId: string) {
    return this.treasuryService.getTreasuryByGroupChat(groupChatId);
  }

  @Post('proposals')
  @ApiOperation({ summary: 'Create a spending proposal' })
  async createProposal(@Body(ValidationPipe) createProposalDto: CreateProposalDto) {
    return this.treasuryService.createProposal(createProposalDto);
  }

  @Post('proposals/:id/vote')
  @ApiOperation({ summary: 'Cast vote on proposal' })
  async castVote(@Body(ValidationPipe) castVoteDto: CastVoteDto) {
    return this.treasuryService.castVote(castVoteDto);
  }

  @Put('proposals/:id/execute')
  @ApiOperation({ summary: 'Execute approved proposal' })
  async executeProposal(
    @Param('id') proposalId: string,
    @Body('executorAddress') executorAddress: string
  ) {
    return this.treasuryService.executeProposal(proposalId, executorAddress);
  }

  @Post('budget')
  @ApiOperation({ summary: 'Create budget allocation' })
  async createBudgetAllocation(@Body(ValidationPipe) createBudgetDto: CreateBudgetAllocationDto) {
    return this.treasuryService.createBudgetAllocation(createBudgetDto);
  }

  @Get(':id/analytics')
  @ApiOperation({ summary: 'Get treasury analytics and reporting' })
  async getTreasuryAnalytics(
    @Param('id') treasuryId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    
    return this.treasuryService.getTreasuryAnalytics(treasuryId, start, end);
  }
}
