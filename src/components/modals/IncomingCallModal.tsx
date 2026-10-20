import React, { useEffect } from 'react';
import { Phone, Video, PhoneOff, Check } from 'lucide-react';
import { IncomingCall } from '../../types';
import { Avatar } from '../common/Avatar';
import { soundFX } from '../../utils/soundEffects';

interface IncomingCallModalProps {
  incomingCall: IncomingCall | null;
  onAccept: (call: IncomingCall) => void;
  onDecline: (call: IncomingCall) => void;
}

export const IncomingCallModal: React.FC<IncomingCallModalProps> = ({
  incomingCall,
  onAccept,
  onDecline,
}) => {
  useEffect(() => {
    if (incomingCall) {
      soundFX.startIncomingRingtone();
    } else {
      soundFX.stopRingtone();
    }

    return () => {
      soundFX.stopRingtone();
    };
  }, [incomingCall]);

  if (!incomingCall) return null;

  const { contact, type } = incomingCall;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full max-w-sm bg-gradient-to-b from-slate-900 to-slate-950 text-white rounded-3xl p-7 shadow-2xl border border-white/10 text-center relative overflow-hidden">
        {/* Pulsing visual sound waves */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full border border-sky-500/20 animate-call-wave pointer-events-none" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full border border-sky-400/20 animate-call-wave-delayed pointer-events-none" />

        <div className="relative z-10">
          {/* Call Type Pill */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-sky-300 text-xs font-medium mb-6 backdrop-blur-md border border-white/10">
            {type === 'video' ? <Video className="w-3.5 h-3.5" /> : <Phone className="w-3.5 h-3.5" />}
            <span>Incoming {type === 'video' ? 'Video' : 'Voice'} Call</span>
          </div>

          {/* Caller Avatar */}
          <div className="my-3 flex justify-center">
            <div className="relative">
              <Avatar
                name={contact.displayName}
                src={contact.avatarUrl}
                size="2xl"
                className="ring-4 ring-sky-500/30 shadow-2xl"
              />
              <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center border-2 border-slate-900 shadow-md">
                {type === 'video' ? <Video className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
              </div>
            </div>
          </div>

          {/* Caller Details */}
          <h3 className="text-xl font-bold tracking-tight text-white mt-4">{contact.displayName}</h3>
          <p className="text-sm font-mono text-sky-300 font-medium">{contact.username}</p>
          <p className="text-xs text-slate-400 mt-1">Calling you on ArfaChat...</p>

          {/* Action Buttons: Decline & Accept */}
          <div className="flex items-center justify-center gap-8 mt-9 pt-2">
            {/* Decline */}
            <div className="flex flex-col items-center gap-1.5">
              <button
                onClick={() => {
                  soundFX.playEndCall();
                  onDecline(incomingCall);
                }}
                className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-700 active:scale-95 text-white flex items-center justify-center shadow-lg shadow-rose-600/30 transition-all cursor-pointer"
                title="Decline Call"
              >
                <PhoneOff className="w-7 h-7" />
              </button>
              <span className="text-xs font-semibold text-rose-300">Decline</span>
            </div>

            {/* Accept */}
            <div className="flex flex-col items-center gap-1.5">
              <button
                onClick={() => {
                  soundFX.playConnected();
                  onAccept(incomingCall);
                }}
                className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 transition-all animate-bounce cursor-pointer"
                title="Accept Call"
              >
                {type === 'video' ? <Video className="w-7 h-7" /> : <Phone className="w-7 h-7" />}
              </button>
              <span className="text-xs font-semibold text-emerald-300">Accept</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
