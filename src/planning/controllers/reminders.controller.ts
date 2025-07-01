import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { ReminderService } from '../services/reminder.service';
import { CreateReminderDto } from '../dto/create-reminder.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('events/reminders')
@UseGuards(JwtAuthGuard)
export class RemindersController {
  constructor(private readonly reminderService: ReminderService) {}

  @Post()
  create(@Body() createReminderDto: CreateReminderDto, @Request() req) {
    return this.reminderService.createReminder(createReminderDto, req.user);
  }
}
