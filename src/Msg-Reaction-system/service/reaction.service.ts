import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomReaction } from '../entities/custom-reaction.entity';
import { CreateCustomReactionDto } from '../dto';

@Injectable()
export class CustomReactionService {
  constructor(
    @InjectRepository(CustomReaction)
    private customReactionRepository: Repository<CustomReaction>,
  ) {}

  async createCustomReaction(userId: string, createDto: CreateCustomReactionDto): Promise<CustomReaction> {
    const customReaction = this.customReactionRepository.create({
      ...createDto,
      createdById: userId,
      isGlobal: createDto.isGlobal || false
    });

    return this.customReactionRepository.save(customReaction);
  }

  async getUserCustomReactions(userId: string): Promise<CustomReaction[]> {
    return this.customReactionRepository.find({
      where: [
        { createdById: userId, isActive: true },
        { isGlobal: true, isActive: true }
      ],
      order: { createdAt: 'DESC' }
    });
  }

  async getGlobalCustomReactions(): Promise<CustomReaction[]> {
    return this.customReactionRepository.find({
      where: { isGlobal: true, isActive: true },
      order: { createdAt: 'DESC' }
    });
  }

  async deleteCustomReaction(userId: string, reactionId: string): Promise<void> {
    const reaction = await this.customReactionRepository.findOne({
      where: { id: reactionId }
    });

    if (!reaction) {
      throw new NotFoundException('Custom reaction not found');
    }

    if (reaction.createdById !== userId) {
      throw new ForbiddenException('You can only delete your own custom reactions');
    }

    reaction.isActive = false;
    await this.customReactionRepository.save(reaction);
  }
}