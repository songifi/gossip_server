import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EventModule } from './event.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { ThreadModule } from './threads/thread.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventModule,
    // XPModule, // XP calculation algorithms
    // AchievementModule, // Achievement tracking system
    // LeaderboardModule, // Leaderboard ranking algorithms
    // RewardModule, // Reward distribution mechanisms
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
