'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { Profile, ActiveCallData, IncomingCallData, CallState } from '@/lib/types';
import { useWebRTC } from '@/hooks/useWebRTC';
import { useState } from 'react';
import { IncomingCallModal } from './IncomingCallModal';
import { CallModal } from './CallModal';
import { PermissionGuideModal } from './PermissionGuideModal';
import { AlertCircle, X, HelpCircle } from 'lucide-react';

interface CallContextType {
  callState: CallState;
  activeCall: ActiveCallData | null;
  incomingCall: IncomingCallData | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isVideoEnabled: boolean;
  callDuration: number;
  startCall: (targetUser: Profile, isVideo: boolean) => void;
  acceptCall: () => void;
  rejectCall: () => void;
  endCall: () => void;
  toggleAudio: () => void;
  toggleVideo: () => void;
  setErrorMessage: (msg: string | null) => void;
  openPermissionGuide: (mediaType?: 'audio' | 'video' | 'both') => void;
}

const CallContext = createContext<CallContextType | null>(null);

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useCall must be used within a CallProvider');
  }
  return context;
};

interface CallProviderProps {
  currentUser: Profile | null;
  children: ReactNode;
}

export const CallProvider: React.FC<CallProviderProps> = ({ currentUser, children }) => {
  const [isPermissionGuideOpen, setIsPermissionGuideOpen] = useState(false);
  const [guideMediaType, setGuideMediaType] = useState<'audio' | 'video' | 'both'>('both');

  const {
    callState,
    activeCall,
    incomingCall,
    localStream,
    remoteStream,
    isMuted,
    isVideoEnabled,
    callDuration,
    errorMessage,
    errorMediaType,
    setErrorMessage,
    clearError,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleAudio,
    toggleVideo,
  } = useWebRTC(currentUser);

  const openPermissionGuide = (mediaType?: 'audio' | 'video' | 'both') => {
    setGuideMediaType(mediaType || errorMediaType || 'both');
    setIsPermissionGuideOpen(true);
  };

  const isPermissionError =
    !!errorMessage &&
    (errorMessage.toLowerCase().includes('permission') ||
      errorMessage.toLowerCase().includes('denied') ||
      errorMessage.toLowerCase().includes('allow'));

  return (
    <CallContext.Provider
      value={{
        callState,
        activeCall,
        incomingCall,
        localStream,
        remoteStream,
        isMuted,
        isVideoEnabled,
        callDuration,
        startCall,
        acceptCall,
        rejectCall,
        endCall,
        toggleAudio,
        toggleVideo,
        setErrorMessage,
        openPermissionGuide,
      }}
    >
      {children}

      {/* Device Permission Guide Modal */}
      <PermissionGuideModal
        isOpen={isPermissionGuideOpen}
        onClose={() => setIsPermissionGuideOpen(false)}
        mediaType={guideMediaType}
      />

      {/* Error Notification Toast */}
      {errorMessage && (
        <div className="fixed bottom-5 left-4 right-4 sm:left-auto sm:right-5 z-50 flex items-center gap-3 bg-[#1f1215]/95 border border-rose-500/60 text-rose-100 px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-md animate-fade-in sm:max-w-md">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <p className="text-xs flex-1 leading-relaxed">{errorMessage}</p>

          {isPermissionError && (
            <button
              onClick={() => openPermissionGuide(errorMediaType)}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-500/20 text-rose-200 hover:bg-rose-500/30 border border-rose-500/40 transition flex items-center gap-1 shrink-0 cursor-pointer active:scale-95"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              How to Fix
            </button>
          )}

          <button
            onClick={clearError}
            className="text-rose-400 hover:text-white p-1 rounded-md transition cursor-pointer"
            aria-label="Dismiss error"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Incoming Call Popup */}
      {callState === 'ringing' && incomingCall && (
        <IncomingCallModal
          incomingCall={incomingCall}
          onAccept={acceptCall}
          onReject={rejectCall}
        />
      )}

      {/* Active Call Overlay */}
      {(callState === 'calling' ||
        callState === 'connected' ||
        callState === 'ended' ||
        callState === 'rejected') &&
        activeCall && (
          <CallModal
            callState={callState}
            activeCall={activeCall}
            localStream={localStream}
            remoteStream={remoteStream}
            isMuted={isMuted}
            isVideoEnabled={isVideoEnabled}
            callDuration={callDuration}
            onToggleAudio={toggleAudio}
            onToggleVideo={toggleVideo}
            onEndCall={endCall}
          />
        )}
    </CallContext.Provider>
  );
};
