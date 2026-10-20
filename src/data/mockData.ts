import { Contact, Conversation, CallLog, StatusUpdate, User, Message } from '../types';

// Real production empty defaults - all mock/dummy users removed per specifications
export const initialCurrentUser: User | null = null;

export const initialContacts: Contact[] = [];

export const initialConversations: Conversation[] = [];

export const initialMessagesMap: Record<string, Message[]> = {};

export const initialCallLogs: CallLog[] = [];

export const initialStatusUpdates: StatusUpdate[] = [];
