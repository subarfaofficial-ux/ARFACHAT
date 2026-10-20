export interface User {
  id: string;
  username: string; // e.g. "@subarfa"
  displayName: string;
  email: string;
  avatarUrl?: string;
  bio?: string;
  status: 'online' | 'offline' | 'away';
  lastSeen?: string;
  joinedDate?: string;
}

export interface Contact {
  id: string;
  username: string; // e.g. "@sarah_sky"
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  status: 'online' | 'offline' | 'away';
  lastSeen?: string;
  phone?: string;
}

export interface FriendRequest {
  id: string;
  fromUserId: string;
  fromUsername: string;
  fromDisplayName: string;
  fromAvatarUrl?: string;
  toUserId: string;
  toUsername: string;
  toDisplayName?: string;
  toAvatarUrl?: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
  updatedAt?: string;
}

export interface MessageReaction {
  emoji: string;
  count: number;
  users: string[]; // usernames
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string; // "me" or contact id
  text?: string;
  timestamp: string; // ISO string or time string
  status: 'sent' | 'delivered' | 'read';
  type: 'text' | 'image' | 'voice' | 'call_log';
  voiceDuration?: number; // seconds
  imageUrl?: string;
  callLogInfo?: {
    type: 'voice' | 'video';
    direction: 'incoming' | 'outgoing' | 'missed';
    duration?: string;
  };
  reactions?: MessageReaction[];
}

export interface Conversation {
  id: string;
  participant: Contact;
  lastMessage?: Message;
  unreadCount: number;
  pinned?: boolean;
  draft?: string;
}

export interface CallLog {
  id: string;
  contact: Contact;
  type: 'voice' | 'video';
  direction: 'incoming' | 'outgoing' | 'missed';
  timestamp: string;
  duration?: string;
}

export interface StatusUpdate {
  id: string;
  contact: Contact;
  timestamp: string;
  caption?: string;
  mediaUrl?: string;
  gradientBackground?: string;
  viewed?: boolean;
}

export interface ActiveCall {
  callId?: string;
  contact: Contact;
  type: 'voice' | 'video';
  status: 'connecting' | 'ringing' | 'connected' | 'ended';
  startedAt: number;
  isMuted: boolean;
  isVideoOff: boolean;
  isSpeakerOn: boolean;
  isScreenSharing: boolean;
  localStream?: MediaStream | null;
  remoteStream?: MediaStream | null;
  mediaError?: string | null;
}

export interface IncomingCall {
  callId?: string;
  contact: Contact;
  type: 'voice' | 'video';
  timestamp: number;
}

