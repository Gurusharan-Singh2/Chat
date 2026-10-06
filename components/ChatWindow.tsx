'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Profile, Message } from '@/lib/types';
import { useChat } from '@/hooks/useChat';
import { useCall } from './CallProvider';
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
  Smile,
  Keyboard,
  Mic,
  Trash2,
  Check,
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

const POPULAR_EMOJIS = [
  '😀', '😂', '🤣', '😍', '🥰', '😎', '🤔', '🥳',
  '👍', '👎', '❤️', '🔥', '🎉', '👏', '🙌', '💯',
  '🚀', '✨', '🙏', '💖', '😢', '😮', '😴', '🍕',
  '☕', '💪', '🤝', '😉', '😇', '🤩', '😜', '😭',
];

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
    deleteMessage,
    uploadAttachment,
    sendTyping,
  } = useChat(conversationId, currentUser, initialMessages);

  const { setErrorMessage, openPermissionGuide } = useCall();

  const [inputContent, setInputContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Live Voice Note Recording States
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Audio recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

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

  // Clean up audio recorder on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

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
        attachmentData = await uploadAttachment(selectedFile);
      }

      const text = inputContent;
      setInputContent('');
      setShowEmojiPicker(false);
      removeSelectedFile();

      await sendMessage(text, attachmentData);
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleSelectEmoji = (emoji: string) => {
    setInputContent((prev) => prev + emoji);
  };

  // --------------------------------------------------------------------------
  // WhatsApp Voice Note Recording Logic
  // --------------------------------------------------------------------------
  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      setIsRecordingVoice(true);
      setRecordingDuration(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone permission error:', err);
      if (err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')) {
        setErrorMessage('Microphone permission was denied. Tap the tune/lock icon in your address bar to allow microphone access.');
        openPermissionGuide('audio');
      } else {
        setErrorMessage('Unable to access microphone to record voice notes.');
      }
    }
  };

  const cancelVoiceRecording = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    setIsRecordingVoice(false);
    setRecordingDuration(0);
    audioChunksRef.current = [];
  };

  const finishVoiceRecording = async () => {
    if (!mediaRecorderRef.current) return;

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }

    mediaRecorderRef.current.onstop = async () => {
      try {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
        }
        setIsRecordingVoice(false);
        setRecordingDuration(0);

        if (audioBlob.size > 0) {
          setIsSending(true);
          const fileName = `voice_note_${Date.now()}.webm`;
          const audioFile = new File([audioBlob], fileName, { type: 'audio/webm' });
          const attachmentData = await uploadAttachment(audioFile);
          await sendMessage('', attachmentData);
        }
      } catch (err) {
        console.error('Failed to send voice note:', err);
      } finally {
        setIsSending(false);
      }
    };

    mediaRecorderRef.current.stop();
  };

  const formatRecordingTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins}:${remaining < 10 ? '0' : ''}${remaining}`;
  };

  const hasContent = inputContent.trim().length > 0 || selectedFile !== null;

  return (
    <div className="flex flex-col h-full w-full min-h-0 bg-[#0b141a] overflow-hidden select-none">
      {/* WhatsApp Header */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 bg-[#202c33] border-b border-[#222e35] shrink-0 z-20 shadow-md">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Mobile Back Button */}
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
            <Phone className="w-4 h-4 text-[#00a884]" />
            <span className="hidden sm:inline">Voice</span>
          </button>

          <button
            onClick={() => onStartCall(otherUser, true)}
            className="p-2 sm:px-3 sm:py-2 rounded-xl text-[#aebac1] hover:text-[#00a884] hover:bg-[#111b21] transition cursor-pointer flex items-center gap-1.5 text-xs font-medium active:scale-95"
            title="Video Call"
            aria-label="Video Call"
          >
            <Video className="w-4 h-4 text-[#00a884]" />
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
          <div className="bg-[#182229]/90 border border-[#222e35]/60 rounded-xl px-3.5 py-2 max-w-sm text-center shadow-sm">
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
              Say hello or send a voice note to {otherUser.username}!
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
                    <span className="bg-[#182229]/95 backdrop-blur-sm text-[#8696a0] text-[11px] font-medium px-3 py-1 rounded-lg uppercase tracking-wider shadow-sm border border-[#222e35]/50 pointer-events-auto">
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
                  onDelete={deleteMessage}
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

      {/* Emoji Quick Picker Drawer */}
      {showEmojiPicker && (
        <div className="p-3 bg-[#202c33] border-t border-[#222e35] animate-fade-in z-20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-[#8696a0] uppercase tracking-wider">
              Popular Emojis
            </span>
            <button
              onClick={() => setShowEmojiPicker(false)}
              className="text-[#8696a0] hover:text-[#e9edef] p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-8 gap-2 text-xl select-none">
            {POPULAR_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => handleSelectEmoji(emoji)}
                className="p-1.5 rounded-lg hover:bg-[#111b21] transition active:scale-125 cursor-pointer text-center"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* WhatsApp Input Bar */}
      <div className="p-2 sm:p-3 bg-[#202c33] border-t border-[#222e35] shrink-0 sticky bottom-0 z-30 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {isRecordingVoice ? (
          /* Live WhatsApp Voice Note Recording View */
          <div className="flex items-center justify-between gap-3 animate-fade-in px-2 py-1">
            <div className="flex items-center gap-3">
              {/* Blinking Red Recording Dot */}
              <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
              <span className="text-xs font-semibold text-rose-400">
                Recording...
              </span>
              <span className="text-sm font-mono text-[#e9edef]">
                {formatRecordingTime(recordingDuration)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Cancel Button */}
              <button
                type="button"
                onClick={cancelVoiceRecording}
                className="p-2 rounded-full text-[#8696a0] hover:text-rose-400 hover:bg-black/20 transition cursor-pointer"
                title="Discard voice note"
              >
                <Trash2 className="w-5 h-5" />
              </button>

              {/* Finish & Send Voice Note Button */}
              <button
                type="button"
                onClick={finishVoiceRecording}
                className="p-2.5 rounded-full bg-[#00a884] hover:bg-[#02906f] text-white shadow-lg shadow-[#00a884]/30 transition cursor-pointer active:scale-95"
                title="Send voice note"
              >
                {isSending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Check className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Standard WhatsApp Message Input Bar */
          <form
            onSubmit={handleSendMessage}
            autoComplete="off"
            className="flex items-center gap-2"
          >
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
            />

            {/* Emoji Toggle Button */}
            <button
              type="button"
              onClick={() => {
                setShowEmojiPicker((prev) => {
                  if (!prev) {
                    // Switching to emoji drawer: dismiss virtual keyboard
                    inputRef.current?.blur();
                    return true;
                  } else {
                    // Switching back to text: bring up virtual keyboard
                    inputRef.current?.focus();
                    return false;
                  }
                });
              }}
              className={`p-2 rounded-full transition cursor-pointer shrink-0 active:scale-95 ${
                showEmojiPicker
                  ? 'text-[#00a884] bg-[#111b21]'
                  : 'text-[#8696a0] hover:text-[#e9edef] hover:bg-[#111b21]'
              }`}
              title={showEmojiPicker ? 'Keyboard' : 'Emoji'}
              aria-label={showEmojiPicker ? 'Switch to keyboard' : 'Open emoji picker'}
            >
              {showEmojiPicker ? (
                <Keyboard className="w-5 h-5 text-[#00a884]" />
              ) : (
                <Smile className="w-5 h-5" />
              )}
            </button>

            {/* Attachment Paperclip Button */}
            <label
              htmlFor="file-upload"
              className="p-2 rounded-full text-[#8696a0] hover:text-[#e9edef] hover:bg-[#111b21] transition cursor-pointer shrink-0 active:scale-95"
              title="Attach file, photo or audio"
            >
              <Paperclip className="w-5 h-5 -rotate-45" />
            </label>

            {/* Text Input */}
            <input
              ref={inputRef}
              type="text"
              name="chat-message"
              id="chat-message-input"
              autoComplete="off"
              autoCorrect="on"
              autoCapitalize="sentences"
              spellCheck={true}
              data-lpignore="true"
              data-form-type="other"
              value={inputContent}
              onChange={handleInputChange}
              onFocus={() => {
                // If user taps directly into input, hide emoji drawer
                if (showEmojiPicker) {
                  setShowEmojiPicker(false);
                }
              }}
              placeholder={
                selectedFile
                  ? 'Add a caption...'
                  : 'Type a message'
              }
              className="flex-1 bg-[#2a3942] border-none rounded-xl px-4 py-2.5 text-sm text-[#e9edef] placeholder-[#8696a0] focus:outline-none focus:ring-1 focus:ring-[#00a884] transition"
            />

            {/* WhatsApp Dynamic Button: Voice Note Mic (when empty) OR Send Arrow (when typing) */}
            {hasContent ? (
              <button
                type="submit"
                disabled={isSending}
                className="p-2.5 rounded-full bg-[#00a884] hover:bg-[#02906f] text-white text-sm font-semibold flex items-center justify-center transition cursor-pointer shadow-md shadow-[#00a884]/25 active:scale-95 shrink-0"
                aria-label="Send message"
                title="Send"
              >
                {isSending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5 ml-0.5" />
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={startVoiceRecording}
                className="p-2.5 rounded-full bg-[#00a884] hover:bg-[#02906f] text-white flex items-center justify-center transition cursor-pointer shadow-md shadow-[#00a884]/25 active:scale-95 shrink-0"
                aria-label="Record voice note"
                title="Hold or click to record voice note"
              >
                <Mic className="w-5 h-5" />
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  );
};
