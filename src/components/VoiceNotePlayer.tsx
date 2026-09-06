import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Square, Volume2 } from 'lucide-react';
import { playVoiceNoteTone, getAudioContext } from '../lib/soundUtils';

interface VoiceNotePlayerProps {
  mediaUrl?: string;
  durationLabel?: string;
  isMe?: boolean;
}

export const VoiceNotePlayer: React.FC<VoiceNotePlayerProps> = ({ mediaUrl, durationLabel, isMe }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState<number>(() => {
    if (durationLabel) {
      const parts = durationLabel.replace(/[^0-9:]/g, '').split(':');
      if (parts.length === 2) {
        return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
      }
    }
    return 8;
  });
  const [playbackRate, setPlaybackRate] = useState<number>(1);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<any>(null);
  const synthControllerRef = useRef<{ stop: () => void } | null>(null);
  const audioSourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

  // Generate deterministic wave heights for aesthetic waveform
  const waveHeights = [20, 45, 80, 60, 30, 90, 100, 75, 40, 85, 95, 50, 70, 30, 85, 60, 40, 90, 70, 35];

  useEffect(() => {
    if (!mediaUrl || (!mediaUrl.startsWith('data:audio') && !mediaUrl.startsWith('http') && !mediaUrl.startsWith('blob:') && !mediaUrl.startsWith('/'))) {
      return;
    }

    const audio = new Audio(mediaUrl);
    audio.volume = 1.0;
    audio.playbackRate = playbackRate;
    audioRef.current = audio;

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(Math.round(audio.duration));
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      if (timerRef.current) clearInterval(timerRef.current);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.pause();
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [mediaUrl]);

  const togglePlay = async () => {
    if (isPlaying) {
      // STOP PLAYBACK
      setIsPlaying(false);
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (synthControllerRef.current) {
        try { synthControllerRef.current.stop(); } catch (e) {}
        synthControllerRef.current = null;
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    } else {
      // START PLAYBACK
      const targetDuration = duration || 8;

      if (mediaUrl && (mediaUrl.startsWith('data:audio') || mediaUrl.startsWith('blob:') || mediaUrl.startsWith('http') || mediaUrl.startsWith('/'))) {
        setIsPlaying(true);

        try {
          if (!audioRef.current) {
            audioRef.current = new Audio(mediaUrl);
          } else if (audioRef.current.src !== mediaUrl) {
            audioRef.current.src = mediaUrl;
          }

          audioRef.current.playbackRate = playbackRate;
          if (currentTime >= targetDuration || audioRef.current.ended) {
            audioRef.current.currentTime = 0;
            setCurrentTime(0);
          } else {
            audioRef.current.currentTime = currentTime;
          }

          await audioRef.current.play();
        } catch (err) {
          console.warn('Native HTML5 Audio play notice, using audio synthesizer:', err);
          runFallbackTimer(targetDuration);
        }
      } else {
        // Voice note without recorded file
        setIsPlaying(true);
        runFallbackTimer(targetDuration);
      }
    }
  };

  const runFallbackTimer = (targetDuration: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (synthControllerRef.current) {
      try { synthControllerRef.current.stop(); } catch (e) {}
    }

    const synth = playVoiceNoteTone(targetDuration - currentTime, () => {
      setIsPlaying(false);
      setCurrentTime(0);
      if (timerRef.current) clearInterval(timerRef.current);
    });
    synthControllerRef.current = synth;

    const startTime = Date.now() - (currentTime * 1000);
    timerRef.current = setInterval(() => {
      const elapsedSecs = ((Date.now() - startTime) / 1000) * playbackRate;
      if (elapsedSecs >= targetDuration) {
        setIsPlaying(false);
        setCurrentTime(0);
        clearInterval(timerRef.current);
        timerRef.current = null;
        if (synthControllerRef.current) {
          try { synthControllerRef.current.stop(); } catch (e) {}
        }
      } else {
        setCurrentTime(elapsedSecs);
      }
    }, 100);
  };

  const stopAudio = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (synthControllerRef.current) {
      try { synthControllerRef.current.stop(); } catch (e) {}
      synthControllerRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const cycleSpeed = (e: React.MouseEvent) => {
    e.stopPropagation();
    const speeds = [1, 1.5, 2];
    const nextIndex = (speeds.indexOf(playbackRate) + 1) % speeds.length;
    const nextSpeed = speeds[nextIndex];
    setPlaybackRate(nextSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs <= 0) return durationLabel || '0:05';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const effectiveDuration = duration || 8;
  const progressPercent = Math.min(100, Math.max(0, (currentTime / effectiveDuration) * 100));

  return (
    <div className={`p-2 rounded-2xl flex items-center gap-2.5 max-w-xs sm:max-w-sm ${isMe ? 'bg-[var(--somluul-primary)] text-white' : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-150 dark:border-gray-700/80 shadow-xs'}`}>
      {/* Play/Pause & Stop Button Group */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={togglePlay}
          type="button"
          title={isPlaying ? "Dhakas / Pause Audio" : "Daar / Play Audio"}
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-transform active:scale-95 cursor-pointer ${
            isMe 
              ? 'bg-white/20 hover:bg-white/30 text-white' 
              : 'bg-[var(--somluul-primary)] hover:brightness-110 text-white shadow-xs'
          }`}
        >
          {isPlaying ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" className="ml-0.5" />}
        </button>

        {(isPlaying || currentTime > 0) && (
          <button
            onClick={stopAudio}
            type="button"
            title="Jooji / Stop Audio (⏹️)"
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              isMe 
                ? 'bg-red-500/80 hover:bg-red-600 text-white' 
                : 'bg-red-100 hover:bg-red-200 text-red-600 dark:bg-red-950/50 dark:text-red-400'
            }`}
          >
            <Square size={12} fill="currentColor" />
          </button>
        )}
      </div>

      {/* Waveform & Scrubber */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="relative h-6 flex items-center gap-0.5 group">
          {/* Animated Waveform Bars */}
          {waveHeights.map((h, idx) => {
            const barProgress = (idx / waveHeights.length) * 100;
            const isFilled = barProgress <= progressPercent;

            return (
              <span
                key={idx}
                style={{
                  height: `${h}%`,
                  animationDuration: isPlaying ? `${0.4 + (idx % 3) * 0.2}s` : '0s'
                }}
                className={`w-1 rounded-full transition-all duration-150 ${
                  isPlaying ? 'animate-pulse' : ''
                } ${
                  isMe
                    ? (isFilled ? 'bg-white' : 'bg-white/40')
                    : (isFilled ? 'bg-[var(--somluul-primary)] dark:bg-blue-400' : 'bg-gray-300 dark:bg-gray-600')
                }`}
              />
            );
          })}

          {/* Interactive Seek Slider Overlay */}
          <input
            type="range"
            min="0"
            max={effectiveDuration}
            step="0.1"
            value={currentTime}
            onChange={handleSeek}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />
        </div>

        {/* Timestamp & Speed Badge */}
        <div className="flex justify-between items-center text-[10px] opacity-80 font-mono">
          <span>{formatTime(currentTime > 0 ? currentTime : effectiveDuration)}</span>
          
          <div className="flex items-center gap-1.5">
            <Volume2 size={11} className="opacity-70" />
            <button
              onClick={cycleSpeed}
              type="button"
              className={`px-1.5 py-0.2 rounded text-[9px] font-bold transition-all cursor-pointer ${
                isMe ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              {playbackRate}x
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
