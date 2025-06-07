import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MessageReaction } from '../entities/message-reaction.entity';
import { Message } from '../entities/message.entity';
import { User } from '../entities/user.entity';
import { CustomReaction } from '../entities/custom-reaction.entity';
import { ReactionAnalytics } from '../entities/reaction-analytics.entity';
import { ReactionService } from '../services/reaction.service';
import { CustomReactionService } from '../services/custom-reaction.service';
import { ReactionController } from '../controllers/reaction.controller';
import { CustomReactionController } from '../controllers/custom-reaction.controller';
import { ReactionGateway } from '../gateways/reaction.gateway';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MessageReaction,
      Message,
      User,
      CustomReaction,
      ReactionAnalytics,
    ]),
    EventEmitterModule.forRoot(),
  ],
  controllers: [ReactionController, CustomReactionController],
  providers: [ReactionService, CustomReactionService, ReactionGateway],
  exports: [ReactionService, CustomReactionService],
})
export class ReactionModule {}
