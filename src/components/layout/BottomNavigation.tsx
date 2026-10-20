import React from 'react';
import { MessageSquare, Phone, CircleDot, Users, Smartphone } from 'lucide-react';

interface BottomNavigationProps {
  activeTab: 'chats' | 'updates' | 'calls';
  onSelectTab: (tab: 'chats' | 'updates' | 'calls') => void;
  unreadCount: number;
  missedCallsCount: number;
  hasNewUpdates: boolean;
  onOpenContacts: () => void;
  onOpenExport?: () => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  activeTab,
  onSelectTab,
  unreadCount,
  missedCallsCount,
  hasNewUpdates,
  onOpenContacts,
  onOpenExport,
}) => {
  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-md border-t border-slate-200/90 z-40 px-2 flex items-center justify-around select-none">
      <button
        onClick={() => onSelectTab('chats')}
        className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] rounded-xl transition-colors ${
          activeTab === 'chats' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        <div className="relative">
          <MessageSquare className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-2 bg-blue-600 text-white rounded-full text-[9px] font-bold px-1.5 py-0.2 min-w-[16px] text-center">
              {unreadCount}
            </span>
          )}
        </div>
        <span className="text-[10px] font-semibold mt-1">Chats</span>
      </button>

      <button
        onClick={() => onSelectTab('updates')}
        className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] rounded-xl transition-colors ${
          activeTab === 'updates' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        <div className="relative">
          <CircleDot className="w-5 h-5" />
          {hasNewUpdates && (
            <span className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-sky-500" />
          )}
        </div>
        <span className="text-[10px] font-semibold mt-1">Updates</span>
      </button>

      <button
        onClick={() => onSelectTab('calls')}
        className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] rounded-xl transition-colors ${
          activeTab === 'calls' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        <div className="relative">
          <Phone className="w-5 h-5" />
          {missedCallsCount > 0 && (
            <span className="absolute -top-1.5 -right-2 bg-rose-500 text-white rounded-full text-[9px] font-bold px-1.5 py-0.2 min-w-[16px] text-center">
              {missedCallsCount}
            </span>
          )}
        </div>
        <span className="text-[10px] font-semibold mt-1">Calls</span>
      </button>

      <button
        onClick={onOpenContacts}
        className="flex flex-col items-center justify-center min-w-[56px] min-h-[48px] rounded-xl text-slate-500 hover:text-slate-800 transition-colors"
      >
        <Users className="w-5 h-5" />
        <span className="text-[10px] font-semibold mt-1">Contacts</span>
      </button>

      {onOpenExport && (
        <button
          onClick={onOpenExport}
          className="flex flex-col items-center justify-center min-w-[56px] min-h-[48px] rounded-xl text-emerald-600 hover:text-emerald-700 transition-colors"
          title="Download Android APK"
        >
          <Smartphone className="w-5 h-5" />
          <span className="text-[10px] font-bold mt-1">APK</span>
        </button>
      )}
    </nav>
  );
};
