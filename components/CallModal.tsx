'use client';

import React, { useEffect } from 'react';
import { ActiveCallData, CallState } from '@/lib/types';
import { VideoCall } from './VideoCall';
import { ringtones } from '@/lib/webrtc/audio';
import { Mic, MicOff, Video, VideoOff, PhoneOff } from 'lucide-react';

interface CallModalProps {
  callState: CallState;
  activeCall: ActiveCallData;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isVideoEnabled: boolean;
  callDuration: number;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onEndCall: () => void;
}

export const CallModal: React.FC<CallModalProps> = ({
  callState,
  activeCall,
  localStream,
  remoteStream,
  isMuted,
  isVideoEnabled,
  callDuration,
  onToggleAudio,
  onToggleVideo,
  onEndCall,
}) => {
  useEffect(() => {
    if (callState === 'calling') {
      ringtones.startCallingTone();
    } else if (callState === 'connected') {
      ringtones.stop();
    } else if (callState === 'ended' || callState === 'rejected') {
      ringtones.stop();
      ringtones.playEndTone();
    }

    return () => {
      ringtones.stop();
    };
  }, [callState]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/90 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full sm:max-w-4xl h-full sm:h-[85vh] bg-[#0b141a] sm:border sm:border-[#222e35] sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        {/* Top Info Bar */}
        <div className="absolute top-0 inset-x-0 z-30 flex items-center justify-between p-4 bg-gradient-to-b from-[#111b21]/90 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#202c33] border border-[#222e35] overflow-hidden flex items-center justify-center font-bold text-[#e9edef] text-sm">
              {activeCall.peerAvatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={activeCall.peerAvatarUrl}
                  alt={activeCall.peerUsername}
                  className="w-full h-full object-cover"
                />
              ) : (
                activeCall.peerUsername.charAt(0).toUpperCase()
              )}
            </div>

            <div>
              <h2 className="text-sm font-semibold text-white drop-shadow">
                {activeCall.peerUsername}
              </h2>
              <p className="text-xs text-[#00a884] drop-shadow flex items-center gap-1.5 font-medium">
                {callState === 'calling' && (
                  <>
                    <span className="w-2 h-2 rounded-full bg-[#25d366] animate-pulse" />
                    <span>Calling...</span>
                  </>
                )}
                {callState === 'connected' && (
                  <>
                    <span className="w-2 h-2 rounded-full bg-[#25d366]" />
                    <span>{formatDuration(callDuration)}</span>
                  </>
                )}
                {callState === 'ended' && <span>Call ended</span>}
                {callState === 'rejected' && <span>Call declined</span>}
              </p>
            </div>
          </div>
        </div>

        {/* Video / Audio Stage */}
        <div className="flex-1 w-full h-full">
          <VideoCall
            localStream={localStream}
            remoteStream={remoteStream}
            peerUsername={activeCall.peerUsername}
            peerAvatarUrl={activeCall.peerAvatarUrl}
            isVideo={activeCall.isVideo}
            isVideoEnabled={isVideoEnabled}
            isMuted={isMuted}
            callState={callState}
          />
        </div>

        {/* Bottom Call Controls */}
        <div className="absolute bottom-0 inset-x-0 z-30 flex items-center justify-center gap-5 p-6 bg-gradient-to-t from-[#111b21]/95 via-[#111b21]/60 to-transparent">
          {/* Mute Button */}
          <button
            onClick={onToggleAudio}
            className={`w-13 h-13 rounded-full flex items-center justify-center transition shadow-lg cursor-pointer active:scale-95 ${
              isMuted
                ? 'bg-[#ea4335] text-white'
                : 'bg-[#202c33] hover:bg-[#2a3942] text-[#e9edef] border border-[#222e35]'
            }`}
            title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
            aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Toggle Video Button */}
          <button
            onClick={onToggleVideo}
            className={`w-13 h-13 rounded-full flex items-center justify-center transition shadow-lg cursor-pointer active:scale-95 ${
              !isVideoEnabled
                ? 'bg-[#ea4335] text-white'
                : 'bg-[#202c33] hover:bg-[#2a3942] text-[#e9edef] border border-[#222e35]'
            }`}
            title={isVideoEnabled ? 'Turn camera off' : 'Turn camera on'}
            aria-label={isVideoEnabled ? 'Turn camera off' : 'Turn camera on'}
          >
            {isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </button>

          {/* End Call Button */}
          <button
            onClick={onEndCall}
            className="w-13 h-13 rounded-full bg-[#ea4335] hover:bg-[#d93025] text-white flex items-center justify-center shadow-xl transition hover:scale-105 active:scale-95 cursor-pointer"
            title="End call"
            aria-label="End call"
          >
            <PhoneOff className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};
