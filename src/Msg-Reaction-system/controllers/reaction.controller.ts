import { Controller, Post, Delete, Get, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ReactionService } from '../services/reaction.service';
import { AddReactionDto } from '../dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@Controller('reactions')
@UseGuards(JwtAuthGuard)
export class ReactionController {
  constructor(private readonly reactionService: ReactionService) {}

  @Post()
  async addReaction(@Req() req: any, @Body() addReactionDto: AddReactionDto) {
    return this.reactionService.addReaction(req.user.id, addReactionDto);
  }

  @Delete(':messageId/:reactionIdentifier')
  async removeReaction(
    @Req() req: any,
    @Param('messageId') messageId: string,
    @Param('reactionIdentifier') reactionIdentifier: string
  ) {
    return this.reactionService.removeReaction(req.user.id, messageId, reactionIdentifier);
  }

  @Get('message/:messageId')
  async getMessageReactions(@Param('messageId') messageId: string) {
    return this.reactionService.getMessageReactions(messageId);
  }

  @Get('user')
  async getUserReactions(@Req() req: any, @Query('messageId') messageId?: string) {
    return this.reactionService.getUserReactions(req.user.id, messageId);
  }

  @Get('analytics')
  async getReactionAnalytics(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string
  ) {
    return this.reactionService.getReactionAnalytics(
      new Date(startDate),
      new Date(endDate)
    );
  }

  @Get('popular')
  async getMostUsedReactions(@Query('limit') limit?: number) {
    return this.reactionService.getMostUsedReactions(limit ? parseInt(limit) : 10);
  }
}

