'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Search, Bell, Menu, X, Shield, Radio, Clock, Star } from 'lucide-react';
import { Movie } from '@/lib/types';

export default function Navbar() {
  const [scrolled,    setScrolled]    = useState(false);
  const [menuOpen,    setMenuOpen]    = useState(false);
  const [searchOpen,  setSearchOpen]  = useState(false);
  const [query,       setQuery]       = useState('');
  const [allMovies,   setAllMovies]   = useState<Movie[]>([]);
  const [results,     setResults]     = useState<Movie[]>([]);
  const [loadingMovies, setLoadingMovies] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const pathname = usePathname();
  const router   = useRouter();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Fetch movies once when search opens
  useEffect(() => {
    if (!searchOpen) return;
    setTimeout(() => inputRef.current?.focus(), 50);
    if (allMovies.length > 0) return;
    setLoadingMovies(true);
    fetch('/api/movies')
      .then((r) => r.json())
      .then((data) => { setAllMovies(data); setLoadingMovies(false); })
      .catch(() => setLoadingMovies(false));
  }, [searchOpen, allMovies.length]);

  // Filter as user types
  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const q = query.toLowerCase();
    setResults(
      allMovies.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          m.genre?.toLowerCase().includes(q) ||
          m.description?.toLowerCase().includes(q) ||
          String(m.year).includes(q)
      ).slice(0, 8)
    );
  }, [query, allMovies]);

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    setQuery('');
    setResults([]);
  }, []);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeSearch(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closeSearch]);

  const goToMovie = (movie: Movie) => {
    closeSearch();
    router.push(`/movie/${movie.id}`);
  };

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? 'bg-black/95 backdrop-blur-md shadow-lg shadow-black/50' : 'bg-gradient-to-b from-black/80 to-transparent'
        }`}
      >
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group flex-shrink-0">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="heartGrad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#FF3CAC" />
                    <stop offset="50%" stopColor="#784BA0" />
                    <stop offset="100%" stopColor="#2B86C5" />
                  </linearGradient>
                </defs>
                <path d="M16 27C16 27 4 19.5 4 11.5C4 8.42 6.42 6 9.5 6C11.74 6 13.68 7.28 14.72 9.1L16 11.5L17.28 9.1C18.32 7.28 20.26 6 22.5 6C25.58 6 28 8.42 28 11.5C28 19.5 16 27 16 27Z" fill="url(#heartGrad)" />
                <path d="M13 16L15.5 19L19.5 13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
              </svg>
              <span className="text-xl font-bold tracking-tight text-white">
                Heart<span style={{ background: 'linear-gradient(90deg,#FF3CAC,#784BA0,#2B86C5)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Sync</span>
              </span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
              <Link href="/" className={`transition-colors hover:text-white ${pathname === '/' ? 'text-white' : 'text-white/60'}`}>Home</Link>
              <Link href="/?genre=Action" className="text-white/60 hover:text-white transition-colors">Movies</Link>
              <Link href="/?genre=Drama" className="text-white/60 hover:text-white transition-colors">Series</Link>
              <Link href="/?genre=Animation" className="text-white/60 hover:text-white transition-colors">New & Popular</Link>
              <Link href="/rooms" className={`flex items-center gap-1.5 transition-colors hover:text-white ${pathname === '/rooms' ? 'text-white' : 'text-white/60'}`}>
                <Radio size={13} className="text-brand-red" /> Live Rooms
              </Link>
            </nav>

            {/* Right Actions */}
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => setSearchOpen(true)}
                aria-label="Search"
                className="p-2 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
              >
                <Search size={20} />
              </button>
              <button aria-label="Notifications" className="p-2 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-all hidden sm:flex cursor-pointer">
                <Bell size={20} />
              </button>
              <Link href="/admin" className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 rounded-md transition-all">
                <Shield size={15} /><span>Admin</span>
              </Link>
              <button aria-label="Profile" className="w-8 h-8 bg-brand-red rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 cursor-pointer">
                U
              </button>
              <button
                aria-label="Menu"
                className="md:hidden p-2 text-white/60 hover:text-white transition-colors cursor-pointer"
                onClick={() => setMenuOpen((v) => !v)}
              >
                {menuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="md:hidden bg-black/95 border-t border-white/10 animate-fade-in">
            <nav className="px-4 py-4 flex flex-col gap-3 text-sm font-medium">
              <Link href="/" className="text-white/80 hover:text-white py-2" onClick={() => setMenuOpen(false)}>Home</Link>
              <Link href="/?genre=Action" className="text-white/60 hover:text-white py-2" onClick={() => setMenuOpen(false)}>Movies</Link>
              <Link href="/?genre=Animation" className="text-white/60 hover:text-white py-2" onClick={() => setMenuOpen(false)}>New & Popular</Link>
              <Link href="/rooms" className="flex items-center gap-2 text-white/60 hover:text-white py-2" onClick={() => setMenuOpen(false)}>
                <Radio size={16} className="text-brand-red" /> Live Rooms
              </Link>
              <Link href="/admin" className="flex items-center gap-2 text-white/60 hover:text-white py-2" onClick={() => setMenuOpen(false)}>
                <Shield size={16} /> Admin
              </Link>
            </nav>
          </div>
        )}
      </header>

      {/* Search Overlay */}
      {searchOpen && (
        <div className="fixed inset-0 z-[60] flex flex-col" onClick={closeSearch}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

          {/* Search panel */}
          <div
            className="relative z-10 mx-auto w-full max-w-2xl mt-20 px-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Input */}
            <div className="flex items-center gap-3 bg-[#1a1a1a] border border-white/15 rounded-2xl px-4 py-3 shadow-2xl">
              <Search size={18} className="text-white/40 flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search movies, genres, years…"
                className="flex-1 bg-transparent text-white placeholder-white/30 text-base outline-none"
              />
              {query && (
                <button onClick={() => setQuery('')} className="text-white/30 hover:text-white transition-colors cursor-pointer">
                  <X size={16} />
                </button>
              )}
              <button onClick={closeSearch} className="text-white/40 hover:text-white transition-colors text-xs font-medium cursor-pointer ml-1">
                Cancel
              </button>
            </div>

            {/* Results */}
            {(results.length > 0 || loadingMovies || query.trim()) && (
              <div className="mt-2 bg-[#1a1a1a] border border-white/10 rounded-2xl overflow-hidden shadow-2xl max-h-[60vh] overflow-y-auto">
                {loadingMovies ? (
                  <div className="p-6 text-center text-white/40 text-sm">Loading…</div>
                ) : results.length === 0 && query.trim() ? (
                  <div className="p-6 text-center">
                    <p className="text-white/40 text-sm">No results for <span className="text-white/70">"{query}"</span></p>
                  </div>
                ) : (
                  results.map((movie) => (
                    <button
                      key={movie.id}
                      onClick={() => goToMovie(movie)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left cursor-pointer border-b border-white/5 last:border-0"
                    >
                      {/* Thumbnail */}
                      <div className="w-10 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-white/5">
                        {movie.thumbnail
                          ? <img src={movie.thumbnail} alt={movie.title} className="w-full h-full object-cover" />
                          : <div className="w-full h-full bg-white/10" />
                        }
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium text-sm truncate">{movie.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-white/40 text-xs">{movie.year}</span>
                          <span className="text-white/20 text-xs">•</span>
                          <span className="text-white/40 text-xs">{movie.genre}</span>
                          {movie.duration && (
                            <>
                              <span className="text-white/20 text-xs">•</span>
                              <span className="flex items-center gap-0.5 text-white/40 text-xs"><Clock size={9} />{movie.duration}</span>
                            </>
                          )}
                        </div>
                      </div>
                      {/* Rating */}
                      <div className="flex items-center gap-1 text-yellow-400 text-xs flex-shrink-0">
                        <Star size={11} className="fill-yellow-400" />
                        {movie.rating?.toFixed(1)}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
