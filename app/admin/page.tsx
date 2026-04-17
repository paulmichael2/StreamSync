'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus, Trash2, Film, Star, Clock, ArrowLeft,
  CheckCircle, AlertCircle, Loader2, ExternalLink
} from 'lucide-react';
import { Movie } from '@/lib/types';

const GENRES = ['Action', 'Animation', 'Comedy', 'Drama', 'Documentary', 'Sci-Fi', 'Horror', 'Romance', 'Thriller', 'Family', 'Adventure'];

const EMPTY_FORM = {
  title: '',
  description: '',
  genre: 'Action',
  year: new Date().getFullYear().toString(),
  rating: '7.0',
  thumbnail: '',
  backdrop: '',
  videoUrl: '',
  duration: '',
};

export default function AdminPage() {
  const router = useRouter();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchMovies = async () => {
    setFetchLoading(true);
    try {
      const res = await fetch('/api/movies');
      setMovies(await res.json());
    } catch {
      showToast('error', 'Failed to load movies');
    } finally {
      setFetchLoading(false);
    }
  };

  useEffect(() => { fetchMovies(); }, []);

  const handleChange = (field: string, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.videoUrl.trim()) {
      showToast('error', 'Title and Video URL are required');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/movies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          genres: [form.genre],
          year: parseInt(form.year),
          rating: parseFloat(form.rating),
          backdrop: form.backdrop || form.thumbnail,
        }),
      });
      if (!res.ok) throw new Error();
      showToast('success', `"${form.title}" added successfully!`);
      setForm(EMPTY_FORM);
      fetchMovies();
    } catch {
      showToast('error', 'Failed to add movie. Check your inputs.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    setDeleteId(id);
    try {
      const res = await fetch(`/api/movies/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      showToast('success', `"${title}" removed`);
      setMovies((prev) => prev.filter((m) => m.id !== id));
    } catch {
      showToast('error', 'Failed to delete movie');
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium animate-slide-up ${
            toast.type === 'success'
              ? 'bg-green-900/90 border border-green-500/30 text-green-100'
              : 'bg-red-900/90 border border-red-500/30 text-red-100'
          }`}
          role="alert"
          aria-live="polite"
        >
          {toast.type === 'success'
            ? <CheckCircle size={16} className="text-green-400" />
            : <AlertCircle size={16} className="text-red-400" />
          }
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <header className="border-b border-white/8 sticky top-0 bg-black/95 backdrop-blur-md z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/')}
              className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
              aria-label="Back"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-lg font-bold text-white">Content Manager</h1>
              <p className="text-xs text-white/40">Add and manage your movie library</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white/60">
            <Film size={13} />
            <span>{movies.length} movies</span>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-1 lg:grid-cols-5 gap-8">

        {/* Add Movie Form */}
        <section className="lg:col-span-2">
          <div className="sticky top-24 bg-[#111] border border-white/8 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/8 flex items-center gap-2">
              <div className="w-7 h-7 bg-brand-red/20 rounded-lg flex items-center justify-center">
                <Plus size={15} className="text-brand-red" />
              </div>
              <h2 className="font-semibold text-white text-sm">Add New Movie</h2>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4" noValidate>
              {/* Title */}
              <div>
                <label htmlFor="title" className="block text-xs font-medium text-white/60 mb-1.5">
                  Title <span className="text-brand-red">*</span>
                </label>
                <input
                  id="title"
                  type="text"
                  value={form.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  placeholder="Movie title"
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm
                    placeholder-white/25 focus:outline-none focus:border-brand-red/60 focus:ring-1 focus:ring-brand-red/30 transition-all"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-xs font-medium text-white/60 mb-1.5">
                  Description
                </label>
                <textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Short description..."
                  rows={3}
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm
                    placeholder-white/25 focus:outline-none focus:border-brand-red/60 focus:ring-1 focus:ring-brand-red/30 transition-all resize-none"
                />
              </div>

              {/* Genre + Year row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="genre" className="block text-xs font-medium text-white/60 mb-1.5">Genre</label>
                  <select
                    id="genre"
                    value={form.genre}
                    onChange={(e) => handleChange('genre', e.target.value)}
                    className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm
                      focus:outline-none focus:border-brand-red/60 transition-all cursor-pointer appearance-none"
                  >
                    {GENRES.map((g) => <option key={g} value={g} className="bg-[#111]">{g}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="year" className="block text-xs font-medium text-white/60 mb-1.5">Year</label>
                  <input
                    id="year"
                    type="number"
                    value={form.year}
                    onChange={(e) => handleChange('year', e.target.value)}
                    min="1900"
                    max={new Date().getFullYear() + 2}
                    className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm
                      focus:outline-none focus:border-brand-red/60 transition-all"
                  />
                </div>
              </div>

              {/* Rating + Duration row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="rating" className="block text-xs font-medium text-white/60 mb-1.5">
                    Rating (0–10)
                  </label>
                  <input
                    id="rating"
                    type="number"
                    value={form.rating}
                    onChange={(e) => handleChange('rating', e.target.value)}
                    min="0"
                    max="10"
                    step="0.1"
                    className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm
                      focus:outline-none focus:border-brand-red/60 transition-all"
                  />
                </div>
                <div>
                  <label htmlFor="duration" className="block text-xs font-medium text-white/60 mb-1.5">
                    Duration
                  </label>
                  <input
                    id="duration"
                    type="text"
                    value={form.duration}
                    onChange={(e) => handleChange('duration', e.target.value)}
                    placeholder="e.g. 1:48"
                    className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm
                      placeholder-white/25 focus:outline-none focus:border-brand-red/60 transition-all"
                  />
                </div>
              </div>

              {/* Thumbnail URL */}
              <div>
                <label htmlFor="thumbnail" className="block text-xs font-medium text-white/60 mb-1.5">
                  Thumbnail URL
                </label>
                <input
                  id="thumbnail"
                  type="url"
                  value={form.thumbnail}
                  onChange={(e) => handleChange('thumbnail', e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm
                    placeholder-white/25 focus:outline-none focus:border-brand-red/60 transition-all"
                />
              </div>

              {/* Backdrop URL */}
              <div>
                <label htmlFor="backdrop" className="block text-xs font-medium text-white/60 mb-1.5">
                  Backdrop URL <span className="text-white/30">(optional, falls back to thumbnail)</span>
                </label>
                <input
                  id="backdrop"
                  type="url"
                  value={form.backdrop}
                  onChange={(e) => handleChange('backdrop', e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm
                    placeholder-white/25 focus:outline-none focus:border-brand-red/60 transition-all"
                />
              </div>

              {/* Video URL */}
              <div>
                <label htmlFor="videoUrl" className="block text-xs font-medium text-white/60 mb-1.5">
                  Video URL <span className="text-brand-red">*</span>
                </label>
                <input
                  id="videoUrl"
                  type="url"
                  value={form.videoUrl}
                  onChange={(e) => handleChange('videoUrl', e.target.value)}
                  placeholder="https://example.com/movie.mp4"
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm
                    placeholder-white/25 focus:outline-none focus:border-brand-red/60 transition-all"
                  required
                />
                <p className="mt-1 text-[10px] text-white/30">Direct .mp4 or .webm URL required</p>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 bg-brand-red text-white font-bold rounded-xl
                  hover:bg-rose-600 disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98] transition-all cursor-pointer"
              >
                {loading
                  ? <><Loader2 size={16} className="animate-spin" /> Adding...</>
                  : <><Plus size={16} /> Add Movie</>
                }
              </button>
            </form>
          </div>
        </section>

        {/* Movie List */}
        <section className="lg:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white">Library ({movies.length})</h2>
          </div>

          {fetchLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-28 rounded-xl shimmer" />
              ))}
            </div>
          ) : movies.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center border border-white/8 rounded-2xl">
              <Film size={40} className="text-white/20 mb-3" />
              <p className="text-white/50 font-medium">No movies yet</p>
              <p className="text-white/30 text-sm mt-1">Add your first movie using the form</p>
            </div>
          ) : (
            <div className="space-y-3">
              {movies.map((movie) => (
                <div
                  key={movie.id}
                  className="flex items-center gap-4 p-4 bg-[#111] border border-white/8 rounded-xl hover:border-white/15 transition-all group"
                >
                  {/* Thumbnail */}
                  <div className="w-16 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-white/5">
                    <img
                      src={movie.thumbnail}
                      alt={movie.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-semibold text-sm truncate">{movie.title}</h3>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className="text-xs text-white/40">{movie.year}</span>
                      <span className="text-xs text-white/20">•</span>
                      <span className="text-xs text-white/40">{movie.genre}</span>
                      <span className="text-xs text-white/20">•</span>
                      <span className="flex items-center gap-0.5 text-xs text-yellow-400">
                        <Star size={10} className="fill-yellow-400" />
                        {movie.rating.toFixed(1)}
                      </span>
                      {movie.duration && (
                        <>
                          <span className="text-xs text-white/20">•</span>
                          <span className="flex items-center gap-0.5 text-xs text-white/40">
                            <Clock size={10} />
                            {movie.duration}
                          </span>
                        </>
                      )}
                    </div>
                    <p className="text-xs text-white/30 mt-1 line-clamp-1">{movie.description}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <a
                      href={`/watch/preview-${movie.id}?movie=${movie.id}&username=Admin`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg text-white/30 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                      aria-label="Preview"
                    >
                      <ExternalLink size={15} />
                    </a>
                    <button
                      onClick={() => handleDelete(movie.id, movie.title)}
                      disabled={deleteId === movie.id}
                      className="p-2 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-400/10 transition-all cursor-pointer disabled:opacity-50"
                      aria-label={`Delete ${movie.title}`}
                    >
                      {deleteId === movie.id
                        ? <Loader2 size={15} className="animate-spin" />
                        : <Trash2 size={15} />
                      }
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
