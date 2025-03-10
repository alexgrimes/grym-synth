import React, { useState, useRef, useEffect } from 'react';

interface AudioSample {
  id: string;
  name: string;
  url: string;
  createdAt: string;
  prompt?: string;
}

interface AudioSampleNavigatorProps {
  samples: AudioSample[];
  currentSampleIndex: number;
  onSelectSample: (index: number) => void;
  className?: string;
}

export const AudioSampleNavigator: React.FC<AudioSampleNavigatorProps> = ({
  samples,
  currentSampleIndex,
  onSelectSample,
  className = '',
}) => {
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [swipeDistance, setSwipeDistance] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset swipe distance when current sample changes
  useEffect(() => {
    setSwipeDistance(0);
    setIsSwiping(false);
  }, [currentSampleIndex]);

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    setTouchStartX(e.touches[0].clientX);
    setTouchStartY(e.touches[0].clientY);
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartX === null || touchStartY === null) return;

    const touchX = e.touches[0].clientX;
    const touchY = e.touches[0].clientY;

    // Calculate horizontal and vertical distance moved
    const deltaX = touchX - touchStartX;
    const deltaY = touchY - touchStartY;

    // If horizontal movement is greater than vertical, it's likely a swipe gesture
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      e.preventDefault(); // Prevent scrolling
      setSwipeDistance(deltaX);
    }
  };

  const handleTouchEnd = () => {
    if (touchStartX === null || touchStartY === null || !isSwiping) return;

    // If swipe distance exceeds threshold, navigate to next/previous sample
    if (Math.abs(swipeDistance) > 50) {
      if (swipeDistance > 0 && currentSampleIndex > 0) {
        // Swipe right - go to previous
        onSelectSample(currentSampleIndex - 1);
      } else if (swipeDistance < 0 && currentSampleIndex < samples.length - 1) {
        // Swipe left - go to next
        onSelectSample(currentSampleIndex + 1);
      }
    }

    setTouchStartX(null);
    setTouchStartY(null);
    setSwipeDistance(0);
    setIsSwiping(false);
  };

  // Format date string
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Calculate transform based on swipe distance
  const getTransform = () => {
    if (!isSwiping) return 'translateX(0)';
    return `translateX(${swipeDistance}px)`;
  };

  // Get opacity for pagination dots
  const getDotOpacity = (index: number) => {
    return index === currentSampleIndex ? 1 : 0.5;
  };

  // Handle empty samples case
  if (samples.length === 0) {
    return (
      <div className={`bg-gray-700 rounded-lg border border-gray-600 p-4 text-center ${className}`}>
        <p className="text-gray-400">No audio samples yet</p>
      </div>
    );
  }

  // Get current sample safely
  const currentSample = samples[currentSampleIndex];

  return (
    <div className={`${className}`}>
      <div
        ref={containerRef}
        className="relative overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="bg-gray-700 rounded-lg border border-gray-600 p-4 transition-transform duration-150"
          style={{ transform: getTransform() }}
        >
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-medium text-[#1EA078] truncate">{currentSample.name}</h4>
            <span className="text-xs text-gray-400">{formatDate(currentSample.createdAt)}</span>
          </div>

          {currentSample.prompt && (
            <p className="text-sm text-gray-300 mb-2 italic">"{currentSample.prompt}"</p>
          )}

          <div className="flex justify-between items-center mt-3">
            <button
              onClick={() => currentSampleIndex > 0 && onSelectSample(currentSampleIndex - 1)}
              disabled={currentSampleIndex === 0}
              className="text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Previous sample"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>

            {/* Pagination dots */}
            <div className="flex space-x-1">
              {samples.map((_, index) => (
                <div
                  key={index}
                  className="w-2 h-2 rounded-full bg-[#1EA078] transition-opacity"
                  style={{ opacity: getDotOpacity(index) }}
                  onClick={() => onSelectSample(index)}
                />
              ))}
            </div>

            <button
              onClick={() => currentSampleIndex < samples.length - 1 && onSelectSample(currentSampleIndex + 1)}
              disabled={currentSampleIndex === samples.length - 1}
              className="text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Next sample"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          </div>
        </div>

        {/* Swipe instruction (only visible on touch devices) */}
        <div className="text-xs text-center text-gray-500 mt-2 md:hidden">
          Swipe left/right to navigate between samples
        </div>
      </div>
    </div>
  );
};
