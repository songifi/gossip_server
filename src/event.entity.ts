export interface Event {
  id: string;
  groupId: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  createdBy: string;
  attendees: RSVP[];
  costSharing?: CostSharing;
  mediaUrls?: string[];
  reminders?: Reminder[];
  discussionThread?: DiscussionThread;
  calendarUrl?: string;
  attendance?: Attendance[];
}

export interface RSVP {
  userId: string;
  status: 'yes' | 'no' | 'maybe';
  notified?: boolean;
}

export interface CostSharing {
  totalCost: number;
  shares: { userId: string; amount: number }[];
}

export interface Reminder {
  userId: string;
  remindAt: Date;
  sent: boolean;
}

export interface DiscussionThread {
  threadId: string;
  messages: ThreadMessage[];
}

export interface ThreadMessage {
  userId: string;
  message: string;
  timestamp: Date;
}

export interface Attendance {
  userId: string;
  attended: boolean;
  checkedInAt?: Date;
}
