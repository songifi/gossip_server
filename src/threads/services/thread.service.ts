import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In } from 'typeorm';
import { ThreadEntity, ThreadNotificationEntity } from '../entities/thread.entity';
import { CreateThreadDto } from '../dto/create-thread.dto';
import { UpdateThreadDto } from '../dto/create-thread.dto';
import { ThreadSearchDto } from '../dto/create-thread.dto';
import { Thread, ThreadSummary, ThreadSearchResult } from '../interfaces/thread.interface';
import { ThreadSummaryService } from './thread-summary.service';
import { ThreadNotificationService } from './thread-notification.service';

@Injectable()
export class ThreadService {
  private readonly MAX_THREAD_DEPTH = 10;

  constructor(
    @InjectRepository(ThreadEntity)
    private threadRepository: Repository<ThreadEntity>,
    private summaryService: ThreadSummaryService,
    private notificationService: ThreadNotificationService,
  ) {}

  async createThread(createThreadDto: CreateThreadDto, authorId: string): Promise<Thread> {
    const { parentId, content, subject, tags = [], priority = 'normal' } = createThreadDto;

    let depth = 0;
    let rootId: string | undefined;

    if (parentId) {
      const parentThread = await this.threadRepository.findOne({
        where: { id: parentId },
        relations: ['childThreads'],
      });

      if (!parentThread) {
        throw new NotFoundException('Parent thread not found');
      }

      if (parentThread.depth >= this.MAX_THREAD_DEPTH) {
        throw new BadRequestException(`Maximum thread depth of ${this.MAX_THREAD_DEPTH} exceeded`);
      }

      depth = parentThread.depth + 1;
      rootId = parentThread.rootId || parentThread.id;

      // Add author to parent thread participants
      if (!parentThread.participantIds.includes(authorId)) {
        parentThread.participantIds.push(authorId);
        await this.threadRepository.save(parentThread);
      }
    }

    const threadEntity = this.threadRepository.create({
      parentId,
      rootId,
      authorId,
      content,
      subject,
      depth,
      participantIds: [authorId],
      metadata: {
        messageCount: 1,
        lastActivityAt: new Date(),
        tags,
        priority,
        readStatus: { [authorId]: true },
      },
    });

    const savedThread = await this.threadRepository.save(threadEntity);
    
    // Create default notification settings for author
    await this.notificationService.createNotificationSettings({
      threadId: savedThread.id,
      userId: authorId,
      notifyOnReply: true,
      notifyOnMention: true,
      notifyOnParticipantJoin: false,
    });

    return this.mapEntityToThread(savedThread);
  }

  async getThread(id: string, userId: string): Promise<Thread> {
    const thread = await this.threadRepository.findOne({
      where: { id },
      relations: ['childThreads', 'parentThread'],
    });

    if (!thread) {
      throw new NotFoundException('Thread not found');
    }

    await this.markAsRead(id, userId);

    return this.mapEntityToThread(thread);
  }

  async getThreadHierarchy(rootId: string, userId: string): Promise<Thread> {
    const rootThread = await this.threadRepository.findOne({
      where: { id: rootId },
    });

    if (!rootThread) {
      throw new NotFoundException('Root thread not found');
    }

    const hierarchy = await this.buildThreadHierarchy(rootId);
    await this.markAsRead(rootId, userId);

    return hierarchy;
  }

  private async buildThreadHierarchy(threadId: string): Promise<Thread> {
    const thread = await this.threadRepository.findOne({
      where: { id: threadId },
    });

    if (!thread) {
      throw new NotFoundException('Thread not found');
    }

    const childThreads = await this.threadRepository.find({
      where: { parentId: threadId },
      order: { createdAt: 'ASC' },
    });

    const mappedThread = this.mapEntityToThread(thread);
    mappedThread.childThreads = await Promise.all(
      childThreads.map(child => this.buildThreadHierarchy(child.id))
    );

    return mappedThread;
  }

  async updateThread(id: string, updateThreadDto: UpdateThreadDto, userId: string): Promise<Thread> {
    const thread = await this.threadRepository.findOne({ where: { id } });

    if (!thread) {
      throw new NotFoundException('Thread not found');
    }

    if (thread.authorId !== userId) {
      throw new BadRequestException('Only the author can update this thread');
    }

    const { content, subject, tags, priority } = updateThreadDto;

    if (content !== undefined) thread.content = content;
    if (subject !== undefined) thread.subject = subject;
    if (tags !== undefined) thread.metadata.tags = tags;
    if (priority !== undefined) thread.metadata.priority = priority;

    thread.metadata.lastActivityAt = new Date();

    const updatedThread = await this.threadRepository.save(thread);
    return this.mapEntityToThread(updatedThread);
  }

  async archiveThread(id: string, userId: string): Promise<void> {
    const thread = await this.threadRepository.findOne({ where: { id } });

    if (!thread) {
      throw new NotFoundException('Thread not found');
    }

    if (thread.authorId !== userId) {
      throw new BadRequestException('Only the author can archive this thread');
    }

    thread.isArchived = true;
    await this.threadRepository.save(thread);

    await this.archiveChildThreads(id);
  }

  private async archiveChildThreads(parentId: string): Promise<void> {
    const childThreads = await this.threadRepository.find({
      where: { parentId },
    });

    for (const child of childThreads) {
      child.isArchived = true;
      await this.threadRepository.save(child);
      await this.archiveChildThreads(child.id);
    }
  }

  async toggleThreadCollapse(id: string, userId: string): Promise<Thread> {
    const thread = await this.threadRepository.findOne({ where: { id } });

    if (!thread) {
      throw new NotFoundException('Thread not found');
    }

    thread.isCollapsed = !thread.isCollapsed;
    const updatedThread = await this.threadRepository.save(thread);

    return this.mapEntityToThread(updatedThread);
  }

  async searchThreads(searchDto: ThreadSearchDto, userId: string): Promise<ThreadSearchResult[]> {
    const { query, tags, participantIds, priority, limit, offset } = searchDto;

    let queryBuilder = this.threadRepository.createQueryBuilder('thread')
      .where('thread.isArchived = :isArchived', { isArchived: false });

    if (query) {
      queryBuilder = queryBuilder.andWhere(
        '(thread.content ILIKE :query OR thread.subject ILIKE :query)',
        { query: `%${query}%` }
      );
    }

    if (tags && tags.length > 0) {
      queryBuilder = queryBuilder.andWhere(
        'thread.metadata->>\'tags\' ?| array[:tags]',
        { tags }
      );
    }

    if (participantIds && participantIds.length > 0) {
      queryBuilder = queryBuilder.andWhere(
        'thread.participantIds && :participantIds',
        { participantIds }
      );
    }

    if (priority) {
      queryBuilder = queryBuilder.andWhere(
        'thread.metadata->>\'priority\' = :priority',
        { priority }
      );
    }

    const threads = await queryBuilder
      .orderBy('thread.metadata->>\'lastActivityAt\'', 'DESC')
      .skip(offset)
      .take(limit)
      .getMany();

    return threads.map(thread => ({
      thread: this.mapEntityToThread(thread),
      relevanceScore: this.calculateRelevanceScore(thread, query),
      matchedContent: this.extractMatchedContent(thread, query),
      matchedMetadata: this.extractMatchedMetadata(thread, tags),
    }));
  }

  async addParticipant(threadId: string, participantId: string): Promise<void> {
    const thread = await this.threadRepository.findOne({ where: { id: threadId } });

    if (!thread) {
      throw new NotFoundException('Thread not found');
    }

    if (!thread.participantIds.includes(participantId)) {
      thread.participantIds.push(participantId);
      thread.metadata.lastActivityAt = new Date();
      await this.threadRepository.save(thread);

      await this.notificationService.createNotificationSettings({
        threadId,
        userId: participantId,
        notifyOnReply: true,
        notifyOnMention: true,
        notifyOnParticipantJoin: false,
      });

      await this.notificationService.notifyParticipantJoined(threadId, participantId);
    }
  }

  async removeParticipant(threadId: string, participantId: string): Promise<void> {
    const thread = await this.threadRepository.findOne({ where: { id: threadId } });

    if (!thread) {
      throw new NotFoundException('Thread not found');
    }

    thread.participantIds = thread.participantIds.filter(id => id !== participantId);
    thread.metadata.lastActivityAt = new Date();
    await this.threadRepository.save(thread);

    await this.notificationService.removeNotificationSettings(threadId, participantId);
  }

  async markAsRead(threadId: string, userId: string): Promise<void> {
    const thread = await this.threadRepository.findOne({ where: { id: threadId } });

    if (!thread) {
      throw new NotFoundException('Thread not found');
    }

    thread.metadata.readStatus[userId] = true;
    await this.threadRepository.save(thread);
  }

  async getThreadSummary(threadId: string): Promise<ThreadSummary> {
    return this.summaryService.generateSummary(threadId);
  }

  async shareThread(threadId: string, shareWithUserIds: string[]): Promise<void> {
    const thread = await this.threadRepository.findOne({ where: { id: threadId } });

    if (!thread) {
      throw new NotFoundException('Thread not found');
    }

    for (const userId of shareWithUserIds) {
      await this.addParticipant(threadId, userId);
    }
  }

  private calculateRelevanceScore(thread: ThreadEntity, query: string): number {
    if (!query) return 1;

    let score = 0;
    const lowerQuery = query.toLowerCase();

    if (thread.content.toLowerCase().includes(lowerQuery)) {
      score += 0.6;
    }

    if (thread.subject?.toLowerCase().includes(lowerQuery)) {
      score += 0.8;
    }

    if (thread.metadata.tags.some(tag => tag.toLowerCase().includes(lowerQuery))) {
      score += 0.4;
    }

    const daysSinceActivity = (Date.now() - new Date(thread.metadata.lastActivityAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceActivity < 7) {
      score += 0.2;
    }

    return Math.min(score, 1);
  }

  private extractMatchedContent(thread: ThreadEntity, query: string): string[] {
    if (!query) return [];

    const matches: string[] = [];
    const lowerQuery = query.toLowerCase();

    if (thread.content.toLowerCase().includes(lowerQuery)) {
      // Extract surrounding context
      const index = thread.content.toLowerCase().indexOf(lowerQuery);
      const start = Math.max(0, index - 50);
      const end = Math.min(thread.content.length, index + query.length + 50);
      matches.push(thread.content.substring(start, end));
    }

    return matches;
  }

  private extractMatchedMetadata(thread: ThreadEntity, tags?: string[]): string[] {
    const matches: string[] = [];

    if (tags) {
      const matchedTags = thread.metadata.tags.filter(tag => 
        tags.some(searchTag => tag.toLowerCase().includes(searchTag.toLowerCase()))
      );
      matches.push(...matchedTags);
    }

    return matches;
  }

  private mapEntityToThread(entity: ThreadEntity): Thread {
    return {
      id: entity.id,
      parentId: entity.parentId,
      rootId: entity.rootId,
      authorId: entity.authorId,
      content: entity.content,
      subject: entity.subject,
      depth: entity.depth,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      isArchived: entity.isArchived,
      isCollapsed: entity.isCollapsed,
      participantIds: entity.participantIds,
      childThreads: entity.childThreads?.map(child => this.mapEntityToThread(child)) || [],
      metadata: {
        messageCount: entity.metadata.messageCount,
        lastActivityAt: entity.metadata.lastActivityAt,
        tags: entity.metadata.tags,
        priority: entity.metadata.priority,
        readStatus: new Map(Object.entries(entity.metadata.readStatus)),
      },
      notificationSettings: {} as any, 
    };
  }
}