'use client';

import React, { useRef, useEffect } from 'react';
import { CallState } from '@/lib/types';
import { MicOff, VideoOff, User } from 'lucide-react';

interface VideoCallProps {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  peerUsername: string;
  peerAvatarUrl?: string | null;
  isVideo: boolean;
  isVideoEnabled: boolean;
  isMuted: boolean;
  callState: CallState;
}

export const VideoCall: React.FC<VideoCallProps> = ({
  localStream,
  remoteStream,
  peerUsername,
  peerAvatarUrl,
  isVideo,
  isVideoEnabled,
  isMuted,
  callState,
}) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Attach local media stream to local video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, isVideoEnabled]);

  // Attach remote media stream to remote video element
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const hasRemoteVideo =
    isVideo &&
    remoteStream &&
    remoteStream.getVideoTracks().length > 0 &&
    remoteStream.getVideoTracks().some((t) => t.enabled);

  return (
    <div className="relative w-full h-full bg-slate-950 flex items-center justify-center overflow-hidden select-none">
      {/* ------------------------------------------------------------------ */}
      {/* Remote Video Display or Audio Avatar                                */}
      {/* ------------------------------------------------------------------ */}
      {isVideo && remoteStream ? (
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className={`w-full h-full object-cover ${
            hasRemoteVideo ? 'block' : 'hidden'
          }`}
        />
      ) : null}

      {/* Fallback to Avatar if audio-only or remote video is not playing */}
      {(!isVideo || !hasRemoteVideo) && (
        <div className="flex flex-col items-center justify-center gap-4 p-8 text-center animate-fade-in">
          <div className="relative">
            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-slate-700 bg-slate-800 flex items-center justify-center shadow-2xl">
              {peerAvatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={peerAvatarUrl}
                  alt={peerUsername}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-16 h-16 text-slate-500" />
              )}
            </div>

            {callState === 'connected' && (
              <span className="absolute bottom-2 right-2 w-5 h-5 rounded-full bg-emerald-500 ring-4 ring-slate-950 animate-pulse" />
            )}
          </div>

          <div>
            <h3 className="text-xl font-bold text-slate-100">{peerUsername}</h3>
            <p className="text-xs text-indigo-400 mt-1 font-medium">
              {callState === 'calling'
                ? 'Calling...'
                : callState === 'connected'
                ? isVideo
                  ? 'Camera turned off'
                  : 'Voice call active'
                : 'Connecting...'}
            </p>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Local Video Picture-in-Picture (PiP) Window                        */}
      {/* ------------------------------------------------------------------ */}
      {isVideo && (
        <div className="absolute top-4 right-4 w-32 h-44 sm:w-44 sm:h-56 bg-slate-900 border-2 border-slate-700 rounded-2xl overflow-hidden shadow-2xl z-20 transition group">
          {isVideoEnabled && localStream ? (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted // Always mute local video preview to prevent echo feedback
              className="w-full h-full object-cover -scale-x-100" // Mirror local selfie camera
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-slate-900 text-slate-500">
              <VideoOff className="w-6 h-6" />
              <span className="text-[10px]">Camera off</span>
            </div>
          )}

          {/* Local Mute Indicator Badge */}
          {isMuted && (
            <div className="absolute bottom-2 left-2 p-1.5 rounded-full bg-rose-600 text-white shadow-md">
              <MicOff className="w-3 h-3" />
            </div>
          )}

          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-[10px] text-slate-300 font-medium">
            You
          </div>
        </div>
      )}
    </div>
  );
};
