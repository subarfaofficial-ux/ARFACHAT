import React from 'react';
import { MessageSquare, Phone, CircleDot, UserPlus, Users, BellRing, Settings, Smartphone, Download } from 'lucide-react';
import { User } from '../../types';
import { Avatar } from '../common/Avatar';

interface AppHeaderProps {
  currentUser: User;
  activeTab: 'chats' | 'updates' | 'calls';
  onSelectTab: (tab: 'chats' | 'updates' | 'calls') => void;
  unreadCount: number;
  missedCallsCount: number;
  hasNewUpdates: boolean;
  pendingRequestsCount?: number;
  onOpenAddFriend: () => void;
  onOpenContacts: () => void;
  onOpenProfile: () => void;
  onOpenExport: () => void;
  onSimulateIncomingCall?: (type: 'voice' | 'video') => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  currentUser,
  activeTab,
  onSelectTab,
  unreadCount,
  missedCallsCount,
  hasNewUpdates,
  pendingRequestsCount = 0,
  onOpenAddFriend,
  onOpenContacts,
  onOpenProfile,
  onOpenExport,
  onSimulateIncomingCall,
}) => {
  return (
    <header className="h-16 bg-white border-b border-slate-200/90 px-3 sm:px-6 flex items-center justify-between shrink-0 select-none z-30 shadow-xs">
      {/* Zone 1: Brand Wordmark */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 via-sky-600 to-blue-700 flex items-center justify-center text-white shadow-sm shadow-blue-500/20">
            <MessageSquare className="w-5 h-5 fill-white/20" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-lg text-slate-900 tracking-tight leading-none">ArfaChat</span>
            </div>
            <span className="text-[11px] text-blue-600 font-medium tracking-tight">CallingApp</span>
          </div>
        </div>
      </div>

      {/* Zone 2: Main Desktop & Tablet Navigation */}
      <nav className="hidden sm:flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-2xl border border-slate-200/60">
        <button
          onClick={() => onSelectTab('chats')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'chats'
              ? 'bg-white text-blue-600 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Chats</span>
          {unreadCount > 0 && (
            <span className="ml-1 px-1.5 py-0.2 bg-blue-600 text-white rounded-full text-[10px] font-bold">
              {unreadCount}
            </span>
          )}
        </button>

        <button
          onClick={() => onSelectTab('updates')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'updates'
              ? 'bg-white text-blue-600 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <CircleDot className="w-4 h-4" />
          <span>Updates</span>
          {hasNewUpdates && (
            <span className="w-2 h-2 rounded-full bg-sky-500" />
          )}
        </button>

        <button
          onClick={() => onSelectTab('calls')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'calls'
              ? 'bg-white text-blue-600 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <Phone className="w-4 h-4" />
          <span>Calls</span>
          {missedCallsCount > 0 && (
            <span className="ml-1 px-1.5 py-0.2 bg-rose-500 text-white rounded-full text-[10px] font-bold">
              {missedCallsCount}
            </span>
          )}
        </button>
      </nav>

      {/* Zone 3: Actions & Profile */}
      <div className="flex items-center gap-2">
        {/* Directory / Contacts button */}
        <button
          onClick={onOpenContacts}
          title="Contacts list"
          className="w-9 h-9 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
          aria-label="View Contacts"
        >
          <Users className="w-4 h-4" />
        </button>

        {/* Export Menu / Download Android APK */}
        <button
          onClick={onOpenExport}
          title="Export Menu & Download Android APK"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-all shadow-xs shadow-emerald-600/20 cursor-pointer"
          aria-label="Export Menu & Download APK"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">Download APK</span>
          <span className="lg:hidden text-[11px]">APK</span>
        </button>

        {/* Add Friend by @username with Pending Request Badge */}
        <button
          onClick={onOpenAddFriend}
          className="relative flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-all shadow-xs shadow-blue-600/20 cursor-pointer"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Add Friend</span>
          {pendingRequestsCount > 0 && (
            <span className="ml-0.5 px-1.5 py-0.2 bg-amber-400 text-slate-900 rounded-full text-[10px] font-bold">
              {pendingRequestsCount}
            </span>
          )}
        </button>

        {/* User Profile trigger with @username */}
        <button
          onClick={onOpenProfile}
          className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-2xl hover:bg-slate-100 border border-slate-200/80 transition-colors ml-1 cursor-pointer"
        >
          <Avatar
            name={currentUser.displayName}
            src={currentUser.avatarUrl}
            size="sm"
            showStatus
            status={currentUser.status}
          />
          <div className="hidden md:flex flex-col text-left">
            <span className="text-xs font-semibold text-slate-800 leading-tight">
              {currentUser.displayName}
            </span>
            <span className="text-[11px] text-blue-600 font-mono leading-none">
              {currentUser.username}
            </span>
          </div>
          <Settings className="w-3.5 h-3.5 text-slate-400 hidden sm:block ml-0.5" />
        </button>
      </div>
    </header>
  );
};
