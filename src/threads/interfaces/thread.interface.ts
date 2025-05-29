export interface Thread {
  id: string;
  parentId?: string;
  rootId?: string;
  authorId: string;
  content: string;
  subject?: string;
  depth: number;
  createdAt: Date;
  updatedAt: Date;
  isArchived: boolean;
  isCollapsed: boolean;
  participantIds: string[];
  childThreads: Thread[];
  metadata: ThreadMetadata;
  notificationSettings: ThreadNotificationSettings;
}

export interface ThreadMetadata {
  messageCount: number;
  lastActivityAt: Date;
  tags: string[];
  priority: 'low' | 'normal' | 'high' | 'urgent';
  readStatus: Map<string, boolean>;
}

export interface ThreadNotificationSettings {
  id: string;
  threadId: string;
  userId: string;
  notifyOnReply: boolean;
  notifyOnMention: boolean;
  notifyOnParticipantJoin: boolean;
  mutedUntil?: Date;
}

export interface ThreadSummary {
  threadId: string;
  rootSubject: string;
  participantCount: number;
  messageCount: number;
  lastActivity: Date;
  keyTopics: string[];
  summary: string;
}

export interface ThreadSearchResult {
  thread: Thread;
  relevanceScore: number;
  matchedContent: string[];
  matchedMetadata: string[];
}
