import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { AnalyticsService } from './analytics/analytics.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('test-event')
  async testEvent() {
    await this.analyticsService.trackEvent('test-user-1', 'test_event', { value: 42 });
    return { message: 'Event tracked' };
  }

  @Get('test-message')
  async testMessage() {
    await this.analyticsService.recordMessageSent('test-user-1');
    return { message: 'Message tracked' };
  }
}
