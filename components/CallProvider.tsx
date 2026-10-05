'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { Profile, ActiveCallData, IncomingCallData, CallState } from '@/lib/types';
import { useWebRTC } from '@/hooks/useWebRTC';
import { IncomingCallModal } from './IncomingCallModal';
import { CallModal } from './CallModal';
import { AlertCircle, X } from 'lucide-react';

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
    clearError,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleAudio,
    toggleVideo,
  } = useWebRTC(currentUser);

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
      }}
    >
      {children}

      {/* Error Notification Toast */}
      {errorMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 bg-rose-950/90 border border-rose-700/80 text-rose-200 px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-md animate-fade-in max-w-sm">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <p className="text-xs flex-1">{errorMessage}</p>
          <button
            onClick={clearError}
            className="text-rose-400 hover:text-white p-1"
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
