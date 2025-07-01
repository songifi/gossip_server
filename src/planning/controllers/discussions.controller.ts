import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { DiscussionService } from '../services/discussion.service';
import { CreateDiscussionDto } from '../dto/create-discussion.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('events/discussions')
@UseGuards(JwtAuthGuard)
export class DiscussionsController {
  constructor(private readonly discussionService: DiscussionService) {}

  @Post()
  create(@Body() createDiscussionDto: CreateDiscussionDto, @Request() req) {
    return this.discussionService.create(createDiscussionDto, req.user);
  }

  @Get('event/:eventId')
  findByEvent(@Param('eventId') eventId: string) {
    return this.discussionService.findByEvent(eventId);
  }
}