import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  Query, 
  UseGuards,
  Request
} from '@nestjs/common';
import { ThreadService } from '../services/thread.service';
import { ThreadNotificationService } from '../services/thread-notification.service';
import { CreateThreadDto } from '../dto/create-thread.dto';
import { UpdateThreadDto } from '../dto/create-thread.dto';
import { ThreadSearchDto } from '../dto/create-thread.dto';
import { Thread, ThreadSummary, ThreadSearchResult } from '../interfaces/thread.interface';

@Controller('threads')
export class ThreadController {
  constructor(
    private readonly threadService: ThreadService,
    private readonly notificationService: ThreadNotificationService,
  ) {}

  @Post()
  async createThread(
    @Body() createThreadDto: CreateThreadDto,
    @Request() req: any
  ): Promise<Thread> {
    return this.threadService.createThread(createThreadDto, req.user.id);
  }

  @Get(':id')
  async getThread(
    @Param('id') id: string,
    @Request() req: any
  ): Promise<Thread> {
    return this.threadService.getThread(id, req.user.id);
  }

  @Get(':id/hierarchy')
  async getThreadHierarchy(
    @Param('id') id: string,
    @Request() req: any
  ): Promise<Thread> {
    return this.threadService.getThreadHierarchy(id, req.user.id);
  }

  @Put(':id')
  async updateThread(
    @Param('id') id: string,
    @Body() updateThreadDto: UpdateThreadDto,
    @Request() req: any
  ): Promise<Thread> {
    return this.threadService.updateThread(id, updateThreadDto, req.user.id);
  }

  @Delete(':id/archive')
  async archiveThread(
    @Param('id') id: string,
    @Request() req: any
  ): Promise<void> {
    return this.threadService.archiveThread(id, req.user.id);
  }

  @Put(':id/collapse')
  async toggleCollapse(
    @Param('id') id: string,
    @Request() req: any
  ): Promise<Thread> {
    return this.threadService.toggleThreadCollapse(id, req.user.id);
  }

  @Post('search')
  async searchThreads(
    @Body() searchDto: ThreadSearchDto,
    @Request() req: any
  ): Promise<ThreadSearchResult[]> {
    return this.threadService.searchThreads(searchDto, req.user.id);
  }

  @Post(':id/participants')
  async addParticipant(
    @Param('id') id: string,
    @Body('participantId') participantId: string
  ): Promise<void> {
    return this.threadService.addParticipant(id, participantId);
  }

  @Delete(':id/participants/:participantId')
  async removeParticipant(
    @Param('id') id: string,
    @Param('participantId') participantId: string
  ): Promise<void> {
    return this.threadService.removeParticipant(id, participantId);
  }

  @Put(':id/read')
  async markAsRead(
    @Param('id') id: string,
    @Request() req: any
  ): Promise<void> {
    return this.threadService.markAsRead(id, req.user.id);
  }

  @Get(':id/summary')
  async getThreadSummary(
    @Param('id') id: string
  ): Promise<ThreadSummary> {
    return this.threadService.getThreadSummary(id);
  }

  @Post(':id/share')
  async shareThread(
    @Param('id') id: string,
    @Body('userIds') userIds: string[]
  ): Promise<void> {
    return this.threadService.shareThread(id, userIds);
  }

  // Notification settings endpoints
  @Get(':id/notifications')
  async getNotificationSettings(
    @Param('id') threadId: string,
    @Request() req: any
  ) {
    return this.notificationService.getNotificationSettings(threadId, req.user.id);
  }

  @Put(':id/notifications')
  async updateNotificationSettings(
    @Param('id') threadId: string,
    @Body() updates: any,
    @Request() req: any
  ) {
    return this.notificationService.updateNotificationSettings(threadId, req.user.id, updates);
  }
}

