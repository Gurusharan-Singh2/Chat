/**
 * WebRTC ICE Servers configuration.
 *
 * WebRTC uses Interactive Connectivity Establishment (ICE) to discover the best
 * path to connect two peers directly (peer-to-peer).
 *
 * 1. STUN (Session Traversal Utilities for NAT):
 *    Free public STUN servers from Google are used to determine each user's
 *    public IP address and port.
 *
 * 2. TURN (Traversal Using Relays around NAT):
 *    When both users are behind symmetric NATs or restrictive corporate firewalls,
 *    direct peer-to-peer fails. A TURN server acts as a secure media relay.
 *    Metered.ca offers a 500 MB/month free tier which can be plugged in here via
 *    environment variables without touching the code.
 */

export function getIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    {
      urls: [
        'stun:stun.l.google.com:19302',
        'stun:stun1.l.google.com:19302',
        'stun:stun2.l.google.com:19302',
        'stun:stun3.l.google.com:19302',
        'stun:stun4.l.google.com:19302',
        'stun:stun.cloudflare.com:3478',
        'stun:stun.services.mozilla.com',
      ],
    },
  ];

  // Optional TURN server fallback (e.g. Free tier from Metered.ca or Coturn)
  const turnUrl = process.env.NEXT_PUBLIC_TURN_URL;
  const turnUsername = process.env.NEXT_PUBLIC_TURN_USERNAME;
  const turnCredential = process.env.NEXT_PUBLIC_TURN_CREDENTIAL;

  if (turnUrl && turnUsername && turnCredential) {
    // If comma-separated URLs were provided (e.g. turn:... and turns:...)
    const urls = turnUrl.split(',').map((u) => u.trim());
    servers.push({
      urls,
      username: turnUsername,
      credential: turnCredential,
    });
  }

  return servers;
}

export const RTC_CONFIGURATION: RTCConfiguration = {
  iceServers: getIceServers(),
  iceCandidatePoolSize: 10,
};

export const DEFAULT_MEDIA_CONSTRAINTS = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
  video: {
    width: { ideal: 1280, max: 1920 },
    height: { ideal: 720, max: 1080 },
    facingMode: 'user',
    frameRate: { ideal: 30, max: 60 },
  },
};
