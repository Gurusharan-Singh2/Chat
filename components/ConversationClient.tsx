'use client';

import React from 'react';
import { Message, Profile } from '@/lib/types';
import { ChatWindow } from './ChatWindow';
import { useCall } from './CallProvider';
import { usePresence } from '@/components/PresenceProvider';

interface ConversationClientProps {
  conversationId: string;
  currentUser: Profile;
  otherUser: Profile;
  initialMessages?: Message[];
}

export const ConversationClient: React.FC<ConversationClientProps> = ({
  conversationId,
  currentUser,
  otherUser,
  initialMessages = [],
}) => {
  const { startCall } = useCall();
  const { isOnline } = usePresence();

  return (
    <div className="w-full h-full flex flex-col flex-1 min-h-0 overflow-hidden">
      <ChatWindow
        conversationId={conversationId}
        currentUser={currentUser}
        otherUser={otherUser}
        isOnline={isOnline(otherUser.id)}
        onStartCall={startCall}
        initialMessages={initialMessages}
      />
    </div>
  );
};
