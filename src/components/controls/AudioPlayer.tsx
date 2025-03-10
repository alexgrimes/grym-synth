import React, { useState, useRef, useEffect } from 'react';
import { Button } from '../ui/button';

interface AudioPlayerProps {
  audioUrl?: string;
  onTimeUpdate?: (currentTime: number) => void;
  onEnded?: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  className?: string;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  audioUrl,
  onTimeUpdate,
  onEnded,
  onPrevious,
  onNext,
  className = '',
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  // Load audio when URL changes
  useEffect(() => {
    if (audioRef.current && audioUrl) {
      audioRef.current.load();
      setIsPlaying(false);
      setCurrentTime(0);
    }
  }, [audioUrl]);

  // Handle play/pause
  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Handle time update
  const handleTimeUpdate = () => {
    if (audioRef.current && !isSeeking) {
      const time = audioRef.current.currentTime;
      setCurrentTime(time);
      if (onTimeUpdate) {
        onTimeUpdate(time);
      }
    }
  };

  // Handle metadata loaded
  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  // Handle seeking
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (progressRef.current && audioRef.current) {
      const rect = progressRef.current.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / rect.width;
      const newTime = pos * duration;
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  // Handle touch events for seeking
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    setTouchStartX(e.touches[0].clientX);
    setTouchStartY(e.touches[0].clientY);
    setIsSeeking(true);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartX === null || touchStartY === null || !progressRef.current || !audioRef.current) return;

    const touchX = e.touches[0].clientX;
    const touchY = e.touches[0].clientY;

    // Calculate horizontal and vertical distance moved
    const deltaX = touchX - touchStartX;
    const deltaY = touchY - touchStartY;

    // If horizontal movement is greater than vertical, it's likely a seek gesture
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      e.preventDefault(); // Prevent scrolling

      const rect = progressRef.current.getBoundingClientRect();
      const pos = (touchX - rect.left) / rect.width;
      const newTime = Math.max(0, Math.min(duration, pos * duration));

      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleTouchEnd = () => {
    setTouchStartX(null);
    setTouchStartY(null);
    setIsSeeking(false);
  };

  // Handle swipe gestures for next/previous
  const handlePlayerTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    setTouchStartX(e.touches[0].clientX);
    setTouchStartY(e.touches[0].clientY);
  };

  const handlePlayerTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartX === null || touchStartY === null) return;

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;

    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;

    // If horizontal movement is greater than vertical and exceeds threshold
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      if (deltaX > 0 && onPrevious) {
        // Swipe right - go to previous
        onPrevious();
      } else if (deltaX < 0 && onNext) {
        // Swipe left - go to next
        onNext();
      }
    }

    setTouchStartX(null);
    setTouchStartY(null);
  };

  // Format time (seconds to MM:SS)
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  return (
    <div
      className={`bg-gray-800 rounded-lg p-3 ${className}`}
      onTouchStart={handlePlayerTouchStart}
      onTouchEnd={handlePlayerTouchEnd}
    >
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => {
          setIsPlaying(false);
          if (onEnded) onEnded();
        }}
      />

      {/* Progress bar with touch support */}
      <div
        ref={progressRef}
        className="h-2 bg-gray-700 rounded-full mb-2 cursor-pointer relative"
        onClick={handleSeek}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="absolute h-full bg-gradient-to-r from-[#462A5A] via-[#32648C] to-[#1EA078] rounded-full"
          style={{ width: `${(currentTime / duration) * 100}%` }}
        />
      </div>

      {/* Time display */}
      <div className="flex justify-between text-xs text-gray-400 mb-2">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center space-x-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onPrevious}
          disabled={!onPrevious}
          className="text-white hover:bg-gray-700"
          aria-label="Previous"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="19 20 9 12 19 4 19 20"></polygon>
            <line x1="5" y1="19" x2="5" y2="5"></line>
          </svg>
        </Button>

        <Button
          variant="default"
          size="default"
          onClick={togglePlayPause}
          className="bg-gradient-to-r from-[#462A5A] via-[#32648C] to-[#1EA078] hover:opacity-90 rounded-full h-10 w-10 p-0 flex items-center justify-center"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="6" y="4" width="4" height="16"></rect>
              <rect x="14" y="4" width="4" height="16"></rect>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
          )}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onNext}
          disabled={!onNext}
          className="text-white hover:bg-gray-700"
          aria-label="Next"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="5 4 15 12 5 20 5 4"></polygon>
            <line x1="19" y1="5" x2="19" y2="19"></line>
          </svg>
        </Button>
      </div>

      {/* Swipe instruction (only visible on touch devices) */}
      <div className="text-xs text-center text-gray-500 mt-2 md:hidden">
        Swipe left/right to navigate between samples
      </div>
    </div>
  );
};
