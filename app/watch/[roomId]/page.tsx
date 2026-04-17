'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { Check, ArrowLeft, Link2, Film } from 'lucide-react';
import VideoPlayer from '@/components/VideoPlayer';
import ChatSidebar from '@/components/ChatSidebar';
import { Movie, Participant } from '@/lib/types';
import { getPusherClient } from '@/lib/pusherClient';

async function triggerEvent(roomId: string, event: string, data: Record<string, unknown>) {
  await fetch('/api/pusher', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roomId, event, data }),
  });
}

function WatchPartyContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const roomId = params.roomId as string;
  const movieId = searchParams.get('movie') ?? '1';
  const username = searchParams.get('username') ?? 'Guest';

  const [movie, setMovie] = useState<Movie | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [initialTime, setInitialTime] = useState(0);
  const [initialPlaying, setInitialPlaying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [chatOpen, setChatOpen] = useState(true);
  const clientId = useRef(crypto.randomUUID());

  // Fetch movie
  useEffect(() => {
    fetch('/api/movies')
      .then((r) => r.json())
      .then((movies: Movie[]) => {
        const found = movies.find((m) => m.id === movieId) ?? movies[0];
        setMovie(found);
      })
      .catch(console.error);
  }, [movieId]);

  // Connect to room via Pusher + get initial sync state
  useEffect(() => {
    const id = clientId.current;
    const pusher = getPusherClient();
    const channel = pusher.subscribe(`room-${roomId}`);

    // Get current playback state from server so late joiners sync up
    fetch(`/api/pusher?roomId=${roomId}`)
      .then((r) => r.json())
      .then((state) => {
        if (state.currentTime > 0) {
          setInitialTime(state.currentTime);
          setInitialPlaying(state.isPlaying);
        }
      })
      .catch(() => {});

    // Track participants via join/leave events
    const handleUserJoined = ({ id: uid, username: u }: { id: string; username: string }) => {
      setParticipants((prev) => {
        if (prev.find((p) => p.id === uid)) return prev;
        return [...prev, { id: uid, username: u }];
      });
    };

    const handleUserLeft = ({ id: uid }: { id: string }) => {
      setParticipants((prev) => prev.filter((p) => p.id !== uid));
    };

    channel.bind('user-joined', handleUserJoined);
    channel.bind('user-left', handleUserLeft);

    // Announce our presence (small delay to ensure channel is subscribed)
    const announceTimer = setTimeout(() => {
      triggerEvent(roomId, 'user-joined', { id, username });
      // Add ourselves to the local list immediately
      setParticipants((prev) => {
        if (prev.find((p) => p.id === id)) return prev;
        return [...prev, { id, username }];
      });
    }, 300);

    return () => {
      clearTimeout(announceTimer);
      channel.unbind('user-joined', handleUserJoined);
      channel.unbind('user-left', handleUserLeft);
      triggerEvent(roomId, 'user-left', { id, username });
      setParticipants([]);
    };
  }, [roomId, username]);

  const copyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!movie) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-white/20 border-t-brand-red rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-black flex flex-col overflow-hidden">
      {/* Top bar */}
      <header className="flex-shrink-0 flex items-center justify-between px-4 py-3 bg-[#0a0a0a] border-b border-white/[0.08]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/')}
            className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
            aria-label="Back"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="h-5 w-px bg-white/10" />
          <div className="flex items-center gap-2">
            <Film size={15} className="text-brand-red" />
            <span className="text-white font-semibold text-sm truncate max-w-[200px] sm:max-w-xs">
              {movie.title}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Avatars */}
          <div className="hidden sm:flex items-center -space-x-2">
            {participants.slice(0, 4).map((p, i) => (
              <div
                key={p.id}
                title={p.username}
                className="w-7 h-7 rounded-full border-2 border-black flex items-center justify-center text-[10px] font-bold text-white"
                style={{ background: ['#E11D48','#7C3AED','#2563EB','#059669'][i % 4], zIndex: 4 - i }}
              >
                {p.username.charAt(0).toUpperCase()}
              </div>
            ))}
            {participants.length > 4 && (
              <div className="w-7 h-7 rounded-full border-2 border-black bg-white/10 flex items-center justify-center text-[9px] text-white/70">
                +{participants.length - 4}
              </div>
            )}
          </div>

          <button
            onClick={copyLink}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-red/15 text-brand-red hover:bg-brand-red/25 transition-all text-xs font-semibold cursor-pointer"
          >
            {copied ? <Check size={13} /> : <Link2 size={13} />}
            <span className="hidden sm:block">{copied ? 'Copied!' : 'Invite'}</span>
          </button>

          <button
            onClick={() => setChatOpen((v) => !v)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${chatOpen ? 'bg-white/10 text-white' : 'bg-white/5 text-white/50 hover:text-white'}`}
          >
            {chatOpen ? 'Hide Chat' : 'Show Chat'}
          </button>
        </div>
      </header>

      {/* Main layout */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Video */}
        <div className="flex-1 flex items-stretch bg-black min-w-0">
          <VideoPlayer
            videoUrl={movie.videoUrl}
            movieTitle={movie.title}
            roomId={roomId}
            participants={participants}
            initialTime={initialTime}
            initialPlaying={initialPlaying}
          />
        </div>

        {/* Chat — desktop */}
        {chatOpen && (
          <div className="flex-shrink-0 w-72 xl:w-80 h-full hidden sm:flex flex-col">
            <ChatSidebar
              roomId={roomId}
              username={username}
              participants={participants}
            />
          </div>
        )}
      </div>

      {/* Chat — mobile */}
      <div className="sm:hidden flex-shrink-0 h-64 border-t border-white/[0.08]">
        <ChatSidebar
          roomId={roomId}
          username={username}
          participants={participants}
        />
      </div>
    </div>
  );
}

export default function WatchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-white/20 border-t-brand-red rounded-full animate-spin" />
        </div>
      }
    >
      <WatchPartyContent />
    </Suspense>
  );
}
