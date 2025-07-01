import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';

// Entities
import { Event } from './entities/event.entity';
import { EventRsvp } from './entities/event-rsvp.entity';
import { EventReminder } from './entities/event-reminder.entity';
import { EventDiscussion } from './entities/event-discussion.entity';
import { EventExpense } from './entities/event-expense.entity';
import { ExpenseSplit } from './entities/expense-split.entity';
import { EventMedia } from './entities/event-media.entity';

// Services
import { EventsService } from './services/events.service';
import { CalendarService } from './services/calendar.service';
import { ReminderService } from './services/reminder.service';
import { DiscussionService } from './services/discussion.service';
import { ExpenseService } from './services/expense.service';
import { MediaService } from './services/media.service';
import { NotificationService } from './services/notification.service';

// Controllers
import { EventsController } from './controllers/events.controller';
import { RemindersController } from './controllers/reminders.controller';
import { DiscussionsController } from './controllers/discussions.controller';
import { ExpensesController } from './controllers/expenses.controller';
import { MediaController } from './controllers/media.controller';

// Gateway
import { EventsGateway } from './gateways/events.gateway';

// External modules
import { UsersModule } from '../users/users.module';
import { ChatsModule } from '../chats/chats.module';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Event,
      EventRsvp,
      EventReminder,
      EventDiscussion,
      EventExpense,
      ExpenseSplit,
      EventMedia,
    ]),
    ScheduleModule.forRoot(),
    UsersModule,
    ChatsModule,
    CommonModule,
  ],
  controllers: [
    EventsController,
    RemindersController,
    DiscussionsController,
    ExpensesController,
    MediaController,
  ],
  providers: [
    EventsService,
    CalendarService,
    ReminderService,
    DiscussionService,
    ExpenseService,
    MediaService,
    NotificationService,
    EventsGateway,
  ],
  exports: [EventsService, NotificationService],
})
export class EventsModule {}