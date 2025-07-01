import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventMedia, MediaType } from '../entities/event-media.entity';
import { User } from '../../users/entities/user.entity';
import { EventsService } from './events.service';
import { StorageService } from '../../common/services/storage.service';

@Injectable()
export class MediaService {
  constructor(
    @InjectRepository(EventMedia)
    private mediaRepository: Repository<EventMedia>,
    private eventsService: EventsService,
    private storageService: StorageService,
  ) {}

  async uploadMedia(
    eventId: string,
    file: Express.Multer.File,
    caption: string,
    uploadedBy: User,
  ): Promise<EventMedia> {
    const event = await this.eventsService.findOne(eventId);
    
    // Upload file to storage service (S3, etc.)
    const url = await this.storageService.uploadFile(file, `events/${eventId}/media`);
    
    const mediaType = this.determineMediaType(file.mimetype);
    
    const media = this.mediaRepository.create({
      filename: file.originalname,
      url,
      type: mediaType,
      size: file.size,
      caption,
      event,
      uploadedBy,
    });

    return this.mediaRepository.save(media);
  }

  async getEventMedia(eventId: string): Promise<EventMedia[]> {
    return this.mediaRepository.find({
      where: { event: { id: eventId } },
      relations: ['uploadedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  private determineMediaType(mimetype: string): MediaType {
    if (mimetype.startsWith('image/')) return MediaType.IMAGE;
    if (mimetype.startsWith('video/')) return MediaType.VIDEO;
    return MediaType.DOCUMENT;
  }
}
