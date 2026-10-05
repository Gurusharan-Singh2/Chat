'use client';

import React from 'react';
import { MessageSquare, Lock, Phone, Video, ShieldCheck } from 'lucide-react';

export default function ChatDashboardPage() {
  return (
    <div className="flex-1 h-full flex flex-col items-center justify-center p-6 text-center bg-[#222e35]/30 select-none border-b-6 border-[#00a884]">
      <div className="max-w-md flex flex-col items-center">
        {/* WhatsApp-styled Welcome Graphic */}
        <div className="w-24 h-24 rounded-full bg-[#111b21] border border-[#222e35] flex items-center justify-center text-[#00a884] mb-6 shadow-xl">
          <MessageSquare className="w-12 h-12 fill-current" />
        </div>

        <h2 className="text-2xl font-light text-[#e9edef] tracking-wide mb-3">
          PulseChat Web
        </h2>
        <p className="text-sm text-[#8696a0] mb-8 leading-relaxed max-w-sm">
          Send and receive text messages, share files and documents, and make HD voice or video calls in real-time.
        </p>

        {/* Quick Highlights */}
        <div className="flex items-center justify-center gap-6 py-4 px-6 rounded-2xl bg-[#111b21] border border-[#222e35] text-xs text-[#8696a0] mb-8 shadow-sm">
          <div className="flex items-center gap-2 text-[#e9edef]">
            <Phone className="w-4 h-4 text-[#00a884]" />
            <span>Voice</span>
          </div>
          <div className="w-1 h-1 rounded-full bg-[#8696a0]" />
          <div className="flex items-center gap-2 text-[#e9edef]">
            <Video className="w-4 h-4 text-[#00a884]" />
            <span>Video</span>
          </div>
          <div className="w-1 h-1 rounded-full bg-[#8696a0]" />
          <div className="flex items-center gap-2 text-[#e9edef]">
            <ShieldCheck className="w-4 h-4 text-[#00a884]" />
            <span>P2P</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-[#8696a0]">
          <Lock className="w-3.5 h-3.5" />
          <span>Secured with direct Peer-to-Peer Encryption</span>
        </div>
      </div>
    </div>
  );
}
