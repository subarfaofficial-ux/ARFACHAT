import React, { useState, useEffect, useRef } from 'react';
import {
  User,
  Contact,
  Conversation,
  Message,
  CallLog,
  StatusUpdate,
  ActiveCall,
  IncomingCall,
  FriendRequest,
} from './types';
import {
  initialCurrentUser,
  initialContacts,
  initialConversations,
  initialMessagesMap,
  initialCallLogs,
  initialStatusUpdates,
} from './data/mockData';
import { AuthScreen } from './components/auth/AuthScreen';
import { AppHeader } from './components/layout/AppHeader';
import { BottomNavigation } from './components/layout/BottomNavigation';
import { ChatList } from './components/chat/ChatList';
import { ChatView } from './components/chat/ChatView';
import { UpdatesView } from './components/updates/UpdatesView';
import { CallsView } from './components/calls/CallsView';
import { ContactListModal } from './components/contacts/ContactListModal';
import { AddFriendModal } from './components/modals/AddFriendModal';
import { ProfileSettingsModal } from './components/modals/ProfileSettingsModal';
import { IncomingCallModal } from './components/modals/IncomingCallModal';
import { VoiceCallScreen } from './components/calls/VoiceCallScreen';
import { VideoCallScreen } from './components/calls/VideoCallScreen';
import { ExportMenuModal } from './components/modals/ExportMenuModal';
import { MessageSquare, Smartphone, X, UserPlus, PhoneCall } from 'lucide-react';
import { soundFX } from './utils/soundEffects';
import {
  auth,
  db,
  logoutUser,
  subscribeToFriendRequests,
  subscribeToOutgoingFriendRequests,
  subscribeToContacts,
  updateUserProfile,
  setUserPresence,
  getConversationId,
  sendMessageToFirestore,
  subscribeToConversations,
  subscribeToMessages,
  markConversationAsRead,
} from './lib/firebase';
import { WebRTCCallSession, subscribeToIncomingCalls } from './lib/webrtc';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(initialCurrentUser);
  const [activeTab, setActiveTab] = useState<'chats' | 'updates' | 'calls'>('chats');

  // Contact & Chat States
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [messagesMap, setMessagesMap] = useState<Record<string, Message[]>>(initialMessagesMap);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isMessagesLoading, setIsMessagesLoading] = useState(false);

  // Call States
  const [callLogs, setCallLogs] = useState<CallLog[]>(initialCallLogs);
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const callSessionRef = useRef<WebRTCCallSession | null>(null);

  // Status/Updates States
  const [statusUpdates, setStatusUpdates] = useState<StatusUpdate[]>(initialStatusUpdates);

  // Modal States
  const [isAddFriendOpen, setIsAddFriendOpen] = useState(false);
  const [isContactsOpen, setIsContactsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

  // Mobile Viewport detection
  const [isMobile, setIsMobile] = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [showAndroidBanner, setShowAndroidBanner] = useState(true);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', fbUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setCurrentUser({
              id: fbUser.uid,
              username: data.username || `@${fbUser.email?.split('@')[0] || 'user'}`,
              displayName: data.displayName || fbUser.displayName || 'Subarfa',
              email: fbUser.email || '',
              avatarUrl: data.avatarUrl || fbUser.photoURL || '',
              bio: data.bio || 'Building the next-gen real-time communication platform 🚀',
              status: 'online',
              joinedDate: data.createdAt ? new Date(data.createdAt).toLocaleDateString() : 'October 2026',
            });
          }
        } catch (e) {
          console.warn('Could not fetch user document:', e);
        }
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // Realtime listeners for Friend Requests and Contacts
  useEffect(() => {
    // CRITICAL: Only attach Firestore listeners if user is actively signed into Firebase Auth
    if (!auth.currentUser || !currentUser || currentUser.id !== auth.currentUser.uid) return;

    let unsubRequests: (() => void) | undefined;
    let unsubOutgoing: (() => void) | undefined;
    let unsubContacts: (() => void) | undefined;
    let unsubConvs: (() => void) | undefined;

    try {
      unsubRequests = subscribeToFriendRequests(currentUser.id, (incoming) => {
        setFriendRequests(incoming);
      });
    } catch (e) {
      console.warn('Could not subscribe to friend requests:', e);
    }

    try {
      unsubOutgoing = subscribeToOutgoingFriendRequests(currentUser.id, (outgoing) => {
        setOutgoingRequests(outgoing);
      });
    } catch (e) {
      console.warn('Could not subscribe to outgoing friend requests:', e);
    }

    try {
      unsubContacts = subscribeToContacts(currentUser.id, (remoteContacts) => {
        setContacts(remoteContacts || []);
      });
    } catch (e) {
      console.warn('Could not subscribe to contacts:', e);
    }

    try {
      unsubConvs = subscribeToConversations(currentUser.id, (remoteConvs) => {
        setConversations(remoteConvs || []);
      });
    } catch (e) {
      console.warn('Could not subscribe to conversations:', e);
    }

    let unsubCalls: (() => void) | undefined;
    try {
      unsubCalls = subscribeToIncomingCalls(
        currentUser.id,
        (incoming) => {
          // If we are already on an active call, ignore or reject
          setIncomingCall((prev) => {
            if (prev?.callId === incoming.callId) return prev;
            soundFX.startIncomingRingtone();
            return incoming;
          });
        },
        (cancelledCallId) => {
          setIncomingCall((prev) => {
            if (prev?.callId === cancelledCallId) {
              soundFX.stopRing();
              return null;
            }
            return prev;
          });
        }
      );
    } catch (e) {
      console.warn('Could not subscribe to incoming calls:', e);
    }

    return () => {
      if (unsubRequests) unsubRequests();
      if (unsubOutgoing) unsubOutgoing();
      if (unsubContacts) unsubContacts();
      if (unsubConvs) unsubConvs();
      if (unsubCalls) unsubCalls();
    };
  }, [currentUser?.id]);

  // Manage user presence (online/away/offline)
  useEffect(() => {
    if (!currentUser?.id || !auth.currentUser || currentUser.id !== auth.currentUser.uid) return;

    setUserPresence(currentUser.id, 'online');

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        setUserPresence(currentUser.id, 'away');
      } else {
        setUserPresence(currentUser.id, 'online');
      }
    };

    const handleBeforeUnload = () => {
      setUserPresence(currentUser.id, 'offline');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      setUserPresence(currentUser.id, 'offline');
    };
  }, [currentUser?.id]);

  // Realtime listener for active conversation messages
  useEffect(() => {
    if (!activeConversationId || !currentUser) return;

    if (auth.currentUser && currentUser.id === auth.currentUser.uid) {
      setIsMessagesLoading(true);

      // Reset unread count for current user
      markConversationAsRead(activeConversationId, currentUser.id);

      const unsubMessages = subscribeToMessages(
        activeConversationId,
        currentUser.id,
        (remoteMessages) => {
          setIsMessagesLoading(false);
          if (remoteMessages && remoteMessages.length > 0) {
            setMessagesMap((prev) => ({
              ...prev,
              [activeConversationId]: remoteMessages,
            }));
          }
        },
        () => {
          setIsMessagesLoading(false);
        }
      );

      return () => {
        unsubMessages();
      };
    }
  }, [activeConversationId, currentUser?.id]);

  // Compute unread messages count
  const totalUnreadCount = conversations.reduce((acc, c) => acc + c.unreadCount, 0);

  // Compute missed calls count
  const missedCallsCount = callLogs.filter((c) => c.direction === 'missed').length;

  // Has new updates
  const hasNewUpdates = statusUpdates.some((s) => !s.viewed);

  // Pending incoming friend requests
  const pendingRequestsCount = friendRequests.filter((r) => r.status === 'pending').length;

  // Handlers for sending messages
  const handleSendMessage = async (
    conversationId: string,
    text: string,
    type: 'text' | 'voice' | 'image' = 'text',
    voiceDuration?: number
  ) => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newMessage: Message = {
      id: `m_${Date.now()}`,
      conversationId,
      senderId: 'me',
      text,
      timestamp: timeStr,
      status: 'sent',
      type,
      voiceDuration,
    };

    // Optimistic local state update
    setMessagesMap((prev) => ({
      ...prev,
      [conversationId]: [...(prev[conversationId] || []), newMessage],
    }));

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === conversationId) {
          return {
            ...c,
            lastMessage: newMessage,
          };
        }
        return c;
      })
    );

    // If authenticated in Firebase, persist message to Firestore
    const conv = conversations.find((c) => c.id === conversationId);
    if (auth.currentUser && currentUser && currentUser.id === auth.currentUser.uid && conv) {
      try {
        await sendMessageToFirestore(
          conversationId,
          currentUser,
          conv.participant,
          text,
          type,
          voiceDuration
        );
      } catch (e) {
        console.warn('Could not persist message to Firestore, retained locally:', e);
      }
    }
  };

  // Add new contact to list and create default conversation
  const handleAddContact = (newContact: Contact) => {
    setContacts((prev) => {
      const exists = prev.some((c) => c.id === newContact.id || c.username === newContact.username);
      if (exists) return prev;
      return [newContact, ...prev];
    });

    let convId: string;
    if (auth.currentUser && currentUser && currentUser.id === auth.currentUser.uid) {
      convId = getConversationId(currentUser.id, newContact.id);
    } else {
      convId = `conv_${newContact.id}`;
    }

    const newConv: Conversation = {
      id: convId,
      participant: newContact,
      unreadCount: 0,
      pinned: false,
      lastMessage: {
        id: `m_${Date.now()}`,
        conversationId: convId,
        senderId: 'me',
        text: `Connected with ${newContact.username} on ArfaChat! 👋`,
        timestamp: 'Just now',
        status: 'read',
        type: 'text',
      },
    };

    setConversations((prev) => {
      if (prev.some((c) => c.id === convId || c.participant.id === newContact.id)) return prev;
      return [newConv, ...prev];
    });

    setMessagesMap((prev) => ({
      ...prev,
      [convId]: [newConv.lastMessage!],
    }));
  };

  const handleStartChat = (contact: Contact) => {
    let convId: string;
    if (auth.currentUser && currentUser && currentUser.id === auth.currentUser.uid) {
      convId = getConversationId(currentUser.id, contact.id);
    } else {
      const existing = conversations.find((c) => c.participant.id === contact.id);
      convId = existing ? existing.id : `conv_${contact.id}`;
    }

    let conv = conversations.find((c) => c.id === convId || c.participant.id === contact.id);
    if (!conv) {
      conv = {
        id: convId,
        participant: contact,
        unreadCount: 0,
        pinned: false,
      };
      setConversations((prev) => [conv!, ...prev]);
      setMessagesMap((prev) => ({
        ...prev,
        [convId]: prev[convId] || [],
      }));
    }

    setActiveConversationId(conv.id);
    setActiveTab('chats');
    if (isMobile) {
      setMobileShowChat(true);
    }
  };

  // WebRTC Calling Handlers
  const handleStartCall = (contact: Contact, type: 'voice' | 'video') => {
    if (activeCall) return;

    soundFX.startOutgoingRingback();

    // If authenticated in Firebase, initiate real WebRTC signaling through Firestore
    if (auth.currentUser && currentUser && currentUser.id === auth.currentUser.uid) {
      const callId = `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      setActiveCall({
        callId,
        contact,
        type,
        status: 'connecting',
        startedAt: Date.now(),
        isMuted: false,
        isVideoOff: false,
        isSpeakerOn: true,
        isScreenSharing: false,
      });

      const session = new WebRTCCallSession({
        onLocalStreamReady: (stream) => {
          setActiveCall((prev) => (prev ? { ...prev, localStream: stream } : null));
        },
        onRemoteStream: (stream) => {
          setActiveCall((prev) => (prev ? { ...prev, remoteStream: stream } : null));
        },
        onCallConnected: () => {
          soundFX.stopRing();
          soundFX.playConnected();
          setActiveCall((prev) => (prev ? { ...prev, status: 'connected' } : null));
        },
        onCallEnded: () => {
          soundFX.stopRing();
          soundFX.playEndCall();
          handleEndCall();
        },
        onError: (err) => {
          console.warn('WebRTC outgoing call error:', err);
          setActiveCall((prev) => (prev ? { ...prev, mediaError: err.message } : null));
        },
      });

      callSessionRef.current = session;
      session.startCall(callId, currentUser, contact, type).catch((err) => {
        console.warn('startCall failed:', err);
        setActiveCall((prev) => (prev ? { ...prev, mediaError: err.message } : null));
      });
    } else {
      // Offline / Preview mode simulation
      setActiveCall({
        contact,
        type,
        status: 'connected',
        startedAt: Date.now(),
        isMuted: false,
        isVideoOff: false,
        isSpeakerOn: true,
        isScreenSharing: false,
      });

      setTimeout(() => {
        soundFX.playConnected();
      }, 1500);
    }
  };

  const handleEndCall = () => {
    soundFX.stopRing();
    if (callSessionRef.current) {
      callSessionRef.current.endCall().catch((e) => console.warn(e));
      callSessionRef.current.cleanup();
      callSessionRef.current = null;
    }

    if (activeCall) {
      const elapsed = Math.round((Date.now() - activeCall.startedAt) / 1000);
      const mins = Math.floor(elapsed / 60);
      const secs = elapsed % 60;
      const durationStr = `${mins}m ${secs}s`;

      const newLog: CallLog = {
        id: `call_${Date.now()}`,
        contact: activeCall.contact,
        type: activeCall.type,
        direction: 'outgoing',
        timestamp: 'Just now',
        duration: durationStr,
      };

      setCallLogs((prev) => [newLog, ...prev]);
    }
    setActiveCall(null);
  };


  const handleAcceptIncomingCall = (call: IncomingCall) => {
    soundFX.stopRing();
    setIncomingCall(null);

    setActiveCall({
      callId: call.callId,
      contact: call.contact,
      type: call.type,
      status: 'connecting',
      startedAt: Date.now(),
      isMuted: false,
      isVideoOff: false,
      isSpeakerOn: true,
      isScreenSharing: false,
    });

    if (call.callId && auth.currentUser && currentUser && currentUser.id === auth.currentUser.uid) {
      const session = new WebRTCCallSession({
        onLocalStreamReady: (stream) => {
          setActiveCall((prev) => (prev ? { ...prev, localStream: stream } : null));
        },
        onRemoteStream: (stream) => {
          setActiveCall((prev) => (prev ? { ...prev, remoteStream: stream } : null));
        },
        onCallConnected: () => {
          soundFX.stopRing();
          soundFX.playConnected();
          setActiveCall((prev) => (prev ? { ...prev, status: 'connected' } : null));
        },
        onCallEnded: () => {
          soundFX.stopRing();
          soundFX.playEndCall();
          handleEndCall();
        },
        onError: (err) => {
          console.warn('WebRTC incoming call error:', err);
          setActiveCall((prev) => (prev ? { ...prev, mediaError: err.message } : null));
        },
      });

      callSessionRef.current = session;
      session.answerCall(call.callId, call.type).catch((err) => {
        console.warn('answerCall failed:', err);
        setActiveCall((prev) => (prev ? { ...prev, mediaError: err.message } : null));
      });
    } else {
      // Offline / Preview simulation
      setTimeout(() => {
        soundFX.playConnected();
        setActiveCall((prev) => (prev ? { ...prev, status: 'connected' } : null));
      }, 400);
    }
  };

  const handleDeclineIncomingCall = (call: IncomingCall) => {
    soundFX.stopRing();
    soundFX.playEndCall();
    setIncomingCall(null);

    if (call.callId && auth.currentUser) {
      WebRTCCallSession.rejectCall(call.callId).catch((e) => console.warn(e));
    }

    const newLog: CallLog = {
      id: `call_${Date.now()}`,
      contact: call.contact,
      type: call.type,
      direction: 'missed',
      timestamp: 'Just now',
    };
    setCallLogs((prev) => [newLog, ...prev]);
  };

  const handleToggleMute = (muted: boolean) => {
    setActiveCall((prev) => (prev ? { ...prev, isMuted: muted } : null));
    if (callSessionRef.current) {
      callSessionRef.current.toggleMute(muted);
    }
  };

  const handleToggleVideo = (videoOff: boolean) => {
    setActiveCall((prev) => (prev ? { ...prev, isVideoOff: videoOff } : null));
    if (callSessionRef.current) {
      callSessionRef.current.toggleVideo(videoOff);
    }
  };

  // Add Status Story handler
  const handleAddStatus = (caption: string, gradientBackground: string) => {
    const newStatus: StatusUpdate = {
      id: `st_${Date.now()}`,
      contact: {
        id: currentUser?.id || 'me',
        username: currentUser?.username || '@subarfa',
        displayName: currentUser?.displayName || 'Subarfa',
        avatarUrl: currentUser?.avatarUrl,
        status: 'online',
      },
      timestamp: 'Just now',
      caption,
      gradientBackground,
      viewed: false,
    };
    setStatusUpdates((prev) => [newStatus, ...prev]);
  };

  const handleReplyToStatus = (contact: Contact, message: string) => {
    handleStartChat(contact);
    setTimeout(() => {
      const conv = conversations.find((c) => c.participant.id === contact.id);
      if (conv) {
        handleSendMessage(conv.id, message, 'text');
      }
    }, 200);
  };

  const handleLogout = async () => {
    if (currentUser?.id) {
      await setUserPresence(currentUser.id, 'offline');
    }
    try {
      await logoutUser();
    } catch {
      // ignore
    }
    setCurrentUser(null);
    setConversations([]);
    setContacts([]);
    setFriendRequests([]);
    setOutgoingRequests([]);
    setActiveConversationId(null);
  };

  const handleUpdateProfile = async (updated: Partial<User>) => {
    setCurrentUser((prev) => (prev ? { ...prev, ...updated } : prev));
    if (currentUser?.id) {
      try {
        await updateUserProfile(currentUser.id, updated);
      } catch (e) {
        console.warn('Could not persist profile changes to Firestore:', e);
      }
    }
  };

  // If not logged in, render the AuthScreen
  if (!currentUser) {
    return <AuthScreen onLoginSuccess={(user) => setCurrentUser(user)} />;
  }

  const activeConversation = conversations.find((c) => c.id === activeConversationId);
  const activeMessages = activeConversationId ? messagesMap[activeConversationId] || [] : [];

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-100 overflow-hidden font-sans">
      {/* Top Application Bar */}
      <AppHeader
        currentUser={currentUser}
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          setMobileShowChat(false);
        }}
        unreadCount={totalUnreadCount}
        missedCallsCount={missedCallsCount}
        hasNewUpdates={hasNewUpdates}
        pendingRequestsCount={pendingRequestsCount}
        onOpenAddFriend={() => setIsAddFriendOpen(true)}
        onOpenContacts={() => setIsContactsOpen(true)}
        onOpenProfile={() => setIsProfileOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
      />

      {/* Android Mobile Quick App Banner */}
      {showAndroidBanner && isMobile && (
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-sky-700 text-white px-3.5 py-2 flex items-center justify-between text-xs shadow-xs z-20 shrink-0 select-none">
          <div
            onClick={() => setIsExportOpen(true)}
            className="flex items-center gap-2.5 cursor-pointer flex-1 mr-2"
          >
            <div className="w-7 h-7 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center shrink-0">
              <Smartphone className="w-4 h-4 text-emerald-300" />
            </div>
            <div className="flex flex-col text-left">
              <span className="font-bold text-xs leading-tight">Install ArfaChat Android App</span>
              <span className="text-[10px] text-blue-200">Tap to download APK v1.0.0 or add to home screen</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsExportOpen(true)}
              className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold shadow-xs transition-colors cursor-pointer"
            >
              Get App
            </button>
            <button
              onClick={() => setShowAndroidBanner(false)}
              className="p-1 rounded-lg hover:bg-white/10 text-blue-200 hover:text-white transition-colors cursor-pointer"
              aria-label="Dismiss banner"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Workspace Frame */}
      <main className="flex-1 flex overflow-hidden relative pb-16 sm:pb-0">
        {activeTab === 'chats' && (
          <div className="w-full h-full flex overflow-hidden">
            {/* Sidebar Chat List (Hidden on mobile if chat open) */}
            <div
              className={`w-full md:w-80 lg:w-96 shrink-0 h-full ${
                isMobile && mobileShowChat ? 'hidden' : 'block'
              }`}
            >
              <ChatList
                conversations={conversations}
                activeConversationId={activeConversationId}
                currentUserId={currentUser.id}
                onSelectConversation={(conv) => {
                  setActiveConversationId(conv.id);
                  setConversations((prev) =>
                    prev.map((c) => (c.id === conv.id ? { ...c, unreadCount: 0 } : c))
                  );
                  if (auth.currentUser && currentUser && currentUser.id === auth.currentUser.uid) {
                    markConversationAsRead(conv.id, currentUser.id);
                  }
                  if (isMobile) {
                    setMobileShowChat(true);
                  }
                }}
                onOpenAddFriend={() => setIsAddFriendOpen(true)}
                onOpenContacts={() => setIsContactsOpen(true)}
              />
            </div>

            {/* Active Chat Conversation View */}
            <div
              className={`flex-1 h-full ${
                isMobile && !mobileShowChat ? 'hidden' : 'block'
              }`}
            >
              {activeConversation ? (
                <ChatView
                  conversation={activeConversation}
                  messages={activeMessages}
                  isLoadingMessages={isMessagesLoading}
                  onSendMessage={handleSendMessage}
                  onStartCall={handleStartCall}
                  onBack={() => setMobileShowChat(false)}
                  isMobile={isMobile}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-slate-50">
                  <div className="w-16 h-16 rounded-3xl bg-blue-100 text-blue-600 flex items-center justify-center mb-3">
                    <MessageSquare className="w-8 h-8" />
                  </div>
                  <h3 className="text-base font-bold text-slate-800">Select a conversation</h3>
                  <p className="text-xs text-slate-500 max-w-xs mt-1">
                    Choose a chat from the sidebar or click Add Friend to connect via @username.
                  </p>
                  <button
                    onClick={() => setIsAddFriendOpen(true)}
                    className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs"
                  >
                    Add Friend by @username
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'updates' && (
          <UpdatesView
            currentUser={currentUser}
            statusUpdates={statusUpdates}
            onAddStatus={handleAddStatus}
            onReplyToStatus={handleReplyToStatus}
            onOpenAddFriend={() => setIsAddFriendOpen(true)}
          />
        )}

        {activeTab === 'calls' && (
          <CallsView
            callLogs={callLogs}
            onStartCall={handleStartCall}
            onOpenContacts={() => setIsContactsOpen(true)}
          />
        )}
      </main>

      {/* Android Mobile Floating Action Button (FAB) */}
      {isMobile && !mobileShowChat && (
        <div className="fixed bottom-20 right-4 z-30 flex flex-col items-end gap-2 pointer-events-auto">
          {activeTab === 'chats' && (
            <button
              onClick={() => setIsAddFriendOpen(true)}
              className="w-13 h-13 rounded-2xl bg-blue-600 active:bg-blue-700 text-white shadow-lg shadow-blue-500/30 flex items-center justify-center active:scale-95 transition-all cursor-pointer"
              title="Add Friend by @username"
              aria-label="Add Friend"
            >
              <UserPlus className="w-5 h-5" />
            </button>
          )}
          {activeTab === 'calls' && (
            <button
              onClick={() => setIsContactsOpen(true)}
              className="w-13 h-13 rounded-2xl bg-emerald-600 active:bg-emerald-700 text-white shadow-lg shadow-emerald-500/30 flex items-center justify-center active:scale-95 transition-all cursor-pointer"
              title="Start a new call"
              aria-label="Start Call"
            >
              <PhoneCall className="w-5 h-5" />
            </button>
          )}
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      <BottomNavigation
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          setMobileShowChat(false);
        }}
        unreadCount={totalUnreadCount}
        missedCallsCount={missedCallsCount}
        hasNewUpdates={hasNewUpdates}
        onOpenContacts={() => setIsContactsOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
      />

      {/* Modals & Full-screen Overlays */}
      <AddFriendModal
        isOpen={isAddFriendOpen}
        onClose={() => setIsAddFriendOpen(false)}
        currentUser={currentUser}
        contacts={contacts}
        friendRequests={friendRequests}
        outgoingRequests={outgoingRequests}
        onAddContact={handleAddContact}
        onStartChat={handleStartChat}
      />

      <ContactListModal
        isOpen={isContactsOpen}
        onClose={() => setIsContactsOpen(false)}
        contacts={contacts}
        onStartChat={handleStartChat}
        onStartCall={handleStartCall}
        onOpenAddFriend={() => {
          setIsContactsOpen(false);
          setIsAddFriendOpen(true);
        }}
      />

      <ProfileSettingsModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        currentUser={currentUser}
        onUpdateUser={handleUpdateProfile}
        onLogout={handleLogout}
        onOpenExport={() => setIsExportOpen(true)}
      />

      {/* Export Menu & Android APK Download Modal */}
      <ExportMenuModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        currentUser={currentUser}
        contacts={contacts}
        conversations={conversations}
      />

      {/* Incoming Call Modal */}
      <IncomingCallModal
        incomingCall={incomingCall}
        onAccept={handleAcceptIncomingCall}
        onDecline={handleDeclineIncomingCall}
      />

      {/* Separate Voice Call Screen */}
      {activeCall && activeCall.type === 'voice' && (
        <VoiceCallScreen
          call={activeCall}
          onEndCall={handleEndCall}
          onToggleMute={handleToggleMute}
          onSwitchToVideo={() =>
            setActiveCall((prev) => (prev ? { ...prev, type: 'video' } : null))
          }
        />
      )}

      {/* Separate Video Call Screen */}
      {activeCall && activeCall.type === 'video' && (
        <VideoCallScreen
          call={activeCall}
          onEndCall={handleEndCall}
          onToggleMute={handleToggleMute}
          onToggleVideo={handleToggleVideo}
          onSwitchToVoice={() =>
            setActiveCall((prev) => (prev ? { ...prev, type: 'voice' } : null))
          }
        />
      )}
    </div>
  );
}
