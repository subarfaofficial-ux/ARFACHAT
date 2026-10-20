import React, { useState, useEffect, useRef } from 'react';
import {
  PhoneOff,
  Mic,
  MicOff,
  Video,
  VideoOff,
  RefreshCw,
  MessageSquare,
  Phone,
  Shield,
  X,
  Send,
  AlertTriangle,
} from 'lucide-react';
import { ActiveCall } from '../../types';
import { Avatar } from '../common/Avatar';
import { soundFX } from '../../utils/soundEffects';

interface VideoCallScreenProps {
  call: ActiveCall;
  onEndCall: () => void;
  onSwitchToVoice: () => void;
  onToggleMute?: (muted: boolean) => void;
  onToggleVideo?: (videoOff: boolean) => void;
}

export const VideoCallScreen: React.FC<VideoCallScreenProps> = ({
  call,
  onEndCall,
  onSwitchToVoice,
  onToggleMute,
  onToggleVideo,
}) => {
  const [seconds, setSeconds] = useState(0);
  const [isMuted, setIsMuted] = useState(call.isMuted);
  const [isVideoOff, setIsVideoOff] = useState(call.isVideoOff);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [showInCallChat, setShowInCallChat] = useState(false);
  const [inCallMessages, setInCallMessages] = useState<Array<{ sender: string; text: string; time: string }>>([
    { sender: call.contact.displayName, text: 'WebRTC video connection initiated', time: 'Just now' },
  ]);
  const [inCallText, setInCallText] = useState('');

  const selfVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  // Timer: runs only once connected
  useEffect(() => {
    if (call.status !== 'connected') return;

    const timer = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [call.status]);

  // Attach local video stream to Self-View
  useEffect(() => {
    if (selfVideoRef.current && call.localStream && !isVideoOff) {
      selfVideoRef.current.srcObject = call.localStream;
      selfVideoRef.current.play().catch((err) => {
        console.warn('Autoplay error on local video:', err);
      });
    }
  }, [call.localStream, isVideoOff]);

  // Attach remote video stream to Remote View
  useEffect(() => {
    if (remoteVideoRef.current && call.remoteStream) {
      remoteVideoRef.current.srcObject = call.remoteStream;
      remoteVideoRef.current.play().catch((err) => {
        console.warn('Autoplay error on remote video:', err);
      });
    }
  }, [call.remoteStream]);

  const formatDuration = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleToggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    if (onToggleMute) {
      onToggleMute(newMuted);
    }
  };

  const handleToggleVideo = () => {
    const newVideoOff = !isVideoOff;
    setIsVideoOff(newVideoOff);
    if (onToggleVideo) {
      onToggleVideo(newVideoOff);
    }
  };

  const handleSendInCallMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inCallText.trim()) return;
    setInCallMessages((prev) => [
      ...prev,
      { sender: 'You', text: inCallText.trim(), time: 'Just now' },
    ]);
    setInCallText('');
  };

  const hasRemoteVideoTrack =
    call.remoteStream &&
    call.remoteStream.getVideoTracks().length > 0 &&
    call.remoteStream.getVideoTracks().some((t) => t.enabled);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col justify-between select-none overflow-hidden">
      {/* Remote Video Feed (Real WebRTC Video Stream or Ambient Fallback) */}
      <div className="absolute inset-0 z-0 flex items-center justify-center overflow-hidden bg-slate-950">
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            hasRemoteVideoTrack ? 'opacity-100' : 'opacity-0 absolute pointer-events-none'
          }`}
        />

        {/* Ambient Fallback when remote video track is waiting or audio-only */}
        {!hasRemoteVideoTrack && (
          <div className="relative w-full h-full flex items-center justify-center">
            {call.contact.avatarUrl ? (
              <>
                <img
                  src={call.contact.avatarUrl}
                  alt={call.contact.displayName}
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 w-full h-full object-cover blur-3xl opacity-30 scale-110"
                />
                <div className="relative z-10 flex flex-col items-center">
                  <div className="relative">
                    <Avatar
                      name={call.contact.displayName}
                      src={call.contact.avatarUrl}
                      size="2xl"
                      className="w-36 h-36 ring-4 ring-sky-400/50 shadow-2xl"
                    />
                    <span className="absolute -bottom-2 right-1/2 translate-x-1/2 px-3 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-bold text-[10px] tracking-wider uppercase shadow-md">
                      {call.status === 'connected' ? 'WebRTC Active' : 'Connecting'}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold mt-5 tracking-tight text-white drop-shadow-md">
                    {call.contact.displayName}
                  </h3>
                  <p className="text-xs font-mono text-sky-200 mt-0.5">{call.contact.username}</p>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center z-10">
                <Avatar name={call.contact.displayName} size="2xl" className="w-32 h-32" />
                <h3 className="text-xl font-bold mt-4">{call.contact.displayName}</h3>
                <p className="text-xs font-mono text-sky-300">{call.contact.username}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Top Floating Bar */}
      <div className="relative z-10 p-4 sm:p-6 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 text-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                call.status === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400 animate-ping'
              }`}
            />
            <span className="font-mono font-semibold tracking-wider text-white">
              {call.status === 'connected' ? formatDuration(seconds) : 'Connecting WebRTC...'}
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 text-xs text-sky-300">
            <Shield className="w-3.5 h-3.5" />
            <span>P2P Encrypted · HD Video</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle In-call Chat Drawer */}
          <button
            onClick={() => setShowInCallChat(!showInCallChat)}
            className="px-3 py-1.5 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 text-xs font-medium hover:bg-black/60 flex items-center gap-1.5 text-white transition-colors cursor-pointer"
          >
            <MessageSquare className="w-4 h-4 text-sky-400" />
            <span className="hidden sm:inline">In-Call Chat</span>
            {inCallMessages.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-sky-400" />
            )}
          </button>
        </div>
      </div>

      {/* Media Permission Warning Banner */}
      {call.mediaError && (
        <div className="relative z-20 mx-4 max-w-md p-3 rounded-2xl bg-amber-500/25 border border-amber-500/40 text-amber-200 text-xs flex items-center gap-2 backdrop-blur-md">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
          <span>{call.mediaError}</span>
        </div>
      )}

      {/* Self-View Picture-in-Picture (PiP) Window with Real Camera Stream */}
      <div className="absolute top-20 right-4 sm:right-6 z-20 w-32 sm:w-44 h-44 sm:h-56 rounded-2xl overflow-hidden bg-slate-900 border-2 border-white/20 shadow-2xl group transition-all">
        {isVideoOff ? (
          <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center bg-slate-800">
            <VideoOff className="w-6 h-6 text-slate-400 mb-1" />
            <span className="text-[10px] text-slate-300">Camera Off</span>
          </div>
        ) : (
          <div className="relative w-full h-full bg-slate-900">
            <video
              ref={selfVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover transform -scale-x-100"
            />
            <div className="absolute bottom-1 left-2 text-[10px] font-mono text-white/90 bg-black/60 px-1.5 py-0.5 rounded backdrop-blur-xs">
              You
            </div>
          </div>
        )}
      </div>

      {/* In-Call Chat Drawer (Side popover) */}
      {showInCallChat && (
        <div className="absolute bottom-24 right-4 sm:right-6 z-30 w-80 max-h-96 bg-slate-900/90 backdrop-blur-xl border border-white/15 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right-4 duration-200">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <span className="text-xs font-bold text-white">Call Messages</span>
            <button
              onClick={() => setShowInCallChat(false)}
              className="w-6 h-6 rounded-full hover:bg-white/10 flex items-center justify-center text-slate-400 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex-1 p-3 overflow-y-auto space-y-2 text-xs">
            {inCallMessages.map((msg, i) => (
              <div
                key={i}
                className={`p-2.5 rounded-2xl max-w-[85%] ${
                  msg.sender === 'You'
                    ? 'ml-auto bg-blue-600 text-white rounded-br-xs'
                    : 'mr-auto bg-white/10 text-slate-200 rounded-bl-xs'
                }`}
              >
                <div className="text-[10px] opacity-75 font-semibold">{msg.sender}</div>
                <div>{msg.text}</div>
              </div>
            ))}
          </div>
          <form onSubmit={handleSendInCallMessage} className="p-2 border-t border-white/10 flex gap-1.5">
            <input
              type="text"
              placeholder="Send in-call text..."
              value={inCallText}
              onChange={(e) => setInCallText(e.target.value)}
              className="flex-1 h-8 px-2.5 rounded-xl bg-white/10 border border-white/10 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-sky-400"
            />
            <button
              type="submit"
              className="w-8 h-8 rounded-xl bg-blue-600 hover:bg-blue-700 flex items-center justify-center text-white cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}

      {/* Floating Bottom Control Dock */}
      <div className="relative z-10 p-4 sm:p-6 flex justify-center bg-gradient-to-t from-black/80 via-black/40 to-transparent">
        <div className="px-5 py-3 bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl flex items-center gap-3 sm:gap-4 shadow-2xl">
          {/* Mute Mic */}
          <button
            onClick={handleToggleMute}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
              isMuted
                ? 'bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/20'
                : 'bg-white/15 hover:bg-white/25 text-white'
            }`}
            title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Toggle Video Camera */}
          <button
            onClick={handleToggleVideo}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
              isVideoOff
                ? 'bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/20'
                : 'bg-white/15 hover:bg-white/25 text-white'
            }`}
            title={isVideoOff ? 'Turn Camera On' : 'Turn Camera Off'}
          >
            {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
          </button>

          {/* Flip Camera */}
          <button
            onClick={() => setIsFrontCamera(!isFrontCamera)}
            className="w-12 h-12 rounded-2xl bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-all cursor-pointer"
            title="Switch front/back camera"
          >
            <RefreshCw className="w-5 h-5" />
          </button>

          {/* Switch to Voice Only */}
          <button
            onClick={onSwitchToVoice}
            className="w-12 h-12 rounded-2xl bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-all cursor-pointer"
            title="Switch to Voice Call"
          >
            <Phone className="w-5 h-5" />
          </button>

          {/* End Call (Red) */}
          <button
            onClick={() => {
              soundFX.playEndCall();
              onEndCall();
            }}
            className="w-12 h-12 rounded-2xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white flex items-center justify-center shadow-lg shadow-rose-600/40 transition-all cursor-pointer"
            title="End Call"
          >
            <PhoneOff className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
