import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from '../entities/event.entity';
import { EventRsvp, RsvpStatus } from '../entities/event-rsvp.entity';
import { CreateEventDto } from '../dto/create-event.dto';
import { RsvpEventDto } from '../dto/rsvp-event.dto';
import { User } from '../../users/entities/user.entity';
import { GroupChat } from '../../chats/entities/group-chat.entity';
import { CalendarService } from './calendar.service';
import { NotificationService } from './notification.service';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private eventRepository: Repository<Event>,
    @InjectRepository(EventRsvp)
    private rsvpRepository: Repository<EventRsvp>,
    @InjectRepository(GroupChat)
    private groupChatRepository: Repository<GroupChat>,
    private calendarService: CalendarService,
    private notificationService: NotificationService,
  ) {}

  async create(createEventDto: CreateEventDto, organizer: User): Promise<Event> {
    const groupChat = await this.groupChatRepository.findOne({
      where: { id: createEventDto.groupChatId },
      relations: ['members'],
    });

    if (!groupChat) {
      throw new NotFoundException('Group chat not found');
    }

    // Check if user is member of the group
    const isMember = groupChat.members.some(member => member.id === organizer.id);
    if (!isMember) {
      throw new ForbiddenException('You are not a member of this group');
    }

    const event = this.eventRepository.create({
      ...createEventDto,
      startDate: new Date(createEventDto.startDate),
      endDate: createEventDto.endDate ? new Date(createEventDto.endDate) : null,
      organizer,
      groupChat,
    });

    const savedEvent = await this.eventRepository.save(event);

    // Create pending RSVPs for all group members
    const rsvps = groupChat.members.map(member => 
      this.rsvpRepository.create({
        event: savedEvent,
        user: member,
        status: member.id === organizer.id ? RsvpStatus.GOING : RsvpStatus.PENDING,
      })
    );

    await this.rsvpRepository.save(rsvps);

    // Send notifications to group members
    await this.notificationService.notifyEventCreated(savedEvent, groupChat.members);

    return this.findOne(savedEvent.id);
  }

  async findAll(userId: string): Promise<Event[]> {
    return this.eventRepository
      .createQueryBuilder('event')
      .leftJoinAndSelect('event.groupChat', 'groupChat')
      .leftJoinAndSelect('groupChat.members', 'members')
      .leftJoinAndSelect('event.organizer', 'organizer')
      .leftJoinAndSelect('event.rsvps', 'rsvps')
      .leftJoinAndSelect('rsvps.user', 'rsvpUser')
      .where('members.id = :userId', { userId })
      .orderBy('event.startDate', 'ASC')
      .getMany();
  }

  async findOne(id: string): Promise<Event> {
    const event = await this.eventRepository.findOne({
      where: { id },
      relations: [
        'organizer', 'groupChat', 'rsvps', 'rsvps.user',
        'discussions', 'discussions.author', 'expenses', 'expenses.paidBy',
        'expenses.splits', 'expenses.splits.user', 'media', 'media.uploadedBy'
      ],
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    return event;
  }

  async rsvp(eventId: string, userId: string, rsvpDto: RsvpEventDto): Promise<EventRsvp> {
    const event = await this.findOne(eventId);
    
    let rsvp = await this.rsvpRepository.findOne({
      where: { event: { id: eventId }, user: { id: userId } },
    });

    if (!rsvp) {
      throw new NotFoundException('RSVP record not found');
    }

    Object.assign(rsvp, rsvpDto);
    const savedRsvp = await this.rsvpRepository.save(rsvp);

    // Send notification to organizer
    await this.notificationService.notifyRsvpUpdate(event, savedRsvp);

    return savedRsvp;
  }

  async getAttendanceStats(eventId: string) {
    const event = await this.findOne(eventId);
    const stats = await this.rsvpRepository
      .createQueryBuilder('rsvp')
      .select('rsvp.status, COUNT(*) as count, SUM(rsvp.guestCount) as totalGuests')
      .where('rsvp.eventId = :eventId', { eventId })
      .groupBy('rsvp.status')
      .getRawMany();

    const totalInvited = event.rsvps.length;
    const totalGoing = stats.find(s => s.status === RsvpStatus.GOING)?.totalGuests || 0;

    return {
      totalInvited,
      totalGoing: parseInt(totalGoing),
      breakdown: stats.reduce((acc, stat) => {
        acc[stat.status] = {
          count: parseInt(stat.count),
          totalGuests: parseInt(stat.totalGuests)
        };
        return acc;
      }, {}),
    };
  }

  async generateCalendarInvite(eventId: string): Promise<string> {
    const event = await this.findOne(eventId);
    return this.calendarService.generateICalInvite(event);
  }
}