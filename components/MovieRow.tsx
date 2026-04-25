'use client';

import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Movie } from '@/lib/types';
import MovieCard from './MovieCard';

interface MovieRowProps {
  title: string;
  movies: Movie[];
}

export default function MovieRow({ title, movies }: MovieRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);

  if (!movies.length) return null;

  const scroll = (dir: 'left' | 'right') => {
    if (!rowRef.current) return;
    const amount = rowRef.current.clientWidth * 0.75;
    rowRef.current.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
  };

  return (
    <section className="relative mb-10 group/row">
      {/* Row header */}
      <div className="flex items-center gap-3 mb-4 px-4 sm:px-6 lg:px-8 max-w-[1800px] mx-auto">
        <h2 className="text-lg sm:text-xl font-bold text-white">{title}</h2>
        <div className="h-0.5 flex-1 bg-gradient-to-r from-white/10 to-transparent max-w-xs" />
        <span className="text-xs text-brand-red font-medium opacity-0 group-hover/row:opacity-100 transition-opacity cursor-pointer hover:underline">
          See all
        </span>
      </div>

      {/* Scroll container */}
      <div className="relative">
        {/* Left arrow */}
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-0 bottom-0 z-20 w-12 flex items-center justify-center
            bg-gradient-to-r from-black to-transparent
            opacity-0 group-hover/row:opacity-100 transition-opacity cursor-pointer
            text-white hover:text-brand-red"
          aria-label="Scroll left"
        >
          <ChevronLeft size={28} strokeWidth={2.5} />
        </button>

        {/* Movies */}
        <div
          ref={rowRef}
          className="flex gap-3 overflow-x-auto scrollbar-hide px-4 sm:px-6 lg:px-8 max-w-[1800px] mx-auto pb-2"
          style={{ scrollSnapType: 'x mandatory' }}
        >
          {movies.map((movie, i) => (
            <div key={movie.id} style={{ scrollSnapAlign: 'start' }}>
              <MovieCard movie={movie} priority={i < 4} />
            </div>
          ))}
        </div>

        {/* Right arrow */}
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-0 bottom-0 z-20 w-12 flex items-center justify-center
            bg-gradient-to-l from-black to-transparent
            opacity-0 group-hover/row:opacity-100 transition-opacity cursor-pointer
            text-white hover:text-brand-red"
          aria-label="Scroll right"
        >
          <ChevronRight size={28} strokeWidth={2.5} />
        </button>
      </div>
    </section>
  );
}
