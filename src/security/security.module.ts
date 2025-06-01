// src/security/security.module.ts
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { RedisThrottlerStorage } from 'nestjs-throttler-storage-redis';
import { CustomThrottlerGuard } from './guards/custom-throttler.guard';
import { SecurityService } from './security.service';
import Redis from 'ioredis';

const redisClient = new Redis({ host: 'localhost', port: 6379 });

@Module({
  imports: [
    ThrottlerModule.forRoot({
      ttl: 60,
      limit: 100,
      storage: new RedisThrottlerStorage(redisClient),
    }),
  ],
  providers: [
    SecurityService,
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
    },
  ],
})
export class SecurityModule {}