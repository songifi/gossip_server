import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { InfluxDB } from '@influxdata/influxdb-client';
import { AnalyticsService } from './analytics.service';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'INFLUXDB_CLIENT',
      useFactory: (configService: ConfigService) => {
        const url = configService.get<string>('INFLUXDB_URL') || 'http://localhost:8086';
        const token = configService.get<string>('INFLUXDB_TOKEN');
        return new InfluxDB({ url, token });
      },
      inject: [ConfigService],
    },
    AnalyticsService,
  ],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
