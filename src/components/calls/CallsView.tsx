import React, { useState } from 'react';
import {
  Phone,
  Video,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Plus,
  Search,
  BellRing,
  Users,
} from 'lucide-react';
import { CallLog, Contact } from '../../types';
import { Avatar } from '../common/Avatar';

interface CallsViewProps {
  callLogs: CallLog[];
  onStartCall: (contact: Contact, type: 'voice' | 'video') => void;
  onOpenContacts: () => void;
  onSimulateIncomingCall?: (type: 'voice' | 'video') => void;
}

export const CallsView: React.FC<CallsViewProps> = ({
  callLogs,
  onStartCall,
  onOpenContacts,
}) => {
  const [filter, setFilter] = useState<'all' | 'missed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLogs = callLogs.filter((log) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      log.contact.displayName.toLowerCase().includes(q) ||
      log.contact.username.toLowerCase().includes(q);

    if (!matchesQuery) return false;
    if (filter === 'missed') return log.direction === 'missed';
    return true;
  });

  return (
    <div className="w-full h-full flex flex-col bg-slate-50 overflow-y-auto p-4 sm:p-6 lg:p-8">
      <div className="max-w-3xl mx-auto w-full space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">Calls & Logs</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              High-definition voice & video call history
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenContacts}
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs shadow-blue-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Call</span>
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Segmented Filter */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                filter === 'all'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Calls
            </button>
            <button
              onClick={() => setFilter('missed')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                filter === 'missed'
                  ? 'bg-white text-rose-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Missed
            </button>
          </div>

          {/* Search */}
          <div className="relative flex items-center flex-1 sm:max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              placeholder="Search call logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8.5 pl-8.5 pr-3 rounded-xl bg-slate-100/80 border border-slate-200/80 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none transition-all"
            />
          </div>
        </div>

        {/* Calls List */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden divide-y divide-slate-100">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 px-4">
              <Phone className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No calls in this category</p>
              <p className="text-xs text-slate-400 mt-1">Start a voice or video call with your friends</p>
              <button
                onClick={onOpenContacts}
                className="mt-4 px-3.5 py-1.5 bg-blue-50 text-blue-700 rounded-xl text-xs font-semibold hover:bg-blue-100 transition-colors inline-flex items-center gap-1.5"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Call a Contact</span>
              </button>
            </div>
          ) : (
            filteredLogs.map((log) => {
              const isMissed = log.direction === 'missed';
              const isIncoming = log.direction === 'incoming';

              return (
                <div
                  key={log.id}
                  className="p-3.5 sm:p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <Avatar
                      name={log.contact.displayName}
                      src={log.contact.avatarUrl}
                      size="md"
                      showStatus
                      status={log.contact.status}
                    />

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-sm font-bold truncate ${
                            isMissed ? 'text-rose-600' : 'text-slate-900'
                          }`}
                        >
                          {log.contact.displayName}
                        </span>
                        <span className="text-xs text-blue-600 font-mono font-medium hidden sm:inline">
                          {log.contact.username}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                        {/* Direction Icon */}
                        {isMissed ? (
                          <span className="flex items-center gap-1 text-rose-600 font-medium">
                            <PhoneMissed className="w-3.5 h-3.5" /> Missed {log.type} call
                          </span>
                        ) : isIncoming ? (
                          <span className="flex items-center gap-1 text-emerald-600 font-medium">
                            <PhoneIncoming className="w-3.5 h-3.5" /> Incoming {log.type} call
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-blue-600 font-medium">
                            <PhoneOutgoing className="w-3.5 h-3.5" /> Outgoing {log.type} call
                          </span>
                        )}

                        <span className="text-slate-300">·</span>
                        <span className="font-mono text-[11px] text-slate-400">{log.timestamp}</span>
                        {log.duration && (
                          <>
                            <span className="text-slate-300">·</span>
                            <span className="font-mono text-[11px] text-slate-500">{log.duration}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Redial Buttons */}
                  <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                    <button
                      onClick={() => onStartCall(log.contact, 'voice')}
                      title={`Call ${log.contact.displayName} (Voice)`}
                      className="w-9 h-9 rounded-xl text-emerald-600 hover:bg-emerald-50 border border-emerald-100 flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <Phone className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onStartCall(log.contact, 'video')}
                      title={`Call ${log.contact.displayName} (Video)`}
                      className="w-9 h-9 rounded-xl text-blue-600 hover:bg-blue-50 border border-blue-100 flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <Video className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
