// events.enum.ts

export enum SocketEvent {
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',

  // Messaging Events
  MESSAGE_SEND = 'message:send',
  MESSAGE_RECEIVED = 'message:received',
  MESSAGE_ACK = 'message:ack',

  // Typing Events
  TYPING_START = 'typing:start',
  TYPING_STOP = 'typing:stop',

  // Presence Events
  USER_ONLINE = 'user:online',
  USER_OFFLINE = 'user:offline',

  // System Events
  ERROR = 'error',
  HEARTBEAT = 'heartbeat',
}
