'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Profile, Conversation } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import {
  Search,
  MessageSquare,
  LogOut,
  UserPlus,
  Users,
  Check,
  CheckCheck,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';

interface UserListProps {
  currentUser: Profile;
  isOnline: (userId: string) => boolean;
}

export const UserList: React.FC<UserListProps> = ({ currentUser, isOnline }) => {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = useMemo(() => createClient(), []);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);

  // --------------------------------------------------------------------------
  // Fetch Existing Conversations
  // --------------------------------------------------------------------------
  const loadConversations = useCallback(async () => {
    try {
      setIsLoadingConversations(true);

      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .or(`user1_id.eq.${currentUser.id},user2_id.eq.${currentUser.id}`)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        setConversations([]);
        setIsLoadingConversations(false);
        return;
      }

      const conversationIds = data.map((conv) => conv.id);
      const otherUserIds = data.map((conv) =>
        conv.user1_id === currentUser.id ? conv.user2_id : conv.user1_id
      );

      // Fetch profiles and recent messages in 2 fast parallel batch queries
      const [profilesRes, messagesRes] = await Promise.all([
        supabase.from('profiles').select('*').in('id', otherUserIds),
        supabase
          .from('messages')
          .select('*')
          .in('conversation_id', conversationIds)
          .order('created_at', { ascending: false }),
      ]);

      const profileMap = new Map<string, Profile>();
      profilesRes.data?.forEach((p) => profileMap.set(p.id, p));

      // Group messages by conversation to calculate last message and unread count instantly
      const lastMessageMap = new Map<string, any>();
      const unreadCountMap = new Map<string, number>();

      messagesRes.data?.forEach((msg) => {
        // First message seen is the latest message due to descending sort
        if (!lastMessageMap.has(msg.conversation_id)) {
          lastMessageMap.set(msg.conversation_id, msg);
        }

        // Count unread incoming messages
        if (msg.sender_id !== currentUser.id && !msg.read_at) {
          const currentCount = unreadCountMap.get(msg.conversation_id) || 0;
          unreadCountMap.set(msg.conversation_id, currentCount + 1);
        }
      });

      const populated: Conversation[] = data.map((conv) => {
        const otherId =
          conv.user1_id === currentUser.id ? conv.user2_id : conv.user1_id;

        return {
          ...conv,
          other_user: profileMap.get(otherId),
          last_message: lastMessageMap.get(conv.id) || undefined,
          unread_count: unreadCountMap.get(conv.id) || 0,
        };
      });

      setConversations(populated);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setIsLoadingConversations(false);
    }
  }, [currentUser.id, supabase]);

  useEffect(() => {
    loadConversations();

    const channel = supabase
      .channel('conversations-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        () => {
          loadConversations();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations' },
        () => {
          loadConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadConversations, supabase]);

  // --------------------------------------------------------------------------
  // User Search
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .neq('id', currentUser.id)
          .ilike('username', `%${searchQuery.trim()}%`)
          .limit(10);

        if (!error && data) {
          setSearchResults(data as Profile[]);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, currentUser.id, supabase]);

  // --------------------------------------------------------------------------
  // Start or open conversation with a user
  // --------------------------------------------------------------------------
  const handleStartConversation = async (targetUser: Profile) => {
    try {
      const { data: convId, error } = await supabase.rpc(
        'get_or_create_conversation',
        { other_user_id: targetUser.id }
      );

      if (error) {
        const { data: existing } = await supabase
          .from('conversations')
          .select('id')
          .or(
            `and(user1_id.eq.${currentUser.id},user2_id.eq.${targetUser.id}),and(user1_id.eq.${targetUser.id},user2_id.eq.${currentUser.id})`
          )
          .maybeSingle();

        if (existing) {
          router.push(`/chat/${existing.id}`);
          setSearchQuery('');
          return;
        }

        const { data: created, error: insertError } = await supabase
          .from('conversations')
          .insert({ user1_id: currentUser.id, user2_id: targetUser.id })
          .select('id')
          .single();

        if (insertError) throw insertError;
        router.push(`/chat/${created.id}`);
        setSearchQuery('');
        return;
      }

      setSearchQuery('');
      router.push(`/chat/${convId}`);
    } catch (err) {
      console.error('Could not start conversation:', err);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="flex flex-col h-full bg-[#111b21] border-r border-[#222e35] w-full select-none">
      {/* WhatsApp Sidebar Header */}
      <div className="p-3 bg-[#202c33] border-b border-[#222e35]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#00a884] flex items-center justify-center text-white shadow-md">
              <MessageSquare className="w-5 h-5 fill-current" />
            </div>
            <h1 className="font-bold text-base text-[#e9edef] tracking-tight">
              PulseChat
            </h1>
          </div>
          <button
            onClick={handleSignOut}
            className="p-2 text-[#8696a0] hover:text-rose-400 hover:bg-[#111b21] rounded-full transition cursor-pointer"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* WhatsApp-styled Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8696a0]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search or start new chat"
            className="w-full bg-[#111b21] border border-transparent rounded-lg pl-10 pr-4 py-2 text-xs text-[#e9edef] placeholder-[#8696a0] focus:outline-none focus:border-[#00a884] transition"
          />
        </div>
      </div>

      {/* Main Content: Search Results OR Conversation List */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#222e35]/50">
        {searchQuery.trim() ? (
          <div className="py-2">
            <div className="px-4 py-1.5 text-[11px] font-semibold tracking-wider uppercase text-[#00a884] flex items-center gap-1.5">
              <UserPlus className="w-3.5 h-3.5" />
              <span>Search Results</span>
            </div>

            {isSearching ? (
              <div className="flex justify-center p-6 text-[#8696a0] text-xs">
                Searching users...
              </div>
            ) : searchResults.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#8696a0]">
                No users found matching &quot;{searchQuery}&quot;
              </div>
            ) : (
              searchResults.map((user) => {
                const online = isOnline(user.id);
                return (
                  <button
                    key={user.id}
                    onClick={() => handleStartConversation(user)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#202c33] transition text-left cursor-pointer group"
                  >
                    <div className="relative shrink-0">
                      <div className="w-11 h-11 rounded-full bg-[#202c33] border border-[#222e35] overflow-hidden flex items-center justify-center font-bold text-[#e9edef] text-sm">
                        {user.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={user.avatar_url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          user.username.charAt(0).toUpperCase()
                        )}
                      </div>
                      <span
                        className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ring-2 ring-[#111b21] ${
                          online ? 'bg-[#25d366]' : 'bg-[#667781]'
                        }`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-[#e9edef] truncate">
                          {user.username}
                        </span>
                        <span className="text-[11px] text-[#00a884] font-semibold">
                          Chat &rarr;
                        </span>
                      </div>
                      <span className="text-xs text-[#8696a0]">
                        {online ? 'Online' : 'Offline'}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        ) : (
          <div>
            {isLoadingConversations ? (
              <div className="flex flex-col items-center justify-center p-8 gap-2.5 text-[#8696a0] text-xs">
                <div className="w-5 h-5 border-2 border-[#00a884] border-t-transparent rounded-full animate-spin" />
                <span>Loading chats...</span>
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center text-[#8696a0] text-xs">
                <Users className="w-8 h-8 mx-auto mb-2 text-[#8696a0]/50" />
                <p className="font-medium text-[#e9edef]">No chats yet</p>
                <p className="mt-1">
                  Search a username above to start a conversation!
                </p>
              </div>
            ) : (
              conversations.map((conv) => {
                const other = conv.other_user;
                if (!other) return null;
                const online = isOnline(other.id);
                const isActive = pathname === `/chat/${conv.id}`;

                return (
                  <Link
                    key={conv.id}
                    href={`/chat/${conv.id}`}
                    prefetch={true}
                    className={`w-full flex items-center gap-3 px-4 py-3 transition cursor-pointer border-b border-[#222e35]/30 active:scale-[0.99] active:bg-[#202c33] ${
                      isActive
                        ? 'bg-[#2a3942]'
                        : 'hover:bg-[#202c33] active:bg-[#202c33]'
                    }`}
                  >
                    <div className="relative shrink-0">
                      <div className="w-12 h-12 rounded-full bg-[#202c33] border border-[#222e35] overflow-hidden flex items-center justify-center font-bold text-[#e9edef]">
                        {other.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={other.avatar_url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          other.username.charAt(0).toUpperCase()
                        )}
                      </div>
                      <span
                        className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ring-2 ring-[#111b21] ${
                          online ? 'bg-[#25d366]' : 'bg-[#667781]'
                        }`}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold text-[#e9edef] truncate">
                          {other.username}
                        </span>
                        {conv.last_message && (
                          <span className="text-[11px] text-[#8696a0] shrink-0 font-normal">
                            {new Date(
                              conv.last_message.created_at
                            ).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1 min-w-0 text-xs text-[#8696a0] truncate">
                          {/* If current user sent the last message, show WhatsApp checkmark */}
                          {conv.last_message &&
                            conv.last_message.sender_id === currentUser.id && (
                              <span className="shrink-0">
                                {conv.last_message.read_at ? (
                                  <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />
                                ) : (
                                  <Check className="w-3.5 h-3.5 text-[#8696a0]" />
                                )}
                              </span>
                            )}
                          <p className="truncate">
                            {conv.last_message
                              ? conv.last_message.file_url
                                ? '📎 Attachment'
                                : conv.last_message.content
                              : 'Chat started'}
                          </p>
                        </div>

                        {(conv.unread_count || 0) > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-[#00a884] text-white text-[11px] font-bold shrink-0">
                            {conv.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* WhatsApp Profile Footer */}
      <div className="p-3 bg-[#202c33] border-t border-[#222e35] flex items-center gap-3">
        <div className="relative shrink-0">
          <div className="w-10 h-10 rounded-full bg-[#111b21] border border-[#222e35] overflow-hidden flex items-center justify-center font-bold text-[#e9edef]">
            {currentUser.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentUser.avatar_url}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              currentUser.username.charAt(0).toUpperCase()
            )}
          </div>
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#25d366] ring-2 ring-[#202c33]" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-[#e9edef] truncate">
            {currentUser.username}
          </p>
          <p className="text-[11px] text-[#00a884] flex items-center gap-1 font-medium">
            Online
          </p>
        </div>
      </div>
    </div>
  );
};
