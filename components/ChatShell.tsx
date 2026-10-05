'use client';

import React from 'react';
import { Profile } from '@/lib/types';
import { UserList } from './UserList';
import { CallProvider } from './CallProvider';
import { PresenceProvider, usePresence } from '@/components/PresenceProvider';
import { usePathname } from 'next/navigation';

interface ChatShellProps {
  currentUser: Profile;
  children: React.ReactNode;
}

const ChatShellLayout: React.FC<ChatShellProps> = ({ currentUser, children }) => {
  const pathname = usePathname();
  const isConversationActive = pathname !== '/chat' && pathname.startsWith('/chat/');
  const { isOnline } = usePresence();

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#111b21] text-[#e9edef] fixed inset-0">
      {/* Left Sidebar (UserList): Hidden on mobile if conversation is selected */}
      <div
        className={`h-full w-full md:w-[360px] lg:w-[420px] shrink-0 border-r border-[#222e35] ${
          isConversationActive ? 'hidden md:flex' : 'flex'
        }`}
      >
        <UserList currentUser={currentUser} isOnline={isOnline} />
      </div>

      {/* Right Main Area: Full width on mobile when conversation selected */}
      <div
        className={`h-full flex-1 overflow-hidden p-0 ${
          !isConversationActive ? 'hidden md:flex flex-col' : 'flex flex-col'
        }`}
      >
        {children}
      </div>
    </div>
  );
};

export const ChatShell: React.FC<ChatShellProps> = ({ currentUser, children }) => {
  return (
    <PresenceProvider currentUser={currentUser}>
      <CallProvider currentUser={currentUser}>
        <ChatShellLayout currentUser={currentUser}>{children}</ChatShellLayout>
      </CallProvider>
    </PresenceProvider>
  );
};
