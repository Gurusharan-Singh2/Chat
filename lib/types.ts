export interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  created_at: string;
}

export interface Conversation {
  id: string;
  user1_id: string;
  user2_id: string;
  created_at: string;
  updated_at: string;
  // Joined profile of the other participant for easy UI rendering
  other_user?: Profile;
  last_message?: Message;
  unread_count?: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
  file_url?: string | null;
  file_name?: string | null;
  file_type?: string | null;
  file_size?: number | null;
}

export type CallState =
  | 'idle'
  | 'calling'     // Caller waiting for response
  | 'ringing'     // Callee receiving incoming call
  | 'connected'   // Active media call
  | 'ended'       // Call finished
  | 'rejected';   // Call declined or busy

export type CallType = 'audio' | 'video';

export interface SignalingPayload {
  type: 'call-offer' | 'call-answer' | 'ice-candidate' | 'call-reject' | 'call-end' | 'media-toggle';
  callId: string;
  fromUserId: string;
  fromUsername?: string;
  fromAvatarUrl?: string | null;
  targetUserId: string;
  isVideo?: boolean;
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  isAudioEnabled?: boolean;
  isVideoEnabled?: boolean;
}

export interface ActiveCallData {
  callId: string;
  peerId: string;
  peerUsername: string;
  peerAvatarUrl?: string | null;
  isVideo: boolean;
  isInitiator: boolean;
}

export interface IncomingCallData {
  callId: string;
  callerId: string;
  callerUsername: string;
  callerAvatarUrl?: string | null;
  isVideo: boolean;
  sdp: RTCSessionDescriptionInit;
}
