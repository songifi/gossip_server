import { Controller, Post, Get, Put, Delete, Param, Body, Query, UseGuards, Req } from '@nestjs/common';
import { MessageSchedulerService } from '../services/message-scheduler.service';
import { CreateScheduledMessageDto, UpdateScheduledMessageDto, BatchScheduleDto } from '../dto';
// import { JwtAuthGuard } from '../guards/jwt-auth.guard'; // Uncomment if using auth

@Controller('scheduled-messages')
// @UseGuards(JwtAuthGuard) // Uncomment if using authentication
export class MessageSchedulerController {
  constructor(private readonly messageSchedulerService: MessageSchedulerService) {}

  @Post()
  async scheduleMessage(@Body() dto: CreateScheduledMessageDto, @Req() req: any) {
    const userId = req.user?.id || 'default-user'; // Replace with actual user extraction
    return this.messageSchedulerService.scheduleMessage(userId, dto);
  }

  @Post('batch')
  async batchScheduleMessages(@Body() dto: BatchScheduleDto, @Req() req: any) {
    const userId = req.user?.id || 'default-user';
    return this.messageSchedulerService.batchScheduleMessages(userId, dto);
  }

  @Get()
  async getScheduledMessages(@Query() filters: any, @Req() req: any) {
    const userId = req.user?.id || 'default-user';
    return this.messageSchedulerService.getScheduledMessages(userId, filters);
  }

  @Put(':id')
  async updateScheduledMessage(
    @Param('id') id: string,
    @Body() dto: UpdateScheduledMessageDto,
    @Req() req: any
  ) {
    const userId = req.user?.id || 'default-user';
    return this.messageSchedulerService.updateScheduledMessage(id, userId, dto);
  }

  @Delete(':id')
  async cancelScheduledMessage(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id || 'default-user';
    await this.messageSchedulerService.cancelScheduledMessage(id, userId);
    return { message: 'Scheduled message cancelled successfully' };
  }

  @Put(':id/pause')
  async pauseScheduledMessage(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id || 'default-user';
    await this.messageSchedulerService.pauseScheduledMessage(id, userId);
    return { message: 'Scheduled message paused successfully' };
  }

  @Put(':id/resume')
  async resumeScheduledMessage(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id || 'default-user';
    await this.messageSchedulerService.resumeScheduledMessage(id, userId);
    return { message: 'Scheduled message resumed successfully' };
  }
}
