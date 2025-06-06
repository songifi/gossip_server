import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { ScheduledMessage } from './entities/scheduled-message.entity';
import { MessageSchedulerService } from './services/message-scheduler.service';
import { MessageSchedulerController } from './controllers/message-scheduler.controller';
import { MessageQueueProcessor } from './processors/message-queue.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([ScheduledMessage]),
    BullModule.registerQueue({
      name: 'message-queue',
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
      },
    }),
  ],
  controllers: [MessageSchedulerController],
  providers: [MessageSchedulerService, MessageQueueProcessor],
  exports: [MessageSchedulerService],
})
export class MessageSchedulerModule {}
