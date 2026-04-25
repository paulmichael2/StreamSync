'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Play, Users, Star, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { Movie } from '@/lib/types';
import JoinModal from './JoinModal';

interface HeroSectionProps {
  movies: Movie[];
}

const INTERVAL = 7000; // 7 seconds per slide

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function HeroSection({ movies }: HeroSectionProps) {
  const router = useRouter();
  const [shuffled, setShuffled] = useState<Movie[]>([]);
  const [current, setCurrent] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);
  const [fading, setFading] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [pendingRoomId, setPendingRoomId] = useState('');
  const [pendingMovieId, setPendingMovieId] = useState('');
  const pausedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  // Shuffle once on mount
  useEffect(() => {
    setShuffled(shuffle(movies));
  }, [movies]);

  const goTo = useCallback((next: number) => {
    setCurrent((cur) => {
      setPrev(cur);
      setFading(true);
      setTimeout(() => { setPrev(null); setFading(false); }, 700);
      return next;
    });
  }, []);

  const advance = useCallback(() => {
    if (pausedRef.current) return;
    setCurrent((cur) => {
      const next = (cur + 1) % shuffled.length;
      setPrev(cur);
      setFading(true);
      setTimeout(() => { setPrev(null); setFading(false); }, 700);
      return next;
    });
  }, [shuffled.length]);

  // Auto-advance
  useEffect(() => {
    if (shuffled.length <= 1) return;
    timerRef.current = setInterval(advance, INTERVAL);
    return () => clearInterval(timerRef.current);
  }, [shuffled.length, advance]);

  const handlePrev = () => {
    clearInterval(timerRef.current);
    goTo((current - 1 + shuffled.length) % shuffled.length);
    timerRef.current = setInterval(advance, INTERVAL);
  };

  const handleNext = () => {
    clearInterval(timerRef.current);
    goTo((current + 1) % shuffled.length);
    timerRef.current = setInterval(advance, INTERVAL);
  };

  const handleDot = (i: number) => {
    clearInterval(timerRef.current);
    goTo(i);
    timerRef.current = setInterval(advance, INTERVAL);
  };

  const handleWatchNow = (movie: Movie) => {
    const roomId = crypto.randomUUID();
    setPendingRoomId(roomId);
    setPendingMovieId(movie.id);
    setShowJoinModal(true);
  };

  const handleJoin = (username: string) => {
    router.push(`/watch/${pendingRoomId}?movie=${pendingMovieId}&username=${encodeURIComponent(username)}`);
  };

  if (shuffled.length === 0) return null;

  const movie = shuffled[current];
  const prevMovie = prev !== null ? shuffled[prev] : null;

  return (
    <>
      <section
        className="relative w-full min-h-[85vh] flex items-end overflow-hidden"
        onMouseEnter={() => { pausedRef.current = true; }}
        onMouseLeave={() => { pausedRef.current = false; }}
      >
        {/* Previous slide (fading out) */}
        {prevMovie && (
          <div className={`absolute inset-0 transition-opacity duration-700 ${fading ? 'opacity-0' : 'opacity-100'}`}>
            <img
              src={prevMovie.backdrop}
              alt={prevMovie.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
          </div>
        )}

        {/* Current slide (fading in) */}
        <div className={`absolute inset-0 transition-opacity duration-700 ${fading ? 'opacity-100' : 'opacity-100'}`}>
          <img
            src={movie.backdrop}
            alt={movie.title}
            className="w-full h-full object-cover"
            fetchPriority="high"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black to-transparent" />
        </div>

        {/* Prev / Next arrows */}
        {shuffled.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/40 text-white/70 hover:bg-black/70 hover:text-white transition-all cursor-pointer backdrop-blur-sm"
              aria-label="Previous"
            >
              <ChevronLeft size={24} />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/40 text-white/70 hover:bg-black/70 hover:text-white transition-all cursor-pointer backdrop-blur-sm"
              aria-label="Next"
            >
              <ChevronRight size={24} />
            </button>
          </>
        )}

        {/* Content */}
        <div className="relative z-10 max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 pb-16 pt-32 w-full">
          <div className="max-w-2xl" key={current}>
            {/* Featured Badge */}
            <div className="flex items-center gap-2 mb-4">
              <div className="h-0.5 w-8 bg-brand-red" />
              <span className="text-brand-red text-xs font-semibold uppercase tracking-widest">Featured</span>
            </div>

            {/* Title */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black leading-none tracking-tight text-white mb-4 animate-slide-up">
              {movie.title}
            </h1>

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-4 mb-5 text-sm animate-slide-up">
              <div className="flex items-center gap-1 text-yellow-400 font-semibold">
                <Star size={14} className="fill-yellow-400" />
                <span>{movie.rating.toFixed(1)}</span>
              </div>
              <span className="text-white/60">{movie.year}</span>
              <div className="flex items-center gap-1 text-white/60">
                <Clock size={13} />
                <span>{movie.duration}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {movie.genres?.slice(0, 3).map((g) => (
                  <span key={g} className="px-2 py-0.5 rounded text-xs font-medium bg-white/10 text-white/80">{g}</span>
                ))}
              </div>
            </div>

            {/* Description */}
            <p className="text-white/80 text-base leading-relaxed mb-8 max-w-lg line-clamp-3 animate-slide-up">
              {movie.description}
            </p>

            {/* Actions */}
            <div className="flex flex-wrap gap-3 animate-slide-up">
              <button
                onClick={() => { const r = crypto.randomUUID(); router.push(`/watch/${r}?movie=${movie.id}&username=Guest`); }}
                className="flex items-center gap-2 px-7 py-3.5 bg-white text-black rounded-md font-bold text-base hover:bg-white/90 active:scale-[0.97] transition-all duration-150 cursor-pointer"
              >
                <Play size={20} className="fill-black" />
                Play Now
              </button>
              <button
                onClick={() => handleWatchNow(movie)}
                className="flex items-center gap-2 px-7 py-3.5 bg-brand-red text-white rounded-md font-bold text-base hover:bg-rose-600 active:scale-[0.97] transition-all duration-150 cursor-pointer"
              >
                <Users size={18} />
                Watch Party
              </button>
            </div>
          </div>

          {/* Dot indicators */}
          {shuffled.length > 1 && (
            <div className="flex items-center gap-2 mt-8">
              {shuffled.map((_, i) => (
                <button
                  key={i}
                  onClick={() => handleDot(i)}
                  className={`transition-all duration-300 rounded-full cursor-pointer ${
                    i === current
                      ? 'w-6 h-1.5 bg-white'
                      : 'w-1.5 h-1.5 bg-white/30 hover:bg-white/60'
                  }`}
                  aria-label={`Go to slide ${i + 1}`}
                />
              ))}

              {/* Progress bar */}
              <div className="ml-4 flex-1 max-w-[120px] h-0.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  key={current}
                  className="h-full bg-brand-red rounded-full"
                  style={{ animation: `progress ${INTERVAL}ms linear` }}
                />
              </div>
            </div>
          )}
        </div>
      </section>

      <style jsx>{`
        @keyframes progress {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>

      {showJoinModal && (
        <JoinModal
          movieTitle={shuffled.find((m) => m.id === pendingMovieId)?.title ?? ''}
          onJoin={handleJoin}
          onClose={() => setShowJoinModal(false)}
        />
      )}
    </>
  );
}
