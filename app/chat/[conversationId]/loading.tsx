import React from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function ConversationLoading() {
  return (
    <div className="flex flex-col h-full w-full bg-[#0b141a] overflow-hidden select-none animate-fade-in">
      {/* WhatsApp Header Skeleton */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 bg-[#202c33] border-b border-[#222e35] shrink-0 z-20 shadow-md">
        <div className="flex items-center gap-2.5 min-w-0">
          <Link
            href="/chat"
            className="md:hidden p-2 -ml-1 text-[#aebac1] rounded-full"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>

          <div className="w-10 h-10 rounded-full bg-[#111b21] animate-pulse shrink-0" />

          <div className="space-y-1.5">
            <div className="w-24 h-3.5 bg-[#111b21] rounded-md animate-pulse" />
            <div className="w-14 h-2.5 bg-[#111b21] rounded-md animate-pulse" />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#111b21] animate-pulse" />
          <div className="w-8 h-8 rounded-xl bg-[#111b21] animate-pulse" />
        </div>
      </div>

      {/* Messages Loading Stage */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 wa-chat-bg flex flex-col items-center justify-center text-[#8696a0]">
        <Loader2 className="w-7 h-7 animate-spin text-[#00a884] mb-2" />
        <span className="text-xs font-medium">Opening conversation...</span>
      </div>

      {/* Input Bar Placeholder */}
      <div className="p-2 sm:p-3 bg-[#202c33] border-t border-[#222e35] shrink-0">
        <div className="w-full h-10 rounded-xl bg-[#2a3942] animate-pulse" />
      </div>
    </div>
  );
}
