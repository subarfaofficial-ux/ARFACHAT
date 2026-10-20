import React, { useState, useEffect, useRef } from 'react';
import { PhoneOff, Mic, MicOff, Volume2, VolumeX, Video, Grid, Shield, AlertTriangle } from 'lucide-react';
import { ActiveCall } from '../../types';
import { Avatar } from '../common/Avatar';
import { soundFX } from '../../utils/soundEffects';

interface VoiceCallScreenProps {
  call: ActiveCall;
  onEndCall: () => void;
  onSwitchToVideo: () => void;
  onToggleMute?: (muted: boolean) => void;
  onToggleSpeaker?: (speakerOn: boolean) => void;
}

export const VoiceCallScreen: React.FC<VoiceCallScreenProps> = ({
  call,
  onEndCall,
  onSwitchToVideo,
  onToggleMute,
  onToggleSpeaker,
}) => {
  const [seconds, setSeconds] = useState(0);
  const [isMuted, setIsMuted] = useState(call.isMuted);
  const [isSpeakerOn, setIsSpeakerOn] = useState(call.isSpeakerOn);
  const [showKeypad, setShowKeypad] = useState(false);
  const [keypadInput, setKeypadInput] = useState('');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Attach remote WebRTC audio stream to HTML audio element
  useEffect(() => {
    if (audioRef.current && call.remoteStream) {
      audioRef.current.srcObject = call.remoteStream;
      audioRef.current.play().catch((err) => {
        console.warn('Autoplay prevented on audio element:', err);
      });
    }
  }, [call.remoteStream]);

  // Call timer - only counts once connected
  useEffect(() => {
    if (call.status !== 'connected') return;

    const timer = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [call.status]);

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

  const handleToggleSpeaker = () => {
    const newSpeaker = !isSpeakerOn;
    setIsSpeakerOn(newSpeaker);
    if (onToggleSpeaker) {
      onToggleSpeaker(newSpeaker);
    }
  };

  const handleDial = (char: string) => {
    setKeypadInput((prev) => prev + char);
  };

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-slate-900 via-blue-950 to-slate-950 text-white flex flex-col justify-between p-6 sm:p-10 select-none overflow-hidden">
      {/* Hidden real audio output element for WebRTC remote stream */}
      <audio ref={audioRef} autoPlay playsInline />

      {/* Top Bar */}
      <div className="flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-xs font-medium text-sky-200">
            <Shield className="w-3.5 h-3.5 text-sky-400" />
            <span>P2P Encrypted WebRTC</span>
          </div>
        </div>
        <div className="text-xs font-mono text-slate-300">
          Opus Voice · 48 kHz
        </div>
      </div>

      {/* Permission or Device Warning Banner if any */}
      {call.mediaError && (
        <div className="mx-auto max-w-md p-3 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-200 text-xs flex items-center gap-2 z-20">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
          <span>{call.mediaError}</span>
        </div>
      )}

      {/* Center Zone: Caller Details & Animated Waveform */}
      <div className="flex flex-col items-center justify-center my-auto relative z-10">
        {/* Pulsing acoustic rings */}
        <div className="relative flex items-center justify-center mb-6">
          <div className="absolute w-56 h-56 rounded-full border border-sky-400/20 animate-call-wave pointer-events-none" />
          <div className="absolute w-72 h-72 rounded-full border border-blue-400/10 animate-call-wave-delayed pointer-events-none" />

          <Avatar
            name={call.contact.displayName}
            src={call.contact.avatarUrl}
            size="2xl"
            className="ring-4 ring-sky-400/30 shadow-2xl relative z-10"
          />
        </div>

        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white text-center">
          {call.contact.displayName}
        </h2>
        <p className="text-sm font-mono text-sky-300 font-medium mt-1">
          {call.contact.username}
        </p>

        {/* Live Call Status & Duration */}
        <div className="mt-4 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              call.status === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400 animate-ping'
            }`}
          />
          <span className="text-sm font-mono font-semibold tracking-wider text-white">
            {call.status === 'connected' ? formatDuration(seconds) : 'Connecting WebRTC...'}
          </span>
        </div>

        {/* Audio Spectrum Simulation */}
        <div className="flex items-center gap-1.5 mt-8 h-8">
          {[40, 75, 100, 60, 90, 45, 80, 95, 50, 70, 85, 30].map((height, i) => (
            <div
              key={i}
              className="w-1 bg-gradient-to-t from-sky-500 to-blue-400 rounded-full transition-all duration-300"
              style={{
                height: `${Math.max(12, height * (isMuted ? 0.1 : 1))}%`,
                animation: isMuted ? 'none' : `pulse 1.2s ease-in-out ${i * 0.1}s infinite alternate`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Keypad Modal Overlay (if opened) */}
      {showKeypad && (
        <div className="fixed inset-0 z-20 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-xs bg-slate-900 border border-slate-700 p-6 rounded-3xl text-center">
            <div className="h-10 text-xl font-mono text-white mb-4 tracking-widest">
              {keypadInput || '—'}
            </div>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((k) => (
                <button
                  key={k}
                  onClick={() => handleDial(k)}
                  className="w-14 h-14 rounded-full bg-slate-800 hover:bg-slate-700 text-lg font-bold text-white mx-auto flex items-center justify-center active:scale-95 transition-all"
                >
                  {k}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowKeypad(false)}
              className="w-full py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-700"
            >
              Close Keypad
            </button>
          </div>
        </div>
      )}

      {/* Bottom Floating Control Bar */}
      <div className="w-full max-w-md mx-auto z-10">
        <div className="p-3 bg-white/10 backdrop-blur-xl border border-white/15 rounded-3xl flex items-center justify-around shadow-2xl">
          {/* Mute Mic */}
          <button
            onClick={handleToggleMute}
            className={`w-13 h-13 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
              isMuted
                ? 'bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/20'
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
            title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Speakerphone */}
          <button
            onClick={handleToggleSpeaker}
            className={`w-13 h-13 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
              isSpeakerOn
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
            title="Toggle Speakerphone"
          >
            {isSpeakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>

          {/* Switch to Video Call */}
          <button
            onClick={onSwitchToVideo}
            className="w-13 h-13 rounded-2xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer"
            title="Switch to Video Call"
          >
            <Video className="w-5 h-5" />
          </button>

          {/* Keypad */}
          <button
            onClick={() => setShowKeypad(true)}
            className="w-13 h-13 rounded-2xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer"
            title="Dialpad"
          >
            <Grid className="w-5 h-5" />
          </button>

          {/* End Call (Red) */}
          <button
            onClick={() => {
              soundFX.playEndCall();
              onEndCall();
            }}
            className="w-13 h-13 rounded-2xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white flex items-center justify-center shadow-lg shadow-rose-600/30 transition-all cursor-pointer"
            title="End Call"
          >
            <PhoneOff className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
