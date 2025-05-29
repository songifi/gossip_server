import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ThreadEntity } from '../entities/thread.entity';
import { ThreadSummary } from '../interfaces/thread.interface';

@Injectable()
export class ThreadSummaryService {
  constructor(
    @InjectRepository(ThreadEntity)
    private threadRepository: Repository<ThreadEntity>,
  ) {}

  async generateSummary(threadId: string): Promise<ThreadSummary> {
    const thread = await this.threadRepository.findOne({
      where: { id: threadId },
    });

    if (!thread) {
      throw new Error('Thread not found');
    }

    const rootId = thread.rootId || thread.id;
    const allThreads = await this.threadRepository.find({
      where: [{ id: rootId }, { rootId }],
      order: { createdAt: 'ASC' },
    });

    const rootThread = allThreads.find(t => t.id === rootId);
    const participantIds = new Set<string>();
    const keyTopics = new Set<string>();

    allThreads.forEach(t => {
      t.participantIds.forEach(id => participantIds.add(id));
      t.metadata.tags.forEach(tag => keyTopics.add(tag));
    });

    const summary = this.generateTextSummary(allThreads);

    return {
      threadId: rootId,
      rootSubject: rootThread?.subject || 'No subject',
      participantCount: participantIds.size,
      messageCount: allThreads.length,
      lastActivity: new Date(Math.max(...allThreads.map(t => t.metadata.lastActivityAt.getTime()))),
      keyTopics: Array.from(keyTopics),
      summary,
    };
  }

  private generateTextSummary(threads: ThreadEntity[]): string {
    if (threads.length === 0) return 'Empty thread';

    const rootThread = threads[0];
    const replyCount = threads.length - 1;

    let summary = `Thread started with: "${this.truncateText(rootThread.content, 100)}"`;

    if (replyCount > 0) {
      summary += ` with ${replyCount} ${replyCount === 1 ? 'reply' : 'replies'}`;
    }

    const allTags = threads.flatMap(t => t.metadata.tags);
    const uniqueTags = [...new Set(allTags)];
    if (uniqueTags.length > 0) {
      summary += `. Key topics: ${uniqueTags.slice(0, 3).join(', ')}`;
    }

    return summary;
  }

  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }
}
