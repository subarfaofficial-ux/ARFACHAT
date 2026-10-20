import React, { useState } from 'react';
import { X, Search, MessageSquare, Phone, Video, UserPlus, Users } from 'lucide-react';
import { Contact } from '../../types';
import { Avatar } from '../common/Avatar';

interface ContactListModalProps {
  isOpen: boolean;
  onClose: () => void;
  contacts: Contact[];
  onStartChat: (contact: Contact) => void;
  onStartCall: (contact: Contact, type: 'voice' | 'video') => void;
  onOpenAddFriend: () => void;
}

export const ContactListModal: React.FC<ContactListModalProps> = ({
  isOpen,
  onClose,
  contacts,
  onStartChat,
  onStartCall,
  onOpenAddFriend,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const filteredContacts = contacts.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    return (
      c.displayName.toLowerCase().includes(q) ||
      c.username.toLowerCase().includes(q) ||
      (c.bio && c.bio.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Contacts</h2>
              <p className="text-xs text-slate-500">
                {contacts.length} {contacts.length === 1 ? 'connection' : 'connections'} with @username handles
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onOpenAddFriend();
              }}
              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-6 py-3 border-b border-slate-100">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name or @username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-9 pr-3 rounded-xl bg-slate-100/80 border border-slate-200/80 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
            />
          </div>
        </div>

        {/* Contacts list */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2">
          {filteredContacts.length === 0 ? (
            <div className="text-center py-10 px-4">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
                <Search className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-700">No contacts found</p>
              <p className="text-xs text-slate-400 mt-1">Try another search or add a new friend</p>
            </div>
          ) : (
            filteredContacts.map((contact) => (
              <div
                key={contact.id}
                className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 transition-colors group"
              >
                <div
                  className="flex items-center gap-3 min-w-0 cursor-pointer flex-1 mr-3"
                  onClick={() => {
                    onStartChat(contact);
                    onClose();
                  }}
                >
                  <Avatar
                    name={contact.displayName}
                    src={contact.avatarUrl}
                    size="md"
                    showStatus
                    status={contact.status}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900 truncate">
                        {contact.displayName}
                      </span>
                      <span className="text-xs text-blue-600 font-mono font-medium">
                        {contact.username}
                      </span>
                    </div>
                    {contact.bio && (
                      <p className="text-xs text-slate-500 truncate mt-0.5">{contact.bio}</p>
                    )}
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      {contact.status === 'online' ? 'Active now' : contact.lastSeen || 'Offline'}
                    </span>
                  </div>
                </div>

                {/* Instant Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => {
                      onStartChat(contact);
                      onClose();
                    }}
                    title="Send message"
                    className="w-9 h-9 rounded-xl text-blue-600 hover:bg-blue-50 flex items-center justify-center transition-colors"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      onStartCall(contact, 'voice');
                      onClose();
                    }}
                    title="Voice Call"
                    className="w-9 h-9 rounded-xl text-emerald-600 hover:bg-emerald-50 flex items-center justify-center transition-colors"
                  >
                    <Phone className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      onStartCall(contact, 'video');
                      onClose();
                    }}
                    title="Video Call"
                    className="w-9 h-9 rounded-xl text-sky-600 hover:bg-sky-50 flex items-center justify-center transition-colors"
                  >
                    <Video className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
