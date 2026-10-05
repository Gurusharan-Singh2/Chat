'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  Camera,
  X,
  MoreVertical,
  CircleDashed,
  SquarePen,
  Mic,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { ProfileModal } from './ProfileModal';

interface UserListProps {
  currentUser: Profile;
  isOnline: (userId: string) => boolean;
}

type FilterTab = 'all' | 'unread' | 'favorites';

export const UserList: React.FC<UserListProps> = ({ currentUser, isOnline }) => {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = useMemo(() => createClient(), []);

  const [userProfile, setUserProfile] = useState<Profile>(currentUser);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [showMenuDropdown, setShowMenuDropdown] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setUserProfile(currentUser);
  }, [currentUser]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenuDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

      // Fetch profiles and recent messages in parallel batch queries
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

      // Group messages by conversation to calculate last message and unread count
      const lastMessageMap = new Map<string, any>();
      const unreadCountMap = new Map<string, number>();

      messagesRes.data?.forEach((msg) => {
        if (!lastMessageMap.has(msg.conversation_id)) {
          lastMessageMap.set(msg.conversation_id, msg);
        }

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
    }, 250);

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

  // Filter conversations by active tab
  const filteredConversations = useMemo(() => {
    if (activeFilter === 'unread') {
      return conversations.filter((c) => (c.unread_count || 0) > 0);
    }
    return conversations;
  }, [conversations, activeFilter]);

  const totalUnreadCount = useMemo(() => {
    return conversations.reduce((acc, curr) => acc + (curr.unread_count || 0), 0);
  }, [conversations]);

  return (
    <div className="flex flex-col h-full bg-[#111b21] border-r border-[#222e35] w-full select-none">
      {/* WhatsApp Sidebar Header */}
      <div className="px-4 py-3 bg-[#202c33] border-b border-[#222e35] flex items-center justify-between">
        {/* User Avatar with Profile trigger */}
        <div
          onClick={() => setIsProfileModalOpen(true)}
          className="flex items-center gap-3 cursor-pointer group"
          title="Click to view or edit profile"
        >
          <div className="relative shrink-0">
            <div className="w-10 h-10 rounded-full bg-[#111b21] border border-[#222e35] overflow-hidden flex items-center justify-center font-bold text-[#e9edef] group-hover:ring-2 group-hover:ring-[#00a884] transition">
              {userProfile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={userProfile.avatar_url}
                  alt={userProfile.username}
                  className="w-full h-full object-cover"
                />
              ) : (
                userProfile.username.charAt(0).toUpperCase()
              )}
            </div>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#25d366] ring-2 ring-[#202c33]" />
          </div>
          <span className="font-semibold text-sm text-[#e9edef] group-hover:text-[#00a884] transition truncate max-w-[120px]">
            {userProfile.username}
          </span>
        </div>

        {/* WhatsApp Top Right Action Icons */}
        <div className="flex items-center gap-1 text-[#aebac1] relative" ref={menuRef}>
          <button
            onClick={() => setActiveFilter(activeFilter === 'unread' ? 'all' : 'unread')}
            className={`p-2 rounded-full hover:text-[#e9edef] hover:bg-[#111b21] transition cursor-pointer ${
              activeFilter === 'unread' ? 'text-[#00a884]' : ''
            }`}
            title="Status / Stories"
          >
            <CircleDashed className="w-5 h-5" />
          </button>

          <button
            onClick={() => {
              const searchInput = document.getElementById('wa-user-search');
              searchInput?.focus();
            }}
            className="p-2 rounded-full hover:text-[#e9edef] hover:bg-[#111b21] transition cursor-pointer"
            title="New Chat"
          >
            <SquarePen className="w-5 h-5" />
          </button>

          {/* 3-dots Menu Button */}
          <button
            onClick={() => setShowMenuDropdown((prev) => !prev)}
            className="p-2 rounded-full hover:text-[#e9edef] hover:bg-[#111b21] transition cursor-pointer"
            title="Menu"
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {/* 3-dots Dropdown Menu */}
          {showMenuDropdown && (
            <div className="absolute right-0 top-11 z-50 w-48 bg-[#202c33] border border-[#222e35] rounded-xl shadow-2xl py-2 animate-scale-in text-sm text-[#e9edef]">
              <button
                onClick={() => {
                  setShowMenuDropdown(false);
                  setIsProfileModalOpen(true);
                }}
                className="w-full px-4 py-2.5 text-left hover:bg-[#111b21] transition flex items-center gap-2.5 cursor-pointer"
              >
                <Camera className="w-4 h-4 text-[#00a884]" />
                <span>Profile Settings</span>
              </button>

              <button
                onClick={() => {
                  setShowMenuDropdown(false);
                  setActiveFilter('unread');
                }}
                className="w-full px-4 py-2.5 text-left hover:bg-[#111b21] transition flex items-center gap-2.5 cursor-pointer"
              >
                <MessageSquare className="w-4 h-4 text-[#00a884]" />
                <span>Unread Chats</span>
              </button>

              <div className="my-1 border-t border-[#222e35]" />

              <button
                onClick={() => {
                  setShowMenuDropdown(false);
                  handleSignOut();
                }}
                className="w-full px-4 py-2.5 text-left text-rose-400 hover:bg-rose-500/10 transition flex items-center gap-2.5 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Log out</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* WhatsApp Search and Filter Chips Bar */}
      <div className="p-3 bg-[#111b21] border-b border-[#222e35] space-y-2.5">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8696a0]" />
          <input
            id="wa-user-search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search or start new chat"
            className="w-full bg-[#202c33] border border-transparent rounded-lg pl-10 pr-9 py-2 text-xs text-[#e9edef] placeholder-[#8696a0] focus:outline-none focus:border-[#00a884] transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8696a0] hover:text-[#e9edef] p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* WhatsApp Filter Chips (All, Unread, Favorites) */}
        {!searchQuery.trim() && (
          <div className="flex items-center gap-2 pt-0.5">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition cursor-pointer ${
                activeFilter === 'all'
                  ? 'bg-[#00a884] text-white shadow-sm'
                  : 'bg-[#202c33] text-[#8696a0] hover:text-[#e9edef] hover:bg-[#2a3942]'
              }`}
            >
              All
            </button>

            <button
              onClick={() => setActiveFilter('unread')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                activeFilter === 'unread'
                  ? 'bg-[#00a884] text-white shadow-sm'
                  : 'bg-[#202c33] text-[#8696a0] hover:text-[#e9edef] hover:bg-[#2a3942]'
              }`}
            >
              <span>Unread</span>
              {totalUnreadCount > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    activeFilter === 'unread'
                      ? 'bg-black/30 text-white'
                      : 'bg-[#00a884] text-white'
                  }`}
                >
                  {totalUnreadCount}
                </span>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Main Content: Search Results OR Filtered Conversation List */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#222e35]/40">
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
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-[#8696a0] text-xs">
                <Users className="w-8 h-8 mx-auto mb-2 text-[#8696a0]/50" />
                <p className="font-medium text-[#e9edef]">
                  {activeFilter === 'unread' ? 'No unread chats' : 'No chats yet'}
                </p>
                <p className="mt-1">
                  {activeFilter === 'unread'
                    ? 'You are all caught up!'
                    : 'Search a username above to start a conversation!'}
                </p>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const other = conv.other_user;
                if (!other) return null;
                const online = isOnline(other.id);
                const isActive = pathname === `/chat/${conv.id}`;

                const isVoiceNote =
                  conv.last_message?.file_type?.startsWith('audio/') ||
                  conv.last_message?.file_name?.startsWith('voice_note_');

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
                          <p className="truncate flex items-center gap-1">
                            {isVoiceNote ? (
                              <span className="flex items-center gap-1 text-[#00a884]">
                                <Mic className="w-3.5 h-3.5" />
                                <span>Voice message</span>
                              </span>
                            ) : conv.last_message ? (
                              conv.last_message.file_url ? (
                                '📎 Attachment'
                              ) : (
                                conv.last_message.content
                              )
                            ) : (
                              'Chat started'
                            )}
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

      {/* Profile Picture & Details Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        currentUser={userProfile}
        onProfileUpdated={(updated) => setUserProfile(updated)}
      />
    </div>
  );
};
