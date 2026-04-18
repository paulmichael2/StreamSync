'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { Check, ArrowLeft, Link2, Film } from 'lucide-react';
import VideoPlayer from '@/components/VideoPlayer';
import ChatSidebar from '@/components/ChatSidebar';
import JoinModal from '@/components/JoinModal';
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
  const isPublic = searchParams.get('public') !== 'false'; // default public
  // If no username in URL, fall back to sessionStorage (set when creating/joining from lobby)
  const urlUsername = searchParams.get('username') ||
    (() => { try { return sessionStorage.getItem('heartsync_username') ?? ''; } catch { return ''; } })();

  const [movie, setMovie] = useState<Movie | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [initialTime, setInitialTime] = useState(0);
  const [initialPlaying, setInitialPlaying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [chatOpen, setChatOpen] = useState(true);
  // Show modal only if no username from URL or sessionStorage
  const [showJoinModal, setShowJoinModal] = useState(!urlUsername);
  const [username, setUsername] = useState(urlUsername ?? '');
  const [hasJoined, setHasJoined] = useState(!!urlUsername);
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

  // Connect to room — only after username is set
  useEffect(() => {
    if (!hasJoined || !username) return;

    const id = clientId.current;
    const pusher = getPusherClient();
    const channel = pusher.subscribe(`room-${roomId}`);

    // Get current playback state + existing participants so late joiners sync up
    fetch(`/api/pusher?roomId=${roomId}`)
      .then((r) => r.json())
      .then((state) => {
        if (state.currentTime > 0) {
          setInitialTime(state.currentTime);
          setInitialPlaying(state.isPlaying);
        }
        // Populate participants with whoever is already in the room (excluding self)
        if (Array.isArray(state.users) && state.users.length > 0) {
          setParticipants(
            state.users
              .filter((u: { id: string; username: string }) => u.id !== id)
              .filter((u: { id: string }, idx: number, arr: { id: string }[]) =>
                arr.findIndex((x) => x.id === u.id) === idx
              )
          );
        }
      })
      .catch(() => {});

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

    // Announce immediately so the session is written to Supabase before anything else
    triggerEvent(roomId, 'user-joined', { id, username, movieId, isPublic });

    // Add self to participants list on next tick (after initial room state is fetched)
    const announceTimer = setTimeout(() => {
      setParticipants((prev) => {
        if (prev.find((p) => p.id === id)) return prev;
        return [...prev, { id, username }];
      });
    }, 100);

    // Keepalive: refresh updated_at in Supabase every 4 minutes so sessions don't get cleaned up
    const keepaliveInterval = setInterval(() => {
      triggerEvent(roomId, 'keepalive', { id, username });
    }, 4 * 60 * 1000);

    // Use sendBeacon for leave so it fires even when the tab is closed
    const sendLeave = () => {
      const payload = JSON.stringify({ roomId, event: 'user-left', data: { id, username, isPublic } });
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/pusher', new Blob([payload], { type: 'application/json' }));
      } else {
        triggerEvent(roomId, 'user-left', { id, username, isPublic });
      }
    };

    // Fire leave when the tab/window is closed or refreshed
    window.addEventListener('beforeunload', sendLeave);

    return () => {
      clearTimeout(announceTimer);
      clearInterval(keepaliveInterval);
      window.removeEventListener('beforeunload', sendLeave);
      channel.unbind('user-joined', handleUserJoined);
      channel.unbind('user-left', handleUserLeft);
      sendLeave();
      pusher.unsubscribe(`room-${roomId}`);
      setParticipants([]);
    };
  }, [roomId, username, hasJoined]);

  // Called when user submits name in the join modal
  const handleJoin = (name: string) => {
    setUsername(name);
    setHasJoined(true);
    setShowJoinModal(false);
    try { sessionStorage.setItem('heartsync_username', name); } catch { /* ignore */ }
    // Update URL with their chosen username (without triggering a navigation)
    const url = new URL(window.location.href);
    url.searchParams.set('username', name);
    window.history.replaceState({}, '', url.toString());
  };

  // Copy invite link WITHOUT the username so the recipient picks their own name
  const copyLink = async () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('username');
    await navigator.clipboard.writeText(url.toString());
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
    <>
      {/* Join modal for invite guests */}
      {showJoinModal && (
        <JoinModal
          movieTitle={movie?.title ?? ''}
          onJoin={handleJoin}
          onClose={() => {
            // If they close without joining, go back home
            router.push('/');
          }}
        />
      )}

      <div className={`h-screen bg-black flex flex-col overflow-hidden ${showJoinModal ? 'pointer-events-none select-none blur-sm' : ''}`}>
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
                  style={{ background: ['#E11D48', '#7C3AED', '#2563EB', '#059669'][i % 4], zIndex: 4 - i }}
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

            {/* Invite button */}
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
          <div className="flex-1 flex items-stretch bg-black min-w-0">
            <VideoPlayer
              videoUrl={movie.videoUrl}
              movieTitle={movie.title}
              roomId={roomId}
              userId={clientId.current}
              participants={participants}
              initialTime={initialTime}
              initialPlaying={initialPlaying}
              subtitleUrl={movie.subtitleUrl}
            />
          </div>

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
    </>
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
