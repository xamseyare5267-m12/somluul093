import React, { useRef } from 'react';

interface VideoPlayerProps {
  src: string;
  className?: string;
  controls?: boolean;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  playsInline?: boolean;
  preload?: 'none' | 'metadata' | 'auto';
  poster?: string;
  onEnded?: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = React.memo(({
  src,
  className = '',
  controls = true,
  autoPlay = false,
  loop = false,
  muted = false,
  playsInline = true,
  preload = 'metadata',
  poster,
  onEnded
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  if (!src) return null;

  return (
    <video
      ref={videoRef}
      src={src}
      controls={controls}
      autoPlay={autoPlay}
      loop={loop}
      muted={muted}
      playsInline={playsInline}
      preload={preload}
      poster={poster}
      onEnded={onEnded}
      className={className}
    />
  );
});

VideoPlayer.displayName = 'VideoPlayer';
