import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AnalyticsModule } from './analytics/analytics.module';
import { ThreadModule } from './threads/thread.module';
import { FileModule } from './files/file.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
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
    // XPModule,
    // AchievementModule,
    // LeaderboardModule,
    // RewardModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
