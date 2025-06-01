import { Controller, Post, Get, Param, Body, Query, Res } from '@nestjs/common';
import { EventService } from './event.service';
import { Event } from './event.entity';
import { Response } from 'express';

@Controller('events')
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Post()
  createEvent(@Body() eventData: Partial<Event>) {
    return this.eventService.createEvent(eventData);
  }

  @Get()
  listEvents() {
    return this.eventService.listEvents();
  }

  @Get(':id')
  getEvent(@Param('id') id: string) {
    return this.eventService.getEventById(id);
  }

  @Post(':id/rsvp')
  rsvpEvent(@Param('id') id: string, @Body() body: { userId: string; status: 'yes' | 'no' | 'maybe' }) {
    return this.eventService.rsvpEvent(id, body.userId, body.status);
  }

  @Post(':id/reminder')
  addReminder(@Param('id') id: string, @Body() body: { userId: string; remindAt: Date }) {
    return this.eventService.addReminder(id, body.userId, new Date(body.remindAt));
  }

  @Post(':id/discussion')
  addDiscussionMessage(@Param('id') id: string, @Body() body: { userId: string; message: string }) {
    return this.eventService.addDiscussionMessage(id, body.userId, body.message);
  }

  @Post(':id/cost')
  splitCost(@Param('id') id: string, @Body() body: { totalCost: number }) {
    return this.eventService.splitCost(id, body.totalCost);
  }

  @Post(':id/media')
  addMedia(@Param('id') id: string, @Body() body: { url: string }) {
    return this.eventService.addMedia(id, body.url);
  }

  @Post(':id/attendance')
  trackAttendance(@Param('id') id: string, @Body() body: { userId: string; attended: boolean }) {
    return this.eventService.trackAttendance(id, body.userId, body.attended);
  }

  @Get(':id/ical')
  getICal(@Param('id') id: string, @Res() res: Response) {
    const icalStr = this.eventService.generateICal(id);
    if (!icalStr) {
      return res.status(404).send('Event not found');
    }
    res.setHeader('Content-Type', 'text/calendar');
    res.setHeader('Content-Disposition', `attachment; filename=event-${id}.ics`);
    res.send(icalStr);
  }

  @Get('notifications/rsvp')
  getPendingRSVPNotifications() {
    return this.eventService.getPendingRSVPNotifications();
  }

  @Post('notifications/rsvp/mark')
  markRSVPNotified(@Body() body: { eventId: string; userId: string }) {
    this.eventService.markRSVPNotified(body.eventId, body.userId);
    return { success: true };
  }

  @Get('notifications/reminders')
  getPendingReminders() {
    return this.eventService.getPendingReminders();
  }

  @Post('notifications/reminders/mark')
  markReminderSent(@Body() body: { eventId: string; userId: string }) {
    this.eventService.markReminderSent(body.eventId, body.userId);
    return { success: true };
  }
}
