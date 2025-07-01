import { Injectable } from '@nestjs/common';
import { Event } from '../entities/event.entity';

@Injectable()
export class CalendarService {
  generateICalInvite(event: Event): string {
    const startDate = this.formatDateForICal(event.startDate);
    const endDate = this.formatDateForICal(event.endDate || new Date(event.startDate.getTime() + 3600000));
    const createdDate = this.formatDateForICal(event.createdAt);
    
    const ical = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Event Planning App//Event//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:REQUEST',
      'BEGIN:VEVENT',
      `UID:${event.id}@eventapp.com`,
      `DTSTART:${startDate}`,
      `DTEND:${endDate}`,
      `DTSTAMP:${createdDate}`,
      `ORGANIZER;CN=${event.organizer.name}:MAILTO:${event.organizer.email}`,
      `SUMMARY:${event.title}`,
      `DESCRIPTION:${event.description || ''}`,
      `LOCATION:${event.location || ''}`,
      'STATUS:CONFIRMED',
      'SEQUENCE:0',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    return ical;
  }

  private formatDateForICal(date: Date): string {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  }
}
