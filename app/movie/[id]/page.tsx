'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Play, Users, ArrowLeft, Star, Clock, Calendar, Film,
} from 'lucide-react';
import { Movie } from '@/lib/types';
import JoinModal from '@/components/JoinModal';
import Navbar from '@/components/Navbar';

export default function MoviePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [movie, setMovie]         = useState<Movie | null>(null);
  const [loading, setLoading]     = useState(true);
  const [notFound, setNotFound]   = useState(false);
  const [showJoin, setShowJoin]   = useState(false);
  const [mode, setMode]           = useState<'solo' | 'party'>('solo');
  const [imgLoaded, setImgLoaded] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/movies/${id}`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setMovie)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  const handlePlay = () => {
    if (!movie) return;
    const roomId = crypto.randomUUID();
    router.push(`/watch/${roomId}?movie=${movie.id}&username=Guest`);
  };

  const handleParty = () => {
    setMode('party');
    setShowJoin(true);
  };

  const handleJoin = (username: string) => {
    if (!movie) return;
    const roomId = crypto.randomUUID();
    router.push(`/watch/${roomId}?movie=${movie.id}&username=${encodeURIComponent(username)}`);
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-white/20 border-t-brand-red rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !movie) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
        <Film size={48} className="text-white/20" />
        <p className="text-white/50">Movie not found.</p>
        <button onClick={() => router.push('/')} className="px-4 py-2 bg-white/10 rounded-lg text-white text-sm hover:bg-white/20 transition-colors cursor-pointer">
          Go Home
        </button>
      </div>
    );
  }

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-black text-white">
        {/* Hero backdrop */}
        <div className="relative w-full h-[60vh] sm:h-[70vh] overflow-hidden">
          {!imgLoaded && <div className="absolute inset-0 shimmer" />}
          <img
            src={movie.backdrop || movie.thumbnail}
            alt={movie.title}
            className={`w-full h-full object-cover transition-opacity duration-500 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setImgLoaded(true)}
          />
          {/* Gradients */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/20" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent" />

          {/* Back button */}
          <button
            onClick={() => router.back()}
            className="absolute top-20 left-4 sm:left-8 z-10 flex items-center gap-2 px-3 py-2 bg-black/50 hover:bg-black/70 rounded-lg text-white/80 hover:text-white text-sm transition-all cursor-pointer backdrop-blur-sm"
          >
            <ArrowLeft size={16} /> Back
          </button>
        </div>

        {/* Content */}
        <div className="max-w-5xl mx-auto px-4 sm:px-8 -mt-48 relative z-10 pb-20">
          <div className="flex flex-col lg:flex-row gap-8">

            {/* Poster */}
            <div className="hidden lg:block w-52 flex-shrink-0">
              <div className="aspect-[2/3] rounded-xl overflow-hidden shadow-2xl border border-white/10">
                <img
                  src={movie.thumbnail}
                  alt={movie.title}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              {/* Genres */}
              <div className="flex flex-wrap gap-2 mb-3">
                {movie.genres?.map((g) => (
                  <span key={g} className="px-2.5 py-1 rounded-full text-xs font-semibold bg-brand-red/20 text-brand-red border border-brand-red/30">
                    {g}
                  </span>
                ))}
              </div>

              {/* Title */}
              <h1 className="text-4xl sm:text-5xl font-black leading-tight text-white mb-4">
                {movie.title}
              </h1>

              {/* Meta row */}
              <div className="flex flex-wrap items-center gap-4 mb-6 text-sm">
                <div className="flex items-center gap-1.5 text-yellow-400 font-bold">
                  <Star size={16} className="fill-yellow-400" />
                  {movie.rating.toFixed(1)}
                  <span className="text-white/30 font-normal">/10</span>
                </div>
                <div className="flex items-center gap-1.5 text-white/60">
                  <Calendar size={14} />
                  {movie.year}
                </div>
                {movie.duration && (
                  <div className="flex items-center gap-1.5 text-white/60">
                    <Clock size={14} />
                    {movie.duration}
                  </div>
                )}
              </div>

              {/* Description */}
              <p className="text-white/75 text-base leading-relaxed mb-8 max-w-2xl">
                {movie.description}
              </p>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handlePlay}
                  className="flex items-center gap-2 px-8 py-4 bg-white text-black rounded-xl font-bold text-base hover:bg-white/90 active:scale-[0.97] transition-all cursor-pointer shadow-lg"
                >
                  <Play size={20} className="fill-black" />
                  Play Now
                </button>
                <button
                  onClick={handleParty}
                  className="flex items-center gap-2 px-8 py-4 bg-brand-red text-white rounded-xl font-bold text-base hover:bg-rose-600 active:scale-[0.97] transition-all cursor-pointer shadow-lg"
                >
                  <Users size={18} />
                  Watch Party
                </button>
              </div>

              {/* Watch party note */}
              <p className="mt-3 text-white/30 text-xs">
                Watch Party lets you invite friends to watch in sync
              </p>
            </div>
          </div>
        </div>
      </main>

      {showJoin && (
        <JoinModal
          movieTitle={movie.title}
          onJoin={handleJoin}
          onClose={() => setShowJoin(false)}
        />
      )}
    </>
  );
}
