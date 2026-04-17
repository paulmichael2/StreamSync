import { Movie } from '@/lib/types';
import Navbar from '@/components/Navbar';
import HeroSection from '@/components/HeroSection';
import MovieRow from '@/components/MovieRow';
import { supabase } from '@/lib/supabase';

async function getMovies(): Promise<Movie[]> {
  try {
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
    }));
  } catch {
    return [];
  }
}

export const revalidate = 0; // Always fetch fresh data

export default async function HomePage() {
  const movies = await getMovies();
  const featured = movies.find((m) => m.featured) ?? movies[0];

  const trending = [...movies].sort((a, b) => b.rating - a.rating);
  const animation = movies.filter((m) => m.genres?.includes('Animation'));
  const action = movies.filter((m) => m.genres?.includes('Action'));
  const drama = movies.filter((m) => m.genres?.includes('Drama') || m.genres?.includes('Sci-Fi'));
  const recent = [...movies].sort((a, b) => b.year - a.year);

  return (
    <main className="min-h-screen bg-black">
      <Navbar />

      {featured && <HeroSection movie={featured} />}

      <div className="relative z-10 -mt-16 pb-16">
        <MovieRow title="Trending Now" movies={trending} />
        <MovieRow title="All Movies" movies={movies} />
        {animation.length > 0 && <MovieRow title="Animation" movies={animation} />}
        {action.length > 0 && <MovieRow title="Action & Thrills" movies={action} />}
        {drama.length > 0 && <MovieRow title="Drama & Sci-Fi" movies={drama} />}
        <MovieRow title="Recently Added" movies={recent} />
      </div>

      <footer className="border-t border-white/5 px-4 sm:px-6 lg:px-8 py-12 max-w-[1800px] mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-brand-red rounded-md flex items-center justify-center">
              <svg width="10" height="12" viewBox="0 0 10 12" fill="white">
                <path d="M2 2l6 4-6 4V2z" />
              </svg>
            </div>
            <span className="text-white font-bold text-sm">StreamSync</span>
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
