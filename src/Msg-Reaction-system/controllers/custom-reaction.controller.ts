import { Controller, Post, Get, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { CustomReactionService } from '../services/custom-reaction.service';
import { CreateCustomReactionDto } from '../dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@Controller('custom-reactions')
@UseGuards(JwtAuthGuard)
export class CustomReactionController {
  constructor(private readonly customReactionService: CustomReactionService) {}

  @Post()
  async createCustomReaction(@Req() req: any, @Body() createDto: CreateCustomReactionDto) {
    return this.customReactionService.createCustomReaction(req.user.id, createDto);
  }

  @Get('my')
  async getUserCustomReactions(@Req() req: any) {
    return this.customReactionService.getUserCustomReactions(req.user.id);
  }

  @Get('global')
  async getGlobalCustomReactions() {
    return this.customReactionService.getGlobalCustomReactions();
  }

  @Delete(':id')
  async deleteCustomReaction(@Req() req: any, @Param('id') id: string) {
    return this.customReactionService.deleteCustomReaction(req.user.id, id);
  }
}
