import React, { useState, useEffect } from 'react';
import { Plus, Camera, Type, X, ChevronLeft, ChevronRight, Send, Clock, Eye } from 'lucide-react';
import { StatusUpdate, User, Contact } from '../../types';
import { Avatar } from '../common/Avatar';

interface UpdatesViewProps {
  currentUser: User;
  statusUpdates: StatusUpdate[];
  onAddStatus: (caption: string, gradientBackground: string) => void;
  onReplyToStatus: (contact: Contact, message: string) => void;
  onOpenAddFriend: () => void;
}

export const UpdatesView: React.FC<UpdatesViewProps> = ({
  currentUser,
  statusUpdates,
  onAddStatus,
  onReplyToStatus,
  onOpenAddFriend,
}) => {
  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCaption, setNewCaption] = useState('');
  const [selectedGradient, setSelectedGradient] = useState('from-blue-600 via-sky-600 to-indigo-700');
  const [storyProgress, setStoryProgress] = useState(0);
  const [replyText, setReplyText] = useState('');

  const gradients = [
    'from-blue-600 via-sky-600 to-indigo-700',
    'from-sky-700 via-teal-700 to-blue-900',
    'from-indigo-600 via-purple-600 to-blue-700',
    'from-blue-700 via-indigo-800 to-slate-900',
    'from-teal-600 via-emerald-600 to-sky-700',
  ];

  // Story progress timer
  useEffect(() => {
    if (activeStoryIndex === null) {
      setStoryProgress(0);
      return;
    }

    const interval = setInterval(() => {
      setStoryProgress((prev) => {
        if (prev >= 100) {
          // Advance to next story or close
          if (activeStoryIndex < statusUpdates.length - 1) {
            setActiveStoryIndex(activeStoryIndex + 1);
            return 0;
          } else {
            setActiveStoryIndex(null);
            return 0;
          }
        }
        return prev + 2;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [activeStoryIndex, statusUpdates.length]);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCaption.trim()) return;
    onAddStatus(newCaption.trim(), selectedGradient);
    setNewCaption('');
    setShowCreateModal(false);
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || activeStoryIndex === null) return;
    const currentStory = statusUpdates[activeStoryIndex];
    onReplyToStatus(currentStory.contact, `Replied to your status: "${replyText.trim()}"`);
    setReplyText('');
    setActiveStoryIndex(null);
  };

  return (
    <div className="w-full h-full flex flex-col bg-slate-50 overflow-y-auto p-4 sm:p-6 lg:p-8">
      <div className="max-w-2xl mx-auto w-full space-y-6">
        {/* Title */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">Updates & Stories</h2>
            <p className="text-xs text-slate-500 mt-0.5">Share text & moments with your connections</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs shadow-blue-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Update</span>
          </button>
        </div>

        {/* My Status Card */}
        <div className="p-4 bg-white rounded-3xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div
            className="flex items-center gap-3 cursor-pointer flex-1"
            onClick={() => setShowCreateModal(true)}
          >
            <div className="relative">
              <Avatar
                name={currentUser.displayName}
                src={currentUser.avatarUrl}
                size="lg"
              />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center border-2 border-white shadow-xs">
                <Plus className="w-3 h-3 stroke-[3]" />
              </div>
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">My Status</h3>
              <p className="text-xs text-slate-500">Tap to add your 24h status update</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowCreateModal(true)}
              className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
              title="Add text status"
            >
              <Type className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Recent Updates Header */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Recent Updates ({statusUpdates.length})
            </span>
          </div>

          {statusUpdates.length === 0 ? (
            <div className="p-8 bg-white rounded-3xl border border-slate-200 text-center">
              <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No updates yet</p>
              <p className="text-xs text-slate-400 mt-1">
                When your contacts post updates, they will appear here.
              </p>
              <button
                onClick={onOpenAddFriend}
                className="mt-4 px-3.5 py-1.5 bg-blue-50 text-blue-700 rounded-xl text-xs font-semibold hover:bg-blue-100 transition-colors"
              >
                Find Friends
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-xs">
              {statusUpdates.map((update, index) => (
                <div
                  key={update.id}
                  onClick={() => {
                    setActiveStoryIndex(index);
                    setStoryProgress(0);
                  }}
                  className="p-3.5 flex items-center gap-3.5 hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  {/* Avatar with gradient story ring */}
                  <div className="p-0.5 rounded-full ring-2 ring-blue-500 ring-offset-2">
                    <Avatar
                      name={update.contact.displayName}
                      src={update.contact.avatarUrl}
                      size="md"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-slate-900 truncate">
                        {update.contact.displayName}
                      </h4>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {update.timestamp}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs font-mono text-blue-600 font-medium">
                        {update.contact.username}
                      </span>
                      <span className="text-slate-300">·</span>
                      <p className="text-xs text-slate-500 truncate">{update.caption}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Story Viewer Modal */}
      {activeStoryIndex !== null && statusUpdates[activeStoryIndex] && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between p-4 sm:p-6 animate-in fade-in duration-200">
          {/* Progress bar line */}
          <div className="w-full flex items-center gap-1 pt-2 z-10">
            {statusUpdates.map((_, idx) => (
              <div
                key={idx}
                className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden"
              >
                <div
                  className="h-full bg-white transition-all duration-100"
                  style={{
                    width:
                      idx === activeStoryIndex
                        ? `${storyProgress}%`
                        : idx < activeStoryIndex
                        ? '100%'
                        : '0%',
                  }}
                />
              </div>
            ))}
          </div>

          {/* Story Top Bar */}
          <div className="flex items-center justify-between mt-3 text-white z-10">
            <div className="flex items-center gap-2.5">
              <Avatar
                name={statusUpdates[activeStoryIndex].contact.displayName}
                src={statusUpdates[activeStoryIndex].contact.avatarUrl}
                size="sm"
              />
              <div>
                <h4 className="text-xs font-bold leading-tight">
                  {statusUpdates[activeStoryIndex].contact.displayName}
                </h4>
                <div className="flex items-center gap-1 text-[11px] text-white/75 font-mono">
                  <span>{statusUpdates[activeStoryIndex].contact.username}</span>
                  <span>·</span>
                  <span>{statusUpdates[activeStoryIndex].timestamp}</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setActiveStoryIndex(null)}
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Story Canvas Center */}
          <div
            className={`my-auto w-full max-w-md mx-auto aspect-[9/16] max-h-[70vh] rounded-3xl bg-gradient-to-br ${
              statusUpdates[activeStoryIndex].gradientBackground ||
              'from-blue-600 via-sky-600 to-indigo-700'
            } flex items-center justify-center p-8 text-center text-white shadow-2xl relative overflow-hidden`}
          >
            <p className="text-xl sm:text-2xl font-bold leading-relaxed tracking-tight">
              {statusUpdates[activeStoryIndex].caption}
            </p>

            {/* Prev/Next hitboxes */}
            <div
              className="absolute left-0 top-0 bottom-0 w-1/3 cursor-pointer"
              onClick={() => {
                if (activeStoryIndex > 0) {
                  setActiveStoryIndex(activeStoryIndex - 1);
                  setStoryProgress(0);
                }
              }}
            />
            <div
              className="absolute right-0 top-0 bottom-0 w-1/3 cursor-pointer"
              onClick={() => {
                if (activeStoryIndex < statusUpdates.length - 1) {
                  setActiveStoryIndex(activeStoryIndex + 1);
                  setStoryProgress(0);
                } else {
                  setActiveStoryIndex(null);
                }
              }}
            />
          </div>

          {/* Reply Bar */}
          <form
            onSubmit={handleSendReply}
            className="w-full max-w-md mx-auto flex items-center gap-2 z-10"
          >
            <input
              type="text"
              placeholder={`Reply to @${statusUpdates[activeStoryIndex].contact.username.replace('@', '')}...`}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              className="flex-1 h-11 px-4 rounded-xl bg-white/20 border border-white/20 text-white placeholder:text-white/60 text-xs outline-none focus:bg-white/30"
            />
            <button
              type="submit"
              className="w-11 h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* Create Status Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Create Status Update</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Update Text
                </label>
                <textarea
                  rows={3}
                  placeholder="What is on your mind?..."
                  value={newCaption}
                  onChange={(e) => setNewCaption(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Background Theme
                </label>
                <div className="flex items-center gap-2">
                  {gradients.map((grad, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSelectedGradient(grad)}
                      className={`w-9 h-9 rounded-xl bg-gradient-to-br ${grad} border-2 transition-all ${
                        selectedGradient === grad
                          ? 'border-blue-600 scale-110 shadow-md'
                          : 'border-transparent'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div
                className={`p-6 rounded-2xl bg-gradient-to-br ${selectedGradient} text-white text-center font-bold text-sm min-h-[90px] flex items-center justify-center`}
              >
                {newCaption || 'Your status preview will appear here'}
              </div>

              <button
                type="submit"
                className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-all shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Share to My Status</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
