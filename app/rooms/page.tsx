'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Users, Radio, Film, Plus, X, ChevronDown, Check } from 'lucide-react';
import { getPusherClient } from '@/lib/pusherClient';
import { Movie } from '@/lib/types';
import JoinModal from '@/components/JoinModal';

interface RoomUser  { id: string; username: string; }
interface ActiveRoom {
  id: string;
  movieId: string;
  users: RoomUser[];
  currentTime: number;
  isPlaying: boolean;
  updatedAt: number;
}

const AVATAR_COLORS = [
  '#E11D48', '#7C3AED', '#2563EB', '#059669',
  '#D97706', '#0891B2', '#9333EA', '#DC2626',
];
function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
function formatTime(s: number) {
  if (!s || isNaN(s)) return '0:00';
  const m = Math.floor(s / 60), sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}

// ── Create Room Modal ────────────────────────────────────────────────────────
function CreateRoomModal({
  movies,
  onStart,
  onClose,
}: {
  movies: Movie[];
  onStart: (name: string, movieId: string) => void;
  onClose: () => void;
}) {
  const [name,        setName]        = useState('');
  const [movieId,     setMovieId]     = useState(movies[0]?.id ?? '');
  const [dropOpen,    setDropOpen]    = useState(false);
  const [error,       setError]       = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const dropRef  = useRef<HTMLDivElement>(null);

  const selectedMovie = movies.find((m) => m.id === movieId) ?? movies[0];

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dropOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed)        { setError('Please enter a display name'); return; }
    if (trimmed.length < 2) { setError('Name must be at least 2 characters'); return; }
    onStart(trimmed, movieId);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      {/* Scrim */}
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-md bg-[#141414] border border-white/10 rounded-2xl shadow-2xl animate-scale-in">
        <div className="p-6">

          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-brand-red/20 rounded-xl flex items-center justify-center">
                <Radio size={20} className="text-brand-red" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Create Watch Party</h2>
                <p className="text-xs text-white/40 mt-0.5">Start a new room for everyone</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all cursor-pointer" aria-label="Close">
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">

            {/* Movie picker */}
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">Movie</label>
              <div ref={dropRef} className="relative">
                <button
                  type="button"
                  onClick={() => setDropOpen((v) => !v)}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-white/5 border border-white/15 rounded-xl text-sm text-white hover:border-white/30 focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red transition-all cursor-pointer"
                >
                  {selectedMovie?.thumbnail && (
                    <img src={selectedMovie.thumbnail} alt="" className="w-8 h-10 object-cover rounded flex-shrink-0" />
                  )}
                  <span className="flex-1 text-left truncate">{selectedMovie?.title ?? 'Select a movie'}</span>
                  <ChevronDown size={16} className={`text-white/40 flex-shrink-0 transition-transform ${dropOpen ? 'rotate-180' : ''}`} />
                </button>

                {dropOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden shadow-2xl z-10 max-h-52 overflow-y-auto">
                    {movies.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => { setMovieId(m.id); setDropOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/8 transition-colors cursor-pointer"
                      >
                        {m.thumbnail && (
                          <img src={m.thumbnail} alt="" className="w-7 h-9 object-cover rounded flex-shrink-0" />
                        )}
                        <span className={`flex-1 text-left text-sm truncate ${m.id === movieId ? 'text-white font-semibold' : 'text-white/70'}`}>
                          {m.title}
                        </span>
                        {m.id === movieId && <Check size={14} className="text-brand-red flex-shrink-0" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Display name */}
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">Your display name</label>
              <input
                ref={inputRef}
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); setError(''); }}
                placeholder="e.g. MovieFan42"
                maxLength={20}
                className="w-full px-4 py-3 bg-white/5 border border-white/15 rounded-xl text-white placeholder-white/30 text-sm
                  focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red transition-all"
              />
              {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
            </div>

            {/* Info */}
            <div className="bg-white/5 rounded-xl p-3 text-xs text-white/50 flex items-start gap-2">
              <Users size={13} className="text-brand-red mt-0.5 flex-shrink-0" />
              <span>Your video will sync in real-time with everyone in the room. Play, pause, and seek together.</span>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-brand-red text-white font-bold rounded-xl hover:bg-rose-600 active:scale-[0.97] transition-all cursor-pointer text-sm"
            >
              Start the Party
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function RoomsPage() {
  const router = useRouter();
  const [rooms,       setRooms]       = useState<ActiveRoom[]>([]);
  const [movies,      setMovies]      = useState<Movie[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [joinTarget,  setJoinTarget]  = useState<ActiveRoom | null>(null);
  const [showCreate,  setShowCreate]  = useState(false);

  const fetchRooms = useCallback(async () => {
    try {
      const [roomsRes, moviesRes] = await Promise.all([
        fetch('/api/rooms'),
        fetch('/api/movies'),
      ]);
      setRooms(await roomsRes.json());
      setMovies(await moviesRes.json());
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRooms(); }, [fetchRooms]);

  // Real-time via Pusher global 'rooms' channel
  useEffect(() => {
    const pusher  = getPusherClient();
    const channel = pusher.subscribe('rooms');
    channel.bind('rooms-updated', ({ rooms: updated }: { rooms: ActiveRoom[] }) => {
      setRooms(updated);
    });
    return () => {
      channel.unbind('rooms-updated');
      pusher.unsubscribe('rooms');
    };
  }, []);

  const getMovie = (movieId: string) => movies.find((m) => m.id === movieId) ?? null;

  // Join existing room
  const handleJoin = (name: string) => {
    if (!joinTarget) return;
    const movieId = joinTarget.movieId || movies[0]?.id || '1';
    router.push(`/watch/${joinTarget.id}?movie=${movieId}&username=${encodeURIComponent(name)}`);
  };

  // Create new room
  const handleCreate = (name: string, movieId: string) => {
    const roomId = Math.random().toString(36).slice(2, 8);
    router.push(`/watch/${roomId}?movie=${movieId}&username=${encodeURIComponent(name)}`);
  };

  return (
    <div className="min-h-screen bg-black text-white">

      {/* Join modal */}
      {joinTarget && (
        <JoinModal
          movieTitle={getMovie(joinTarget.movieId)?.title ?? 'Watch Party'}
          onJoin={handleJoin}
          onClose={() => setJoinTarget(null)}
        />
      )}

      {/* Create modal */}
      {showCreate && movies.length > 0 && (
        <CreateRoomModal
          movies={movies}
          onStart={handleCreate}
          onClose={() => setShowCreate(false)}
        />
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 bg-black/95 backdrop-blur-md border-b border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/')}
              className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-lg font-bold text-white flex items-center gap-2">
                <Radio size={16} className="text-brand-red" />
                Live Rooms
              </h1>
              <p className="text-xs text-white/40">Join an active watch party</p>
            </div>
          </div>

          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-red text-white rounded-xl text-sm font-semibold hover:bg-rose-600 active:scale-95 transition-all cursor-pointer"
          >
            <Plus size={15} />
            <span className="hidden sm:block">Create Room</span>
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(3)].map((_, i) => <div key={i} className="h-64 rounded-2xl shimmer" />)}
          </div>
        ) : rooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 gap-5 text-center">
            <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center">
              <Film size={36} className="text-white/20" />
            </div>
            <div>
              <p className="text-white/60 font-semibold text-lg">No active rooms</p>
              <p className="text-white/30 text-sm mt-1">Be the first to start a watch party</p>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-6 py-3 bg-brand-red text-white rounded-xl font-semibold hover:bg-rose-600 active:scale-95 transition-all cursor-pointer"
            >
              <Plus size={16} /> Create a Room
            </button>
          </div>
        ) : (
          <>
            <p className="text-white/40 text-sm mb-6">
              {rooms.length} active {rooms.length === 1 ? 'room' : 'rooms'}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {rooms.map((room) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  movie={getMovie(room.movieId)}
                  onJoin={() => setJoinTarget(room)}
                />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

// ── Room Card ────────────────────────────────────────────────────────────────
function RoomCard({ room, movie, onJoin }: { room: ActiveRoom; movie: Movie | null; onJoin: () => void }) {
  const thumbnail = movie?.thumbnail ?? '';
  const title     = movie?.title     ?? 'Watch Party';

  return (
    <div className="group relative rounded-2xl overflow-hidden border border-white/[0.08] hover:border-white/20 transition-all duration-300 bg-[#0f0f0f]">

      {/* Thumbnail */}
      <div className="relative h-44 overflow-hidden">
        {thumbnail ? (
          <img src={thumbnail} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-white/5 to-white/[0.02] flex items-center justify-center">
            <Film size={40} className="text-white/15" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

        {/* LIVE badge */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 bg-brand-red rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          <span className="text-white text-[11px] font-bold tracking-wide">LIVE</span>
        </div>

        {/* Viewer count */}
        <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 bg-black/60 backdrop-blur-sm rounded-full border border-white/10">
          <Users size={11} className="text-white/70" />
          <span className="text-white text-[11px] font-semibold">{room.users.length}</span>
        </div>

        {/* Timestamp */}
        <div className="absolute bottom-3 right-3 text-[10px] text-white/40 font-mono">
          {formatTime(room.currentTime)}
        </div>
      </div>

      {/* Body */}
      <div className="p-4">
        <h3 className="text-white font-semibold text-sm truncate mb-3">{title}</h3>

        {/* Viewer avatars */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex -space-x-2">
            {room.users.slice(0, 5).map((u, i) => (
              <div
                key={u.id}
                title={u.username}
                className="w-8 h-8 rounded-full border-2 border-[#0f0f0f] flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                style={{ background: avatarColor(u.username), zIndex: 5 - i }}
              >
                {u.username.charAt(0).toUpperCase()}
              </div>
            ))}
            {room.users.length > 5 && (
              <div className="w-8 h-8 rounded-full border-2 border-[#0f0f0f] bg-white/10 flex items-center justify-center text-[10px] text-white/60 font-semibold" style={{ zIndex: 0 }}>
                +{room.users.length - 5}
              </div>
            )}
          </div>
          <p className="flex-1 text-white/40 text-xs truncate min-w-0">
            {room.users.slice(0, 3).map((u) => u.username).join(', ')}
            {room.users.length > 3 && ` +${room.users.length - 3} more`}
          </p>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-white/20 text-[10px] font-mono truncate">#{room.id}</span>
          <button
            onClick={onJoin}
            className="flex-shrink-0 px-4 py-1.5 bg-brand-red text-white rounded-lg text-xs font-bold hover:bg-rose-600 active:scale-95 transition-all cursor-pointer"
          >
            Join
          </button>
        </div>
      </div>
    </div>
  );
}
