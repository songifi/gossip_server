import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AnalyticsModule } from './analytics/analytics.module';
import { ThreadModule } from './threads/thread.module';
// import { XPModule } from './xp/xp.module'; // Uncomment if implemented
// import { AchievementModule } from './achievement/achievement.module';
// import { LeaderboardModule } from './leaderboard/leaderboard.module';
// import { RewardModule } from './reward/reward.module';

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
