import { Controller, Get } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('messages/last-hour')
  async getMessagesLastHour() {
    return { messagesLastHour: await this.analyticsService.getMessageCountLastHour() };
  }

  @Get('daily-active-users')
  async getDailyActiveUsers() {
    return { dailyActiveUsers: await this.analyticsService.getDailyActiveUsers() };
  }
}
