'use client';

import React, { useState } from 'react';
import { Message } from '@/lib/types';
import { Check, CheckCheck, Clock, FileText, Download, ExternalLink, X, Trash2 } from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
  isCurrentUser: boolean;
  senderName?: string;
  senderAvatar?: string | null;
  onDelete?: (messageId: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isCurrentUser,
  senderName,
  senderAvatar,
  onDelete,
}) => {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isImageAttachment =
    message.file_url &&
    (message.file_type?.startsWith('image/') ||
      /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(message.file_url));

  return (
    <>
      <div
        className={`group/bubble flex items-end gap-1.5 mb-2.5 ${
          isCurrentUser ? 'justify-end' : 'justify-start'
        }`}
      >
        {!isCurrentUser && (
          <div className="w-7 h-7 rounded-full bg-[#111b21] border border-[#222e35] overflow-hidden shrink-0 flex items-center justify-center text-xs font-semibold text-[#8696a0]">
            {senderAvatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={senderAvatar}
                alt={senderName || 'Avatar'}
                className="w-full h-full object-cover"
              />
            ) : (
              (senderName?.charAt(0) || 'U').toUpperCase()
            )}
          </div>
        )}

        <div
          className={`max-w-[85%] sm:max-w-[70%] md:max-w-[60%] rounded-2xl px-3 py-2 shadow-sm text-sm relative break-words ${
            isCurrentUser
              ? 'bg-[#005c4b] text-[#e9edef] rounded-br-xs'
              : 'bg-[#202c33] text-[#e9edef] rounded-bl-xs'
          }`}
        >
          {/* File Attachment: Image Preview */}
          {isImageAttachment && message.file_url && (
            <div className="mb-1.5 overflow-hidden rounded-xl border border-black/10 relative group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={message.file_url}
                alt={message.file_name || 'Attached Image'}
                className="w-full max-h-72 object-cover rounded-xl cursor-pointer hover:opacity-95 transition"
                onClick={() => setIsLightboxOpen(true)}
              />
              <button
                onClick={() => setIsLightboxOpen(true)}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition shadow-md"
                title="View full image"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* File Attachment: Document or Generic File */}
          {!isImageAttachment && message.file_url && (
            <div className="mb-1.5 flex items-center gap-3 p-2.5 bg-black/20 rounded-xl border border-white/5">
              <div className="w-10 h-10 rounded-lg bg-[#111b21] flex items-center justify-center text-[#00a884] shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate">
                  {message.file_name || 'Document'}
                </p>
                <p className="text-[10px] text-[#8696a0]">
                  {formatFileSize(message.file_size)}
                </p>
              </div>
              <a
                href={message.file_url}
                target="_blank"
                rel="noopener noreferrer"
                download={message.file_name || 'download'}
                className="p-2 rounded-full hover:bg-white/10 text-[#00a884] hover:text-[#25d366] transition shrink-0"
                title="Download file"
              >
                <Download className="w-4 h-4" />
              </a>
            </div>
          )}

          {/* Message Text (if text was provided or different from file name) */}
          {message.content &&
            (!message.file_url || message.content !== message.file_name) && (
              <p className="whitespace-pre-wrap leading-relaxed select-text text-[13.5px]">
                {message.content}
              </p>
            )}

          {/* Timestamp, Read Status, and Delete Action */}
          <div
            className={`flex items-center justify-end gap-1.5 text-[10px] mt-1 select-none text-[#8696a0]`}
          >
            <span>{formatTime(message.created_at)}</span>

            {isCurrentUser && (
              <span
                title={
                  message.id.startsWith('temp-')
                    ? 'Sending...'
                    : message.read_at
                    ? `Seen at ${formatTime(message.read_at)}`
                    : 'Delivered'
                }
              >
                {message.id.startsWith('temp-') ? (
                  <Clock className="w-3 h-3 text-[#8696a0] inline animate-pulse" />
                ) : message.read_at ? (
                  // WhatsApp iconic sky-blue double ticks
                  <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb] inline" />
                ) : (
                  <Check className="w-3.5 h-3.5 text-[#8696a0] inline" />
                )}
              </span>
            )}

            {/* Delete button (visible on hover or tap) */}
            {isCurrentUser && onDelete && !message.id.startsWith('temp-') && (
              <button
                onClick={() => setShowDeleteModal(true)}
                className="opacity-0 group-hover/bubble:opacity-100 transition-opacity p-0.5 text-[#8696a0] hover:text-rose-400 rounded hover:bg-black/20 cursor-pointer"
                title="Delete message"
                aria-label="Delete message"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowDeleteModal(false)}
        >
          <div
            className="bg-[#202c33] border border-[#222e35] rounded-2xl p-5 max-w-xs w-full shadow-2xl text-center animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-11 h-11 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-[#e9edef] mb-1">
              Delete message?
            </h3>
            <p className="text-xs text-[#8696a0] mb-4 leading-relaxed">
              This message will be deleted for everyone in this conversation.
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-2 px-3 rounded-xl bg-[#111b21] hover:bg-[#2a3942] text-xs font-semibold text-[#e9edef] transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  onDelete?.(message.id);
                }}
                className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-semibold text-white transition shadow-lg shadow-rose-600/30 cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal for Full Image View */}
      {isLightboxOpen && message.file_url && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 backdrop-blur-md animate-fade-in"
          onClick={() => setIsLightboxOpen(false)}
        >
          <button
            onClick={() => setIsLightboxOpen(false)}
            className="absolute top-4 right-4 p-2 text-white bg-white/10 hover:bg-white/20 rounded-full transition"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={message.file_url}
            alt=""
            className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
};
