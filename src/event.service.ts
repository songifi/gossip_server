import { Injectable } from '@nestjs/common';
import { Event, RSVP, CostSharing, Reminder, DiscussionThread, Attendance } from './event.entity';
import { v4 as uuidv4 } from 'uuid';
import ical from 'ical-generator';

@Injectable()
export class EventService {
  private events: Event[] = [];

  createEvent(eventData: Partial<Event>): Event {
    const event: Event = {
      id: uuidv4(),
      groupId: eventData.groupId!,
      title: eventData.title!,
      description: eventData.description,
      startTime: eventData.startTime!,
      endTime: eventData.endTime!,
      location: eventData.location,
      createdBy: eventData.createdBy!,
      attendees: [],
      costSharing: eventData.costSharing,
      mediaUrls: [],
      reminders: [],
      discussionThread: { threadId: uuidv4(), messages: [] },
      calendarUrl: '',
      attendance: [],
    };
    this.events.push(event);
    return event;
  }

  getEventById(id: string): Event | undefined {
    return this.events.find(e => e.id === id);
  }

  listEvents(): Event[] {
    return this.events;
  }

  rsvpEvent(eventId: string, userId: string, status: 'yes' | 'no' | 'maybe'): RSVP | undefined {
    const event = this.getEventById(eventId);
    if (!event) return undefined;
    let rsvp = event.attendees.find(a => a.userId === userId);
    if (rsvp) {
      rsvp.status = status;
    } else {
      rsvp = { userId, status };
      event.attendees.push(rsvp);
    }
    return rsvp;
  }

  addReminder(eventId: string, userId: string, remindAt: Date): Reminder | undefined {
    const event = this.getEventById(eventId);
    if (!event) return undefined;
    const reminder: Reminder = { userId, remindAt, sent: false };
    event.reminders?.push(reminder);
    return reminder;
  }

  addDiscussionMessage(eventId: string, userId: string, message: string): boolean {
    const event = this.getEventById(eventId);
    if (!event || !event.discussionThread) return false;
    event.discussionThread.messages.push({ userId, message, timestamp: new Date() });
    return true;
  }

  splitCost(eventId: string, totalCost: number): CostSharing | undefined {
    const event = this.getEventById(eventId);
    if (!event) return undefined;
    const attendees = event.attendees.filter(a => a.status === 'yes');
    const share = totalCost / (attendees.length || 1);
    event.costSharing = {
      totalCost,
      shares: attendees.map(a => ({ userId: a.userId, amount: share })),
    };
    return event.costSharing;
  }

  addMedia(eventId: string, url: string): boolean {
    const event = this.getEventById(eventId);
    if (!event) return false;
    event.mediaUrls = event.mediaUrls || [];
    event.mediaUrls.push(url);
    return true;
  }

  trackAttendance(eventId: string, userId: string, attended: boolean): boolean {
    const event = this.getEventById(eventId);
    if (!event) return false;
    let record = event.attendance?.find(a => a.userId === userId);
    if (record) {
      record.attended = attended;
      record.checkedInAt = new Date();
    } else {
      event.attendance?.push({ userId, attended, checkedInAt: new Date() });
    }
    return true;
  }

  generateICal(eventId: string): string | undefined {
    const event = this.getEventById(eventId);
    if (!event) return undefined;
    const cal = ical({ name: event.title });
    cal.createEvent({
      start: event.startTime,
      end: event.endTime,
      summary: event.title,
      description: event.description,
      location: event.location,
      organizer: { name: event.createdBy },
    });
    return cal.toString();
  }

  getPendingRSVPNotifications(): { eventId: string; userId: string }[] {
    const pending: { eventId: string; userId: string }[] = [];
    for (const event of this.events) {
      for (const attendee of event.attendees) {
        if (!attendee.notified && attendee.status === 'yes') {
          pending.push({ eventId: event.id, userId: attendee.userId });
        }
      }
    }
    return pending;
  }

  markRSVPNotified(eventId: string, userId: string): void {
    const event = this.getEventById(eventId);
    if (!event) return;
    const attendee = event.attendees.find(a => a.userId === userId);
    if (attendee) attendee.notified = true;
  }

  getPendingReminders(): { eventId: string; userId: string; remindAt: Date }[] {
    const now = new Date();
    const pending: { eventId: string; userId: string; remindAt: Date }[] = [];
    for (const event of this.events) {
      for (const reminder of event.reminders || []) {
        if (!reminder.sent && reminder.remindAt <= now) {
          pending.push({ eventId: event.id, userId: reminder.userId, remindAt: reminder.remindAt });
        }
      }
    }
    return pending;
  }

  markReminderSent(eventId: string, userId: string): void {
    const event = this.getEventById(eventId);
    if (!event) return;
    const reminder = event.reminders?.find(r => r.userId === userId);
    if (reminder) reminder.sent = true;
  }
}
