import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { Reaction } from './entities/reaction.entity';
import { CustomReaction } from './entities/custom-reaction.entity';
import { CreateReactionDto, CreateCustomReactionDto } from './dto/create-reaction.dto';
import { ReactionQueryDto } from './dto/reaction-query.dto';
import { NotificationService } from '../notifications/notification.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class ReactionsService {
  constructor(
    @InjectRepository(Reaction)
    private reactionRepository: Repository<Reaction>,
    @InjectRepository(CustomReaction)
    private customReactionRepository: Repository<CustomReaction>,
    private notificationService: NotificationService,
    private analyticsService: AnalyticsService,
    private storageService: StorageService,
  ) {}

  async createReaction(userId: string, dto: CreateReactionDto): Promise<Reaction> {
    // Check if user already reacted with this emoji/custom reaction
    const existingReaction = await this.reactionRepository.findOne({
      where: {
        userId,
        messageId: dto.messageId,
        ...(dto.type === 'emoji' ? { emoji: dto.emoji } : { customReactionId: dto.customReactionId }),
      },
    });

    if (existingReaction) {
      throw new ConflictException('User already reacted with this reaction');
    }

    // Validate custom reaction exists if type is custom
    if (dto.type === 'custom' && dto.customReactionId) {
      const customReaction = await this.customReactionRepository.findOne({
        where: { id: dto.customReactionId, isActive: true },
      });
      if (!customReaction) {
        throw new NotFoundException('Custom reaction not found');
      }
    }

    const reaction = this.reactionRepository.create({
      userId,
      messageId: dto.messageId,
      type: dto.type,
      emoji: dto.type === 'emoji' ? dto.emoji : null,
      customReactionId: dto.type === 'custom' ? dto.customReactionId : null,
    });

    const savedReaction = await this.reactionRepository.save(reaction);

    // Update custom reaction usage count
    if (dto.type === 'custom' && dto.customReactionId) {
      await this.customReactionRepository.increment(
        { id: dto.customReactionId },
        'usageCount',
        1
      );
    }

    // Send notification (async)
    this.notificationService.notifyReaction(savedReaction).catch(console.error);

    // Track analytics (async)
    this.analyticsService.trackReaction(savedReaction).catch(console.error);

    return this.reactionRepository.findOne({
      where: { id: savedReaction.id },
      relations: ['user', 'customReaction'],
    });
  }

  async removeReaction(userId: string, reactionId: string): Promise<void> {
    const reaction = await this.reactionRepository.findOne({
      where: { id: reactionId },
    });

    if (!reaction) {
      throw new NotFoundException('Reaction not found');
    }

    if (reaction.userId !== userId) {
      throw new ForbiddenException('Cannot remove other users reactions');
    }

    // Decrement custom reaction usage count
    if (reaction.type === 'custom' && reaction.customReactionId) {
      await this.customReactionRepository.decrement(
        { id: reaction.customReactionId },
        'usageCount',
        1
      );
    }

    await this.reactionRepository.remove(reaction);

    // Track analytics (async)
    this.analyticsService.trackReactionRemoval(reaction).catch(console.error);
  }

  async getMessageReactions(messageId: string): Promise<any> {
    const reactions = await this.reactionRepository
      .createQueryBuilder('reaction')
      .leftJoinAndSelect('reaction.user', 'user')
      .leftJoinAndSelect('reaction.customReaction', 'customReaction')
      .where('reaction.messageId = :messageId', { messageId })
      .orderBy('reaction.createdAt', 'ASC')
      .getMany();

    // Aggregate reactions by emoji/custom reaction
    const aggregated = reactions.reduce((acc, reaction) => {
      const key = reaction.type === 'emoji' 
        ? `emoji:${reaction.emoji}` 
        : `custom:${reaction.customReactionId}`;
      
      if (!acc[key]) {
        acc[key] = {
          type: reaction.type,
          emoji: reaction.emoji,
          customReaction: reaction.customReaction,
          count: 0,
          users: [],
          userReacted: false,
        };
      }
      
      acc[key].count++;
      acc[key].users.push({
        id: reaction.user.id,
        username: reaction.user.username,
        avatar: reaction.user.avatar,
      });
      
      return acc;
    }, {});

    return Object.values(aggregated);
  }

  async createCustomReaction(
    userId: string, 
    dto: CreateCustomReactionDto, 
    imageFile: Express.Multer.File
  ): Promise<CustomReaction> {
    // Check if name already exists
    const existing = await this.customReactionRepository.findOne({
      where: { name: dto.name },
    });

    if (existing) {
      throw new ConflictException('Custom reaction name already exists');
    }

    // Upload image
    const imageUrl = await this.storageService.uploadReactionImage(imageFile);

    const customReaction = this.customReactionRepository.create({
      name: dto.name,
      description: dto.description,
      imageUrl,
      createdById: userId,
    });

    return this.customReactionRepository.save(customReaction);
  }

  async getCustomReactions(query: ReactionQueryDto): Promise<any> {
    const queryBuilder = this.customReactionRepository
      .createQueryBuilder('customReaction')
      .leftJoinAndSelect('customReaction.createdBy', 'createdBy')
      .where('customReaction.isActive = :isActive', { isActive: true })
      .orderBy('customReaction.usageCount', 'DESC')
      .addOrderBy('customReaction.createdAt', 'DESC');

    const total = await queryBuilder.getCount();
    const reactions = await queryBuilder
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getMany();

    return {
      data: reactions,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async getUserReactions(userId: string, query: ReactionQueryDto): Promise<any> {
    const queryBuilder = this.reactionRepository
      .createQueryBuilder('reaction')
      .leftJoinAndSelect('reaction.message', 'message')
      .leftJoinAndSelect('reaction.customReaction', 'customReaction')
      .where('reaction.userId = :userId', { userId })
      .orderBy('reaction.createdAt', 'DESC');

    if (query.type) {
      queryBuilder.andWhere('reaction.type = :type', { type: query.type });
    }

    const total = await queryBuilder.getCount();
    const reactions = await queryBuilder
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getMany();

    return {
      data: reactions,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async getReactionAnalytics(messageId?: string, period?: string): Promise<any> {
    return this.analyticsService.getReactionAnalytics(messageId, period);
  }
}