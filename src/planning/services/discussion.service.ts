import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventDiscussion } from '../entities/event-discussion.entity';
import { CreateDiscussionDto } from '../dto/create-discussion.dto';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class DiscussionService {
  constructor(
    @InjectRepository(EventDiscussion)
    private discussionRepository: Repository<EventDiscussion>,
  ) {}

  async create(createDiscussionDto: CreateDiscussionDto, author: User): Promise<EventDiscussion> {
    const discussion = this.discussionRepository.create({
      ...createDiscussionDto,
      author,
      event: { id: createDiscussionDto.eventId } as any,
    });

    return this.discussionRepository.save(discussion);
  }

  async findByEvent(eventId: string): Promise<EventDiscussion[]> {
    return this.discussionRepository.find({
      where: { event: { id: eventId } },
      relations: ['author'],
      order: { createdAt: 'ASC' },
    });
  }
}