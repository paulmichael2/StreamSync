import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { Movie } from '@/lib/types';

const hasSupabase =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

const moviesPath = path.join(process.cwd(), 'data', 'movies.json');

function readLocal(): Movie[] {
  try { return JSON.parse(fs.readFileSync(moviesPath, 'utf-8')); }
  catch { return []; }
}

function writeLocal(movies: Movie[]) {
  fs.writeFileSync(moviesPath, JSON.stringify(movies, null, 2));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toMovie(row: any): Movie {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? '',
    genre: row.genre ?? '',
    genres: row.genres ?? [],
    year: row.year,
    rating: row.rating,
    thumbnail: row.thumbnail ?? '',
    backdrop: row.backdrop ?? '',
    videoUrl: row.video_url ?? row.videoUrl ?? '',
    duration: row.duration ?? 'N/A',
    featured: row.featured ?? false,
  };
}

export async function GET() {
  if (hasSupabase) {
    const { supabase } = await import('@/lib/supabase');
    const { data, error } = await supabase
      .from('movies')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json((data ?? []).map(toMovie));
  }
  return NextResponse.json(readLocal());
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  // Build a clean row — always use snake_case for Supabase
  const row = {
    id: Date.now().toString(),
    title: body.title,
    description: body.description ?? '',
    genre: body.genre ?? 'Action',
    genres: body.genres ?? [body.genre],
    year: Number(body.year),
    rating: Number(body.rating),
    thumbnail: body.thumbnail ?? '',
    backdrop: body.backdrop || body.thumbnail || '',
    video_url: body.videoUrl,          // snake_case for DB
    duration: body.duration ?? 'N/A',
    featured: body.featured ?? false,
  };

  if (hasSupabase) {
    const { supabase } = await import('@/lib/supabase');
    const { data, error } = await supabase
      .from('movies')
      .insert(row)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(toMovie(data), { status: 201 });
  }

  // Local fallback — store as camelCase in JSON
  const movies = readLocal();
  const newMovie: Movie = { ...row, videoUrl: row.video_url };
  movies.push(newMovie);
  writeLocal(movies);
  return NextResponse.json(newMovie, { status: 201 });
}
