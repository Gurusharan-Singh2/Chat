'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Profile } from '@/lib/types';

interface PresenceContextType {
  onlineUserIds: Set<string>;
  isOnline: (userId: string) => boolean;
}

const PresenceContext = createContext<PresenceContextType>({
  onlineUserIds: new Set(),
  isOnline: () => false,
});

export const usePresence = () => {
  return useContext(PresenceContext);
};

interface PresenceProviderProps {
  currentUser: Profile | null;
  children: ReactNode;
}

export const PresenceProvider: React.FC<PresenceProviderProps> = ({ currentUser, children }) => {
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    if (!currentUser?.id) return;

    // Check if an existing channel with topic 'realtime:online-presence' already exists and remove it
    const existingChannels = supabase.getChannels();
    existingChannels.forEach((ch) => {
      if (ch.topic === 'realtime:online-presence') {
        supabase.removeChannel(ch);
      }
    });

    const channel = supabase.channel('online-presence', {
      config: {
        presence: {
          key: currentUser.id,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<{ user_id: string }>();
        const activeIds = new Set<string>();
        Object.keys(state).forEach((key) => {
          activeIds.add(key);
        });
        setOnlineUserIds(activeIds);
      })
      .on('presence', { event: 'join' }, ({ key }) => {
        setOnlineUserIds((prev) => new Set([...prev, key]));
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        setOnlineUserIds((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: currentUser.id,
            username: currentUser.username,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      channel.untrack();
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id, currentUser?.username, supabase]);

  const isOnline = useCallback(
    (userId: string) => {
      if (!userId) return false;
      return onlineUserIds.has(userId);
    },
    [onlineUserIds]
  );

  return (
    <PresenceContext.Provider value={{ onlineUserIds, isOnline }}>
      {children}
    </PresenceContext.Provider>
  );
};
