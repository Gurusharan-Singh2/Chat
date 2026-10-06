'use client';

import React, { useState } from 'react';
import {
  Mic,
  Video,
  SlidersHorizontal,
  Lock,
  RefreshCw,
  X,
  Smartphone,
  Laptop,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';

interface PermissionGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  mediaType?: 'audio' | 'video' | 'both';
}

export const PermissionGuideModal: React.FC<PermissionGuideModalProps> = ({
  isOpen,
  onClose,
  mediaType = 'both',
}) => {
  const [platformTab, setPlatformTab] = useState<'android' | 'ios' | 'desktop'>('android');

  if (!isOpen) return null;

  const isAudioOnly = mediaType === 'audio';

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div className="w-full max-w-md bg-[#111b21] border border-[#222e35] rounded-3xl p-5 sm:p-6 text-left shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              {isAudioOnly ? <Mic className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[#e9edef]">
                Allow Device Access
              </h3>
              <p className="text-xs text-[#8696a0]">
                {isAudioOnly
                  ? 'Microphone access is blocked in your browser'
                  : 'Microphone & Camera are blocked in your browser'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-[#8696a0] hover:text-[#e9edef] hover:bg-[#202c33] transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Platform Selector Tabs */}
        <div className="flex items-center p-1 bg-[#202c33] rounded-xl mb-4 text-xs font-medium">
          <button
            onClick={() => setPlatformTab('android')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg transition cursor-pointer ${
              platformTab === 'android'
                ? 'bg-[#00a884] text-white shadow-sm'
                : 'text-[#8696a0] hover:text-[#e9edef]'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            Android / Chrome
          </button>
          <button
            onClick={() => setPlatformTab('ios')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg transition cursor-pointer ${
              platformTab === 'ios'
                ? 'bg-[#00a884] text-white shadow-sm'
                : 'text-[#8696a0] hover:text-[#e9edef]'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            iPhone / Safari
          </button>
          <button
            onClick={() => setPlatformTab('desktop')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg transition cursor-pointer ${
              platformTab === 'desktop'
                ? 'bg-[#00a884] text-white shadow-sm'
                : 'text-[#8696a0] hover:text-[#e9edef]'
            }`}
          >
            <Laptop className="w-3.5 h-3.5" />
            Computer
          </button>
        </div>

        {/* Android / Mobile Chrome Instructions */}
        {platformTab === 'android' && (
          <div className="space-y-3.5 text-xs text-[#d1d7db]">
            {/* Visual Address Bar Mockup */}
            <div className="bg-[#0b141a] border border-[#222e35] rounded-xl p-2.5 flex items-center gap-2 text-[11px] text-[#8696a0]">
              <div className="p-1.5 rounded-lg bg-[#00a884]/20 border border-[#00a884] text-[#00a884] animate-pulse flex items-center gap-1">
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </div>
              <span className="flex-1 font-mono text-[#e9edef] truncate">
                ...vercel.app
              </span>
              <span className="text-[10px] text-[#00a884] font-semibold bg-[#00a884]/10 px-2 py-0.5 rounded">
                Tap Here 👆
              </span>
            </div>

            <ol className="space-y-2.5">
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#202c33] text-[#00a884] font-bold flex items-center justify-center shrink-0 text-[11px]">
                  1
                </span>
                <span>
                  Tap the <strong className="text-[#e9edef]">Tune / Settings icon (🎛️)</strong> or <strong className="text-[#e9edef]">Lock (🔒)</strong> right next to the URL in your browser address bar above.
                </span>
              </li>

              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#202c33] text-[#00a884] font-bold flex items-center justify-center shrink-0 text-[11px]">
                  2
                </span>
                <span>
                  Tap <strong className="text-[#e9edef]">Permissions</strong> (or Site settings).
                </span>
              </li>

              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#202c33] text-[#00a884] font-bold flex items-center justify-center shrink-0 text-[11px]">
                  3
                </span>
                <span>
                  Toggle <strong className="text-[#00a884]">Microphone</strong>{' '}
                  {!isAudioOnly && <span>and <strong className="text-[#00a884]">Camera</strong> </span>}
                  from <span className="text-rose-400 font-semibold">Blocked</span> to{' '}
                  <span className="text-[#00a884] font-semibold">Allow</span>.
                </span>
              </li>

              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#202c33] text-[#00a884] font-bold flex items-center justify-center shrink-0 text-[11px]">
                  4
                </span>
                <span>
                  Tap the green <strong className="text-[#00a884]">Reload Page</strong> button below to start calling.
                </span>
              </li>
            </ol>

            {/* Android System Level Hint */}
            <div className="bg-[#182229] border border-[#222e35] rounded-xl p-3 text-[11px] text-[#8696a0] mt-3">
              <p className="font-semibold text-[#e9edef] mb-1 flex items-center gap-1.5">
                <ExternalLink className="w-3.5 h-3.5 text-[#00a884]" />
                Still blocked by Android?
              </p>
              <p>
                Open your phone’s <strong>Settings ➔ Apps ➔ Chrome ➔ Permissions</strong> and allow{' '}
                <strong>Microphone</strong> {!isAudioOnly && '& <strong>Camera</strong>'}.
              </p>
            </div>
          </div>
        )}

        {/* iPhone / Safari Instructions */}
        {platformTab === 'ios' && (
          <div className="space-y-3 text-xs text-[#d1d7db]">
            <ol className="space-y-2.5">
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#202c33] text-[#00a884] font-bold flex items-center justify-center shrink-0 text-[11px]">
                  1
                </span>
                <span>
                  Tap the <strong className="text-[#e9edef]">aA</strong> icon on the left side of the Safari address bar.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#202c33] text-[#00a884] font-bold flex items-center justify-center shrink-0 text-[11px]">
                  2
                </span>
                <span>
                  Tap <strong className="text-[#e9edef]">Website Settings</strong>.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#202c33] text-[#00a884] font-bold flex items-center justify-center shrink-0 text-[11px]">
                  3
                </span>
                <span>
                  Set <strong className="text-[#00a884]">Microphone</strong> {!isAudioOnly && 'and <strong className="text-[#00a884]">Camera</strong>'} to <strong className="text-[#00a884]">Allow</strong>.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#202c33] text-[#00a884] font-bold flex items-center justify-center shrink-0 text-[11px]">
                  4
                </span>
                <span>
                  Tap <strong className="text-[#00a884]">Done</strong> and reload this page.
                </span>
              </li>
            </ol>
          </div>
        )}

        {/* Desktop Browser Instructions */}
        {platformTab === 'desktop' && (
          <div className="space-y-3 text-xs text-[#d1d7db]">
            <ol className="space-y-2.5">
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#202c33] text-[#00a884] font-bold flex items-center justify-center shrink-0 text-[11px]">
                  1
                </span>
                <span>
                  Click the <strong className="text-[#e9edef]">Lock (🔒)</strong> or <strong className="text-[#e9edef]">Tune (🎛️)</strong> icon to the left of the website address.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#202c33] text-[#00a884] font-bold flex items-center justify-center shrink-0 text-[11px]">
                  2
                </span>
                <span>
                  Turn the toggle switch for <strong className="text-[#00a884]">Microphone</strong> {!isAudioOnly && 'and <strong className="text-[#00a884]">Camera</strong>'} to <strong className="text-[#00a884]">ON</strong>.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#202c33] text-[#00a884] font-bold flex items-center justify-center shrink-0 text-[11px]">
                  3
                </span>
                <span>
                  Click the <strong className="text-[#00a884]">Reload</strong> button to apply changes.
                </span>
              </li>
            </ol>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-5 pt-3 border-t border-[#222e35] flex items-center gap-3">
          <button
            onClick={handleReload}
            className="flex-1 bg-[#00a884] hover:bg-[#02906f] text-white py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer shadow-md shadow-emerald-600/20"
          >
            <RefreshCw className="w-4 h-4" />
            Reload Page
          </button>
          <button
            onClick={onClose}
            className="bg-[#202c33] hover:bg-[#2a3942] text-[#8696a0] hover:text-[#e9edef] py-2.5 px-4 rounded-xl text-xs font-semibold transition active:scale-95 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
