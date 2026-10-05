'use client';

import React from 'react';
import { Lock, Phone, Video, Mic, ShieldCheck, Laptop, Smartphone } from 'lucide-react';

export default function ChatDashboardPage() {
  return (
    <div className="flex-1 h-full flex flex-col items-center justify-between p-6 sm:p-10 text-center bg-[#111b21] select-none border-b-6 border-[#00a884] overflow-y-auto">
      {/* Spacer top */}
      <div className="h-4" />

      {/* Main Center Content */}
      <div className="max-w-md w-full flex flex-col items-center my-auto animate-fade-in">
        {/* Authentic WhatsApp Connected Devices Hero Graphic */}
        <div className="relative mb-8">
          <div className="w-32 h-32 rounded-full bg-[#182229] border border-[#222e35] flex items-center justify-center shadow-2xl relative">
            {/* Laptop Vector */}
            <div className="w-16 h-12 rounded-t-lg bg-[#202c33] border-2 border-[#00a884] flex items-center justify-center relative shadow-md">
              <Laptop className="w-8 h-8 text-[#00a884]" />
              <div className="absolute -bottom-1 inset-x-0 h-1 bg-[#00a884] rounded-sm" />
            </div>

            {/* Smartphone Vector Overlay */}
            <div className="absolute -bottom-2 -right-2 w-10 h-16 rounded-xl bg-[#111b21] border-2 border-[#25d366] flex items-center justify-center shadow-xl">
              <Smartphone className="w-5 h-5 text-[#25d366]" />
            </div>
          </div>

          {/* Pulse Ripple Animation */}
          <span className="absolute inset-0 rounded-full border border-[#00a884]/30 animate-ping pointer-events-none" />
        </div>

        {/* Heading */}
        <h1 className="text-2xl sm:text-3xl font-light text-[#e9edef] tracking-wide mb-3">
          PulseChat Web
        </h1>

        <p className="text-sm text-[#8696a0] leading-relaxed max-w-sm mb-8">
          Send and receive messages without keeping your phone online. Use
          PulseChat on up to 4 linked devices at the same time.
        </p>

        {/* WhatsApp Features Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full mb-8">
          <div className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-[#202c33]/70 border border-[#222e35] text-xs text-[#8696a0]">
            <Phone className="w-4 h-4 text-[#00a884]" />
            <span className="text-[#e9edef] font-medium text-[11px]">HD Voice</span>
          </div>

          <div className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-[#202c33]/70 border border-[#222e35] text-xs text-[#8696a0]">
            <Video className="w-4 h-4 text-[#00a884]" />
            <span className="text-[#e9edef] font-medium text-[11px]">HD Video</span>
          </div>

          <div className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-[#202c33]/70 border border-[#222e35] text-xs text-[#8696a0]">
            <Mic className="w-4 h-4 text-[#00a884]" />
            <span className="text-[#e9edef] font-medium text-[11px]">Voice Notes</span>
          </div>

          <div className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-[#202c33]/70 border border-[#222e35] text-xs text-[#8696a0]">
            <ShieldCheck className="w-4 h-4 text-[#00a884]" />
            <span className="text-[#e9edef] font-medium text-[11px]">P2P Sync</span>
          </div>
        </div>
      </div>

      {/* WhatsApp Bottom Security Notice */}
      <div className="flex items-center gap-2 text-xs text-[#8696a0] select-none py-2">
        <Lock className="w-3.5 h-3.5 text-[#8696a0]" />
        <span>Your personal messages and calls are end-to-end encrypted</span>
      </div>
    </div>
  );
}
