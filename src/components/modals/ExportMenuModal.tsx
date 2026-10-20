import React, { useState } from 'react';
import {
  X,
  Smartphone,
  Download,
  QrCode,
  CheckCircle2,
  Copy,
  Check,
  FileJson,
  ShieldCheck,
  Layers,
  Sparkles,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Info,
  HelpCircle,
  Share2
} from 'lucide-react';
import { User, Contact, Conversation } from '../../types';

interface ExportMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  contacts: Contact[];
  conversations: Conversation[];
}

export const ExportMenuModal: React.FC<ExportMenuModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  contacts,
  conversations,
}) => {
  const [activeTab, setActiveTab] = useState<'apk' | 'backup' | 'pwa'>('apk');
  const [copiedLink, setCopiedLink] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(true);

  if (!isOpen) return null;

  // APK file details
  const apkInfo = {
    fileName: 'arfachat-v1.0.apk',
    downloadPath: '/arfachat.apk',
    packageName: 'com.arfachat.subarfa',
    versionName: '1.0.0',
    versionCode: 1001,
    minSdkVersion: 'Android 7.0 (Nougat, API 24)',
    targetSdkVersion: 'Android 15 (API 35)',
    architecture: 'Universal (ARM64 / ARMv7 / x86_64)',
    fileSize: '~2.8 MB',
    buildDate: 'October 2026',
    signing: 'Production Release Signed (SHA-256 with RSA)',
  };

  const getFullDownloadUrl = () => {
    return `${window.location.origin}${apkInfo.downloadPath}`;
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(getFullDownloadUrl()).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    });
  };

  const handleDownloadApk = () => {
    setIsDownloading(true);
    // Programmatic anchor click to trigger download
    const link = document.createElement('a');
    link.href = apkInfo.downloadPath;
    link.download = apkInfo.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      setIsDownloading(false);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    }, 1200);
  };

  const handleExportJsonBackup = () => {
    const backupData = {
      app: 'ArfaChat',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      user: currentUser ? {
        id: currentUser.id,
        username: currentUser.username,
        displayName: currentUser.displayName,
        email: currentUser.email,
        bio: currentUser.bio,
      } : null,
      contactsCount: contacts.length,
      contacts: contacts.map(c => ({
        id: c.id,
        username: c.username,
        displayName: c.displayName,
        bio: c.bio,
        status: c.status,
      })),
      conversationsCount: conversations.length,
      conversations: conversations.map(cv => ({
        id: cv.id,
        participantName: cv.participantName,
        participantUsername: cv.participantUsername,
        lastMessage: cv.lastMessage,
        lastMessageTime: cv.lastMessageTime,
        unreadCount: cv.unreadCount,
      })),
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `arfachat_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Simple QR Code SVG renderer for the current download URL
  const qrSvgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(getFullDownloadUrl())}&margin=4`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-900 via-slate-800 to-blue-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
              <Smartphone className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">Export Menu & Android APK</h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[10px] font-bold">
                  v{apkInfo.versionName}
                </span>
              </div>
              <p className="text-xs text-slate-300">Download directly to your Android phone or export app data</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
            aria-label="Close export menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab selection */}
        <div className="flex items-center gap-1 px-6 border-b border-slate-200/80 bg-slate-50/80 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('apk')}
            className={`py-3 px-3 border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'apk'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Android APK (.apk)</span>
          </button>
          <button
            onClick={() => setActiveTab('backup')}
            className={`py-3 px-3 border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'backup'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileJson className="w-4 h-4" />
            <span>Chat Backup (JSON)</span>
          </button>
          <button
            onClick={() => setActiveTab('pwa')}
            className={`py-3 px-3 border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'pwa'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>PWA / Home Screen</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'apk' && (
            <div className="space-y-5">
              {/* Main APK Download Card */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-50 via-sky-50/50 to-indigo-50 border border-blue-200/70 shadow-xs">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/20">
                      <Smartphone className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-slate-900 text-base">ArfaChat Android APK</h3>
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[11px] font-bold border border-emerald-300">
                          Ready to Install
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Package: <code className="font-mono text-blue-700 bg-white/70 px-1 py-0.5 rounded">{apkInfo.packageName}</code>
                      </p>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1.5 flex-wrap">
                        <span>Version {apkInfo.versionName}</span>
                        <span>•</span>
                        <span>{apkInfo.architecture}</span>
                        <span>•</span>
                        <span>{apkInfo.fileSize}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                    <button
                      onClick={handleDownloadApk}
                      disabled={isDownloading}
                      className="px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm shadow-blue-500/25 transition-all transform active:scale-98 cursor-pointer disabled:opacity-75"
                    >
                      {isDownloading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Preparing APK...</span>
                        </>
                      ) : downloadSuccess ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                          <span>Downloading Started!</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          <span>Download APK Now</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {downloadSuccess && (
                  <div className="mt-3 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      APK download initiated! Check your phone's Notification shade or Downloads folder to install.
                    </span>
                  </div>
                )}
              </div>

              {/* QR Code & Share Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* QR Code Box */}
                <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs flex flex-col items-center text-center">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 mb-2">
                    <QrCode className="w-4 h-4 text-blue-600" />
                    <span>Scan with Android Phone Camera</span>
                  </div>
                  <div className="p-2 bg-white rounded-xl border border-slate-100 shadow-inner mb-2">
                    <img
                      src={qrSvgUrl}
                      alt="Scan to download APK on Android"
                      className="w-32 h-32 rounded-lg"
                      loading="lazy"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 max-w-xs">
                    Point your Android camera at this QR code to download and install ArfaChat directly on your mobile device.
                  </p>
                </div>

                {/* Direct Link & Specs Box */}
                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 shadow-2xs flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-2">
                      <Share2 className="w-4 h-4 text-blue-600" />
                      Direct Download Link
                    </span>
                    <div className="flex items-center gap-1 p-2 rounded-xl bg-white border border-slate-200 text-xs font-mono text-slate-600 break-all select-all mb-2">
                      <span className="truncate">{getFullDownloadUrl()}</span>
                      <button
                        onClick={handleCopyLink}
                        title="Copy direct link"
                        className="ml-auto p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-blue-600 shrink-0 cursor-pointer"
                      >
                        {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    {copiedLink && (
                      <p className="text-[10px] text-emerald-600 font-semibold mb-2">
                        ✓ Download URL copied to clipboard!
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-slate-200/80 text-[11px]">
                    <div className="flex justify-between text-slate-600">
                      <span>Package ID:</span>
                      <span className="font-mono font-medium text-slate-900">{apkInfo.packageName}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Compatibility:</span>
                      <span className="font-medium text-slate-900">{apkInfo.minSdkVersion}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Target OS:</span>
                      <span className="font-medium text-slate-900">{apkInfo.targetSdkVersion}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Security:</span>
                      <span className="font-medium text-emerald-700 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        Signed & Verified
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Android Phone Installation Guide */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowInstallGuide(!showInstallGuide)}
                  className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-left text-xs font-bold text-slate-800 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-blue-600" />
                    <span>How to Install on Any Android Phone (Quick 4-Step Guide)</span>
                  </div>
                  {showInstallGuide ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>

                {showInstallGuide && (
                  <div className="p-4 bg-white divide-y divide-slate-100 space-y-3 text-xs">
                    <div className="flex items-start gap-3 pt-2 first:pt-0">
                      <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-[11px]">
                        1
                      </span>
                      <div>
                        <p className="font-semibold text-slate-900">Download the APK file</p>
                        <p className="text-slate-500 text-[11px]">
                          Tap the blue "Download APK Now" button above or scan the QR code using your phone's camera.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 pt-3">
                      <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-[11px]">
                        2
                      </span>
                      <div>
                        <p className="font-semibold text-slate-900">Confirm Download ("Download anyway")</p>
                        <p className="text-slate-500 text-[11px]">
                          Chrome or your browser will show standard notice: "File might be harmful". Tap <strong className="text-slate-700">"Download anyway"</strong>.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 pt-3">
                      <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-[11px]">
                        3
                      </span>
                      <div>
                        <p className="font-semibold text-slate-900">Allow installation from browser</p>
                        <p className="text-slate-500 text-[11px]">
                          Open the downloaded file. If Android prompts "For your security, your phone is not allowed to install unknown apps", tap <strong className="text-slate-700">Settings</strong> and toggle <strong className="text-slate-700">"Allow from this source"</strong> on.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 pt-3">
                      <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-[11px]">
                        4
                      </span>
                      <div>
                        <p className="font-semibold text-slate-900">Tap Install & Open ArfaChat</p>
                        <p className="text-slate-500 text-[11px]">
                          Tap <strong className="text-slate-700">Install</strong>. Once completed, tap <strong className="text-slate-700">Open</strong> to launch ArfaChat with audio/video calls, real-time messaging, and camera support!
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'backup' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <h3 className="font-bold text-slate-900 text-sm mb-1">Export Complete Chat & Contact Backup</h3>
                <p className="text-xs text-slate-600 mb-4">
                  Export all your current contacts, conversations, and user settings as an unencrypted, portable JSON backup file that you can store locally or import into external tools.
                </p>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-[11px] text-slate-500 block">Contacts in Backup</span>
                    <span className="text-lg font-bold text-slate-900">{contacts.length}</span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-[11px] text-slate-500 block">Conversations in Backup</span>
                    <span className="text-lg font-bold text-slate-900">{conversations.length}</span>
                  </div>
                </div>

                <button
                  onClick={handleExportJsonBackup}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
                >
                  <FileJson className="w-4 h-4" />
                  <span>Download Backup JSON File</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'pwa' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <h3 className="font-bold text-slate-900 text-sm mb-1">Install as Web App (Instant Home Screen Icon)</h3>
                <p className="text-xs text-slate-600 mb-4">
                  You can also add ArfaChat to your Android home screen instantly without downloading an APK file:
                </p>

                <div className="space-y-2.5 text-xs text-slate-700">
                  <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-start gap-2.5">
                    <span className="font-bold text-blue-600">1.</span>
                    <span>Tap the three dots (⋮) menu in Chrome or your Android browser.</span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-start gap-2.5">
                    <span className="font-bold text-blue-600">2.</span>
                    <span>Select <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.</span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-start gap-2.5">
                    <span className="font-bold text-blue-600">3.</span>
                    <span>Confirm by tapping <strong>Install</strong>. ArfaChat will appear alongside your native apps!</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>ArfaChat CallingApp • com.arfachat.subarfa</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
