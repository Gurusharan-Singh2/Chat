'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Profile, Message } from '@/lib/types';
import { useChat } from '@/hooks/useChat';
import { MessageBubble } from './MessageBubble';
import {
  Phone,
  Video,
  Send,
  ArrowLeft,
  Paperclip,
  X,
  FileText,
  Loader2,
  Lock,
  ChevronDown,
} from 'lucide-react';
import Link from 'next/link';

interface ChatWindowProps {
  conversationId: string;
  currentUser: Profile;
  otherUser: Profile;
  isOnline: boolean;
  onStartCall: (targetUser: Profile, isVideo: boolean) => void;
  initialMessages?: Message[];
}

function getDateSeparatorLabel(isoString: string): string {
  try {
    const msgDate = new Date(isoString);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (
      msgDate.getDate() === today.getDate() &&
      msgDate.getMonth() === today.getMonth() &&
      msgDate.getFullYear() === today.getFullYear()
    ) {
      return 'TODAY';
    }

    if (
      msgDate.getDate() === yesterday.getDate() &&
      msgDate.getMonth() === yesterday.getMonth() &&
      msgDate.getFullYear() === yesterday.getFullYear()
    ) {
      return 'YESTERDAY';
    }

    return msgDate.toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: msgDate.getFullYear() === today.getFullYear() ? undefined : 'numeric',
    });
  } catch {
    return '';
  }
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  conversationId,
  currentUser,
  otherUser,
  isOnline,
  onStartCall,
  initialMessages = [],
}) => {
  const {
    messages,
    isLoading,
    isOtherUserTyping,
    sendMessage,
    uploadAttachment,
    sendTyping,
  } = useChat(conversationId, currentUser, initialMessages);

  const [inputContent, setInputContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Monitor scroll for floating down button
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isUp = scrollHeight - scrollTop - clientHeight > 180;
    setShowScrollBottom(isUp);
  };

  // Auto-scroll to bottom on messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isOtherUserTyping]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputContent(e.target.value);

    // Broadcast typing event
    sendTyping(true);

    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }

    typingTimerRef.current = setTimeout(() => {
      sendTyping(false);
    }, 2000);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);

      // Create preview for image files
      if (file.type.startsWith('image/')) {
        setFilePreviewUrl(URL.createObjectURL(file));
      } else {
        setFilePreviewUrl(null);
      }
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
      setFilePreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!inputContent.trim() && !selectedFile) || isSending) return;

    try {
      setIsSending(true);
      let attachmentData:
        | {
            file_url: string;
            file_name: string;
            file_type: string;
            file_size: number;
          }
        | undefined = undefined;

      // If user is attaching a file, upload to Supabase Storage first
      if (selectedFile) {
        setIsUploadingFile(true);
        attachmentData = await uploadAttachment(selectedFile);
        setIsUploadingFile(false);
      }

      const text = inputContent;
      setInputContent('');
      removeSelectedFile();

      await sendMessage(text, attachmentData);
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setIsSending(false);
      setIsUploadingFile(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full min-h-0 bg-[#0b141a] overflow-hidden select-none">
      {/* WhatsApp Header */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 bg-[#202c33] border-b border-[#222e35] shrink-0 z-20 shadow-md">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Mobile Back Button to return to conversation list */}
          <Link
            href="/chat"
            className="md:hidden p-2 -ml-1 text-[#aebac1] hover:text-[#e9edef] rounded-full active:bg-[#111b21] transition"
            aria-label="Back to chats"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>

          <div className="relative shrink-0">
            <div className="w-10 h-10 rounded-full bg-[#111b21] border border-[#222e35] overflow-hidden flex items-center justify-center font-bold text-[#e9edef]">
              {otherUser.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={otherUser.avatar_url}
                  alt={otherUser.username}
                  className="w-full h-full object-cover"
                />
              ) : (
                otherUser.username.charAt(0).toUpperCase()
              )}
            </div>
            {/* Online Green Badge */}
            <span
              className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ring-2 ring-[#202c33] ${
                isOnline ? 'bg-[#25d366]' : 'bg-[#667781]'
              }`}
              title={isOnline ? 'Online' : 'Offline'}
            />
          </div>

          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-[#e9edef] truncate leading-tight">
              {otherUser.username}
            </h2>
            <p className="text-xs text-[#8696a0] truncate">
              {isOtherUserTyping ? (
                <span className="text-[#00a884] font-medium animate-pulse">
                  typing...
                </span>
              ) : isOnline ? (
                <span className="text-[#25d366] font-medium">online</span>
              ) : (
                'offline'
              )}
            </p>
          </div>
        </div>

        {/* Call Action Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            onClick={() => onStartCall(otherUser, false)}
            className="p-2 sm:px-3 sm:py-2 rounded-xl text-[#aebac1] hover:text-[#00a884] hover:bg-[#111b21] transition cursor-pointer flex items-center gap-1.5 text-xs font-medium active:scale-95"
            title="Voice Call"
            aria-label="Voice Call"
          >
            <Phone className="w-4 h-4 sm:w-4 sm:h-4 text-[#00a884]" />
            <span className="hidden sm:inline">Voice</span>
          </button>

          <button
            onClick={() => onStartCall(otherUser, true)}
            className="p-2 sm:px-3 sm:py-2 rounded-xl text-[#aebac1] hover:text-[#00a884] hover:bg-[#111b21] transition cursor-pointer flex items-center gap-1.5 text-xs font-medium active:scale-95"
            title="Video Call"
            aria-label="Video Call"
          >
            <Video className="w-4 h-4 sm:w-4 sm:h-4 text-[#00a884]" />
            <span className="hidden sm:inline">Video</span>
          </button>
        </div>
      </div>

      {/* Messages Stream with WhatsApp Texture */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-6 py-4 space-y-1 wa-chat-bg relative"
      >
        {/* WhatsApp End-to-End Encryption Banner */}
        <div className="flex justify-center mb-4 select-none px-4">
          <div className="bg-[#182229]/80 border border-[#222e35]/60 rounded-xl px-3.5 py-2 max-w-sm text-center shadow-sm">
            <p className="text-[11px] text-[#ffd279]/90 flex items-center justify-center gap-1.5 font-medium leading-relaxed">
              <Lock className="w-3.5 h-3.5 text-[#ffd279] shrink-0" />
              Messages and calls are end-to-end encrypted. No one outside of this chat can read or listen to them.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2.5 text-[#8696a0]">
            <Loader2 className="w-6 h-6 animate-spin text-[#00a884]" />
            <span className="text-xs">Loading messages...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center p-6 text-[#8696a0]">
            <div className="w-12 h-12 rounded-2xl bg-[#111b21] border border-[#222e35] flex items-center justify-center text-[#00a884] mb-3 shadow-md">
              <Send className="w-5 h-5" />
            </div>
            <p className="text-sm font-medium text-[#e9edef]">No messages yet</p>
            <p className="text-xs text-[#8696a0] mt-1 max-w-xs">
              Say hello or share files with {otherUser.username}!
            </p>
          </div>
        ) : (
          messages.map((message, index) => {
            const isCurrentUser = message.sender_id === currentUser.id;

            // Date separator check
            const prevMessage = index > 0 ? messages[index - 1] : null;
            const currentDateLabel = getDateSeparatorLabel(message.created_at);
            const prevDateLabel = prevMessage ? getDateSeparatorLabel(prevMessage.created_at) : null;
            const showDateSeparator = !prevDateLabel || currentDateLabel !== prevDateLabel;

            return (
              <React.Fragment key={message.id}>
                {showDateSeparator && currentDateLabel && (
                  <div className="flex justify-center my-3 sticky top-2 z-10 select-none pointer-events-none">
                    <span className="bg-[#182229]/90 backdrop-blur-sm text-[#8696a0] text-[11px] font-medium px-3 py-1 rounded-lg uppercase tracking-wider shadow-sm border border-[#222e35]/50 pointer-events-auto">
                      {currentDateLabel}
                    </span>
                  </div>
                )}
                <MessageBubble
                  message={message}
                  isCurrentUser={isCurrentUser}
                  senderName={isCurrentUser ? currentUser.username : otherUser.username}
                  senderAvatar={
                    isCurrentUser ? currentUser.avatar_url : otherUser.avatar_url
                  }
                />
              </React.Fragment>
            );
          })
        )}

        {/* Typing indicator bubble */}
        {isOtherUserTyping && (
          <div className="flex items-center gap-1.5 mb-2 text-xs text-[#8696a0] animate-fade-in">
            <div className="bg-[#202c33] border border-[#222e35] rounded-2xl px-3.5 py-2 flex items-center gap-1.5 shadow-sm">
              <span className="text-[11px] text-[#e9edef] font-medium">
                {otherUser.username} is typing
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00a884] typing-dot-1" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#00a884] typing-dot-2" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#00a884] typing-dot-3" />
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Floating Scroll to Bottom Button */}
      {showScrollBottom && (
        <button
          onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })}
          className="absolute right-4 bottom-20 z-30 p-2.5 rounded-full bg-[#202c33] border border-[#222e35] text-[#8696a0] hover:text-[#e9edef] hover:bg-[#2a3942] shadow-xl transition active:scale-95 cursor-pointer flex items-center justify-center animate-fade-in"
          aria-label="Scroll to bottom"
          title="Scroll to bottom"
        >
          <ChevronDown className="w-5 h-5" />
        </button>
      )}

      {/* Selected File Attachment Preview Bar */}
      {selectedFile && (
        <div className="px-4 py-2.5 bg-[#202c33] border-t border-[#222e35] flex items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-3 min-w-0">
            {filePreviewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={filePreviewUrl}
                alt="Preview"
                className="w-12 h-12 rounded-lg object-cover border border-[#222e35] shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-[#111b21] flex items-center justify-center text-[#00a884] shrink-0">
                <FileText className="w-5 h-5" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-medium text-[#e9edef] truncate max-w-xs">
                {selectedFile.name}
              </p>
              <p className="text-[10px] text-[#8696a0]">
                {(selectedFile.size / 1024).toFixed(1)} KB • Ready to send
              </p>
            </div>
          </div>

          <button
            onClick={removeSelectedFile}
            className="p-1.5 text-[#8696a0] hover:text-[#e9edef] rounded-full hover:bg-black/20 transition cursor-pointer"
            aria-label="Remove attachment"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* WhatsApp Input Bar */}
      <div className="p-2 sm:p-3 bg-[#202c33] border-t border-[#222e35] shrink-0 sticky bottom-0 z-30 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            className="hidden"
            id="file-upload"
          />

          {/* Attachment Paperclip Button */}
          <label
            htmlFor="file-upload"
            className="p-2.5 rounded-full text-[#8696a0] hover:text-[#e9edef] hover:bg-[#111b21] transition cursor-pointer shrink-0 active:scale-95"
            title="Attach file or photo"
          >
            <Paperclip className="w-5 h-5 -rotate-45" />
          </label>

          {/* Text Input */}
          <input
            type="text"
            value={inputContent}
            onChange={handleInputChange}
            placeholder={
              selectedFile
                ? 'Add a caption...'
                : `Type a message...`
            }
            className="flex-1 bg-[#2a3942] border-none rounded-xl px-4 py-2.5 text-sm text-[#e9edef] placeholder-[#8696a0] focus:outline-none focus:ring-1 focus:ring-[#00a884] transition"
          />

          {/* Send Button */}
          <button
            type="submit"
            disabled={(!inputContent.trim() && !selectedFile) || isSending}
            className="p-2.5 sm:px-4 sm:py-2.5 rounded-full sm:rounded-xl bg-[#00a884] hover:bg-[#02906f] disabled:opacity-40 disabled:hover:bg-[#00a884] text-white text-sm font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer disabled:cursor-not-allowed shadow-md shadow-[#00a884]/20 active:scale-95 shrink-0"
            aria-label="Send message"
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
      </div>
    </div>
  );
};
