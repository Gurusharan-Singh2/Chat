# PulseChat — Real-Time Chat & WebRTC Calling Web App

PulseChat is a full-featured real-time communication application built with **Next.js 15+ (App Router)**, **TypeScript**, **Tailwind CSS**, and **Supabase**, engineered to be deployed **100% on free-tier services** (Vercel + Supabase Free + Google STUN / Metered TURN).

---

## 🌟 Key Features

1. **Authentication (Supabase Auth)**
   - Sign up and sign in with email + password.
   - Automatic user profile creation with avatar generation via PostgreSQL trigger.
   - Session preservation and route protection via Next.js Proxy/Middleware.

2. **User Discovery & 1:1 Conversations**
   - Live user search by username.
   - Direct messaging list with last message snippet, timestamp, and unread counter badges.
   - Atomic `get_or_create_conversation` database function to prevent duplicate conversations.

3. **Real-Time 1:1 Chat**
   - Instant message delivery powered by Supabase **Postgres Changes**.
   - Read receipts with delivered (single check) and seen (double check) status with timestamps.
   - Live typing indicator broadcast with auto-dismiss debounce.
   - Full message history persisted in PostgreSQL with auto-scroll to latest message.

4. **WebRTC Voice & Video Calling (1:1)**
   - Native browser `RTCPeerConnection` with zero paid third-party SDKs.
   - Signaling exchanged entirely via **Supabase Realtime Broadcast** (no custom WebSocket server needed).
   - Incoming call modal with synthesized web audio ringtone and **Accept / Decline** buttons.
   - In-call controls:
     - Mute / unmute microphone.
     - Turn video camera on / off.
     - Switch between voice-only and video modes during an active call.
     - End call button.
   - Call states: `idle`, `calling`, `ringing`, `connected`, `ended`, `rejected`.
   - Local picture-in-picture stream with audio feedback prevention (`muted`).
   - Clean teardown: media tracks stop immediately on hangup or tab close (`beforeunload`).
   - Graceful camera/microphone permission error handling.

5. **Online / Offline Presence Indicator**
   - Real-time online tracking powered by **Supabase Presence**.
   - Glowing online badges on user list, conversation header, and profile cards.

---

## 🏗️ Architecture & Call Signaling Flow

Because Vercel serverless functions cannot run persistent WebSocket servers, this application uses **Supabase Realtime Broadcast** for WebRTC signaling:

```text
[User A: Caller]                           [Supabase Realtime]                           [User B: Callee]
      |                                              |                                            |
      |-- 1. getUserMedia(audio, video)              |                                            |
      |-- 2. createOffer() -> setLocalDescription    |                                            |
      |-- 3. Broadcast { type: 'call-offer', sdp } ->|==== Channel: user-signals:B ============> |
      |                                              |                                 Ring tone plays
      |                                              |                                 Popup: Accept / Reject
      |                                              |                                            |
      |                                              |                                 User B clicks Accept
      |                                              |                             -- 4. getUserMedia()
      |                                              |                             -- 5. setRemoteDescription(offer)
      |                                              |                             -- 6. createAnswer() -> setLocalDesc
      |<== Channel: user-signals:A ==================|<-- 7. Broadcast { type: 'call-answer', sdp } -|
      |-- 8. setRemoteDescription(answer)            |                                            |
      |                                              |                                            |
      |<========= 9. Exchange ICE Candidates via Supabase Broadcast (user-signals:*) ============>|
      |                                                                                           |
      |======================== 10. Direct P2P Media Stream (WebRTC) =============================|
```

---

## 📁 Project Structure

```text
├── app/
│   ├── auth/callback/route.ts       # Supabase auth confirmation handler
│   ├── chat/
│   │   ├── [conversationId]/page.tsx# Active conversation view with ChatWindow
│   │   ├── layout.tsx               # Authenticated shell & CallProvider wrapper
│   │   └── page.tsx                 # Default dashboard overview
│   ├── login/page.tsx               # Login page
│   ├── register/page.tsx            # Signup page with avatar generator
│   ├── globals.css                  # Tailwind styles, glassmorphism, animations
│   ├── layout.tsx                   # Root HTML layout and metadata
│   └── page.tsx                     # Landing page
├── components/
│   ├── CallModal.tsx                # Active call modal with controls & timer
│   ├── CallProvider.tsx             # Global WebRTC call context & notification provider
│   ├── ChatShell.tsx                # Responsive split layout container
│   ├── ChatWindow.tsx               # Message stream, typing indicator, call buttons
│   ├── ConversationClient.tsx       # Client wrapper for dynamic chat route
│   ├── IncomingCallModal.tsx        # Incoming call popup with accept/reject & ringtone
│   ├── MessageBubble.tsx            # Individual message bubble with status ticks
│   ├── UserList.tsx                 # User search and conversations sidebar
│   └── VideoCall.tsx                # Remote video element & local PiP preview
├── hooks/
│   ├── useChat.ts                   # Postgres changes subscription, send message, typing
│   ├── usePresence.ts               # Supabase Presence channel online status
│   └── useWebRTC.ts                 # RTCPeerConnection, signaling, track toggling
├── lib/
│   ├── supabase/
│   │   ├── client.ts                # Browser Supabase client (@supabase/ssr)
│   │   ├── middleware.ts            # Session refresh helper
│   │   └── server.ts                # Server Supabase client (@supabase/ssr)
│   ├── webrtc/
│   │   ├── audio.ts                 # Web Audio API ringtone synthesizer
│   │   └── config.ts                # STUN/TURN server configuration
│   └── types.ts                     # TypeScript definitions
├── supabase/
│   └── schema.sql                   # Complete PostgreSQL schema, RLS, triggers & Realtime
├── proxy.ts                         # Next.js 16 Proxy / Middleware for auth protection
├── .env.example                     # Environment variables template
└── .env.local                       # Local environment variables
```

---

## 🚀 Step-by-Step Setup Guide

### 1. Create a Supabase Project (Free Tier)
1. Go to [supabase.com](https://supabase.com) and create a free account.
2. Click **New Project**, choose a project name (e.g. `pulse-chat`), set a database password, and select your preferred region.
3. Once the project is created, navigate to **Project Settings** > **API**.
4. Copy the:
   - **Project URL** (`https://<project-ref>.supabase.co`)
   - **anon / public key** (`ey...`)

### 2. Run the SQL Setup Script
1. In the Supabase Dashboard, open the **SQL Editor** tab from the left navigation.
2. Click **New query**.
3. Copy and paste the entire contents of [`supabase/schema.sql`](file:///c:/Users/91639/Desktop/call/supabase/schema.sql) into the editor.
4. Click **Run**.
5. This script creates:
   - `profiles`, `conversations`, and `messages` tables.
   - Row Level Security (RLS) policies.
   - Profile auto-creation trigger on `auth.users` signup.
   - Conversation timestamp update trigger.
   - `get_or_create_conversation` atomic RPC function.
   - Enables Supabase Realtime publication on `messages`, `conversations`, and `profiles`.

### 3. Disable Email Confirmation (Optional for Quick Testing)
If you want to test registration without waiting to click email confirmation links:
1. In the Supabase Dashboard, go to **Authentication** > **Providers** > **Email**.
2. Uncheck **Confirm email**.
3. Click **Save**.

### 4. Configure Environment Variables
Copy `.env.example` to `.env.local` and add your Supabase credentials:

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Optional: Metered.ca Free TURN server fallback (pre-configured with open relay)
NEXT_PUBLIC_TURN_URL=turn:global.relay.metered.ca:80,turns:global.relay.metered.ca:443
NEXT_PUBLIC_TURN_USERNAME=openrelayproject
NEXT_PUBLIC_TURN_CREDENTIAL=openrelayproject
```

### 5. Run Locally
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

> **Testing Tip**: Open one tab normally and a second tab in an **Incognito / Private window**. Register two different usernames (e.g. `alice` and `bob`). Search for `bob` from `alice`'s account to start a conversation, send messages, and initiate audio/video calls!

---

## 🌐 Deploy to Vercel (Free Tier)

1. Push your repository to GitHub, GitLab, or Bitbucket.
2. Sign in to [Vercel](https://vercel.com) with your Git provider.
3. Click **Add New...** > **Project** and import your repository.
4. In the **Environment Variables** section, add:
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase Project URL.
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon public key.
   - `NEXT_PUBLIC_TURN_URL`: `turn:global.relay.metered.ca:80,turns:global.relay.metered.ca:443` (or your custom TURN).
   - `NEXT_PUBLIC_TURN_USERNAME`: `openrelayproject`
   - `NEXT_PUBLIC_TURN_CREDENTIAL`: `openrelayproject`
5. Click **Deploy**.
6. In Supabase Dashboard, go to **Authentication** > **URL Configuration** and add your Vercel deployment URL (e.g. `https://your-app.vercel.app`) as a **Redirect URL**.

---

## 📊 Free-Tier Limits & Known Limitations

| Service / Component | Free Tier Allowance | Practical Implication / Limitation |
| :--- | :--- | :--- |
| **Vercel Hobby Plan** | 100 GB Bandwidth, Unlimited Serverless Requests | Fully sufficient for hosting Next.js frontend and Proxy. Does not support long-running WebSocket servers, which is why WebRTC signaling is routed through Supabase Broadcast instead. |
| **Supabase Free Tier** | 500 MB Database, 50,000 Monthly Active Users, 200 Concurrent Realtime connections | Suitable for several thousand messages and concurrent chats. After 7 days of total inactivity, a free Supabase project pauses (it unpauses with a single click in the dashboard). |
| **WebRTC 1:1 Calls** | Peer-to-Peer direct connection | Media streams travel directly between client devices (or through TURN). Zero server bandwidth used during video calls. Mesh/1:1 works smoothly without an SFU media server. |
| **Google STUN Servers** | Unlimited Free Public Access | Resolves public IPs for ~85% of standard home and mobile internet connections. |
| **TURN Relay Fallback** | Metered.ca (500 MB/month free) or OpenRelay | On restrictive corporate firewalls or symmetric NAT cellular networks, direct P2P fails and requires TURN relay. Metered.ca provides 500 MB/month free; beyond that, configure your own Coturn or upgrade TURN quota. |
