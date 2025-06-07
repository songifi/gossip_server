// socket-payloads.ts

export interface SendMessagePayload {
  recipientId: string;
  content: string;
}

export interface MessageAckPayload {
  messageId: string;
  timestamp: string;
}

export interface TypingPayload {
  recipientId: string;
  isTyping: boolean;
}

export interface SocketUser {
  userId: string;
  socketId: string;
}