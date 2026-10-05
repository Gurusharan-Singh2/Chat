'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Profile,
  CallState,
  SignalingPayload,
  ActiveCallData,
  IncomingCallData,
} from '@/lib/types';
import { RTC_CONFIGURATION, DEFAULT_MEDIA_CONSTRAINTS } from '@/lib/webrtc/config';
import {
  startCallingTone,
  startIncomingTone,
  playEndTone,
  stopRingtones,
} from '@/lib/webrtc/audio';

export function useWebRTC(currentUser: Profile | null) {
  const supabase = useMemo(() => createClient(), []);

  // UI States
  const [callState, setCallState] = useState<CallState>('idle');
  const [activeCall, setActiveCall] = useState<ActiveCallData | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Mutable references for WebRTC internals
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const queuedCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const activeCallRef = useRef<ActiveCallData | null>(null);

  // Keep activeCallRef in sync
  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);

  // Keep localStreamRef in sync
  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  // --------------------------------------------------------------------------
  // Step 1: Cleanup Helper Function
  // --------------------------------------------------------------------------
  /**
   * Completely closes and tears down media streams, peer connection,
   * timers, and restores state to 'idle'.
   */
  const cleanupCall = useCallback(() => {
    // 1. Stop all tracks in the local media stream (releases camera and mic light)
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      localStreamRef.current = null;
      setLocalStream(null);
    }

    // 2. Stop all tracks in the remote media stream
    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      remoteStreamRef.current = null;
      setRemoteStream(null);
    }

    // 3. Close the RTCPeerConnection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.onicecandidate = null;
      peerConnectionRef.current.ontrack = null;
      peerConnectionRef.current.onconnectionstatechange = null;
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // 4. Reset queued ICE candidates
    queuedCandidatesRef.current = [];

    // 5. Clear the active call duration interval
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }

    // 6. Stop all ringtone audio
    try {
      stopRingtones();
    } catch {}

    // 7. Reset state
    setCallDuration(0);
    setActiveCall(null);
    setIncomingCall(null);
    setIsMuted(false);
    setIsVideoEnabled(true);
  }, []);

  // --------------------------------------------------------------------------
  // Step 2: Signaling Broadcast Sender
  // --------------------------------------------------------------------------
  /**
   * Sends signaling payloads to the target peer's personal channel
   * using Supabase Realtime Broadcast.
   */
  const sendSignal = useCallback(
    async (targetUserId: string, payload: SignalingPayload) => {
      try {
        const channel = supabase.channel(`user-signals:${targetUserId}`);
        await channel.send({
          type: 'broadcast',
          event: 'signal',
          payload,
        });
      } catch (err) {
        console.error('Failed to send signaling broadcast:', err);
      }
    },
    [supabase]
  );

  // --------------------------------------------------------------------------
  // Step 3: Peer Connection Factory
  // --------------------------------------------------------------------------
  /**
   * Instantiates an RTCPeerConnection configured with STUN/TURN,
   * binds ICE candidate discovery, and sets up track listeners.
   */
  const createPeerConnection = useCallback(
    (targetUserId: string, callId: string) => {
      const pc = new RTCPeerConnection(RTC_CONFIGURATION);

      // Listen for ICE candidates found locally and send them to the peer
      pc.onicecandidate = (event) => {
        if (event.candidate && currentUser) {
          sendSignal(targetUserId, {
            type: 'ice-candidate',
            callId,
            fromUserId: currentUser.id,
            targetUserId,
            candidate: event.candidate.toJSON(),
          });
        }
      };

      // Listen for incoming remote audio/video tracks
      pc.ontrack = (event) => {
        let stream = event.streams && event.streams[0];
        if (!stream) {
          stream = remoteStreamRef.current || new MediaStream();
          stream.addTrack(event.track);
        }
        remoteStreamRef.current = stream;
        // Always pass a new MediaStream instance so React state updates and triggers audio playback
        setRemoteStream(new MediaStream(stream.getTracks()));
      };

      // Monitor connection state
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          setCallState('connected');
        } else if (
          pc.connectionState === 'disconnected' ||
          pc.connectionState === 'failed' ||
          pc.connectionState === 'closed'
        ) {
          setCallState('ended');
          setTimeout(() => {
            cleanupCall();
            setCallState('idle');
          }, 1500);
        }
      };

      peerConnectionRef.current = pc;
      return pc;
    },
    [currentUser, sendSignal, cleanupCall]
  );

  // --------------------------------------------------------------------------
  // Step 4: Acquire User Media (Camera / Microphone)
  // --------------------------------------------------------------------------
  const getMediaStream = useCallback(
    async (videoRequested: boolean): Promise<MediaStream | null> => {
      try {
        setErrorMessage(null);
        let stream: MediaStream;

        try {
          const constraints: MediaStreamConstraints = {
            audio: DEFAULT_MEDIA_CONSTRAINTS.audio,
            video: videoRequested ? DEFAULT_MEDIA_CONSTRAINTS.video : false,
          };
          stream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch {
          // Fallback to basic constraints if advanced audio processing flags failed
          stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: videoRequested,
          });
        }

        // Ensure all audio tracks are active
        stream.getAudioTracks().forEach((track) => {
          track.enabled = true;
        });

        localStreamRef.current = stream;
        setLocalStream(stream);
        setIsVideoEnabled(videoRequested);
        return stream;
      } catch (err: unknown) {
        console.error('Error getting media devices:', err);
        let message = 'Unable to access your microphone or camera.';
        if (err instanceof DOMException) {
          if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            message = 'Microphone/Camera permission was denied. Please allow device access.';
          } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
            message = 'No microphone or camera device found on your system.';
          } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
            message = 'Your camera or microphone is already in use by another application.';
          }
        }
        setErrorMessage(message);
        return null;
      }
    },
    []
  );

  // --------------------------------------------------------------------------
  // Step 5: Initiate Outgoing Call (Caller)
  // --------------------------------------------------------------------------
  const startCall = useCallback(
    async (targetUser: Profile, isVideo: boolean) => {
      if (!currentUser) return;

      const callId = crypto.randomUUID();
      setCallState('calling');
      setActiveCall({
        callId,
        peerId: targetUser.id,
        peerUsername: targetUser.username,
        peerAvatarUrl: targetUser.avatar_url,
        isVideo,
        isInitiator: true,
      });

      // 1. Get local audio/video media
      const stream = await getMediaStream(isVideo);
      if (!stream) {
        setCallState('idle');
        return;
      }

      // Start WhatsApp calling tone
      try {
        startCallingTone();
      } catch {}

      // 2. Create peer connection
      const pc = createPeerConnection(targetUser.id, callId);

      // 3. Attach local media tracks to peer connection
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // 4. Create WebRTC SDP Offer
      try {
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: isVideo,
        });

        await pc.setLocalDescription(offer);

        // 5. Send offer via Supabase Broadcast
        await sendSignal(targetUser.id, {
          type: 'call-offer',
          callId,
          fromUserId: currentUser.id,
          fromUsername: currentUser.username,
          fromAvatarUrl: currentUser.avatar_url,
          targetUserId: targetUser.id,
          isVideo,
          sdp: offer,
        });
      } catch (err) {
        console.error('Failed to create or send offer:', err);
        setErrorMessage('Failed to initiate call.');
        cleanupCall();
        setCallState('idle');
      }
    },
    [currentUser, getMediaStream, createPeerConnection, sendSignal, cleanupCall]
  );

  // --------------------------------------------------------------------------
  // Step 6: Accept Incoming Call (Callee)
  // --------------------------------------------------------------------------
  const acceptCall = useCallback(async () => {
    if (!currentUser || !incomingCall) return;

    try {
      stopRingtones();
    } catch {}

    const { callId, callerId, callerUsername, callerAvatarUrl, isVideo, sdp } =
      incomingCall;

    setCallState('connected');
    setActiveCall({
      callId,
      peerId: callerId,
      peerUsername: callerUsername,
      peerAvatarUrl: callerAvatarUrl,
      isVideo,
      isInitiator: false,
    });
    setIncomingCall(null);

    // 1. Get local stream matching call type
    const stream = await getMediaStream(isVideo);
    if (!stream) {
      // Decline if media failed
      sendSignal(callerId, {
        type: 'call-reject',
        callId,
        fromUserId: currentUser.id,
        targetUserId: callerId,
      });
      cleanupCall();
      setCallState('idle');
      return;
    }

    // 2. Create peer connection
    const pc = createPeerConnection(callerId, callId);

    // 3. Add local tracks
    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    try {
      // 4. Set remote description from caller's offer
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));

      // 5. Drain any queued ICE candidates that arrived early
      while (queuedCandidatesRef.current.length > 0) {
        const candidate = queuedCandidatesRef.current.shift();
        if (candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
      }

      // 6. Create WebRTC SDP Answer with bidirectional media request
      const answer = await pc.createAnswer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: isVideo,
      });
      await pc.setLocalDescription(answer);

      // 7. Send answer back to caller
      await sendSignal(callerId, {
        type: 'call-answer',
        callId,
        fromUserId: currentUser.id,
        fromUsername: currentUser.username,
        targetUserId: callerId,
        sdp: answer,
      });
    } catch (err) {
      console.error('Failed to answer call:', err);
      setErrorMessage('Could not establish call connection.');
      cleanupCall();
      setCallState('idle');
    }
  }, [
    currentUser,
    incomingCall,
    getMediaStream,
    createPeerConnection,
    sendSignal,
    cleanupCall,
  ]);

  // --------------------------------------------------------------------------
  // Step 7: Reject Incoming Call (Callee)
  // --------------------------------------------------------------------------
  const rejectCall = useCallback(async () => {
    if (!currentUser || !incomingCall) return;

    try {
      stopRingtones();
      playEndTone();
    } catch {}

    const { callId, callerId } = incomingCall;
    await sendSignal(callerId, {
      type: 'call-reject',
      callId,
      fromUserId: currentUser.id,
      targetUserId: callerId,
    });

    setIncomingCall(null);
    setCallState('idle');
  }, [currentUser, incomingCall, sendSignal]);

  // --------------------------------------------------------------------------
  // Step 8: End Active Call (Either Party)
  // --------------------------------------------------------------------------
  const endCall = useCallback(async () => {
    try {
      stopRingtones();
      playEndTone();
    } catch {}

    const currentActive = activeCallRef.current;
    if (currentUser && currentActive) {
      await sendSignal(currentActive.peerId, {
        type: 'call-end',
        callId: currentActive.callId,
        fromUserId: currentUser.id,
        targetUserId: currentActive.peerId,
      });
    }

    setCallState('ended');
    setTimeout(() => {
      cleanupCall();
      setCallState('idle');
    }, 800);
  }, [currentUser, sendSignal, cleanupCall]);

  // --------------------------------------------------------------------------
  // Step 9: In-Call Controls (Mute Mic / Toggle Video / Switch Mode)
  // --------------------------------------------------------------------------
  const toggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);

        // Notify remote peer
        if (currentUser && activeCallRef.current) {
          sendSignal(activeCallRef.current.peerId, {
            type: 'media-toggle',
            callId: activeCallRef.current.callId,
            fromUserId: currentUser.id,
            targetUserId: activeCallRef.current.peerId,
            isAudioEnabled: audioTrack.enabled,
          });
        }
      }
    }
  }, [currentUser, sendSignal]);

  const toggleVideo = useCallback(async () => {
    if (!localStreamRef.current) return;

    const videoTrack = localStreamRef.current.getVideoTracks()[0];

    if (videoTrack) {
      // Toggle existing track
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoEnabled(videoTrack.enabled);

      if (currentUser && activeCallRef.current) {
        sendSignal(activeCallRef.current.peerId, {
          type: 'media-toggle',
          callId: activeCallRef.current.callId,
          fromUserId: currentUser.id,
          targetUserId: activeCallRef.current.peerId,
          isVideoEnabled: videoTrack.enabled,
        });
      }
    } else {
      // User was in audio-only call and wants to turn video ON
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({
          video: DEFAULT_MEDIA_CONSTRAINTS.video,
        });
        const newTrack = videoStream.getVideoTracks()[0];

        if (newTrack && peerConnectionRef.current) {
          localStreamRef.current.addTrack(newTrack);
          peerConnectionRef.current.addTrack(newTrack, localStreamRef.current);
          setIsVideoEnabled(true);

          // Update active call metadata
          setActiveCall((prev) => (prev ? { ...prev, isVideo: true } : null));

          // Renegotiate or inform peer
          if (currentUser && activeCallRef.current) {
            sendSignal(activeCallRef.current.peerId, {
              type: 'media-toggle',
              callId: activeCallRef.current.callId,
              fromUserId: currentUser.id,
              targetUserId: activeCallRef.current.peerId,
              isVideoEnabled: true,
            });
          }
        }
      } catch (err) {
        console.error('Failed to enable camera track:', err);
        setErrorMessage('Could not access camera.');
      }
    }
  }, [currentUser, sendSignal]);

  // --------------------------------------------------------------------------
  // Step 10: Call Duration Timer
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (callState === 'connected') {
      callTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
        callTimerRef.current = null;
      }
    }

    return () => {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
    };
  }, [callState]);

  // --------------------------------------------------------------------------
  // Step 11: Realtime Signaling Listener for Current User
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!currentUser?.id) return;

    const channel = supabase.channel(`user-signals:${currentUser.id}`);

    channel
      .on(
        'broadcast',
        { event: 'signal' },
        async ({ payload }: { payload: SignalingPayload }) => {
          const { type, callId, fromUserId, fromUsername, fromAvatarUrl, isVideo, sdp, candidate } =
            payload;

          switch (type) {
            case 'call-offer': {
              // Incoming call offer received!
              if (callState !== 'idle') {
                // Already in a call: reject as busy
                sendSignal(fromUserId, {
                  type: 'call-reject',
                  callId,
                  fromUserId: currentUser.id,
                  targetUserId: fromUserId,
                });
                return;
              }

              if (sdp) {
                setIncomingCall({
                  callId,
                  callerId: fromUserId,
                  callerUsername: fromUsername || 'User',
                  callerAvatarUrl: fromAvatarUrl,
                  isVideo: !!isVideo,
                  sdp,
                });
                setCallState('ringing');
                try {
                  startIncomingTone();
                } catch {}
              }
              break;
            }

            case 'call-answer': {
              // Caller received callee's answer
              try {
                stopRingtones();
              } catch {}
              const pc = peerConnectionRef.current;
              if (pc && sdp) {
                try {
                  await pc.setRemoteDescription(new RTCSessionDescription(sdp));
                  setCallState('connected');

                  // Drain any ICE candidates queued before answer arrived
                  while (queuedCandidatesRef.current.length > 0) {
                    const c = queuedCandidatesRef.current.shift();
                    if (c) {
                      await pc.addIceCandidate(new RTCIceCandidate(c));
                    }
                  }
                } catch (err) {
                  console.error('Failed to set remote description on answer:', err);
                }
              }
              break;
            }

            case 'ice-candidate': {
              if (candidate) {
                const pc = peerConnectionRef.current;
                if (pc && pc.remoteDescription && pc.remoteDescription.type) {
                  try {
                    await pc.addIceCandidate(new RTCIceCandidate(candidate));
                  } catch (err) {
                    console.error('Error adding received ICE candidate:', err);
                  }
                } else {
                  // Queue candidate until remote description is set
                  queuedCandidatesRef.current.push(candidate);
                }
              }
              break;
            }

            case 'call-reject': {
              try {
                stopRingtones();
                playEndTone();
              } catch {}
              setCallState('rejected');
              setTimeout(() => {
                cleanupCall();
                setCallState('idle');
              }, 2000);
              break;
            }

            case 'call-end': {
              try {
                stopRingtones();
                playEndTone();
              } catch {}
              setCallState('ended');
              setTimeout(() => {
                cleanupCall();
                setCallState('idle');
              }, 1000);
              break;
            }

            case 'media-toggle': {
              // Remote peer toggled audio or video
              break;
            }

            default:
              break;
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser, callState, sendSignal, cleanupCall, supabase]);

  // --------------------------------------------------------------------------
  // Step 12: Handle Window Unload (Tab Close / Navigation)
  // --------------------------------------------------------------------------
  useEffect(() => {
    const handleBeforeUnload = () => {
      const currentActive = activeCallRef.current;
      if (currentUser && currentActive) {
        // Send fast beacon/broadcast end signal
        sendSignal(currentActive.peerId, {
          type: 'call-end',
          callId: currentActive.callId,
          fromUserId: currentUser.id,
          targetUserId: currentActive.peerId,
        });
      }
      cleanupCall();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      cleanupCall();
    };
  }, [currentUser, sendSignal, cleanupCall]);

  return {
    callState,
    activeCall,
    incomingCall,
    localStream,
    remoteStream,
    isMuted,
    isVideoEnabled,
    callDuration,
    errorMessage,
    clearError: () => setErrorMessage(null),
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleAudio,
    toggleVideo,
  };
}
