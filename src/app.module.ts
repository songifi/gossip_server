import { Module } from '@nestjs/common';

import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EventModule } from './event.module';
import { MessagesModule } from './messages/messages.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { ThreadModule } from './threads/thread.module';

import { FileModule } from './files/file.module';

import { SyncModule } from './sync/sync.module';


@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    EventModule,
    // XPModule, // XP calculation algorithms
    // AchievementModule, // Achievement tracking system
    // LeaderboardModule, // Leaderboard ranking algorithms
    // RewardModule, // Reward distribution mechanisms

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',

        host: configService.get('DATABASE_HOST', 'localhost'),
        port: configService.get('DATABASE_PORT', 5432),
        username: configService.get('DATABASE_USERNAME', 'postgres'),
        password: configService.get('DATABASE_PASSWORD', 'postgres'),
        database: configService.get('DATABASE_NAME', 'gossip_server'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: true, // Only use in development
      }),
      inject: [ConfigService],
    }),
    AnalyticsModule,
    ThreadModule,
    FileModule,

        host: configService.get('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 5432),
        username: configService.get('DB_USERNAME', 'postgres'),
        password: configService.get('DB_PASSWORD', 'postgres'),
        database: configService.get('DB_DATABASE', 'gossip'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: configService.get('NODE_ENV') !== 'production',
      }),
      inject: [ConfigService],
    }),
    MessagesModule,
    AnalyticsModule,
    ThreadModule,
    TransactionHistoryModule,
    SyncModule,
    // XPModule, // XP calculation algorithms
    // AchievementModule, // Achievement tracking system
    // LeaderboardModule, // Leaderboard ranking algorithms
    // RewardModule, // Reward distribution mechanisms

    // XPModule,
    // AchievementModule,
    // LeaderboardModule,
    // RewardModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
