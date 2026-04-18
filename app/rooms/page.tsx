'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Users, Radio, Film, Plus, X, ChevronDown, Check, Clock } from 'lucide-react';
import { getPusherClient } from '@/lib/pusherClient';
import { Movie } from '@/lib/types';
import { GRACE_MS } from '@/lib/roomConfig';
import JoinModal from '@/components/JoinModal';

interface RoomUser  { id: string; username: string; }
interface ActiveRoom {
  id: string;
  movieId: string;
  users: RoomUser[];
  currentTime: number;
  isPlaying: boolean;
  updatedAt: number;
  closingAt: number | null; // null = active, timestamp = grace period end
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
function formatCountdown(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}:${String(sec).padStart(2, '0')}` : `${sec}s`;
}

// ── Create Room Modal ────────────────────────────────────────────────────────
function CreateRoomModal({ movies, onStart, onClose }: {
  movies: Movie[];
  onStart: (name: string, movieId: string) => void;
  onClose: () => void;
}) {
  const [name,     setName]     = useState('');
  const [movieId,  setMovieId]  = useState(movies[0]?.id ?? '');
  const [dropOpen, setDropOpen] = useState(false);
  const [error,    setError]    = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const dropRef  = useRef<HTMLDivElement>(null);
  const selectedMovie = movies.find((m) => m.id === movieId) ?? movies[0];

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    if (!dropOpen) return;
    const h = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [dropOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = name.trim();
    if (!t)       { setError('Please enter a display name'); return; }
    if (t.length < 2) { setError('Name must be at least 2 characters'); return; }
    onStart(t, movieId);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 w-full max-w-md bg-[#141414] border border-white/10 rounded-2xl shadow-2xl animate-scale-in">
        <div className="p-6">
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
            <button onClick={onClose} className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all cursor-pointer"><X size={18} /></button>
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
                  {selectedMovie?.thumbnail && <img src={selectedMovie.thumbnail} alt="" className="w-8 h-10 object-cover rounded flex-shrink-0" />}
                  <span className="flex-1 text-left truncate">{selectedMovie?.title ?? 'Select a movie'}</span>
                  <ChevronDown size={16} className={`text-white/40 flex-shrink-0 transition-transform ${dropOpen ? 'rotate-180' : ''}`} />
                </button>
                {dropOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden shadow-2xl z-10 max-h-52 overflow-y-auto">
                    {movies.map((m) => (
                      <button key={m.id} type="button" onClick={() => { setMovieId(m.id); setDropOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/8 transition-colors cursor-pointer">
                        {m.thumbnail && <img src={m.thumbnail} alt="" className="w-7 h-9 object-cover rounded flex-shrink-0" />}
                        <span className={`flex-1 text-left text-sm truncate ${m.id === movieId ? 'text-white font-semibold' : 'text-white/70'}`}>{m.title}</span>
                        {m.id === movieId && <Check size={14} className="text-brand-red flex-shrink-0" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">Your display name</label>
              <input ref={inputRef} type="text" value={name} onChange={(e) => { setName(e.target.value); setError(''); }}
                placeholder="e.g. MovieFan42" maxLength={20}
                className="w-full px-4 py-3 bg-white/5 border border-white/15 rounded-xl text-white placeholder-white/30 text-sm focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red transition-all" />
              {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
            </div>

            <div className="bg-white/5 rounded-xl p-3 text-xs text-white/50 flex items-start gap-2">
              <Users size={13} className="text-brand-red mt-0.5 flex-shrink-0" />
              <span>Your video will sync in real-time with everyone in the room. Play, pause, and seek together.</span>
            </div>

            <button type="submit" className="w-full py-3.5 bg-brand-red text-white font-bold rounded-xl hover:bg-rose-600 active:scale-[0.97] transition-all cursor-pointer text-sm">
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
  const [rooms,      setRooms]      = useState<ActiveRoom[]>([]);
  const [movies,     setMovies]     = useState<Movie[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [joinTarget, setJoinTarget] = useState<ActiveRoom | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [now,        setNow]        = useState(Date.now());
  const subscribedRoomsRef = useRef<Set<string>>(new Set());

  // Tick every second for countdowns
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const fetchRooms = useCallback(async () => {
    try {
      const [roomsRes, moviesRes] = await Promise.all([
        fetch('/api/rooms', { cache: 'no-store' }),
        fetch('/api/movies'),
      ]);
      const roomsData = await roomsRes.json();
      setRooms(Array.isArray(roomsData) ? roomsData : []);
      setMovies(await moviesRes.json());
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRooms(); }, [fetchRooms]);

  // Polling fallback — re-fetch every 15 s in case a Pusher event is missed
  useEffect(() => {
    const t = setInterval(() => fetchRooms(), 5_000);
    return () => clearInterval(t);
  }, [fetchRooms]);

  // Global channel — sync rooms not yet in our local list
  useEffect(() => {
    const pusher = getPusherClient();
    const ch = pusher.subscribe('rooms');
    ch.bind('rooms-updated', (payload: unknown) => {
      const p = payload as {
        action?: string; roomId?: string; movieId?: string;
        user?: RoomUser; userId?: string; closingAt?: number | null;
      } | null;

      if (p?.action === 'user-joined' && p.roomId && p.user) {
        setRooms((prev) => {
          if (prev.find((r) => r.id === p.roomId)) return prev; // already known; room channel handles updates
          return [...prev, {
            id: p.roomId!, movieId: p.movieId ?? '',
            users: [p.user!], currentTime: 0, isPlaying: false,
            updatedAt: Date.now(), closingAt: null,
          }];
        });
      } else if (p?.action === 'user-left' && p.roomId) {
        setRooms((prev) => {
          const existing = prev.find((r) => r.id === p.roomId);
          if (existing) {
            // Room already in list — room channel handles user removal; just sync closingAt
            const users = existing.users.filter((u) => u.id !== p.userId);
            return prev.map((r) => r.id !== p.roomId ? r : { ...r, users, closingAt: p.closingAt ?? null });
          }
          // Room not in list but now closing — show it so user can see / rejoin
          if (p.closingAt) {
            return [...prev, {
              id: p.roomId!, movieId: p.movieId ?? '',
              users: [], currentTime: 0, isPlaying: false,
              updatedAt: Date.now(), closingAt: p.closingAt,
            }];
          }
          return prev;
        });
      }
    });
    return () => { ch.unbind_all(); pusher.unsubscribe('rooms'); };
  }, []);

  // Room-level channels — same real-time mechanism the watch page uses
  useEffect(() => {
    const pusher = getPusherClient();
    rooms.forEach((room) => {
      if (subscribedRoomsRef.current.has(room.id)) return;
      subscribedRoomsRef.current.add(room.id);
      const ch = pusher.subscribe(`room-${room.id}`);
      ch.bind('user-joined', (d: { id: string; username: string }) => {
        setRooms((prev) => prev.map((r) => r.id !== room.id ? r : {
          ...r,
          users: r.users.find((u) => u.id === d.id) ? r.users : [...r.users, { id: d.id, username: d.username }],
          closingAt: null,
        }));
      });
      ch.bind('user-left', (d: { id: string }) => {
        setRooms((prev) => prev.map((r) => {
          if (r.id !== room.id) return r;
          const users = r.users.filter((u) => u.id !== d.id);
          return { ...r, users, closingAt: users.length === 0 ? Date.now() + GRACE_MS : r.closingAt };
        }));
      });
    });
  }, [rooms]);

  // Unmount: clean up all room-level subscriptions
  useEffect(() => {
    const pusher = getPusherClient();
    return () => {
      subscribedRoomsRef.current.forEach((id) => pusher.unsubscribe(`room-${id}`));
      subscribedRoomsRef.current.clear();
    };
  }, []);

  // Remove expired ghost rooms client-side so they vanish without a server round-trip
  useEffect(() => {
    const expired = rooms.filter((r) => r.closingAt !== null && now >= r.closingAt);
    if (expired.length > 0) {
      setRooms((prev) => prev.filter((r) => r.closingAt === null || now < r.closingAt));
    }
  }, [now, rooms]);

  const getMovie = (movieId: string) => movies.find((m) => m.id === movieId) ?? null;

  const handleJoin = (name: string) => {
    if (!joinTarget) return;
    const movieId = joinTarget.movieId || movies[0]?.id || '1';
    router.push(`/watch/${joinTarget.id}?movie=${movieId}&username=${encodeURIComponent(name)}`);
  };

  const handleCreate = (name: string, movieId: string) => {
    const roomId = Math.random().toString(36).slice(2, 8);
    router.push(`/watch/${roomId}?movie=${movieId}&username=${encodeURIComponent(name)}`);
  };

  const activeRooms  = rooms.filter((r) => r.users.length > 0);
  const closingRooms = rooms.filter((r) => r.users.length === 0 && r.closingAt !== null);

  return (
    <div className="min-h-screen bg-black text-white">
      {joinTarget && (
        <JoinModal
          movieTitle={getMovie(joinTarget.movieId)?.title ?? 'Watch Party'}
          onJoin={handleJoin}
          onClose={() => setJoinTarget(null)}
        />
      )}
      {showCreate && movies.length > 0 && (
        <CreateRoomModal movies={movies} onStart={handleCreate} onClose={() => setShowCreate(false)} />
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 bg-black/95 backdrop-blur-md border-b border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/')} className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-all cursor-pointer">
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-lg font-bold text-white flex items-center gap-2">
                <Radio size={16} className="text-brand-red" />
                Live Rooms
              </h1>
              <p className="text-xs text-white/40">
                {loading ? 'Loading…' : `${activeRooms.length} active${closingRooms.length > 0 ? ` · ${closingRooms.length} closing` : ''}`}
              </p>
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
            <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-6 py-3 bg-brand-red text-white rounded-xl font-semibold hover:bg-rose-600 active:scale-95 transition-all cursor-pointer">
              <Plus size={16} /> Create a Room
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Active rooms */}
            {activeRooms.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <h2 className="text-sm font-semibold text-white/70">Watching Now</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {activeRooms.map((room) => (
                    <RoomCard key={room.id} room={room} movie={getMovie(room.movieId)} onJoin={() => setJoinTarget(room)} now={now} />
                  ))}
                </div>
              </div>
            )}

            {/* Closing rooms */}
            {closingRooms.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Clock size={13} className="text-white/30" />
                  <h2 className="text-sm font-semibold text-white/30">Closing Soon</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {closingRooms.map((room) => (
                    <RoomCard key={room.id} room={room} movie={getMovie(room.movieId)} onJoin={() => setJoinTarget(room)} now={now} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

// ── Room Card ────────────────────────────────────────────────────────────────
function RoomCard({ room, movie, onJoin, now }: {
  room: ActiveRoom; movie: Movie | null; onJoin: () => void; now: number;
}) {
  const thumbnail = movie?.thumbnail ?? '';
  const title     = movie?.title ?? 'Watch Party';
  const isClosing = room.users.length === 0 && room.closingAt !== null;
  const remaining = room.closingAt ? room.closingAt - now : 0;

  return (
    <div className={`group relative rounded-2xl overflow-hidden border transition-all duration-300 bg-[#0f0f0f] ${
      isClosing ? 'border-white/5 opacity-60' : 'border-white/[0.08] hover:border-white/20'
    }`}>
      {/* Thumbnail */}
      <div className="relative h-44 overflow-hidden">
        {thumbnail ? (
          <img src={thumbnail} alt={title} className={`w-full h-full object-cover transition-transform duration-500 ${isClosing ? '' : 'group-hover:scale-105'}`} />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-white/5 to-white/[0.02] flex items-center justify-center">
            <Film size={40} className="text-white/15" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

        {/* Status badge */}
        {isClosing ? (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 bg-black/70 border border-white/10 rounded-full">
            <Clock size={10} className="text-white/50" />
            <span className="text-white/50 text-[11px] font-semibold">{formatCountdown(remaining)}</span>
          </div>
        ) : (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 bg-brand-red rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            <span className="text-white text-[11px] font-bold tracking-wide">LIVE</span>
          </div>
        )}

        {/* Viewer count */}
        <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 bg-black/60 backdrop-blur-sm rounded-full border border-white/10">
          <Users size={11} className="text-white/70" />
          <span className="text-white text-[11px] font-semibold">{room.users.length}</span>
        </div>

        {room.currentTime > 0 && (
          <div className="absolute bottom-3 right-3 text-[10px] text-white/40 font-mono">
            {formatTime(room.currentTime)}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-4">
        <h3 className="text-white font-semibold text-sm truncate mb-3">{title}</h3>

        {/* Viewer avatars */}
        <div className="flex items-center gap-2 mb-4 min-h-[2rem]">
          {room.users.length > 0 ? (
            <>
              <div className="flex -space-x-2">
                {room.users.slice(0, 5).map((u, i) => (
                  <div key={u.id} title={u.username}
                    className="w-8 h-8 rounded-full border-2 border-[#0f0f0f] flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                    style={{ background: avatarColor(u.username), zIndex: 5 - i }}>
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
            </>
          ) : (
            <p className="text-white/25 text-xs">Room closing soon…</p>
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-white/20 text-[10px] font-mono truncate">#{room.id}</span>
          {!isClosing && (
            <button onClick={onJoin}
              className="flex-shrink-0 px-4 py-1.5 bg-brand-red text-white rounded-lg text-xs font-bold hover:bg-rose-600 active:scale-95 transition-all cursor-pointer">
              Join
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
