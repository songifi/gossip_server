import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AnalyticsModule } from './analytics/analytics.module';
import { ThreadModule } from './threads/thread.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AnalyticsModule,
    ThreadModule,
    // XPModule,
    // AchievementModule,
    // LeaderboardModule,
    // RewardModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
