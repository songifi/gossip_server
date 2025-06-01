import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThreadService } from './services/thread.service';
import { ThreadSummaryService } from './services/thread-summary.service';
import { ThreadNotificationService } from './services/thread-notification.service';
import { ThreadController } from './controllers/thread.controller';
import { ThreadEntity, ThreadNotificationEntity } from './entities/thread.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ThreadEntity, ThreadNotificationEntity]),
  ],
  controllers: [ThreadController],
  providers: [
    ThreadService,
    ThreadSummaryService,
    ThreadNotificationService,
  ],
  exports: [
    ThreadService,
    ThreadSummaryService,
    ThreadNotificationService,
  ],
})
export class ThreadModule {}