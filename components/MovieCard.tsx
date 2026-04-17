'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Play, Users, Star, Clock } from 'lucide-react';
import { Movie } from '@/lib/types';
import JoinModal from './JoinModal';

interface MovieCardProps {
  movie: Movie;
}

export default function MovieCard({ movie }: MovieCardProps) {
  const router = useRouter();
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [pendingRoomId, setPendingRoomId] = useState('');
  const [imgLoaded, setImgLoaded] = useState(false);

  const handleWatchParty = (e: React.MouseEvent) => {
    e.stopPropagation();
    const roomId = crypto.randomUUID();
    setPendingRoomId(roomId);
    setShowJoinModal(true);
  };

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    const roomId = crypto.randomUUID();
    // Quick solo watch — use a guest name
    router.push(`/watch/${roomId}?movie=${movie.id}&username=Guest`);
  };

  const handleJoin = (username: string) => {
    router.push(`/watch/${pendingRoomId}?movie=${movie.id}&username=${encodeURIComponent(username)}`);
  };

  return (
    <>
      <div className="movie-card relative rounded-lg overflow-hidden cursor-pointer group flex-shrink-0 w-[180px] sm:w-[200px] lg:w-[220px]">
        {/* Thumbnail */}
        <div className="aspect-[2/3] relative bg-brand-muted">
          {!imgLoaded && <div className="absolute inset-0 shimmer" />}
          <img
            src={movie.thumbnail}
            alt={movie.title}
            className={`w-full h-full object-cover transition-opacity duration-300 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setImgLoaded(true)}
            loading="lazy"
          />
          {/* Overlay on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

          {/* Rating badge */}
          <div className="absolute top-2 right-2 flex items-center gap-0.5 px-1.5 py-0.5 bg-black/70 rounded text-xs text-yellow-400 font-semibold backdrop-blur-sm">
            <Star size={10} className="fill-yellow-400" />
            {movie.rating.toFixed(1)}
          </div>

          {/* Hover content */}
          <div className="absolute inset-0 flex flex-col justify-end p-3 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-2 group-hover:translate-y-0">
            <div className="mb-2">
              <h3 className="text-white font-bold text-sm leading-tight line-clamp-2">{movie.title}</h3>
              <div className="flex items-center gap-2 mt-1 text-xs text-white/60">
                <span>{movie.year}</span>
                <span>•</span>
                <span className="flex items-center gap-0.5">
                  <Clock size={10} />
                  {movie.duration}
                </span>
              </div>
            </div>

            {/* Genre badges */}
            <div className="flex flex-wrap gap-1 mb-3">
              {movie.genres.slice(0, 2).map((g) => (
                <span key={g} className="px-1.5 py-0.5 text-[10px] rounded bg-white/15 text-white/80">
                  {g}
                </span>
              ))}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <button
                onClick={handlePlay}
                className="flex-1 flex items-center justify-center gap-1 py-2 bg-white text-black rounded-md text-xs font-bold hover:bg-white/90 active:scale-[0.97] transition-all cursor-pointer"
              >
                <Play size={12} className="fill-black" />
                Play
              </button>
              <button
                onClick={handleWatchParty}
                className="flex-1 flex items-center justify-center gap-1 py-2 bg-brand-red text-white rounded-md text-xs font-bold hover:bg-rose-600 active:scale-[0.97] transition-all cursor-pointer"
              >
                <Users size={12} />
                Party
              </button>
            </div>
          </div>
        </div>

        {/* Card footer (always visible) */}
        <div className="p-2 bg-brand-muted/80">
          <p className="text-white text-xs font-semibold truncate">{movie.title}</p>
          <p className="text-white/40 text-[10px]">{movie.genre} • {movie.year}</p>
        </div>
      </div>

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
