'use client';

import React, { useState, useRef } from 'react';
import { Profile } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import { Camera, X, Loader2, Check, Trash2, User } from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: Profile;
  onProfileUpdated: (updatedProfile: Profile) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onProfileUpdated,
}) => {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentAvatar = previewUrl || currentUser.avatar_url;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      if (!file.type.startsWith('image/')) {
        setErrorMessage('Please select a valid image file (JPEG, PNG, WebP).');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setErrorMessage('Image size must be less than 5 MB.');
        return;
      }

      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSavePhoto = async () => {
    if (!selectedFile) return;

    try {
      setIsUploading(true);
      setErrorMessage(null);

      const ext = selectedFile.name.split('.').pop() || 'png';
      const cleanExt = ext.replace(/[^a-zA-Z0-9]/g, '');
      const filePath = `avatars/${currentUser.id}_${Date.now()}.${cleanExt}`;

      // Upload to chat-attachments bucket
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('chat-attachments')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw new Error('Failed to upload image to storage.');
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from('chat-attachments').getPublicUrl(uploadData.path);

      // Update profile in Postgres database
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', currentUser.id);

      if (profileError) {
        console.error('Profile update error:', profileError);
        throw new Error('Failed to update profile picture in database.');
      }

      const updated: Profile = {
        ...currentUser,
        avatar_url: publicUrl,
      };

      onProfileUpdated(updated);
      setSelectedFile(null);
      setPreviewUrl(null);
      setSuccessMessage('Profile picture updated successfully!');

      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred while uploading.';
      setErrorMessage(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemovePhoto = async () => {
    try {
      setIsUploading(true);
      setErrorMessage(null);

      // Reset to default seed avatar
      const defaultAvatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser.username}`;

      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: defaultAvatar })
        .eq('id', currentUser.id);

      if (error) {
        throw new Error('Failed to remove profile picture.');
      }

      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      setSelectedFile(null);

      const updated: Profile = {
        ...currentUser,
        avatar_url: defaultAvatar,
      };

      onProfileUpdated(updated);
      setSuccessMessage('Profile picture removed.');

      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not remove photo.';
      setErrorMessage(msg);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in select-none"
      onClick={onClose}
    >
      <div
        className="bg-[#202c33] border border-[#222e35] rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#222e35] bg-[#111b21]/60">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-[#00a884]" />
            <h2 className="text-base font-semibold text-[#e9edef]">Profile</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#8696a0] hover:text-[#e9edef] rounded-full hover:bg-white/10 transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col items-center">
          {/* Avatar with Camera Overlay */}
          <div className="relative group cursor-pointer mb-5" onClick={() => fileInputRef.current?.click()}>
            <div className="w-28 h-28 rounded-full bg-[#111b21] border-2 border-[#222e35] overflow-hidden flex items-center justify-center text-3xl font-bold text-[#e9edef] shadow-xl">
              {currentAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentAvatar}
                  alt={currentUser.username}
                  className="w-full h-full object-cover"
                />
              ) : (
                currentUser.username.charAt(0).toUpperCase()
              )}
            </div>

            {/* Hover Camera Overlay */}
            <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity gap-1">
              <Camera className="w-6 h-6 text-[#00a884]" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#e9edef]">
                Change
              </span>
            </div>

            {/* Small camera badge */}
            <div className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#00a884] text-white flex items-center justify-center shadow-lg ring-2 ring-[#202c33]">
              <Camera className="w-4 h-4" />
            </div>
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleFileChange}
            className="hidden"
            id="profile-avatar-input"
          />

          {/* Username info */}
          <h3 className="text-lg font-bold text-[#e9edef] tracking-tight">
            {currentUser.username}
          </h3>
          <p className="text-xs text-[#8696a0] mt-0.5">
            Click photo to choose a new picture
          </p>

          {/* Alerts */}
          {errorMessage && (
            <div className="mt-3 px-3 py-2 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs text-center w-full animate-fade-in">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="mt-3 px-3 py-2 bg-[#00a884]/10 border border-[#00a884]/30 rounded-xl text-[#00a884] text-xs text-center w-full flex items-center justify-center gap-1.5 animate-fade-in">
              <Check className="w-4 h-4" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="w-full mt-6 space-y-2.5">
            {selectedFile ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setSelectedFile(null);
                    if (previewUrl) {
                      URL.revokeObjectURL(previewUrl);
                      setPreviewUrl(null);
                    }
                  }}
                  disabled={isUploading}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-[#111b21] hover:bg-[#2a3942] text-xs font-semibold text-[#e9edef] transition cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSavePhoto}
                  disabled={isUploading}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-[#00a884] hover:bg-[#02906f] text-xs font-semibold text-white transition flex items-center justify-center gap-1.5 shadow-lg shadow-[#00a884]/20 cursor-pointer disabled:opacity-50"
                >
                  {isUploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>Save Photo</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2 w-full">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#00a884] hover:bg-[#02906f] text-xs font-semibold text-white transition flex items-center justify-center gap-2 shadow-lg shadow-[#00a884]/20 cursor-pointer active:scale-[0.98]"
                >
                  <Camera className="w-4 h-4" />
                  <span>Upload New Photo</span>
                </button>

                {currentUser.avatar_url && !currentUser.avatar_url.includes('dicebear') && (
                  <button
                    onClick={handleRemovePhoto}
                    disabled={isUploading}
                    className="w-full py-2 px-4 rounded-xl bg-transparent hover:bg-rose-500/10 text-rose-400 hover:text-rose-300 text-xs font-medium transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isUploading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    <span>Remove Photo</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
