'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Play, Users, Star, Clock } from 'lucide-react';
import { Movie } from '@/lib/types';
import JoinModal from './JoinModal';

interface MovieCardProps {
  movie: Movie;
  priority?: boolean;
}

// Downsize TMDB w500 → w342 (cards are ≤220px; w342 covers 2× retina)
function optimiseThumbnail(url: string): string {
  if (!url) return url;
  return url.replace('/t/p/w500/', '/t/p/w342/');
}

export default function MovieCard({ movie, priority = false }: MovieCardProps) {
  const router = useRouter();
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [pendingRoomId, setPendingRoomId] = useState('');
  const [imgError, setImgError] = useState(false);

  const handleWatchParty = (e: React.MouseEvent) => {
    e.stopPropagation();
    const roomId = crypto.randomUUID();
    setPendingRoomId(roomId);
    setShowJoinModal(true);
  };

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    const roomId = crypto.randomUUID();
    router.push(`/watch/${roomId}?movie=${movie.id}&username=Guest`);
  };

  const handleJoin = (username: string) => {
    router.push(`/watch/${pendingRoomId}?movie=${movie.id}&username=${encodeURIComponent(username)}`);
  };

  const thumb = optimiseThumbnail(movie.thumbnail);

  return (
    <>
      <div className="movie-card relative rounded-lg overflow-hidden cursor-pointer group flex-shrink-0 w-[180px] sm:w-[200px] lg:w-[220px]">
        {/* Thumbnail */}
        <div className="aspect-[2/3] relative bg-brand-muted">
          {/* Shimmer shown while loading */}
          <div className="absolute inset-0 shimmer" />

          {thumb && !imgError ? (
            <Image
              src={thumb}
              alt={movie.title}
              fill
              sizes="(max-width: 640px) 180px, (max-width: 1024px) 200px, 220px"
              className="object-cover"
              loading={priority ? 'eager' : 'lazy'}
              priority={priority}
              onError={() => setImgError(true)}
              placeholder="empty"
            />
          ) : (
            <div className="absolute inset-0 bg-white/5 flex items-center justify-center">
              <span className="text-white/20 text-xs text-center px-2">{movie.title}</span>
            </div>
          )}

          {/* Overlay on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

          {/* Rating badge */}
          <div className="absolute top-2 right-2 flex items-center gap-0.5 px-1.5 py-0.5 bg-black/70 rounded text-xs text-yellow-400 font-semibold backdrop-blur-sm z-10">
            <Star size={10} className="fill-yellow-400" />
            {movie.rating.toFixed(1)}
          </div>

          {/* Hover content */}
          <div className="absolute inset-0 flex flex-col justify-end p-3 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-2 group-hover:translate-y-0 z-10">
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

        {/* Card footer */}
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
