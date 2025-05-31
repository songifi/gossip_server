import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, IsNull } from 'typeorm';
import { Message, MessageStatus } from './entities/message.entity';
import { CreateMessageDto } from './dto/create-message.dto';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
  ) {}

  async create(
    senderId: string,
    createMessageDto: CreateMessageDto,
  ): Promise<Message> {
    const message = this.messageRepository.create({
      ...createMessageDto,
      senderId,
      status: MessageStatus.SENT,
    });
    return this.messageRepository.save(message);
  }

  async findAll(
    userId: string,
    page: number = 1,
    limit: number = 50,
    search?: string,
  ): Promise<{ messages: Message[]; total: number }> {
    const queryBuilder = this.messageRepository
      .createQueryBuilder('message')
      .where('(message.senderId = :userId OR message.receiverId = :userId)', {
        userId,
      })
      .andWhere('message.deletedAt IS NULL');

    if (search) {
      queryBuilder.andWhere('message.content ILIKE :search', {
        search: `%${search}%`,
      });
    }

    const [messages, total] = await queryBuilder
      .orderBy('message.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { messages, total };
  }

  async findOne(id: string, userId: string): Promise<Message> {
    const message = await this.messageRepository.findOne({
      where: {
        id,
        deletedAt: IsNull(),
      },
      relations: ['replies'],
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.senderId !== userId && message.receiverId !== userId) {
      throw new NotFoundException('Message not found');
    }

    return message;
  }

  async updateStatus(
    id: string,
    status: MessageStatus,
    userId: string,
  ): Promise<Message> {
    const message = await this.findOne(id, userId);
    message.status = status;
    return this.messageRepository.save(message);
  }

  async remove(id: string, userId: string): Promise<void> {
    const message = await this.findOne(id, userId);
    await this.messageRepository.softDelete(id);
  }

  async getThread(parentMessageId: string, userId: string): Promise<Message[]> {
    const thread = await this.messageRepository.find({
      where: [
        { id: parentMessageId, deletedAt: IsNull() },
        { parentMessageId, deletedAt: IsNull() },
      ],
      relations: ['replies'],
      order: {
        createdAt: 'ASC',
      },
    });

    if (!thread.length) {
      throw new NotFoundException('Thread not found');
    }

    const firstMessage = thread[0];
    if (
      firstMessage.senderId !== userId &&
      firstMessage.receiverId !== userId
    ) {
      throw new NotFoundException('Thread not found');
    }

    return thread;
  }
}
