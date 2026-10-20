import React, { useState } from 'react';
import { X, User, Bell, Shield, Volume2, Mic, Camera, LogOut, Check, Sparkles, Smartphone, Radio, Server, Lock, Download, FileDown } from 'lucide-react';
import { User as UserType } from '../../types';
import { Avatar } from '../common/Avatar';

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserType;
  onUpdateUser: (updated: Partial<UserType>) => void;
  onLogout: () => void;
  onOpenExport?: () => void;
}

export const ProfileSettingsModal: React.FC<ProfileSettingsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUpdateUser,
  onLogout,
  onOpenExport,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'media' | 'notifications' | 'privacy'>('profile');
  const [displayName, setDisplayName] = useState(currentUser.displayName);
  const [username, setUsername] = useState(currentUser.username.replace('@', ''));
  const [bio, setBio] = useState(currentUser.bio || '');
  const [selectedAvatar, setSelectedAvatar] = useState(currentUser.avatarUrl || '');
  const [isSaved, setIsSaved] = useState(false);

  // Audio/video preferences
  const [micLevel, setMicLevel] = useState(75);
  const [speakerLevel, setSpeakerLevel] = useState(85);
  const [noiseSuppression, setNoiseSuppression] = useState(true);
  const [hdVideo, setHdVideo] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    onUpdateUser({
      displayName: displayName.trim(),
      username: `@${cleanUsername || 'user'}`,
      bio: bio.trim(),
      avatarUrl: selectedAvatar,
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const presetAvatars = [
    { label: 'Modern Portrait', url: '/src/assets/images/avatar_female_sarah_1792395181383.jpg' },
    { label: 'Casual Portrait', url: '/src/assets/images/avatar_male_marcus_1792395181448.jpg' },
    { label: 'Studio Portrait', url: '/src/assets/images/avatar_female_priya_1792395182508.jpg' },
    { label: 'Monogram Default', url: '' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">Settings & Profile</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Tabs */}
        <div className="flex items-center gap-1 px-6 border-b border-slate-200/80 bg-slate-50/80 overflow-x-auto text-xs font-semibold">
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'profile'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Profile</span>
          </button>
          <button
            onClick={() => setActiveTab('media')}
            className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'media'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Mic className="w-4 h-4" />
            <span>Audio & Video</span>
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'notifications'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>Notifications</span>
          </button>
          <button
            onClick={() => setActiveTab('privacy')}
            className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'privacy'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Privacy & App</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'profile' && (
            <form onSubmit={handleSave} className="space-y-5">
              {/* Avatar Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Profile Photo
                </label>
                <div className="flex items-center gap-4">
                  <Avatar
                    name={displayName || 'User'}
                    src={selectedAvatar}
                    size="xl"
                    className="ring-4 ring-blue-50"
                  />
                  <div className="flex-1">
                    <p className="text-xs text-slate-600 mb-2">Choose an avatar preset:</p>
                    <div className="flex flex-wrap gap-2">
                      {presetAvatars.map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setSelectedAvatar(preset.url)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                            selectedAvatar === preset.url
                              ? 'border-blue-600 bg-blue-50 text-blue-700 font-semibold shadow-xs'
                              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Display Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm text-slate-900"
                  required
                />
              </div>

              {/* Unique Username */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Unique Username (@handle)
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-blue-600 font-mono font-bold text-sm select-none">
                    @
                  </span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                    className="w-full h-11 pl-8 pr-3.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm font-mono text-slate-900"
                    required
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Unique handle used to add you to calls and messages.
                </p>
              </div>

              {/* Bio */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  About / Bio
                </label>
                <textarea
                  rows={2}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm text-slate-900"
                  placeholder="Tell your friends what you are up to..."
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-slate-400 font-mono">
                  ID: {currentUser.id} · {currentUser.joinedDate}
                </span>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-blue-600/20 transition-all cursor-pointer"
                >
                  {isSaved ? <Check className="w-4 h-4" /> : null}
                  <span>{isSaved ? 'Changes Saved!' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          )}

          {activeTab === 'media' && (
            <div className="space-y-6">
              {/* Microphone Settings */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Mic className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-semibold text-slate-800">Microphone Input Level</span>
                  </div>
                  <span className="text-xs font-mono font-medium text-slate-600">{micLevel}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={micLevel}
                  onChange={(e) => setMicLevel(Number(e.target.value))}
                  className="w-full accent-blue-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                />
                <div className="flex items-center justify-between mt-3 text-xs text-slate-600">
                  <span>AI Noise Suppression</span>
                  <input
                    type="checkbox"
                    checked={noiseSuppression}
                    onChange={(e) => setNoiseSuppression(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Speaker Settings */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-semibold text-slate-800">Speaker Volume</span>
                  </div>
                  <span className="text-xs font-mono font-medium text-slate-600">{speakerLevel}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={speakerLevel}
                  onChange={(e) => setSpeakerLevel(Number(e.target.value))}
                  className="w-full accent-blue-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                />
              </div>

              {/* Video Camera Settings */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Camera className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-semibold text-slate-800">High-Definition 1080p Video</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={hdVideo}
                    onChange={(e) => setHdVideo(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  Enables HD streaming for video calling with dynamic resolution adjustments.
                </p>
              </div>

              {/* WebRTC HTTPS & TURN Server Guide */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50/60 border border-blue-200/80 space-y-3">
                <div className="flex items-center gap-2 text-blue-900 font-bold text-xs">
                  <Server className="w-4 h-4 text-blue-600" />
                  <span>WebRTC Architecture & TURN Setup</span>
                </div>

                <div className="space-y-2 text-[11px] text-slate-700 leading-relaxed">
                  <div className="p-2.5 rounded-xl bg-white/80 border border-blue-100 shadow-2xs">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-900 mb-0.5">
                      <Lock className="w-3.5 h-3.5 text-emerald-600" />
                      <span>HTTPS Requirement (Secure Context)</span>
                    </div>
                    <p className="text-slate-600">
                      Modern browsers require HTTPS (or localhost during development) to grant access to <code className="text-blue-700 bg-blue-50 px-1 py-0.5 rounded font-mono text-[10px]">navigator.mediaDevices.getUserMedia</code>. Camera and microphone permissions will be blocked by browsers on plain unencrypted HTTP.
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white/80 border border-blue-100 shadow-2xs">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-900 mb-0.5">
                      <Radio className="w-3.5 h-3.5 text-blue-600" />
                      <span>STUN vs. TURN Relay Setup</span>
                    </div>
                    <p className="text-slate-600">
                      <strong>STUN</strong> (<code className="text-blue-700 bg-blue-50 px-1 py-0.5 rounded font-mono text-[10px]">stun.l.google.com:19302</code>) resolves public IPs for direct P2P streaming across standard home routers.
                    </p>
                    <p className="text-slate-600 mt-1">
                      <strong>TURN</strong> relay servers (such as Coturn, Twilio, or Xirsys) are required when peers operate behind Symmetric NAT, carrier-grade NAT (mobile 4G/5G data), or restrictive enterprise firewalls that block direct UDP packets. Add your TURN credentials to <code className="text-blue-700 bg-blue-50 px-1 py-0.5 rounded font-mono text-[10px]">rtcConfiguration.iceServers</code> in <code className="text-blue-700 bg-blue-50 px-1 py-0.5 rounded font-mono text-[10px]">src/lib/webrtc.ts</code> for production relay.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200">
                <div>
                  <h4 className="text-xs font-semibold text-slate-800">Call Ringtones & Chimes</h4>
                  <p className="text-[11px] text-slate-500">Play synth sound effects for incoming calls & messages</p>
                </div>
                <input
                  type="checkbox"
                  checked={soundEnabled}
                  onChange={(e) => setSoundEnabled(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200">
                <div>
                  <h4 className="text-xs font-semibold text-slate-800">Message Previews</h4>
                  <p className="text-[11px] text-slate-500">Show message text preview in in-app banners</p>
                </div>
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                />
              </div>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/80">
                <div className="flex items-center gap-2 text-blue-800 font-semibold text-xs mb-1">
                  <Smartphone className="w-4 h-4" />
                  <span>Application Information & Android App</span>
                </div>
                <p className="text-xs text-blue-700">App Name: <strong>ArfaChat</strong></p>
                <p className="text-xs text-blue-700">Package Name: <strong className="font-mono">com.arfachat.subarfa</strong></p>
                <p className="text-[11px] text-blue-600/80 mt-1">Built with React, TypeScript and WebRTC calling.</p>

                {/* Direct Download Android APK link */}
                <div className="mt-3 pt-3 border-t border-blue-200/60 flex items-center gap-2">
                  <a
                    href="/arfachat.apk"
                    download="arfachat-v1.0.apk"
                    className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Android APK</span>
                  </a>
                  {onOpenExport && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenExport();
                      }}
                      className="py-2 px-3 rounded-xl bg-white hover:bg-blue-100/70 border border-blue-300 text-blue-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span>Export Menu</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onLogout();
                  }}
                  className="w-full py-2.5 px-4 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log Out of ArfaChat</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
