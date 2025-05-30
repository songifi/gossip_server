import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AnalyticsModule } from './analytics/analytics.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AnalyticsModule,
    // XPModule, // XP calculation algorithms
    // AchievementModule, // Achievement tracking system
    // LeaderboardModule, // Leaderboard ranking algorithms
    // RewardModule, // Reward distribution mechanisms
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
