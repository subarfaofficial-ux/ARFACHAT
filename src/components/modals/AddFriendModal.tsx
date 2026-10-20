import React, { useState } from 'react';
import {
  X,
  UserPlus,
  Check,
  Search,
  MessageSquare,
  Loader2,
  Clock,
  UserCheck,
  UserX,
  Send,
  Trash2,
  Users,
} from 'lucide-react';
import { Contact, User, FriendRequest } from '../../types';
import { Avatar } from '../common/Avatar';
import {
  lookupUserByUsername,
  sendFriendRequest,
  cancelFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  sanitizeUsername,
} from '../../lib/firebase';

interface AddFriendModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  contacts: Contact[];
  friendRequests: FriendRequest[];
  outgoingRequests?: FriendRequest[];
  onAddContact: (newContact: Contact) => void;
  onStartChat: (contact: Contact) => void;
}

export const AddFriendModal: React.FC<AddFriendModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  contacts,
  friendRequests,
  outgoingRequests = [],
  onAddContact,
  onStartChat,
}) => {
  const [activeTab, setActiveTab] = useState<'search' | 'requests'>('search');
  const [requestsSubTab, setRequestsSubTab] = useState<'incoming' | 'outgoing'>('incoming');
  const [handleInput, setHandleInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchedUser, setSearchedUser] = useState<User | null>(null);
  const [requestSent, setRequestSent] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleInputChange = (val: string) => {
    let clean = val.replace(/[^a-zA-Z0-9_@]/g, '');
    if (!clean.startsWith('@') && clean.length > 0) {
      clean = '@' + clean;
    }
    setHandleInput(clean);
    setError(null);
    setRequestSent(false);
    setSearchedUser(null);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = sanitizeUsername(handleInput);

    if (!clean || clean.length < 3) {
      setError('Please enter a username of at least 3 characters.');
      return;
    }

    if (`@${clean}` === currentUser.username.toLowerCase()) {
      setError('That is your own username handle!');
      return;
    }

    setIsSearching(true);
    setError(null);
    setSearchedUser(null);
    setRequestSent(false);

    try {
      const user = await lookupUserByUsername(clean);
      if (user) {
        setSearchedUser(user);
      } else {
        setError(`No registered user found with handle @${clean}. Please verify the exact @username.`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || 'Could not find user.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSendRequest = async () => {
    if (!searchedUser) return;
    setIsSending(true);
    setError(null);

    try {
      await sendFriendRequest(currentUser, searchedUser);
      setRequestSent(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('already pending')) {
        setRequestSent(true);
      } else {
        setError(msg);
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleAcceptRequest = async (request: FriendRequest) => {
    try {
      const newContact = await acceptFriendRequest(request, currentUser);
      onAddContact(newContact);
    } catch (err) {
      console.warn('Accept friend request error:', err);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      await rejectFriendRequest(requestId);
    } catch (e) {
      console.warn('Reject friend request error:', e);
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    try {
      await cancelFriendRequest(requestId);
    } catch (e) {
      console.warn('Cancel outgoing request error:', e);
    }
  };

  const pendingIncoming = friendRequests.filter((r) => r.status === 'pending');
  const pendingOutgoing = outgoingRequests.filter((r) => r.status === 'pending');

  const isAlreadyFriend = searchedUser ? contacts.some((c) => c.id === searchedUser.id) : false;
  const isPendingOutgoingToSearched = searchedUser
    ? pendingOutgoing.some((r) => r.toUserId === searchedUser.id)
    : false;
  const isPendingIncomingFromSearched = searchedUser
    ? pendingIncoming.some((r) => r.fromUserId === searchedUser.id)
    : false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Find & Add Friends</h2>
              <p className="text-xs text-slate-500 font-mono">
                Your Handle: <span className="text-blue-600 font-semibold">{currentUser.username}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-6 pt-3 pb-2 border-b border-slate-100 flex gap-2">
          <button
            onClick={() => setActiveTab('search')}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
              activeTab === 'search'
                ? 'bg-blue-50 text-blue-700 shadow-2xs'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Search className="w-3.5 h-3.5 inline mr-1.5" />
            Find by @username
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all relative cursor-pointer ${
              activeTab === 'requests'
                ? 'bg-blue-50 text-blue-700 shadow-2xs'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Clock className="w-3.5 h-3.5 inline mr-1.5" />
            Friend Requests
            {pendingIncoming.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 bg-blue-600 text-white rounded-full text-[10px] font-bold">
                {pendingIncoming.length}
              </span>
            )}
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'search' ? (
            <div className="space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                  {error}
                </div>
              )}

              {requestSent ? (
                <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-2 animate-in fade-in">
                  <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto">
                    <Check className="w-5 h-5 stroke-[3]" />
                  </div>
                  <h3 className="text-sm font-bold text-emerald-900">Friend Request Sent!</h3>
                  <p className="text-xs text-emerald-700 max-w-xs mx-auto">
                    Your request was sent to <strong className="font-mono">{searchedUser?.username}</strong>. They will appear in your contacts once they accept.
                  </p>
                  <div className="pt-2">
                    <button
                      onClick={() => {
                        setRequestSent(false);
                        setSearchedUser(null);
                        setHandleInput('');
                      }}
                      className="px-4 py-2 bg-white border border-emerald-300 text-emerald-800 rounded-xl text-xs font-semibold hover:bg-emerald-100 transition-colors"
                    >
                      Search Another User
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <form onSubmit={handleSearch}>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Search User by @username Handle
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3.5 top-3 text-blue-600 font-mono font-bold text-sm select-none">
                          @
                        </span>
                        <input
                          type="text"
                          placeholder="username"
                          value={handleInput.replace('@', '')}
                          onChange={(e) => handleInputChange(e.target.value)}
                          className="w-full h-11 pl-8 pr-3.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm text-slate-900 font-mono placeholder:text-slate-400"
                          autoFocus
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={isSearching}
                        className="px-4 h-11 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
                      >
                        {isSearching ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Search className="w-4 h-4" />
                        )}
                        <span>Find</span>
                      </button>
                    </div>
                  </form>

                  {/* Found User Profile Result */}
                  {searchedUser && (
                    <div className="p-4 rounded-2xl border border-blue-200 bg-blue-50/50 flex items-center justify-between gap-3 animate-in fade-in">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar
                          name={searchedUser.displayName}
                          src={searchedUser.avatarUrl}
                          size="md"
                          showStatus
                          status={searchedUser.status}
                        />
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-slate-900 truncate">
                            {searchedUser.displayName}
                          </h4>
                          <span className="text-xs font-mono text-blue-600 font-semibold block">
                            {searchedUser.username}
                          </span>
                          {searchedUser.bio && (
                            <p className="text-[11px] text-slate-500 truncate mt-0.5">
                              {searchedUser.bio}
                            </p>
                          )}
                        </div>
                      </div>

                      {isAlreadyFriend ? (
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-100 px-2.5 py-1 rounded-lg">
                            Friends
                          </span>
                          <button
                            onClick={() => {
                              const existingContact = contacts.find((c) => c.id === searchedUser.id);
                              if (existingContact) onStartChat(existingContact);
                              onClose();
                            }}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Chat</span>
                          </button>
                        </div>
                      ) : isPendingOutgoingToSearched ? (
                        <span className="text-xs font-medium text-amber-700 bg-amber-100 px-3 py-1.5 rounded-xl shrink-0">
                          Request Pending
                        </span>
                      ) : isPendingIncomingFromSearched ? (
                        <div className="flex items-center gap-1 shrink-0">
                          {(() => {
                            const req = pendingIncoming.find((r) => r.fromUserId === searchedUser.id);
                            return req ? (
                              <button
                                onClick={() => handleAcceptRequest(req)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1"
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                                <span>Accept</span>
                              </button>
                            ) : null;
                          })()}
                        </div>
                      ) : (
                        <button
                          onClick={handleSendRequest}
                          disabled={isSending}
                          className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm shadow-blue-500/20 cursor-pointer disabled:opacity-60 shrink-0"
                        >
                          {isSending ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <UserPlus className="w-3.5 h-3.5" />
                          )}
                          <span>Send Request</span>
                        </button>
                      )}
                    </div>
                  )}

                  {!searchedUser && !error && (
                    <div className="text-center py-6 px-4">
                      <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
                        <Users className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-semibold text-slate-700">Find real ArfaChat users</p>
                      <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
                        Type an authenticated @username to send a friend request. Accepted connections will appear in your contacts.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Friend Requests Tab (Incoming & Outgoing) */
            <div className="space-y-4">
              {/* Sub-tab selector */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
                <button
                  onClick={() => setRequestsSubTab('incoming')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    requestsSubTab === 'incoming'
                      ? 'bg-white text-blue-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Incoming ({pendingIncoming.length})
                </button>
                <button
                  onClick={() => setRequestsSubTab('outgoing')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    requestsSubTab === 'outgoing'
                      ? 'bg-white text-blue-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Outgoing ({pendingOutgoing.length})
                </button>
              </div>

              {requestsSubTab === 'incoming' ? (
                <div className="space-y-3">
                  {pendingIncoming.length === 0 ? (
                    <div className="text-center py-8">
                      <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-slate-700">No incoming friend requests</p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        When other users send you a request using your @{currentUser.username.replace('@', '')} handle, they will appear here.
                      </p>
                    </div>
                  ) : (
                    pendingIncoming.map((req) => (
                      <div
                        key={req.id}
                        className="p-3.5 rounded-2xl border border-slate-200 bg-white shadow-xs flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar
                            name={req.fromDisplayName}
                            src={req.fromAvatarUrl}
                            size="md"
                          />
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-slate-900 truncate">
                              {req.fromDisplayName}
                            </h4>
                            <span className="text-[11px] font-mono text-blue-600 block">
                              {req.fromUsername}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {req.createdAt ? new Date(req.createdAt).toLocaleDateString() : 'Pending'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => handleAcceptRequest(req)}
                            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1 shadow-xs cursor-pointer"
                            title="Accept friend request"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Accept</span>
                          </button>
                          <button
                            onClick={() => handleRejectRequest(req.id)}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer"
                            title="Reject friend request"
                          >
                            <UserX className="w-3.5 h-3.5" />
                            <span>Decline</span>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingOutgoing.length === 0 ? (
                    <div className="text-center py-8">
                      <Send className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-slate-700">No outgoing friend requests</p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Friend requests you have sent that are waiting for acceptance will appear here.
                      </p>
                    </div>
                  ) : (
                    pendingOutgoing.map((req) => (
                      <div
                        key={req.id}
                        className="p-3.5 rounded-2xl border border-slate-200 bg-white shadow-xs flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar
                            name={req.toDisplayName || req.toUsername}
                            src={req.toAvatarUrl}
                            size="md"
                          />
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-slate-900 truncate">
                              {req.toDisplayName || req.toUsername}
                            </h4>
                            <span className="text-[11px] font-mono text-blue-600 block">
                              {req.toUsername}
                            </span>
                            <span className="text-[10px] text-amber-600 font-medium">
                              Waiting for response...
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => handleCancelRequest(req.id)}
                            className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                            title="Cancel friend request"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Cancel</span>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
