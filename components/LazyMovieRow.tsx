'use client';

import { useEffect, useRef, useState } from 'react';
import MovieRow from './MovieRow';
import { Movie } from '@/lib/types';

interface Props {
  title: string;
  movies: Movie[];
}

export default function LazyMovieRow({ title, movies }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { rootMargin: '200px' } // start loading 200px before it enters the viewport
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="mb-10">
      {visible ? (
        <MovieRow title={title} movies={movies} />
      ) : (
        // Skeleton placeholder — same height as a real row so layout doesn't jump
        <div className="px-4 sm:px-6 lg:px-8 max-w-[1800px] mx-auto">
          <div className="h-6 w-40 bg-white/5 rounded mb-4 shimmer" />
          <div className="flex gap-3 overflow-hidden">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex-shrink-0 w-[180px] sm:w-[200px] lg:w-[220px] aspect-[2/3] rounded-lg shimmer" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
