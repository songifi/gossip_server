import { Injectable, Inject } from '@nestjs/common';
import { InfluxDB, Point } from '@influxdata/influxdb-client';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class AnalyticsService {
  private readonly bucket: string;
  private readonly org: string;

  constructor(
    @Inject('INFLUXDB_CLIENT') private readonly influxDB: InfluxDB,
    private readonly configService: ConfigService,
  ) {
    this.bucket = this.configService.get<string>('INFLUXDB_BUCKET') || 'metrics';
    this.org = this.configService.get<string>('INFLUXDB_ORG') || 'gossip_server';
  }

  private hashUserId(userId: string): string {
    const secret = this.configService.get<string>('HASH_SECRET') || 'default-secret';
    return crypto.createHmac('sha256', secret).update(userId).digest('hex');
  }

  private addField(point: Point, key: string, value: any) {
    if (typeof value === 'number') {
      if (Number.isInteger(value)) {
        point.intField(key, value);
      } else {
        point.floatField(key, value);
      }
    } else if (typeof value === 'string') {
      point.stringField(key, value);
    } else if (typeof value === 'boolean') {
      point.booleanField(key, value);
    } else {
      point.stringField(key, String(value));
    }
  }

  async trackEvent(userId: string, eventName: string, properties?: Record<string, any>) {
    const hashedUserId = this.hashUserId(userId);
    const writeApi = this.influxDB.getWriteApi(this.org, this.bucket);
    const point = new Point('user_events')
      .tag('userId', hashedUserId)
      .tag('eventName', eventName);
    if (properties) {
      Object.entries(properties).forEach(([key, value]) => this.addField(point, key, value));
    }
    writeApi.writePoint(point);
    await writeApi.close().catch((err) => console.error('Analytics write error:', err));
  }

  async recordMessageSent(senderId: string) {
    const hashedSenderId = this.hashUserId(senderId);
    const writeApi = this.influxDB.getWriteApi(this.org, this.bucket);
    const point = new Point('messages').tag('senderId', hashedSenderId).intField('count', 1);
    writeApi.writePoint(point);
    await writeApi.close().catch((err) => console.error('Analytics write error:', err));
  }

  async getMessageCountLastHour(): Promise<number> {
    const queryApi = this.influxDB.getQueryApi(this.org);
    const fluxQuery = `
      from(bucket: "${this.bucket}")
        |> range(start: -1h)
        |> filter(fn: (r) => r._measurement == "messages")
        |> count()
        |> yield(name: "count")
    `;
    const result = await queryApi.collectRows<{ _value: number }>(fluxQuery);
    return result.length > 0 ? result[0]._value : 0;
  }

  async getDailyActiveUsers(): Promise<number> {
    const queryApi = this.influxDB.getQueryApi(this.org);
    const fluxQuery = `
      from(bucket: "${this.bucket}")
        |> range(start: -24h)
        |> filter(fn: (r) => r._measurement == "user_events")
        |> group(columns: ["userId"])
        |> count()
        |> group()
        |> count()
        |> yield(name: "dau")
    `;
    const result = await queryApi.collectRows<{ _value: number }>(fluxQuery);
    return result.length > 0 ? result[0]._value : 0;
  }

  async getGroupEngagement(groupId: string, start: string = '-30d'): Promise<number> {
    const queryApi = this.influxDB.getQueryApi(this.org);
    const fluxQuery = `
      from(bucket: "${this.bucket}")
        |> range(start: ${start})
        |> filter(fn: (r) => r._measurement == "user_events")
        |> filter(fn: (r) => r.groupId == "${groupId}")
        |> count()
        |> yield(name: "group_engagement")
    `;
    const result = await queryApi.collectRows<{ _value: number }>(fluxQuery);
    return result.length > 0 ? result[0]._value : 0;
  }

  async getTrendAnalysis(metric: string, start: string = '-30d'): Promise<number[]> {
    const queryApi = this.influxDB.getQueryApi(this.org);
    const fluxQuery = `
      from(bucket: "${this.bucket}")
        |> range(start: ${start})
        |> filter(fn: (r) => r._measurement == "${metric}")
        |> aggregateWindow(every: 1d, fn: count)
        |> yield(name: "trend")
    `;
    const result = await queryApi.collectRows<{ _value: number }>(fluxQuery);
    return result.map(row => row._value);
  }
}