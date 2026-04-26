'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  SkipBack, SkipForward, Settings, Users, Wifi, ChevronLeft, Check,
} from 'lucide-react';
import Hls from 'hls.js';
import { getPusherClient } from '@/lib/pusherClient';
import { Participant } from '@/lib/types';

interface VideoPlayerProps {
  videoUrl: string;
  movieTitle: string;
  roomId: string;
  userId: string;
  participants: Participant[];
  initialTime?: number;
  initialPlaying?: boolean;
  subtitleUrl?: string;
}

const SPEEDS = [
  { value: 0.5, label: '0.5' },
  { value: 0.8, label: '0.8' },
  { value: 1,   label: 'Normal' },
  { value: 1.3, label: '1.3' },
  { value: 1.5, label: '1.5' },
  { value: 2,   label: '2.0' },
];

const SUBTITLE_SIZES = [
  { value: 'small',  label: 'Small',  cls: 'text-sm' },
  { value: 'medium', label: 'Medium', cls: 'text-lg' },
  { value: 'large',  label: 'Large',  cls: 'text-2xl' },
] as const;

function formatTime(s: number): string {
  if (isNaN(s) || !isFinite(s)) return '0:00';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

async function triggerEvent(roomId: string, event: string, data: Record<string, unknown>) {
  await fetch('/api/pusher', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roomId, event, data }),
  });
}

export default function VideoPlayer({
  videoUrl, movieTitle, roomId, userId, participants,
  initialTime = 0, initialPlaying = false, subtitleUrl = '',
}: VideoPlayerProps) {
  const videoRef      = useRef<HTMLVideoElement>(null);
  const containerRef  = useRef<HTMLDivElement>(null);
  const progressRef   = useRef<HTMLDivElement>(null);
  const hlsRef          = useRef<Hls | null>(null);
  const isSyncing       = useRef(false);
  const syncHostLock    = useRef(false); // prevents applying multiple sync-host responses at once
  const controlsTimer   = useRef<ReturnType<typeof setTimeout>>();

  const [isPlaying,       setIsPlaying]       = useState(false);
  const [currentTime,     setCurrentTime]     = useState(0);
  const [duration,        setDuration]        = useState(0);
  const [buffered,        setBuffered]        = useState(0);
  const [volume,          setVolume]          = useState(1);
  const [isMuted,         setIsMuted]         = useState(false);
  const [showControls,    setShowControls]    = useState(true);
  const [isFullscreen,    setIsFullscreen]    = useState(false);
  const [isSyncIndicator, setIsSyncIndicator] = useState(false);
  const [isLoading,       setIsLoading]       = useState(true);
  const [showVolumeSlider,setShowVolumeSlider]= useState(false);

  // Settings panel
  const [showSettings,  setShowSettings]  = useState(false);
  const [settingsView,  setSettingsView]  = useState<'main' | 'speed' | 'subtitle'>('main');
  const [playbackRate,  setPlaybackRate]  = useState(1);

  // Subtitle state
  const [subtitlesOn,      setSubtitlesOn]      = useState(true);
  const [activeCueText,    setActiveCueText]    = useState('');
  const [subtitleSize,     setSubtitleSize]     = useState<'small' | 'medium' | 'large'>('medium');
  const [subtitlePosition, setSubtitlePosition] = useState<'bottom' | 'top'>('bottom');
  const [centerFlash,      setCenterFlash]      = useState<'play' | 'pause' | null>(null);

  const trackSrc = subtitleUrl ? `/api/subtitle?url=${encodeURIComponent(subtitleUrl)}` : null;

  // ── helpers ──────────────────────────────────────────────────────────────

  const flashSync = useCallback(() => {
    setIsSyncIndicator(true);
    setTimeout(() => setIsSyncIndicator(false), 2000);
  }, []);

  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    clearTimeout(controlsTimer.current);
    controlsTimer.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) setShowControls(false);
    }, 3000);
  }, []);

  // ── HLS.js setup for .m3u8 streams ──────────────────────────────────────

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Destroy any previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const isHls = videoUrl.includes('.m3u8') || videoUrl.includes('m3u8');

    if (!isHls) {
      // Plain MP4 or other natively supported format — just set src directly
      video.src = videoUrl;
      return;
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90,
      });
      hlsRef.current = hls;
      hls.loadSource(videoUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari has native HLS support
      video.src = videoUrl;
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [videoUrl]);

  // ── subtitle cue tracking (custom renderer for size/position control) ────

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !trackSrc) return;

    const bindTrack = () => {
      for (let i = 0; i < video.textTracks.length; i++) {
        const track = video.textTracks[i];
        // 'hidden' = browser tracks cues but doesn't render — we render manually
        track.mode = subtitlesOn ? 'hidden' : 'disabled';
        track.oncuechange = () => {
          if (!subtitlesOn || !track.activeCues || track.activeCues.length === 0) {
            setActiveCueText('');
            return;
          }
          const cue = track.activeCues[0] as VTTCue;
          // Strip any inline HTML tags from the cue text
          setActiveCueText(cue.text.replace(/<[^>]+>/g, '').trim());
        };
      }
    };

    bindTrack();
    video.textTracks.addEventListener('addtrack', bindTrack);
    return () => {
      video.textTracks.removeEventListener('addtrack', bindTrack);
      setActiveCueText('');
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackSrc]);

  // Toggle track mode without re-binding handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    for (let i = 0; i < video.textTracks.length; i++) {
      video.textTracks[i].mode = subtitlesOn ? 'hidden' : 'disabled';
    }
    if (!subtitlesOn) setActiveCueText('');
  }, [subtitlesOn]);

  // ── Pusher sync ──────────────────────────────────────────────────────────

  useEffect(() => {
    const pusher  = getPusherClient();
    const channel = pusher.subscribe(`room-${roomId}`);

    channel.bind('play', ({ currentTime: ct }: { currentTime: number }) => {
      if (!videoRef.current) return;
      isSyncing.current = true;
      videoRef.current.currentTime = ct;
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
      setTimeout(() => { isSyncing.current = false; }, 300);
      flashSync();
    });

    channel.bind('pause', ({ currentTime: ct }: { currentTime: number }) => {
      if (!videoRef.current) return;
      isSyncing.current = true;
      videoRef.current.currentTime = ct;
      videoRef.current.pause();
      setIsPlaying(false);
      setTimeout(() => { isSyncing.current = false; }, 300);
      flashSync();
    });

    channel.bind('seek', ({ currentTime: ct }: { currentTime: number }) => {
      if (!videoRef.current) return;
      isSyncing.current = true;
      videoRef.current.currentTime = ct;
      setTimeout(() => { isSyncing.current = false; }, 300);
      flashSync();
    });

    channel.bind('speed', ({ rate }: { rate: number }) => {
      if (!videoRef.current) return;
      videoRef.current.playbackRate = rate;
      setPlaybackRate(rate);
      flashSync();
    });

    // When a new viewer joins, existing members broadcast their current state so the
    // joiner can snap to the right position and play/pause state immediately.
    // Skip if it's our own join event — we don't have the right state yet.
    // NOTE: data is { id, username, ... } at the top level (not nested under 'user').
    const handleUserJoinedSync = ({ id: joinedId }: { id?: string }) => {
      if (!videoRef.current) return;
      if (joinedId === userId) return; // I'm the one who just joined — don't respond
      triggerEvent(roomId, 'sync-host', {
        currentTime: videoRef.current.currentTime,
        isPlaying: !videoRef.current.paused,
        rate: videoRef.current.playbackRate,
      });
    };
    channel.bind('user-joined', handleUserJoinedSync);

    // New joiner receives sync-host — apply only the first response (cooldown prevents
    // applying one from every existing member in large rooms).
    channel.bind('sync-host', ({ currentTime: ct, isPlaying: ip, rate }: { currentTime: number; isPlaying: boolean; rate?: number }) => {
      if (!videoRef.current || syncHostLock.current) return;
      syncHostLock.current = true;
      setTimeout(() => { syncHostLock.current = false; }, 2000);

      const applySync = () => {
        if (!videoRef.current) return;
        isSyncing.current = true;
        videoRef.current.currentTime = ct;
        if (rate && rate !== videoRef.current.playbackRate) {
          videoRef.current.playbackRate = rate;
          setPlaybackRate(rate);
        }
        if (ip) videoRef.current.play().catch(() => {});
        else videoRef.current.pause();
        setTimeout(() => { isSyncing.current = false; }, 300);
        flashSync();
      };

      // If metadata isn't loaded yet, wait for it before seeking
      if (videoRef.current.readyState < 1) {
        videoRef.current.addEventListener('loadedmetadata', applySync, { once: true });
      } else {
        applySync();
      }
    });

    return () => {
      channel.unbind('play');
      channel.unbind('pause');
      channel.unbind('seek');
      channel.unbind('speed');
      channel.unbind('user-joined', handleUserJoinedSync);
      channel.unbind('sync-host');
    };
  }, [roomId, flashSync]);

  // ── initial sync ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!videoRef.current || initialTime === 0) return;
    const apply = () => {
      if (!videoRef.current) return;
      isSyncing.current = true;
      videoRef.current.currentTime = initialTime;
      if (initialPlaying) videoRef.current.play().catch(() => {});
      setTimeout(() => { isSyncing.current = false; }, 500);
    };
    if (videoRef.current.readyState >= 1) apply();
    else videoRef.current.addEventListener('loadedmetadata', apply, { once: true });
  }, [initialTime, initialPlaying]);

  // ── fullscreen ───────────────────────────────────────────────────────────

  useEffect(() => {
    const onFS = () => {
      const el = document.fullscreenElement ||
        (document as Document & { webkitFullscreenElement?: Element }).webkitFullscreenElement;
      setIsFullscreen(!!el);
    };
    document.addEventListener('fullscreenchange', onFS);
    document.addEventListener('webkitfullscreenchange', onFS);
    videoRef.current?.addEventListener('webkitbeginfullscreen', () => setIsFullscreen(true));
    videoRef.current?.addEventListener('webkitendfullscreen', () => setIsFullscreen(false));
    return () => {
      document.removeEventListener('fullscreenchange', onFS);
      document.removeEventListener('webkitfullscreenchange', onFS);
    };
  }, []);

  // Close settings when controls hide
  useEffect(() => {
    if (!showControls) setShowSettings(false);
  }, [showControls]);

  // ── keyboard shortcuts ───────────────────────────────────────────────────

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return;
      if (e.key === ' ' || e.key === 'k') { e.preventDefault(); togglePlay(false); }
      if (e.key === 'f') toggleFullscreen();
      if (e.key === 'm') toggleMute();
      if (e.key === 'ArrowLeft')  skipBy(-10);
      if (e.key === 'ArrowRight') skipBy(10);
      if (e.key === 'Escape') setShowSettings(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // ── controls ─────────────────────────────────────────────────────────────

  const togglePlay = useCallback((showFlash = false) => {
    if (!videoRef.current || isSyncing.current) return;
    const ct = videoRef.current.currentTime;
    if (videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
      triggerEvent(roomId, 'play', { currentTime: ct });
      if (showFlash) { setCenterFlash('play');  setTimeout(() => setCenterFlash(null), 500); }
    } else {
      videoRef.current.pause();
      triggerEvent(roomId, 'pause', { currentTime: ct });
      if (showFlash) { setCenterFlash('pause'); setTimeout(() => setCenterFlash(null), 500); }
    }
    resetControlsTimer();
  }, [roomId, resetControlsTimer]);

  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const video     = videoRef.current;
    const container = containerRef.current;
    if (!container || !video) return;
    const isInFS = document.fullscreenElement ||
      (document as Document & { webkitFullscreenElement?: Element }).webkitFullscreenElement;
    if (isInFS) {
      if (document.exitFullscreen) document.exitFullscreen();
      else (document as Document & { webkitExitFullscreen?: () => void }).webkitExitFullscreen?.();
    } else {
      if (container.requestFullscreen) container.requestFullscreen();
      else if ((container as HTMLElement & { webkitRequestFullscreen?: () => void }).webkitRequestFullscreen)
        (container as HTMLElement & { webkitRequestFullscreen?: () => void }).webkitRequestFullscreen!();
      else (video as HTMLVideoElement & { webkitEnterFullscreen?: () => void }).webkitEnterFullscreen?.();
    }
  }, []);

  const skipBy = useCallback((seconds: number) => {
    if (!videoRef.current) return;
    const newTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + seconds));
    videoRef.current.currentTime = newTime;
    triggerEvent(roomId, 'seek', { currentTime: newTime });
  }, [roomId, duration]);

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || !videoRef.current) return;
    const rect  = progressRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newTime = ratio * duration;
    videoRef.current.currentTime = newTime;
    triggerEvent(roomId, 'seek', { currentTime: newTime });
    setCurrentTime(newTime);
  }, [duration, roomId]);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    setVolume(v);
    if (videoRef.current) {
      videoRef.current.volume = v;
      videoRef.current.muted  = v === 0;
      setIsMuted(v === 0);
    }
  };

  const changeSpeed = (rate: number) => {
    if (videoRef.current) videoRef.current.playbackRate = rate;
    setPlaybackRate(rate);
    triggerEvent(roomId, 'speed', { rate });
    setShowSettings(false);
    setSettingsView('main');
  };

  const openSettings = () => {
    setSettingsView('main');
    setShowSettings((v) => !v);
  };

  const progressPct  = duration ? (currentTime / duration) * 100 : 0;
  const bufferedPct  = duration ? (buffered  / duration) * 100 : 0;
  const sizeCls      = SUBTITLE_SIZES.find((s) => s.value === subtitleSize)?.cls ?? 'text-lg';
  const currentSpeedLabel = SPEEDS.find((s) => s.value === playbackRate)?.label ?? 'Normal';

  // ── render ───────────────────────────────────────────────────────────────

  return (
    <div
      ref={containerRef}
      className={`relative bg-black select-none ${isFullscreen ? 'w-screen h-screen' : 'w-full h-full'} overflow-hidden`}
      onMouseMove={resetControlsTimer}
      onMouseLeave={() => { if (isPlaying) setShowControls(false); }}
    >
      {/* Video */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime ?? 0)}
        onDurationChange={() => setDuration(videoRef.current?.duration ?? 0)}
        onProgress={() => {
          const v = videoRef.current;
          if (v && v.buffered.length > 0) setBuffered(v.buffered.end(v.buffered.length - 1));
        }}
        onWaiting={() => setIsLoading(true)}
        onCanPlay={() => setIsLoading(false)}
        onLoadedMetadata={() => setIsLoading(false)}
        playsInline
        preload="metadata"
        x-webkit-airplay="allow"
      >
        {trackSrc && (
          <track key={trackSrc} kind="subtitles" src={trackSrc} srcLang="en" label="English" />
        )}
      </video>

      {/* Custom subtitle overlay */}
      {subtitlesOn && activeCueText && (
        <div
          className={`absolute left-0 right-0 flex justify-center px-6 pointer-events-none z-10 ${
            subtitlePosition === 'bottom' ? 'bottom-20' : 'top-16'
          }`}
        >
          <span
            className={`px-3 py-1.5 bg-black/80 rounded text-white text-center leading-snug ${sizeCls}`}
            style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)', whiteSpace: 'pre-line' }}
          >
            {activeCueText}
          </span>
        </div>
      )}

      {/* Loading spinner */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none">
          <div className="w-12 h-12 border-4 border-white/20 border-t-brand-red rounded-full animate-spin" />
        </div>
      )}

      {/* Sync flash */}
      {isSyncIndicator && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 bg-brand-red/90 rounded-full text-white text-xs font-semibold pointer-events-none animate-fade-in">
          <Wifi size={12} /> Synced with party
        </div>
      )}

      {/* Center tap area — always active, shows icon when paused or on flash */}
      <div
        className="absolute inset-0 flex items-center justify-center cursor-pointer"
        onClick={() => togglePlay(true)}
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {/* Static icon when paused */}
        {!isPlaying && !isLoading && !centerFlash && (
          <div className="w-20 h-20 rounded-full bg-black/60 flex items-center justify-center backdrop-blur-sm">
            <Play size={32} className="text-white fill-white ml-1" />
          </div>
        )}
        {/* Flash animation on tap */}
        {centerFlash && (
          <div className="w-20 h-20 rounded-full bg-black/70 flex items-center justify-center backdrop-blur-sm animate-ping-once">
            {centerFlash === 'play'
              ? <Play  size={32} className="text-white fill-white ml-1" />
              : <Pause size={32} className="text-white fill-white" />
            }
          </div>
        )}
      </div>

      {/* Controls overlay */}
      <div
        className={`player-overlay absolute inset-0 flex flex-col justify-between transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 pt-4">
          <p className="text-white font-semibold text-sm drop-shadow">{movieTitle}</p>
          {participants.length > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-sm text-xs text-white border border-white/15">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <Users size={12} />
              <span>{participants.length} watching</span>
            </div>
          )}
        </div>

        {/* Bottom controls */}
        <div className="px-4 pb-4 relative">

          {/* ── Settings panel ── */}
          {showSettings && (
            <div className="absolute bottom-full right-4 mb-3 w-56 bg-[#1a1a1a]/95 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden shadow-2xl z-20 animate-fade-in">

              {/* Main menu */}
              {settingsView === 'main' && (
                <div>
                  <div className="px-4 py-3 border-b border-white/8 text-xs font-semibold text-white/40 uppercase tracking-wider">
                    Settings
                  </div>
                  <button
                    onClick={() => setSettingsView('speed')}
                    className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-white/8 transition-colors cursor-pointer"
                  >
                    <span className="text-white text-sm font-medium">Play Speed</span>
                    <span className="text-white/50 text-xs">{currentSpeedLabel} ›</span>
                  </button>
                  {trackSrc && (
                    <button
                      onClick={() => setSettingsView('subtitle')}
                      className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-white/8 transition-colors cursor-pointer border-t border-white/5"
                    >
                      <span className="text-white text-sm font-medium">Subtitle</span>
                      <span className="text-white/50 text-xs">
                        {subtitlesOn ? subtitleSize.charAt(0).toUpperCase() + subtitleSize.slice(1) : 'Off'} ›
                      </span>
                    </button>
                  )}
                </div>
              )}

              {/* Speed sub-menu */}
              {settingsView === 'speed' && (
                <div>
                  <button
                    onClick={() => setSettingsView('main')}
                    className="w-full flex items-center gap-2 px-4 py-3.5 border-b border-white/8 hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <ChevronLeft size={16} className="text-white/60" />
                    <span className="text-white font-semibold text-sm">Play Speed</span>
                  </button>
                  {SPEEDS.map((s) => (
                    <button
                      key={s.value}
                      onClick={() => changeSpeed(s.value)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/8 transition-colors cursor-pointer"
                    >
                      <span className={`text-sm ${playbackRate === s.value ? 'text-green-400 font-semibold' : 'text-white'}`}>
                        {s.label}
                      </span>
                      {playbackRate === s.value && <Check size={14} className="text-green-400" />}
                    </button>
                  ))}
                </div>
              )}

              {/* Subtitle sub-menu */}
              {settingsView === 'subtitle' && (
                <div>
                  <button
                    onClick={() => setSettingsView('main')}
                    className="w-full flex items-center gap-2 px-4 py-3.5 border-b border-white/8 hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <ChevronLeft size={16} className="text-white/60" />
                    <span className="text-white font-semibold text-sm">Subtitle</span>
                  </button>

                  {/* On/Off toggle */}
                  <button
                    onClick={() => setSubtitlesOn((v) => !v)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/8 transition-colors cursor-pointer border-b border-white/5"
                  >
                    <span className="text-white/70 text-xs uppercase tracking-wider">Subtitles</span>
                    <span className={`text-xs font-semibold ${subtitlesOn ? 'text-green-400' : 'text-white/40'}`}>
                      {subtitlesOn ? 'On' : 'Off'}
                    </span>
                  </button>

                  {/* Size */}
                  <div className="px-4 pt-3 pb-1">
                    <p className="text-white/40 text-[10px] uppercase tracking-wider mb-2">Text Size</p>
                    <div className="flex gap-2">
                      {SUBTITLE_SIZES.map((s) => (
                        <button
                          key={s.value}
                          onClick={() => setSubtitleSize(s.value)}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                            subtitleSize === s.value
                              ? 'bg-brand-red border-brand-red text-white'
                              : 'border-white/10 text-white/50 hover:text-white hover:border-white/30'
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Position */}
                  <div className="px-4 pt-2 pb-3">
                    <p className="text-white/40 text-[10px] uppercase tracking-wider mb-2">Position</p>
                    <div className="flex gap-2">
                      {(['bottom', 'top'] as const).map((pos) => (
                        <button
                          key={pos}
                          onClick={() => setSubtitlePosition(pos)}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border capitalize ${
                            subtitlePosition === pos
                              ? 'bg-brand-red border-brand-red text-white'
                              : 'border-white/10 text-white/50 hover:text-white hover:border-white/30'
                          }`}
                        >
                          {pos}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

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
            <div className="absolute top-0 left-0 h-full bg-white/20 rounded-full" style={{ width: `${bufferedPct}%` }} />
            <div className="absolute top-0 left-0 h-full bg-brand-red rounded-full" style={{ width: `${progressPct}%` }} />
          </div>

          {/* Controls row */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button onClick={() => skipBy(-10)} className="p-2 text-white/80 hover:text-white transition-colors cursor-pointer" aria-label="Rewind 10s">
                <SkipBack size={20} strokeWidth={2} />
              </button>
              <button
                onClick={() => togglePlay(false)}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all active:scale-[0.92] cursor-pointer"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause size={22} className="fill-white" /> : <Play size={22} className="fill-white ml-0.5" />}
              </button>
              <button onClick={() => skipBy(10)} className="p-2 text-white/80 hover:text-white transition-colors cursor-pointer" aria-label="Forward 10s">
                <SkipForward size={20} strokeWidth={2} />
              </button>

              {/* Volume */}
              <div
                className="flex items-center gap-2"
                onMouseEnter={() => setShowVolumeSlider(true)}
                onMouseLeave={() => setShowVolumeSlider(false)}
              >
                <button onClick={toggleMute} className="p-2 text-white/80 hover:text-white transition-colors cursor-pointer" aria-label={isMuted ? 'Unmute' : 'Mute'}>
                  {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>
                <div className={`transition-all duration-200 overflow-hidden ${showVolumeSlider ? 'w-20 opacity-100' : 'w-0 opacity-0'}`}>
                  <input type="range" min={0} max={1} step={0.05} value={isMuted ? 0 : volume} onChange={handleVolumeChange} className="w-full" aria-label="Volume" />
                </div>
              </div>

              <span className="text-white/80 text-xs font-medium tabular-nums hidden sm:block">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            {/* Right controls */}
            <div className="flex items-center gap-1">
              {/* CC button — only when subtitles available */}
              {trackSrc && (
                <button
                  onClick={() => setSubtitlesOn((v) => !v)}
                  className={`px-2 py-1 rounded text-[11px] font-bold transition-all cursor-pointer border ${
                    subtitlesOn
                      ? 'bg-white text-black border-white'
                      : 'bg-transparent text-white/60 border-white/30 hover:text-white hover:border-white/60'
                  }`}
                  aria-label={subtitlesOn ? 'Turn off subtitles' : 'Turn on subtitles'}
                >
                  CC
                </button>
              )}

              {/* Speed badge (visible when not 1x) */}
              {playbackRate !== 1 && (
                <span className="hidden sm:block px-1.5 py-0.5 rounded bg-white/10 text-white/70 text-[11px] font-semibold">
                  {playbackRate}x
                </span>
              )}

              {/* Settings */}
              <button
                onClick={openSettings}
                className={`p-2 transition-colors cursor-pointer hidden sm:block ${showSettings ? 'text-white' : 'text-white/80 hover:text-white'}`}
                aria-label="Settings"
              >
                <Settings size={18} className={showSettings ? 'text-brand-red' : ''} />
              </button>

              {/* Fullscreen */}
              <button onClick={toggleFullscreen} className="p-2 text-white/80 hover:text-white transition-colors cursor-pointer" aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
                {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
