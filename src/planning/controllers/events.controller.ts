import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    UseGuards,
    Request,
    HttpCode,
    HttpStatus,
  } from '@nestjs/common';
  import { EventsService } from '../services/events.service';
  import { CreateEventDto } from '../dto/create-event.dto';
  import { RsvpEventDto } from '../dto/rsvp-event.dto';
  import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
  
  @Controller('events')
  @UseGuards(JwtAuthGuard)
  export class EventsController {
    constructor(private readonly eventsService: EventsService) {}
  
    @Post()
    create(@Body() createEventDto: CreateEventDto, @Request() req) {
      return this.eventsService.create(createEventDto, req.user);
    }
  
    @Get()
    findAll(@Request() req) {
      return this.eventsService.findAll(req.user.id);
    }
  
    @Get(':id')
    findOne(@Param('id') id: string) {
      return this.eventsService.findOne(id);
    }
  
    @Patch(':id/rsvp')
    rsvp(@Param('id') id: string, @Body() rsvpDto: RsvpEventDto, @Request() req) {
      return this.eventsService.rsvp(id, req.user.id, rsvpDto);
    }
  
    @Get(':id/attendance')
    getAttendanceStats(@Param('id') id: string) {
      return this.eventsService.getAttendanceStats(id);
    }
  
    @Get(':id/calendar')
    @HttpCode(HttpStatus.OK)
    async getCalendarInvite(@Param('id') id: string) {
      const ical = await this.eventsService.generateCalendarInvite(id);
      return {
        ical,
        filename: `event-${id}.ics`,
        contentType: 'text/calendar',
      };
    }
  }
  