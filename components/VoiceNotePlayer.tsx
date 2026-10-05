'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, Mic } from 'lucide-react';

interface VoiceNotePlayerProps {
  audioUrl: string;
  isCurrentUser: boolean;
}

export const VoiceNotePlayer: React.FC<VoiceNotePlayerProps> = ({
  audioUrl,
  isCurrentUser,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Formats seconds into M:SS format
  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch((err) => {
        console.error('Audio playback failed:', err);
      });
    }
  };

  const toggleSpeed = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current) return;
    const rates = [1, 1.5, 2];
    const nextIndex = (rates.indexOf(playbackRate) + 1) % rates.length;
    const nextRate = rates[nextIndex];
    setPlaybackRate(nextRate);
    audioRef.current.playbackRate = nextRate;
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const newTime = parseFloat(e.target.value);
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Waveform bars heights pattern (WhatsApp authentic aesthetic)
  const barHeights = [
    25, 45, 80, 50, 70, 95, 60, 40, 75, 100, 85, 40, 60, 90, 70, 45, 85, 95, 60,
    35, 70, 85, 50, 30,
  ];

  return (
    <div className="flex flex-col gap-1.5 py-1 min-w-[220px] sm:min-w-[260px] max-w-sm select-none">
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
        onTimeUpdate={() => {
          if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
          }
        }}
        onLoadedMetadata={() => {
          if (audioRef.current) {
            setDuration(audioRef.current.duration || 0);
          }
        }}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
        }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      <div className="flex items-center gap-3">
        {/* Circular Play / Pause Button */}
        <button
          onClick={togglePlay}
          className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition active:scale-95 cursor-pointer shadow-md ${
            isCurrentUser
              ? 'bg-[#111b21] hover:bg-[#182229] text-[#00a884]'
              : 'bg-[#00a884] hover:bg-[#02906f] text-white'
          }`}
          aria-label={isPlaying ? 'Pause' : 'Play voice note'}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 fill-current" />
          ) : (
            <Play className="w-4 h-4 fill-current ml-0.5" />
          )}
        </button>

        {/* Waveform Scrubber Visualizer */}
        <div className="flex-1 flex flex-col justify-center gap-1.5 min-w-0">
          <div className="relative h-6 flex items-center">
            {/* Interactive invisible range input overlay */}
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.1}
              value={currentTime}
              onChange={handleSeek}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              aria-label="Seek audio"
            />

            {/* Audio Waveform Bars */}
            <div className="w-full flex items-center justify-between gap-[2px] h-full pointer-events-none">
              {barHeights.map((h, i) => {
                const barPercent = (i / barHeights.length) * 100;
                const isPassed = barPercent <= progressPercent;

                return (
                  <div
                    key={i}
                    style={{ height: `${h}%` }}
                    className={`w-[3px] rounded-full transition-colors duration-150 ${
                      isPassed
                        ? isCurrentUser
                          ? 'bg-[#25d366]'
                          : 'bg-[#00a884]'
                        : isCurrentUser
                        ? 'bg-black/30'
                        : 'bg-[#8696a0]/40'
                    }`}
                  />
                );
              })}
            </div>
          </div>

          {/* Time & Speed Controls */}
          <div className="flex items-center justify-between text-[11px] font-medium text-[#8696a0]">
            <span>
              {isPlaying ? formatTime(currentTime) : formatTime(duration || 0)}
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleSpeed}
                className="px-1.5 py-0.5 rounded bg-black/20 hover:bg-black/40 text-[10px] text-[#e9edef] font-semibold transition cursor-pointer"
                title="Change playback speed"
              >
                {playbackRate}x
              </button>
              <Mic className="w-3.5 h-3.5 text-[#00a884] opacity-80" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
