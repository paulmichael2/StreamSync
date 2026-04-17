'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  SkipBack, SkipForward, Settings, Users, Wifi
} from 'lucide-react';
import { Socket } from 'socket.io-client';
import { Participant } from '@/lib/types';

interface VideoPlayerProps {
  videoUrl: string;
  movieTitle: string;
  roomId: string;
  socket: Socket | null;
  participants: Participant[];
  onReady?: () => void;
}

function formatTime(s: number): string {
  if (isNaN(s)) return '0:00';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export default function VideoPlayer({
  videoUrl, movieTitle, roomId, socket, participants, onReady,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const isSyncing = useRef(false);
  const controlsTimer = useRef<ReturnType<typeof setTimeout>>();

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSyncIndicator, setIsSyncIndicator] = useState(false);
  const [syncUser, setSyncUser] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  // Show sync flash
  const flashSync = useCallback((user: string) => {
    setSyncUser(user);
    setIsSyncIndicator(true);
    setTimeout(() => setIsSyncIndicator(false), 2000);
  }, []);

  // Auto-hide controls
  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    clearTimeout(controlsTimer.current);
    controlsTimer.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  }, [isPlaying]);

  // Socket sync listeners
  useEffect(() => {
    if (!socket) return;

    const handlePlay = ({ currentTime: ct }: { currentTime: number }) => {
      if (!videoRef.current) return;
      isSyncing.current = true;
      videoRef.current.currentTime = ct;
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
      setTimeout(() => { isSyncing.current = false; }, 300);
      flashSync('Party');
    };

    const handlePause = ({ currentTime: ct }: { currentTime: number }) => {
      if (!videoRef.current) return;
      isSyncing.current = true;
      videoRef.current.currentTime = ct;
      videoRef.current.pause();
      setIsPlaying(false);
      setTimeout(() => { isSyncing.current = false; }, 300);
      flashSync('Party');
    };

    const handleSeek = ({ currentTime: ct }: { currentTime: number }) => {
      if (!videoRef.current) return;
      isSyncing.current = true;
      videoRef.current.currentTime = ct;
      setTimeout(() => { isSyncing.current = false; }, 300);
      flashSync('Party');
    };

    const handleSyncState = ({ currentTime: ct, isPlaying: playing }: { currentTime: number; isPlaying: boolean }) => {
      if (!videoRef.current) return;
      isSyncing.current = true;
      videoRef.current.currentTime = ct;
      if (playing) {
        videoRef.current.play().catch(() => {});
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
      setTimeout(() => { isSyncing.current = false; }, 500);
    };

    socket.on('play', handlePlay);
    socket.on('pause', handlePause);
    socket.on('seek', handleSeek);
    socket.on('sync-state', handleSyncState);

    return () => {
      socket.off('play', handlePlay);
      socket.off('pause', handlePause);
      socket.off('seek', handleSeek);
      socket.off('sync-state', handleSyncState);
    };
  }, [socket, flashSync]);

  // Fullscreen change listener
  useEffect(() => {
    const onFSChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFSChange);
    return () => document.removeEventListener('fullscreenchange', onFSChange);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return;
      if (e.key === ' ' || e.key === 'k') { e.preventDefault(); togglePlay(); }
      if (e.key === 'f') toggleFullscreen();
      if (e.key === 'm') toggleMute();
      if (e.key === 'ArrowLeft') skipBy(-10);
      if (e.key === 'ArrowRight') skipBy(10);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const togglePlay = useCallback(() => {
    if (!videoRef.current || isSyncing.current) return;
    const ct = videoRef.current.currentTime;
    if (videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
      socket?.emit('play', { roomId, currentTime: ct });
    } else {
      videoRef.current.pause();
      socket?.emit('pause', { roomId, currentTime: ct });
    }
    resetControlsTimer();
  }, [socket, roomId, resetControlsTimer]);

  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }, []);

  const skipBy = useCallback((seconds: number) => {
    if (!videoRef.current) return;
    const newTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + seconds));
    videoRef.current.currentTime = newTime;
    socket?.emit('seek', { roomId, currentTime: newTime });
  }, [socket, roomId, duration]);

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || !videoRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newTime = ratio * duration;
    videoRef.current.currentTime = newTime;
    socket?.emit('seek', { roomId, currentTime: newTime });
    setCurrentTime(newTime);
  }, [duration, socket, roomId]);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    setVolume(v);
    if (videoRef.current) {
      videoRef.current.volume = v;
      videoRef.current.muted = v === 0;
      setIsMuted(v === 0);
    }
  };

  const progressPct = duration ? (currentTime / duration) * 100 : 0;
  const bufferedPct = duration ? (buffered / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className={`relative bg-black group select-none ${isFullscreen ? 'w-screen h-screen' : 'w-full aspect-video'} overflow-hidden`}
      onMouseMove={resetControlsTimer}
      onMouseLeave={() => { if (isPlaying) setShowControls(false); }}
    >
      {/* Video element */}
      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full h-full object-contain"
        onClick={togglePlay}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime ?? 0)}
        onDurationChange={() => setDuration(videoRef.current?.duration ?? 0)}
        onProgress={() => {
          const v = videoRef.current;
          if (v && v.buffered.length > 0) setBuffered(v.buffered.end(v.buffered.length - 1));
        }}
        onWaiting={() => setIsLoading(true)}
        onCanPlay={() => { setIsLoading(false); onReady?.(); }}
        onLoadedMetadata={() => setIsLoading(false)}
        playsInline
        preload="metadata"
      />

      {/* Loading spinner */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none">
          <div className="w-12 h-12 border-4 border-white/20 border-t-brand-red rounded-full animate-spin" />
        </div>
      )}

      {/* Sync indicator */}
      {isSyncIndicator && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 bg-brand-red/90 rounded-full text-white text-xs font-semibold animate-fade-in pointer-events-none">
          <Wifi size={12} />
          Synced with party
        </div>
      )}

      {/* Center play/pause flash */}
      {!isPlaying && !isLoading && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          onClick={togglePlay}
        >
          <div className="w-20 h-20 rounded-full bg-black/60 flex items-center justify-center backdrop-blur-sm">
            <Play size={32} className="text-white fill-white ml-1" />
          </div>
        </div>
      )}

      {/* Controls overlay */}
      <div
        className={`player-overlay absolute inset-0 flex flex-col justify-between transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 pt-4">
          <div>
            <p className="text-white font-semibold text-sm drop-shadow">{movieTitle}</p>
          </div>
          <div className="flex items-center gap-2">
            {participants.length > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-sm text-xs text-white border border-white/15">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <Users size={12} />
                <span>{participants.length} watching</span>
              </div>
            )}
          </div>
        </div>

        {/* Bottom controls */}
        <div className="px-4 pb-4">
          {/* Progress bar */}
          <div
            ref={progressRef}
            className="progress-track mb-3 cursor-pointer"
            onClick={handleProgressClick}
            role="slider"
            aria-label="Video progress"
            aria-valuenow={Math.round(progressPct)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            {/* Buffered */}
            <div
              className="absolute top-0 left-0 h-full bg-white/20 rounded-full"
              style={{ width: `${bufferedPct}%` }}
            />
            {/* Played */}
            <div
              className="absolute top-0 left-0 h-full bg-brand-red rounded-full transition-none"
              style={{ width: `${progressPct}%` }}
            />
            {/* Thumb */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-brand-red rounded-full shadow-lg opacity-0 hover:opacity-100 transition-opacity"
              style={{ left: `calc(${progressPct}% - 7px)` }}
            />
          </div>

          {/* Controls row */}
          <div className="flex items-center justify-between gap-3">
            {/* Left controls */}
            <div className="flex items-center gap-2">
              {/* Skip back */}
              <button
                onClick={() => skipBy(-10)}
                className="p-2 text-white/80 hover:text-white transition-colors cursor-pointer"
                aria-label="Rewind 10 seconds"
              >
                <SkipBack size={20} strokeWidth={2} />
              </button>

              {/* Play/Pause */}
              <button
                onClick={togglePlay}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all active:scale-[0.92] cursor-pointer"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying
                  ? <Pause size={22} className="fill-white" />
                  : <Play size={22} className="fill-white ml-0.5" />
                }
              </button>

              {/* Skip forward */}
              <button
                onClick={() => skipBy(10)}
                className="p-2 text-white/80 hover:text-white transition-colors cursor-pointer"
                aria-label="Skip forward 10 seconds"
              >
                <SkipForward size={20} strokeWidth={2} />
              </button>

              {/* Volume */}
              <div
                className="flex items-center gap-2 relative"
                onMouseEnter={() => setShowVolumeSlider(true)}
                onMouseLeave={() => setShowVolumeSlider(false)}
              >
                <button
                  onClick={toggleMute}
                  className="p-2 text-white/80 hover:text-white transition-colors cursor-pointer"
                  aria-label={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted || volume === 0
                    ? <VolumeX size={20} />
                    : <Volume2 size={20} />
                  }
                </button>
                <div
                  className={`transition-all duration-200 overflow-hidden ${
                    showVolumeSlider ? 'w-20 opacity-100' : 'w-0 opacity-0'
                  }`}
                >
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-full"
                    aria-label="Volume"
                  />
                </div>
              </div>

              {/* Time */}
              <span className="text-white/80 text-xs font-medium tabular-nums hidden sm:block">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            {/* Right controls */}
            <div className="flex items-center gap-1">
              <button
                className="p-2 text-white/80 hover:text-white transition-colors cursor-pointer hidden sm:block"
                aria-label="Settings"
              >
                <Settings size={18} />
              </button>
              <button
                onClick={toggleFullscreen}
                className="p-2 text-white/80 hover:text-white transition-colors cursor-pointer"
                aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              >
                {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
