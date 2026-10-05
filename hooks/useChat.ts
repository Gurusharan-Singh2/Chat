'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Message, Profile } from '@/lib/types';
import { ringtones } from '@/lib/webrtc/audio';

export function useChat(
  conversationId: string | null,
  currentUser: Profile | null,
  initialMessages: Message[] = []
) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(initialMessages.length === 0 && !!conversationId);
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const supabase = useMemo(() => createClient(), []);

  // --------------------------------------------------------------------------
  // Step 1: Mark Unread Messages as Read
  // --------------------------------------------------------------------------
  const markMessagesAsRead = useCallback(async () => {
    if (!conversationId || !currentUser?.id) return;

    try {
      await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .neq('sender_id', currentUser.id)
        .is('read_at', null);
    } catch (err) {
      console.error('Error marking messages as read:', err);
    }
  }, [conversationId, currentUser?.id, supabase]);

  // --------------------------------------------------------------------------
  // Step 2: Fetch Initial Messages if not provided
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    // If initial messages were already provided, just mark unread as read and return
    if (initialMessages && initialMessages.length > 0) {
      setMessages(initialMessages);
      setIsLoading(false);
      markMessagesAsRead();
      return;
    }

    setIsLoading(true);

    async function loadMessages() {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (!error && data && isMounted) {
        setMessages(data as Message[]);
        setIsLoading(false);
        markMessagesAsRead();
      } else if (isMounted) {
        setIsLoading(false);
      }
    }

    loadMessages();

    return () => {
      isMounted = false;
    };
  }, [conversationId, supabase, markMessagesAsRead, initialMessages]);

  // --------------------------------------------------------------------------
  // Step 3: Realtime Postgres Changes Subscription (WhatsApp sounds & read ticks)
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`chat-messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const newMsg = payload.new as Message;

          // Play incoming sound if from other user
          if (currentUser && newMsg.sender_id !== currentUser.id) {
            ringtones.playReceivedTone();
          }

          setMessages((prev) => {
            // Check if this matches a temporary optimistic message
            const existingTempIndex = prev.findIndex(
              (m) =>
                m.id.startsWith('temp-') &&
                m.sender_id === newMsg.sender_id &&
                m.content === newMsg.content
            );

            if (existingTempIndex !== -1) {
              const copy = [...prev];
              copy[existingTempIndex] = newMsg;
              return copy;
            }

            // Avoid duplicate if already in state
            if (prev.some((m) => m.id === newMsg.id)) {
              return prev;
            }

            return [...prev, newMsg];
          });

          // If incoming message from other user, mark as read
          if (currentUser && newMsg.sender_id !== currentUser.id) {
            await supabase
              .from('messages')
              .update({ read_at: new Date().toISOString() })
              .eq('id', newMsg.id);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const updatedMsg = payload.new as Message;
          setMessages((prev) =>
            prev.map((msg) => (msg.id === updatedMsg.id ? updatedMsg : msg))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, currentUser, supabase]);

  // --------------------------------------------------------------------------
  // Step 4: Typing Indicator Broadcast
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase.channel(`chat-typing:${conversationId}`);

    channel
      .on(
        'broadcast',
        { event: 'typing' },
        ({ payload }: { payload: { userId: string; isTyping: boolean } }) => {
          if (payload.userId !== currentUser?.id) {
            setIsOtherUserTyping(payload.isTyping);

            if (typingTimeoutRef.current) {
              clearTimeout(typingTimeoutRef.current);
            }

            if (payload.isTyping) {
              typingTimeoutRef.current = setTimeout(() => {
                setIsOtherUserTyping(false);
              }, 2500);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [conversationId, currentUser?.id, supabase]);

  const sendTyping = useCallback(
    async (isTyping: boolean) => {
      if (!conversationId || !currentUser?.id) return;

      try {
        const channel = supabase.channel(`chat-typing:${conversationId}`);
        await channel.send({
          type: 'broadcast',
          event: 'typing',
          payload: {
            userId: currentUser.id,
            isTyping,
          },
        });
      } catch (err) {
        console.error('Failed to broadcast typing event:', err);
      }
    },
    [conversationId, currentUser?.id, supabase]
  );

  // --------------------------------------------------------------------------
  // Step 5: Upload Attachment to Supabase Storage (1 GB Free Tier)
  // --------------------------------------------------------------------------
  const uploadAttachment = useCallback(
    async (file: File) => {
      if (!currentUser?.id) throw new Error('Not authenticated');

      const fileExt = file.name.split('.').pop();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `${currentUser.id}/${Date.now()}_${sanitizedName}`;

      const { data, error } = await supabase.storage
        .from('chat-attachments')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('File upload error:', error);
        throw error;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from('chat-attachments').getPublicUrl(data.path);

      return {
        file_url: publicUrl,
        file_name: file.name,
        file_type: file.type || `application/${fileExt}`,
        file_size: file.size,
      };
    },
    [currentUser?.id, supabase]
  );

  // --------------------------------------------------------------------------
  // Step 6: Send Message Action (Optimistic WhatsApp Instant Send)
  // --------------------------------------------------------------------------
  const sendMessage = useCallback(
    async (
      content: string,
      attachment?: {
        file_url: string;
        file_name: string;
        file_type: string;
        file_size: number;
      }
    ) => {
      if (!conversationId || !currentUser?.id) return null;
      if (!content.trim() && !attachment) return null;

      const trimmed = content.trim();
      const messageText = trimmed || (attachment ? attachment.file_name : '');
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      // 1. Create optimistic message
      const optimisticMessage: Message = {
        id: tempId,
        conversation_id: conversationId,
        sender_id: currentUser.id,
        content: messageText,
        file_url: attachment?.file_url || null,
        file_name: attachment?.file_name || null,
        file_type: attachment?.file_type || null,
        file_size: attachment?.file_size || null,
        created_at: new Date().toISOString(),
        read_at: null,
      };

      // 2. Instantly append to state (0ms perceived latency!)
      setMessages((prev) => [...prev, optimisticMessage]);

      // 3. Play WhatsApp sent pop tone
      ringtones.playSentTone();

      // 4. Reset typing status immediately
      sendTyping(false);

      try {
        const { data, error } = await supabase
          .from('messages')
          .insert({
            conversation_id: conversationId,
            sender_id: currentUser.id,
            content: messageText,
            file_url: attachment?.file_url || null,
            file_name: attachment?.file_name || null,
            file_type: attachment?.file_type || null,
            file_size: attachment?.file_size || null,
          })
          .select()
          .single();

        if (error) {
          console.error('Failed to send message:', error);
          setMessages((prev) => prev.filter((m) => m.id !== tempId));
          throw error;
        }

        if (data) {
          const savedMessage = data as Message;
          setMessages((prev) =>
            prev.map((m) => (m.id === tempId ? savedMessage : m))
          );
          return savedMessage;
        }
        return null;
      } catch (err) {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        throw err;
      }
    },
    [conversationId, currentUser?.id, supabase, sendTyping]
  );

  return {
    messages,
    isLoading,
    isOtherUserTyping,
    sendMessage,
    uploadAttachment,
    sendTyping,
    markMessagesAsRead,
  };
}
