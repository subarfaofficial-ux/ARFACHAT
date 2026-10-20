import React, { useState } from 'react';
import { Search, Pin, Mic, Image as ImageIcon, Plus, CheckCheck, Users } from 'lucide-react';
import { Conversation, Contact } from '../../types';
import { Avatar } from '../common/Avatar';

interface ChatListProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  currentUserId?: string;
  onSelectConversation: (conv: Conversation) => void;
  onOpenAddFriend: () => void;
  onOpenContacts: () => void;
}

export const ChatList: React.FC<ChatListProps> = ({
  conversations,
  activeConversationId,
  currentUserId,
  onSelectConversation,
  onOpenAddFriend,
  onOpenContacts,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread' | 'favorites'>('all');

  const filteredConversations = conversations.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      c.participant.displayName.toLowerCase().includes(q) ||
      c.participant.username.toLowerCase().includes(q) ||
      (c.lastMessage?.text && c.lastMessage.text.toLowerCase().includes(q));

    if (!matchesSearch) return false;

    if (filter === 'unread') return c.unreadCount > 0;
    if (filter === 'favorites') return !!c.pinned;
    return true;
  });

  return (
    <div className="w-full h-full flex flex-col bg-white border-r border-slate-200/80">
      {/* Top Search & Actions */}
      <div className="p-3.5 border-b border-slate-100 space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight text-slate-900">Chats</h2>
          <div className="flex items-center gap-1.5">
            <button
              onClick={onOpenContacts}
              title="All Contacts"
              className="w-8 h-8 rounded-xl border border-slate-200 text-slate-600 hover:text-blue-600 hover:bg-blue-50 flex items-center justify-center transition-colors cursor-pointer"
            >
              <Users className="w-4 h-4" />
            </button>
            <button
              onClick={onOpenAddFriend}
              title="Add friend by @username"
              className="w-8 h-8 rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-colors shadow-xs shadow-blue-600/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search input */}
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Search chats or @username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-xl bg-slate-100/80 border border-slate-200/60 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
          />
        </div>

        {/* Segmented Filter Controls */}
        <div className="flex items-center gap-1 p-1 bg-slate-100/80 rounded-xl">
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              filter === 'all'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`flex-1 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              filter === 'unread'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Unread
          </button>
          <button
            onClick={() => setFilter('favorites')}
            className={`flex-1 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              filter === 'favorites'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pinned
          </button>
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100/80">
        {filteredConversations.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
              <Search className="w-6 h-6" />
            </div>
            <p className="text-xs font-semibold text-slate-700">No conversations found</p>
            <p className="text-[11px] text-slate-400 mt-1">Start a new chat with your contacts</p>
            <button
              onClick={onOpenContacts}
              className="mt-3 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Select Contact</span>
            </button>
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const isActive = conv.id === activeConversationId;
            const lastMsg = conv.lastMessage;

            return (
              <div
                key={conv.id}
                onClick={() => onSelectConversation(conv)}
                className={`p-3 sm:px-3.5 flex items-start gap-3 cursor-pointer transition-colors select-none ${
                  isActive
                    ? 'bg-blue-50/70 border-l-3 border-blue-600'
                    : 'hover:bg-slate-50'
                }`}
              >
                {/* Avatar with status */}
                <Avatar
                  name={conv.participant.displayName}
                  src={conv.participant.avatarUrl}
                  size="md"
                  showStatus
                  status={conv.participant.status}
                />

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-slate-900 truncate">
                      {conv.participant.displayName}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono shrink-0">
                      {lastMsg?.timestamp || ''}
                    </span>
                  </div>

                  <div className="text-[11px] font-mono text-blue-600 font-medium truncate">
                    {conv.participant.username}
                  </div>

                  {/* Last message preview */}
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <div className="text-xs text-slate-500 truncate flex items-center gap-1">
                      {(lastMsg?.senderId === 'me' || (currentUserId && lastMsg?.senderId === currentUserId)) && (
                        <CheckCheck className="w-3.5 h-3.5 text-blue-600 inline shrink-0" />
                      )}
                      {lastMsg?.type === 'voice' ? (
                        <span className="flex items-center gap-1 text-blue-600 font-medium">
                          <Mic className="w-3.5 h-3.5" /> Voice message ({lastMsg.voiceDuration}s)
                        </span>
                      ) : lastMsg?.type === 'image' ? (
                        <span className="flex items-center gap-1 text-slate-600">
                          <ImageIcon className="w-3.5 h-3.5" /> Photo
                        </span>
                      ) : (
                        <span className="truncate">{lastMsg?.text || 'No messages yet'}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {conv.pinned && <Pin className="w-3 h-3 text-slate-400 fill-slate-300" />}
                      {conv.unreadCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full bg-blue-600 text-white font-bold text-[10px] min-w-[18px] text-center">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
