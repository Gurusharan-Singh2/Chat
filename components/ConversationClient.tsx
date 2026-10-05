'use client';

import React from 'react';
import { Profile } from '@/lib/types';
import { ChatWindow } from './ChatWindow';
import { useCall } from './CallProvider';
import { usePresence } from '@/components/PresenceProvider';

interface ConversationClientProps {
  conversationId: string;
  currentUser: Profile;
  otherUser: Profile;
}

export const ConversationClient: React.FC<ConversationClientProps> = ({
  conversationId,
  currentUser,
  otherUser,
}) => {
  const { startCall } = useCall();
  const { isOnline } = usePresence();

  return (
    <div className="w-full h-full">
      <ChatWindow
        conversationId={conversationId}
        currentUser={currentUser}
        otherUser={otherUser}
        isOnline={isOnline(otherUser.id)}
        onStartCall={startCall}
      />
    </div>
  );
};
