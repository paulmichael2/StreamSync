import { Movie } from '@/lib/types';
import Navbar from '@/components/Navbar';
import HeroSection from '@/components/HeroSection';
import MovieRow from '@/components/MovieRow';
import LazyMovieRow from '@/components/LazyMovieRow';
import fs from 'fs';
import path from 'path';

const hasSupabase =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

async function getMovies(): Promise<Movie[]> {
  try {
    if (hasSupabase) {
      const { supabase } = await import('@/lib/supabase');
      const { data, error } = await supabase
        .from('movies')
        .select('*')
        .order('created_at', { ascending: true });
      if (error || !data) return [];
      return data.map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        genre: row.genre,
        genres: row.genres,
        year: row.year,
        rating: row.rating,
        thumbnail: row.thumbnail,
        backdrop: row.backdrop,
        videoUrl: row.video_url,
        duration: row.duration,
        featured: row.featured,
        subtitleUrl: row.subtitle_url ?? '',
      }));
    }
    const data = fs.readFileSync(path.join(process.cwd(), 'data', 'movies.json'), 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export const revalidate = 0;

const CAP = 20; // max cards per row

export default async function HomePage() {
  const movies = await getMovies();

  const heroMovies = [...movies]
    .filter((m) => m.backdrop)
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 8);

  // Each row capped at CAP to keep DOM size manageable
  const trending   = [...movies].sort((a, b) => b.rating - a.rating).slice(0, CAP);
  const animation  = movies.filter((m) => m.genres?.includes('Animation')).slice(0, CAP);
  const action     = movies.filter((m) => m.genres?.includes('Action')).slice(0, CAP);
  const horror     = movies.filter((m) => m.genres?.includes('Horror')).slice(0, CAP);
  const drama      = movies.filter((m) => m.genres?.includes('Drama') || m.genres?.includes('Sci-Fi')).slice(0, CAP);
  const recent     = [...movies].sort((a, b) => b.year - a.year).slice(0, CAP);

  return (
    <main className="min-h-screen bg-black">
      <Navbar />

      {heroMovies.length > 0 && <HeroSection movies={heroMovies} />}

      <div className="relative z-10 -mt-16 pb-16">
        {/* First row renders immediately (above fold) */}
        <MovieRow title="Trending Now" movies={trending} />

        {/* All remaining rows are lazy — only mount when scrolled near */}
        {animation.length > 0  && <LazyMovieRow title="Animation"      movies={animation} />}
        {action.length > 0     && <LazyMovieRow title="Action & Thrills" movies={action} />}
        {horror.length > 0     && <LazyMovieRow title="Horror"          movies={horror} />}
        {drama.length > 0      && <LazyMovieRow title="Drama & Sci-Fi"  movies={drama} />}
        <LazyMovieRow title="Recently Added" movies={recent} />
      </div>

      <footer className="border-t border-white/5 px-4 sm:px-6 lg:px-8 py-12 max-w-[1800px] mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="footerGrad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#FF3CAC" />
                  <stop offset="50%" stopColor="#784BA0" />
                  <stop offset="100%" stopColor="#2B86C5" />
                </linearGradient>
              </defs>
              <path d="M16 27C16 27 4 19.5 4 11.5C4 8.42 6.42 6 9.5 6C11.74 6 13.68 7.28 14.72 9.1L16 11.5L17.28 9.1C18.32 7.28 20.26 6 22.5 6C25.58 6 28 8.42 28 11.5C28 19.5 16 27 16 27Z" fill="url(#footerGrad)" />
              <path d="M13 16L15.5 19L19.5 13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
            </svg>
            <span className="text-white font-bold text-sm">HeartSync</span>
          </div>
          <p className="text-white/30 text-xs">Watch together. Stay in sync.</p>
          <div className="flex gap-4 text-xs text-white/30">
            <a href="/admin" className="hover:text-white/60 transition-colors">Admin</a>
            <span>Privacy</span>
            <span>Terms</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
