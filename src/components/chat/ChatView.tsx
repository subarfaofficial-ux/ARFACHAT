import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  Phone,
  Video,
  MoreVertical,
  Smile,
  Paperclip,
  Send,
  Mic,
  Square,
  Play,
  Pause,
  Check,
  CheckCheck,
  Image as ImageIcon,
  Heart,
  ThumbsUp,
  Laugh,
  X,
  MessageSquare,
} from 'lucide-react';
import { Conversation, Message, Contact } from '../../types';
import { Avatar } from '../common/Avatar';
import { soundFX } from '../../utils/soundEffects';

interface ChatViewProps {
  conversation: Conversation;
  messages: Message[];
  isLoadingMessages?: boolean;
  onSendMessage: (conversationId: string, text: string, type?: 'text' | 'voice' | 'image', voiceDuration?: number) => void;
  onStartCall: (contact: Contact, type: 'voice' | 'video') => void;
  onBack: () => void;
  isMobile: boolean;
}

export const ChatView: React.FC<ChatViewProps> = ({
  conversation,
  messages,
  isLoadingMessages = false,
  onSendMessage,
  onStartCall,
  onBack,
  isMobile,
}) => {
  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [voiceSeconds, setVoiceSeconds] = useState(0);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const voiceTimerRef = useRef<number | null>(null);

  const { participant } = conversation;

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Voice recording duration timer
  useEffect(() => {
    if (isRecordingVoice) {
      setVoiceSeconds(0);
      voiceTimerRef.current = window.setInterval(() => {
        setVoiceSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (voiceTimerRef.current) clearInterval(voiceTimerRef.current);
    }
    return () => {
      if (voiceTimerRef.current) clearInterval(voiceTimerRef.current);
    };
  }, [isRecordingVoice]);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    const text = inputText.trim();
    setInputText('');
    setShowEmojiPicker(false);
    soundFX.playMessageSent();
    onSendMessage(conversation.id, text, 'text');
  };

  const handleSendVoiceNote = () => {
    setIsRecordingVoice(false);
    const duration = Math.max(3, voiceSeconds);
    soundFX.playMessageSent();
    onSendMessage(conversation.id, `Voice message (${duration}s)`, 'voice', duration);
  };

  const togglePlayVoice = (msgId: string) => {
    if (playingVoiceId === msgId) {
      setPlayingVoiceId(null);
    } else {
      setPlayingVoiceId(msgId);
      setTimeout(() => {
        setPlayingVoiceId(null);
      }, 3000);
    }
  };

  const emojis = ['👍', '❤️', '🔥', '😂', '🎉', '👏', '🚀', '💯', '👋', '✨', '👌', '🙌'];

  return (
    <div className="w-full h-full flex flex-col bg-slate-50 relative overflow-hidden">
      {/* Chat Header */}
      <div className="h-16 bg-white border-b border-slate-200 px-3 sm:px-5 flex items-center justify-between shrink-0 shadow-xs z-10">
        <div className="flex items-center gap-2.5 min-w-0">
          {isMobile && (
            <button
              onClick={onBack}
              className="w-8 h-8 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-600 mr-1"
              title="Back to chats"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          <div
            className="flex items-center gap-2.5 min-w-0 cursor-pointer"
            onClick={() => setShowContactInfo(!showContactInfo)}
          >
            <Avatar
              name={participant.displayName}
              src={participant.avatarUrl}
              size="md"
              showStatus
              status={participant.status}
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold text-slate-900 truncate">
                  {participant.displayName}
                </h3>
                <span className="text-xs text-blue-600 font-mono font-medium hidden sm:inline">
                  {participant.username}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 truncate flex items-center gap-1">
                {isTyping ? (
                  <span className="text-blue-600 font-medium animate-pulse">Typing...</span>
                ) : participant.status === 'online' ? (
                  <span className="text-emerald-600 font-medium">Active now</span>
                ) : (
                  <span>{participant.lastSeen || 'Offline'}</span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Call Actions */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <button
            onClick={() => onStartCall(participant, 'voice')}
            className="w-10 h-10 rounded-xl text-emerald-600 hover:bg-emerald-50 border border-emerald-100 flex items-center justify-center transition-colors cursor-pointer"
            title="Start Voice Call"
          >
            <Phone className="w-4 h-4" />
          </button>
          <button
            onClick={() => onStartCall(participant, 'video')}
            className="w-10 h-10 rounded-xl text-blue-600 hover:bg-blue-50 border border-blue-100 flex items-center justify-center transition-colors cursor-pointer"
            title="Start Video Call"
          >
            <Video className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowContactInfo(!showContactInfo)}
            className="w-10 h-10 rounded-xl text-slate-500 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
            title="Contact Info"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Chat Thread */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5">
        {isLoadingMessages && messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-12">
            <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin mb-3" />
            <p className="text-xs font-semibold text-slate-700">Loading conversation history...</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Fetching encrypted messages from Firebase</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-12 px-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-2">
              <MessageSquare className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-800">Say hello to {participant.displayName}!</p>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              No messages here yet. Send a message or voice note to start the conversation.
            </p>
          </div>
        ) : (
          <>
            {/* Date separator */}
            <div className="flex items-center justify-center my-2">
              <span className="px-3 py-1 rounded-full bg-slate-200/80 text-[11px] font-medium text-slate-600">
                Today
              </span>
            </div>

            {/* Messages */}
            {messages.map((msg) => {
          const isMe = msg.senderId === 'me';

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group`}
            >
              <div
                className={`max-w-[85%] sm:max-w-[70%] rounded-2xl p-3 shadow-xs transition-all relative ${
                  isMe
                    ? 'bg-blue-600 text-white rounded-br-xs'
                    : 'bg-white text-slate-900 border border-slate-200/80 rounded-bl-xs'
                }`}
              >
                {/* Voice Note Bubble */}
                {msg.type === 'voice' ? (
                  <div className="flex items-center gap-3 min-w-[200px] py-1">
                    <button
                      onClick={() => togglePlayVoice(msg.id)}
                      className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95 ${
                        isMe ? 'bg-white text-blue-600' : 'bg-blue-600 text-white'
                      }`}
                    >
                      {playingVoiceId === msg.id ? (
                        <Pause className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4 ml-0.5" />
                      )}
                    </button>
                    <div className="flex-1">
                      {/* Waveform preview bars */}
                      <div className="flex items-center gap-0.75 h-5">
                        {[40, 70, 90, 60, 100, 45, 80, 65, 95, 50, 75, 30, 85, 40].map((h, idx) => (
                          <div
                            key={idx}
                            className={`w-0.75 rounded-full transition-all ${
                              isMe
                                ? playingVoiceId === msg.id
                                  ? 'bg-white animate-pulse'
                                  : 'bg-blue-200'
                                : playingVoiceId === msg.id
                                ? 'bg-blue-600 animate-pulse'
                                : 'bg-slate-300'
                            }`}
                            style={{ height: `${h}%` }}
                          />
                        ))}
                      </div>
                      <span
                        className={`text-[10px] font-mono mt-0.5 block ${
                          isMe ? 'text-blue-100' : 'text-slate-400'
                        }`}
                      >
                        0:{msg.voiceDuration?.toString().padStart(2, '0') || '14'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>
                )}

                {/* Message Metadata (Timestamp + Read receipt) */}
                <div
                  className={`flex items-center justify-end gap-1 text-[10px] mt-1 select-none ${
                    isMe ? 'text-blue-100' : 'text-slate-400'
                  }`}
                >
                  <span className="font-mono">{msg.timestamp}</span>
                  {isMe && (
                    <span>
                      {msg.status === 'read' ? (
                        <CheckCheck className="w-3.5 h-3.5 text-sky-200" />
                      ) : (
                        <Check className="w-3.5 h-3.5 text-blue-200" />
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
          </>
        )}

        {/* Typing Bubble */}
        {isTyping && (
          <div className="flex items-center gap-2">
            <Avatar name={participant.displayName} src={participant.avatarUrl} size="xs" />
            <div className="bg-white border border-slate-200 px-3.5 py-2.5 rounded-2xl rounded-bl-xs shadow-xs flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" />
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce [animation-delay:0.4s]" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Emoji Picker Popup */}
      {showEmojiPicker && (
        <div className="absolute bottom-20 left-4 z-30 p-2.5 bg-white rounded-2xl shadow-xl border border-slate-200 grid grid-cols-6 gap-1.5 animate-in fade-in zoom-in-95 duration-150">
          {emojis.map((emoji) => (
            <button
              key={emoji}
              onClick={() => {
                setInputText((prev) => prev + emoji);
              }}
              className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-lg active:scale-95 transition-transform"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Input Bar */}
      <div className="p-3 sm:p-4 bg-white border-t border-slate-200 z-10">
        {isRecordingVoice ? (
          <div className="flex items-center justify-between gap-3 p-2 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 animate-pulse">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-600 animate-ping" />
              <span className="text-xs font-semibold">Recording Voice Note...</span>
              <span className="text-xs font-mono font-bold">
                0:{voiceSeconds.toString().padStart(2, '0')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsRecordingVoice(false)}
                className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSendVoiceNote}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1"
              >
                <Send className="w-3 h-3" />
                <span>Send</span>
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSend} className="flex items-center gap-2">
            {/* Attachment Button */}
            <button
              type="button"
              onClick={() => {
                // Attach simulated image message
                soundFX.playMessageSent();
                onSendMessage(
                  conversation.id,
                  'Shared a high-resolution screenshot with you.',
                  'text'
                );
              }}
              className="w-10 h-10 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
              title="Attach File or Image"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {/* Emoji Trigger */}
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="w-10 h-10 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
              title="Add Emoji"
            >
              <Smile className="w-4 h-4" />
            </button>

            {/* Input Field */}
            <input
              type="text"
              placeholder={`Message @${participant.username.replace('@', '')}...`}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 h-11 px-4 rounded-xl bg-slate-100/90 border border-slate-200/80 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm text-slate-900 placeholder:text-slate-400 transition-all"
            />

            {/* Voice record or Send button */}
            {inputText.trim() ? (
              <button
                type="submit"
                className="w-11 h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-all shadow-md shadow-blue-600/20 active:scale-95 cursor-pointer"
                title="Send Message"
              >
                <Send className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsRecordingVoice(true)}
                className="w-11 h-11 rounded-xl bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 flex items-center justify-center transition-colors cursor-pointer"
                title="Record voice note"
              >
                <Mic className="w-4 h-4" />
              </button>
            )}
          </form>
        )}
      </div>

      {/* Slide-out Contact Info Drawer */}
      {showContactInfo && (
        <div className="absolute top-0 right-0 bottom-0 w-80 bg-white border-l border-slate-200 z-20 shadow-2xl flex flex-col p-6 animate-in slide-in-from-right-4 duration-200">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-sm font-bold text-slate-900">Contact Details</h4>
            <button
              onClick={() => setShowContactInfo(false)}
              className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="text-center pb-6 border-b border-slate-100">
            <Avatar
              name={participant.displayName}
              src={participant.avatarUrl}
              size="2xl"
              showStatus
              status={participant.status}
              className="mx-auto mb-3"
            />
            <h3 className="text-base font-bold text-slate-900">{participant.displayName}</h3>
            <p className="text-xs font-mono text-blue-600 font-semibold">{participant.username}</p>
            <p className="text-xs text-slate-500 mt-2">{participant.bio || 'Available for calls'}</p>
          </div>

          <div className="py-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Phone</span>
              <span className="font-mono text-slate-800">{participant.phone || '+1 (555) 019-2834'}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Status</span>
              <span className="capitalize text-slate-800">{participant.status}</span>
            </div>
          </div>

          <div className="mt-auto grid grid-cols-2 gap-2 pt-4 border-t border-slate-100">
            <button
              onClick={() => {
                setShowContactInfo(false);
                onStartCall(participant, 'voice');
              }}
              className="py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Voice</span>
            </button>
            <button
              onClick={() => {
                setShowContactInfo(false);
                onStartCall(participant, 'video');
              }}
              className="py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
            >
              <Video className="w-3.5 h-3.5" />
              <span>Video</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
