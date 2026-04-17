'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Play, Users, Info, Star, Clock } from 'lucide-react';
import { Movie } from '@/lib/types';
import JoinModal from './JoinModal';

interface HeroSectionProps {
  movie: Movie;
}

export default function HeroSection({ movie }: HeroSectionProps) {
  const router = useRouter();
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [pendingRoomId, setPendingRoomId] = useState('');

  const handleWatchNow = () => {
    const roomId = crypto.randomUUID();
    setPendingRoomId(roomId);
    setShowJoinModal(true);
  };

  const handleJoin = (username: string) => {
    router.push(`/watch/${pendingRoomId}?movie=${movie.id}&username=${encodeURIComponent(username)}`);
  };

  return (
    <>
      <section className="relative w-full min-h-[85vh] flex items-end overflow-hidden">
        {/* Backdrop Image */}
        <div className="absolute inset-0">
          <img
            src={`${movie.backdrop}?auto=format&w=1920`}
            alt={movie.title}
            className="w-full h-full object-cover"
          />
          {/* Gradients */}
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black to-transparent" />
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 pb-16 pt-32 w-full">
          <div className="max-w-2xl animate-slide-up">
            {/* Featured Badge */}
            <div className="flex items-center gap-2 mb-4">
              <div className="h-0.5 w-8 bg-brand-red" />
              <span className="text-brand-red text-xs font-semibold uppercase tracking-widest">Featured Today</span>
            </div>

            {/* Title */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black leading-none tracking-tight text-white mb-4">
              {movie.title}
            </h1>

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-4 mb-5 text-sm">
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
                {movie.genres.map((g) => (
                  <span
                    key={g}
                    className="px-2 py-0.5 rounded text-xs font-medium bg-white/10 text-white/80"
                  >
                    {g}
                  </span>
                ))}
              </div>
            </div>

            {/* Description */}
            <p className="text-white/80 text-base leading-relaxed mb-8 max-w-lg line-clamp-3">
              {movie.description}
            </p>

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleWatchNow}
                className="flex items-center gap-2 px-7 py-3.5 bg-white text-black rounded-md font-bold text-base hover:bg-white/90 active:scale-[0.97] transition-all duration-150 cursor-pointer"
              >
                <Play size={20} className="fill-black" />
                Play Now
              </button>
              <button
                onClick={handleWatchNow}
                className="flex items-center gap-2 px-7 py-3.5 bg-brand-red text-white rounded-md font-bold text-base hover:bg-rose-600 active:scale-[0.97] transition-all duration-150 cursor-pointer"
              >
                <Users size={18} />
                Watch Party
              </button>
              <button className="flex items-center gap-2 px-5 py-3.5 bg-white/15 text-white rounded-md font-semibold text-base hover:bg-white/25 active:scale-[0.97] transition-all duration-150 cursor-pointer">
                <Info size={18} />
                More Info
              </button>
            </div>
          </div>
        </div>
      </section>

      {showJoinModal && (
        <JoinModal
          movieTitle={movie.title}
          onJoin={handleJoin}
          onClose={() => setShowJoinModal(false)}
        />
      )}
    </>
  );
}
