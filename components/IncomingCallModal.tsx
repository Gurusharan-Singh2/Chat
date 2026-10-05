'use client';

import React, { useEffect } from 'react';
import { IncomingCallData } from '@/lib/types';
import { ringtones } from '@/lib/webrtc/audio';
import { Phone, PhoneOff, Video } from 'lucide-react';

interface IncomingCallModalProps {
  incomingCall: IncomingCallData;
  onAccept: () => void;
  onReject: () => void;
}

export const IncomingCallModal: React.FC<IncomingCallModalProps> = ({
  incomingCall,
  onAccept,
  onReject,
}) => {
  useEffect(() => {
    ringtones.startIncomingTone();
    return () => {
      ringtones.stop();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div className="w-full max-w-sm bg-[#111b21] border border-[#222e35] rounded-3xl p-6 text-center shadow-2xl flex flex-col items-center">
        {/* Caller Avatar with WhatsApp pulsing ring */}
        <div className="relative mb-5">
          <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-[#00a884] animate-ring-pulse bg-[#202c33] flex items-center justify-center text-2xl font-bold text-[#e9edef] shadow-xl">
            {incomingCall.callerAvatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={incomingCall.callerAvatarUrl}
                alt={incomingCall.callerUsername}
                className="w-full h-full object-cover"
              />
            ) : (
              incomingCall.callerUsername.charAt(0).toUpperCase()
            )}
          </div>
          <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[#00a884] border-2 border-[#111b21] flex items-center justify-center text-white">
            {incomingCall.isVideo ? (
              <Video className="w-4 h-4" />
            ) : (
              <Phone className="w-4 h-4" />
            )}
          </div>
        </div>

        {/* Caller info */}
        <h3 className="text-xl font-bold text-[#e9edef] mb-1">
          {incomingCall.callerUsername}
        </h3>
        <p className="text-sm text-[#00a884] font-medium mb-8">
          WhatsApp {incomingCall.isVideo ? 'Video' : 'Voice'} Call...
        </p>

        {/* Actions */}
        <div className="flex items-center justify-center gap-8 w-full">
          {/* Reject */}
          <div className="flex flex-col items-center gap-1.5">
            <button
              onClick={() => {
                ringtones.stop();
                onReject();
              }}
              className="w-14 h-14 rounded-full bg-[#ea4335] hover:bg-[#d93025] text-white flex items-center justify-center shadow-lg shadow-rose-600/30 transition hover:scale-105 active:scale-95 cursor-pointer"
              aria-label="Decline call"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
            <span className="text-xs text-[#8696a0]">Decline</span>
          </div>

          {/* Accept */}
          <div className="flex flex-col items-center gap-1.5">
            <button
              onClick={() => {
                ringtones.stop();
                onAccept();
              }}
              className="w-14 h-14 rounded-full bg-[#00a884] hover:bg-[#02906f] text-white flex items-center justify-center shadow-lg shadow-emerald-600/30 transition hover:scale-105 active:scale-95 cursor-pointer"
              aria-label="Accept call"
            >
              {incomingCall.isVideo ? (
                <Video className="w-6 h-6" />
              ) : (
                <Phone className="w-6 h-6" />
              )}
            </button>
            <span className="text-xs text-[#8696a0]">Accept</span>
          </div>
        </div>
      </div>
    </div>
  );
};
